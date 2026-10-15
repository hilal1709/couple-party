import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { AIRPORTS, BOARD, GROUPS, groupOf, nextOf, ownable, UTILITIES } from './board'
import { CARDS } from './cards'
import {
  GO_SALARY,
  HOTEL,
  JAIL,
  JAIL_FINE,
  type Deck,
  type MonopolyAction,
  type MonopolyOptions,
  type MonopolyState,
  type Note,
  type Payee,
  type Trade,
} from './types'

export function defaultOptions(players = 2): MonopolyOptions {
  return { players, end: 'rounds', rounds: 25, startCash: 1500, auction: true, trade: true, mortgage: true, freeParking: true, doubleGo: false }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

export function init(seed: number, options?: Partial<MonopolyOptions>): MonopolyState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.min(8, Math.max(2, opts.players))
  const [chance, r1] = shuffle(range(CARDS.chance.length), seed)
  const [chest, r2] = shuffle(range(CARDS.chest.length), r1)
  return {
    opts: { ...opts, players: n },
    rng: r2,
    pos: Array(n).fill(0),
    cash: Array(n).fill(opts.startCash),
    bankrupt: Array(n).fill(false),
    owner: Array(40).fill(null),
    houses: Array(40).fill(0),
    mortgaged: Array(40).fill(false),
    jail: Array(n).fill(-1),
    jailCards: range(n).map(() => []),
    turn: 0,
    round: 1,
    doubles: 0,
    phase: 'roll',
    resume: 'done',
    pot: 0,
    decks: { chance, chest },
    auction: null,
    trade: null,
    debts: [],
    winner: null,
    eventId: 0,
    event: null,
  }
}

// ---------- hitungan yang juga dipakai UI ----------

export const alive = (s: MonopolyState): Seat[] => s.pos.map((_, i) => i).filter((i) => !s.bankrupt[i])

/** Pemilik satu komplek warna lengkap. */
export function hasMonopoly(s: MonopolyState, who: Seat, sq: number): boolean {
  const b = BOARD[sq]
  return b.kind === 'street' && GROUPS[b.group].every((i) => s.owner[i] === who)
}

/** Sewa petak; `dice` dipakai utilitas, `card` = kartu "terdekat" (bandara 2x, utilitas 10x dadu). */
export function rentOf(s: MonopolyState, sq: number, dice: number, card?: 'airport' | 'utility'): number {
  const b = BOARD[sq]
  const o = s.owner[sq]
  if (o === null || s.mortgaged[sq]) return 0
  if (b.kind === 'street') {
    const h = s.houses[sq]
    return h > 0 ? b.rent[h] : b.rent[0] * (hasMonopoly(s, o, sq) ? 2 : 1)
  }
  if (b.kind === 'airport') {
    const c = AIRPORTS.filter((i) => s.owner[i] === o).length
    return 25 * 2 ** (c - 1) * (card === 'airport' ? 2 : 1)
  }
  if (b.kind === 'utility') {
    const c = UTILITIES.filter((i) => s.owner[i] === o).length
    return dice * (card === 'utility' || c === 2 ? 10 : 4)
  }
  return 0
}

export const mortgageValue = (sq: number) => (ownable(sq)?.price ?? 0) / 2
export const unmortgageCost = (sq: number) => Math.ceil(mortgageValue(sq) * 1.1)

/** Total kekayaan: uang + harga properti (yang digadai dihitung setengah) + bangunan. */
export function netWorth(s: MonopolyState, who: Seat): number {
  if (s.bankrupt[who]) return 0
  let total = s.cash[who]
  BOARD.forEach((b, sq) => {
    if (s.owner[sq] !== who || !('price' in b)) return
    total += s.mortgaged[sq] ? b.price / 2 : b.price
    if (b.kind === 'street') total += s.houses[sq] * b.house
  })
  return total
}

export function canBuild(s: MonopolyState, who: Seat, sq: number): boolean {
  const b = BOARD[sq]
  if (b.kind !== 'street' || !hasMonopoly(s, who, sq) || s.houses[sq] >= HOTEL || s.cash[who] < b.house) return false
  const g = GROUPS[b.group]
  return g.every((i) => !s.mortgaged[i]) && s.houses[sq] === Math.min(...g.map((i) => s.houses[i]))
}

export function canSell(s: MonopolyState, who: Seat, sq: number): boolean {
  const b = BOARD[sq]
  if (b.kind !== 'street' || s.owner[sq] !== who || s.houses[sq] === 0) return false
  return s.houses[sq] === Math.max(...GROUPS[b.group].map((i) => s.houses[i]))
}

export function canMortgage(s: MonopolyState, who: Seat, sq: number): boolean {
  if (!s.opts.mortgage || s.owner[sq] !== who || s.mortgaged[sq]) return false
  return groupOf(sq).every((i) => BOARD[i].kind !== 'street' || s.houses[i] === 0)
}

export const canUnmortgage = (s: MonopolyState, who: Seat, sq: number) =>
  s.opts.mortgage && s.owner[sq] === who && s.mortgaged[sq] && s.cash[who] >= unmortgageCost(sq)

/** Petak boleh ditukar: milik `who` dan komplek warnanya kosong dari bangunan. */
export const tradable = (s: MonopolyState, who: Seat, sq: number) =>
  s.owner[sq] === who && groupOf(sq).every((i) => BOARD[i].kind !== 'street' || s.houses[i] === 0)

export function validTrade(s: MonopolyState, t: Trade): boolean {
  if (t.from === t.to || s.bankrupt[t.from] || s.bankrupt[t.to] || t.to < 0 || t.to >= s.pos.length) return false
  const ints = [t.giveCash, t.getCash].every((v) => Number.isInteger(v) && v >= 0)
  if (!ints || t.giveCash > s.cash[t.from] || t.getCash > s.cash[t.to]) return false
  if (new Set([...t.give, ...t.get]).size !== t.give.length + t.get.length) return false
  if (!t.give.every((sq) => tradable(s, t.from, sq)) || !t.get.every((sq) => tradable(s, t.to, sq))) return false
  return t.give.length + t.get.length + t.giveCash + t.getCash > 0
}

/** Siapa yang sedang harus bertindak (untuk demo & suara giliran). */
export function actorOf(s: MonopolyState): Seat | null {
  if (s.phase === 'end') return null
  if (s.phase === 'auction') return s.auction!.turn
  if (s.phase === 'debt') return s.debts[0]?.who ?? null
  return s.turn
}

// ---------- mutasi draf (hanya dipanggil pada salinan state) ----------

type Ctx = { d: MonopolyState; log: Note[]; path: number[] }

const taxPayee = (d: MonopolyState): Payee => (d.opts.freeParking ? 'pot' : 'bank')

function rollDie(d: MonopolyState): number {
  const [r, ns] = nextRand(d.rng)
  d.rng = ns
  return 1 + Math.floor(r * 6)
}

function pay(d: MonopolyState, who: Seat, amount: number, to: Payee) {
  d.cash[who] -= amount
  if (to === 'pot') d.pot += amount
  else if (typeof to === 'number' && !d.bankrupt[to]) d.cash[to] += amount
}

/** Tagih: langsung dibayar kalau mampu & tidak ada antrean utang, selain itu jadi utang. */
function charge({ d, log }: Ctx, who: Seat, amount: number, to: Payee) {
  if (amount <= 0 || d.bankrupt[who]) return
  if (to === 'pot' && !d.opts.freeParking) to = 'bank'
  if (!d.debts.length && d.cash[who] >= amount) pay(d, who, amount, to)
  else {
    d.debts.push({ who, amount, to })
    log.push({ t: 'debt', amount, to })
  }
}

/** Fase setelah bidak selesai bergerak: dobel = lempar lagi. */
const afterMove = (d: MonopolyState) => (d.doubles > 0 && d.jail[d.turn] < 0 ? 'roll' : 'done')

function stepTo(c: Ctx, who: Seat, to: number) {
  const { d, log, path } = c
  let p = d.pos[who]
  while (p !== to) {
    p = (p + 1) % 40
    path.push(p)
    if (p === 0) {
      const amount = to === 0 && d.opts.doubleGo ? GO_SALARY * 2 : GO_SALARY
      d.cash[who] += amount
      log.push({ t: 'go', amount })
    }
  }
  d.pos[who] = to
}

function stepBack(c: Ctx, who: Seat, n: number) {
  let p = c.d.pos[who]
  for (let i = 0; i < n; i++) {
    p = (p + 39) % 40
    c.path.push(p)
  }
  c.d.pos[who] = p
}

function sendToJail(c: Ctx, who: Seat) {
  const { d } = c
  d.pos[who] = JAIL
  c.path.push(JAIL)
  d.jail[who] = 0
  d.doubles = 0
  d.phase = 'done'
  c.log.push({ t: 'jail' })
}

function drawCard(c: Ctx, who: Seat, deck: Deck, dice: number) {
  const { d, log } = c
  const i = d.decks[deck].shift()!
  log.push({ t: 'card', deck, i })
  const fx = CARDS[deck][i].fx
  if (fx.k !== 'jailFree') d.decks[deck].push(i)
  switch (fx.k) {
    case 'money':
      if (fx.amount > 0) d.cash[who] += fx.amount
      else charge(c, who, -fx.amount, taxPayee(d))
      break
    case 'goto':
      stepTo(c, who, fx.sq)
      land(c, who, dice)
      break
    case 'back':
      stepBack(c, who, fx.n)
      land(c, who, dice)
      break
    case 'jail':
      sendToJail(c, who)
      break
    case 'jailFree':
      d.jailCards[who].push(deck)
      log.push({ t: 'jailCard' })
      break
    case 'nearest':
      stepTo(c, who, nextOf(d.pos[who], fx.kind === 'airport' ? AIRPORTS : UTILITIES))
      land(c, who, dice, fx.kind)
      break
    case 'repairs': {
      let total = 0
      d.owner.forEach((o, sq) => {
        if (o !== who) return
        const h = d.houses[sq]
        total += h === HOTEL ? fx.hotel : h * fx.house
      })
      charge(c, who, total, taxPayee(d))
      break
    }
    case 'each':
      for (const o of alive(d)) {
        if (o === who) continue
        if (fx.amount > 0) charge(c, o, fx.amount, who)
        else charge(c, who, -fx.amount, o)
      }
      break
  }
}

function land(c: Ctx, who: Seat, dice: number, card?: 'airport' | 'utility') {
  const { d, log } = c
  const sq = d.pos[who]
  const b = BOARD[sq]
  switch (b.kind) {
    case 'street':
    case 'airport':
    case 'utility': {
      const o = d.owner[sq]
      if (o === null) d.phase = 'buy'
      else if (o !== who && !d.mortgaged[sq]) {
        const amount = rentOf(d, sq, dice, card)
        log.push({ t: 'rent', sq, amount, to: o })
        charge(c, who, amount, o)
      }
      break
    }
    case 'tax':
      log.push({ t: 'tax', sq, amount: b.amount })
      charge(c, who, b.amount, taxPayee(d))
      break
    case 'card':
      drawCard(c, who, b.deck, dice)
      break
    case 'gotojail':
      sendToJail(c, who)
      break
    case 'parking':
      if (d.opts.freeParking && d.pot > 0) {
        d.cash[who] += d.pot
        log.push({ t: 'pot', amount: d.pot })
        d.pot = 0
      }
      break
  }
}

function finish(c: Ctx, by: 'wealth' | Seat) {
  const { d } = c
  if (by === 'wealth') {
    const left = alive(d)
    const w = left.reduce((best, i) => (netWorth(d, i) > netWorth(d, best) ? i : best), left[0])
    d.winner = w
    c.log.push({ t: 'timeUp', who: w })
  } else {
    d.winner = by
    c.log.push({ t: 'win', who: by })
  }
  d.phase = 'end'
  d.auction = null
  d.trade = null
  d.debts = []
}

function nextTurn(c: Ctx) {
  const { d } = c
  const n = d.pos.length
  d.doubles = 0
  let t = d.turn
  do t = (t + 1) % n
  while (d.bankrupt[t])
  if (t <= d.turn) {
    d.round++
    if (d.opts.end === 'rounds' && d.round > d.opts.rounds) return finish(c, 'wealth')
  }
  d.turn = t
  d.phase = 'roll'
  c.log.push({ t: 'turn' })
}

/** Lanjutkan giliran pemain aktif setelah beli/lelang selesai. */
function resumeTurn(c: Ctx) {
  if (c.d.bankrupt[c.d.turn]) nextTurn(c)
  else c.d.phase = afterMove(c.d)
}

function advanceAuction(c: Ctx, from: Seat) {
  const { d, log } = c
  const a = d.auction!
  const n = d.pos.length
  const act = range(n).filter((i) => a.active[i] && !d.bankrupt[i])
  if (a.bidder !== null && act.every((i) => i === a.bidder)) {
    d.owner[a.sq] = a.bidder
    d.cash[a.bidder] -= a.bid
    log.push({ t: 'sold', sq: a.sq, to: a.bidder, amount: a.bid })
    d.auction = null
    return resumeTurn(c)
  }
  if (act.length === 0) {
    log.push({ t: 'unsold', sq: a.sq })
    d.auction = null
    return resumeTurn(c)
  }
  let t = from
  do t = (t + 1) % n
  while (!act.includes(t))
  a.turn = t
}

function goBankrupt(c: Ctx, who: Seat, to: Payee) {
  const { d, log } = c
  d.owner.forEach((o, sq) => {
    const b = BOARD[sq]
    if (o === who && b.kind === 'street' && d.houses[sq] > 0) {
      d.cash[who] += (d.houses[sq] * b.house) / 2
      d.houses[sq] = 0
    }
  })
  const heir = typeof to === 'number' && !d.bankrupt[to] && to !== who ? to : null
  if (heir !== null) {
    d.cash[heir] += Math.max(0, d.cash[who])
    d.owner = d.owner.map((o) => (o === who ? heir : o))
    d.jailCards[heir].push(...d.jailCards[who])
  } else {
    d.owner.forEach((o, sq) => {
      if (o !== who) return
      d.owner[sq] = null
      d.mortgaged[sq] = false
    })
    for (const deck of d.jailCards[who]) d.decks[deck].push(CARDS[deck].findIndex((k) => k.fx.k === 'jailFree'))
  }
  d.jailCards[who] = []
  d.cash[who] = 0
  d.bankrupt[who] = true
  d.jail[who] = -1
  d.debts = d.debts.filter((x) => x.who !== who).map((x) => (x.to === who ? { ...x, to: 'bank' as const } : x))
  if (d.trade && (d.trade.from === who || d.trade.to === who)) d.trade = null
  log.push({ t: 'bankrupt', who, to: heir ?? 'bank' })

  const left = alive(d)
  if (left.length === 1) return finish(c, left[0])
  const a = d.auction
  if (a) {
    a.active[who] = false
    if (a.bidder === who) {
      a.bidder = null
      a.bid = 0
    }
    // lanjut dari kursi sebelum yang sedang menawar, supaya gilirannya tidak terlewat
    advanceAuction(c, a.turn === who ? who : (a.turn + d.pos.length - 1) % d.pos.length)
  } else if (d.turn === who) nextTurn(c)
}

/** Bayar antrean utang yang sudah mampu dibayar; atur fase 'debt'. */
function settle(c: Ctx) {
  const { d, log } = c
  while (d.debts.length) {
    const h = d.debts[0]
    if (d.bankrupt[h.who]) {
      d.debts.shift()
      continue
    }
    if (d.cash[h.who] < h.amount) break
    pay(d, h.who, h.amount, h.to)
    log.push({ t: 'paid', who: h.who, amount: h.amount, to: h.to })
    d.debts.shift()
  }
  if (d.phase === 'end') {
    d.debts = []
    return
  }
  if (d.debts.length) {
    if (d.phase === 'roll' || d.phase === 'buy' || d.phase === 'done') {
      d.resume = d.phase
      d.phase = 'debt'
    }
  } else if (d.phase === 'debt') d.phase = d.resume
}

// ---------- reducer ----------

function allowed(s: MonopolyState, a: MonopolyAction, by: Seat): boolean {
  const mine = by === s.turn
  switch (a.type) {
    case 'roll':
      return s.phase === 'roll' && mine
    case 'buy': {
      const o = ownable(s.pos[by])
      return s.phase === 'buy' && mine && !!o && s.cash[by] >= o.price
    }
    case 'decline':
      return s.phase === 'buy' && mine
    case 'bid':
      return s.phase === 'auction' && s.auction!.turn === by && Number.isInteger(a.amount) && a.amount > s.auction!.bid && a.amount <= s.cash[by]
    case 'passBid':
      return s.phase === 'auction' && s.auction!.turn === by
    case 'build':
      return (s.phase === 'roll' || s.phase === 'done') && canBuild(s, by, a.sq)
    case 'unmortgage':
      return (s.phase === 'roll' || s.phase === 'done') && canUnmortgage(s, by, a.sq)
    case 'sell':
    case 'mortgage': {
      const when = s.phase === 'roll' || s.phase === 'done' || (s.phase === 'debt' && s.debts[0]?.who === by)
      return when && (a.type === 'sell' ? canSell(s, by, a.sq) : canMortgage(s, by, a.sq))
    }
    case 'propose':
      return (
        s.opts.trade &&
        !s.trade &&
        (s.phase === 'roll' || s.phase === 'done' || s.phase === 'debt') &&
        validTrade(s, { ...a.trade, from: by })
      )
    case 'accept':
      return !!s.trade && s.trade.to === by && (s.phase === 'roll' || s.phase === 'done' || s.phase === 'debt')
    case 'reject':
      return !!s.trade && s.trade.to === by
    case 'cancel':
      return !!s.trade && s.trade.from === by
    case 'payJail':
      return s.phase === 'roll' && mine && s.jail[by] >= 0 && s.cash[by] >= JAIL_FINE
    case 'jailCard':
      return s.phase === 'roll' && mine && s.jail[by] >= 0 && s.jailCards[by].length > 0
    case 'endTurn':
      return s.phase === 'done' && mine
    case 'bankrupt':
      return s.phase !== 'end'
    case 'again':
      return s.phase === 'end'
  }
}

export function reduce(s: MonopolyState, a: MonopolyAction, by: Seat): MonopolyState {
  if (by < 0 || by >= s.pos.length) return s
  if (a.type === 'again') return allowed(s, a, by) ? { ...init(s.rng, s.opts), eventId: s.eventId + 1 } : s
  if (s.bankrupt[by] || !allowed(s, a, by)) return s

  const d: MonopolyState = structuredClone(s)
  const c: Ctx = { d, log: [], path: [d.pos[by]] }
  let dice: [number, number] | undefined

  switch (a.type) {
    case 'roll': {
      dice = [rollDie(d), rollDie(d)]
      const sum = dice[0] + dice[1]
      const dbl = dice[0] === dice[1]
      if (d.jail[by] >= 0) {
        d.doubles = 0
        if (dbl) {
          d.jail[by] = -1
          c.log.push({ t: 'jailOut', how: 'double' })
        } else if (d.jail[by] >= 2) {
          d.jail[by] = -1
          c.log.push({ t: 'jailOut', how: 'forced' })
          charge(c, by, JAIL_FINE, taxPayee(d))
        } else {
          d.jail[by]++
          c.log.push({ t: 'jailStay', tries: d.jail[by] })
          d.phase = 'done'
          break
        }
      } else if (dbl) {
        d.doubles++
        if (d.doubles >= 3) {
          c.log.push({ t: 'speeding' })
          sendToJail(c, by)
          break
        }
      } else d.doubles = 0
      stepTo(c, by, (d.pos[by] + sum) % 40)
      d.phase = afterMove(d)
      land(c, by, sum)
      if (d.phase === 'roll') c.log.push({ t: 'doubles' })
      break
    }
    case 'buy': {
      const sq = d.pos[by]
      const price = ownable(sq)!.price
      d.cash[by] -= price
      d.owner[sq] = by
      c.log.push({ t: 'buy', sq, price })
      resumeTurn(c)
      break
    }
    case 'decline': {
      const sq = d.pos[by]
      const bidders = alive(d)
      if (d.opts.auction && bidders.some((i) => d.cash[i] > 0)) {
        d.auction = { sq, bid: 0, bidder: null, active: d.pos.map((_, i) => !d.bankrupt[i]), turn: by }
        d.phase = 'auction'
        c.log.push({ t: 'auction', sq })
        advanceAuction(c, by)
      } else resumeTurn(c)
      break
    }
    case 'bid': {
      const au = d.auction!
      au.bid = a.amount
      au.bidder = by
      c.log.push({ t: 'bid', amount: a.amount })
      advanceAuction(c, by)
      break
    }
    case 'passBid':
      d.auction!.active[by] = false
      c.log.push({ t: 'passBid' })
      advanceAuction(c, by)
      break
    case 'build':
      d.cash[by] -= (BOARD[a.sq] as { house: number }).house
      d.houses[a.sq]++
      c.log.push({ t: 'build', sq: a.sq })
      break
    case 'sell':
      d.cash[by] += (BOARD[a.sq] as { house: number }).house / 2
      d.houses[a.sq]--
      c.log.push({ t: 'sell', sq: a.sq })
      break
    case 'mortgage':
      d.cash[by] += mortgageValue(a.sq)
      d.mortgaged[a.sq] = true
      c.log.push({ t: 'mortgage', sq: a.sq })
      break
    case 'unmortgage':
      d.cash[by] -= unmortgageCost(a.sq)
      d.mortgaged[a.sq] = false
      c.log.push({ t: 'unmortgage', sq: a.sq })
      break
    case 'propose':
      d.trade = { ...a.trade, give: [...a.trade.give], get: [...a.trade.get], from: by }
      c.log.push({ t: 'tradeOffer', to: a.trade.to })
      break
    case 'accept': {
      const t = d.trade!
      d.trade = null
      if (!validTrade(d, t)) {
        c.log.push({ t: 'tradeNo', with: t.from })
        break
      }
      for (const sq of t.give) d.owner[sq] = t.to
      for (const sq of t.get) d.owner[sq] = t.from
      d.cash[t.from] += t.getCash - t.giveCash
      d.cash[t.to] += t.giveCash - t.getCash
      c.log.push({ t: 'tradeDone', with: t.from })
      break
    }
    case 'reject':
      c.log.push({ t: 'tradeNo', with: d.trade!.from })
      d.trade = null
      break
    case 'cancel':
      d.trade = null
      c.log.push({ t: 'tradeCancel' })
      break
    case 'payJail':
      pay(d, by, JAIL_FINE, taxPayee(d))
      d.jail[by] = -1
      c.log.push({ t: 'jailOut', how: 'pay' })
      break
    case 'jailCard': {
      const deck = d.jailCards[by].pop()!
      d.decks[deck].push(CARDS[deck].findIndex((k) => k.fx.k === 'jailFree'))
      d.jail[by] = -1
      c.log.push({ t: 'jailOut', how: 'card' })
      break
    }
    case 'endTurn':
      nextTurn(c)
      break
    case 'bankrupt': {
      const h = d.debts[0]
      goBankrupt(c, by, h && h.who === by ? h.to : 'bank')
      break
    }
  }

  settle(c)
  d.event = { by, dice, path: c.path, log: c.log }
  d.eventId = s.eventId + 1
  return d
}
