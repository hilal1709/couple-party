import { betAction, best, pickOne } from '../botKit'
import type { BotLevel, BotPolicy, Seat } from '../types'
import { highAce } from './cards'
import { bjTotal, MIN_BET } from './modes/blackjack'
import { beats, btValue, comboOf } from './modes/bigtwo'
import { awaitingOut } from './modes/bohong'
import { cangkulPlayable, mustDig } from './modes/cangkulan'
import { jokerTarget } from './modes/joker'
import { evaluate } from './modes/poker-eval'
import { minRaiseTo, toCall } from './modes/poker'
import { value41 } from './modes/remi41'
import { sevenPlayable } from './modes/seven'
import type {
  BigTwoAction,
  BigTwoState,
  BlackjackAction,
  BlackjackState,
  BohongAction,
  BohongState,
  CangkulanAction,
  CangkulanState,
  Card,
  JokerAction,
  JokerState,
  ModeAction,
  PokerAction,
  PokerState,
  Remi41Action,
  Remi41State,
  RemiAction,
  RemiState,
  SevenAction,
  SevenState,
} from './types'

type Mem = Record<string, unknown>
type Think = { level: BotLevel; rnd: () => number; mem: Mem }

function cangkulan(m: CangkulanState, seat: Seat, { level, rnd }: Think): CangkulanAction | null {
  if (m.turn !== seat) return null
  if (mustDig(m, seat)) return m.deck.length ? { t: 'dig' } : { t: 'pass' }
  const cards = m.hands[seat].filter((c) => cangkulPlayable(m, seat).includes(c.id))
  if (level === 1) return { t: 'play', id: pickOne(cards, rnd).id }
  const sameSuit = (c: Card) => m.hands[seat].filter((k) => k.s === c.s).length
  // memimpin: buang dari jenis terbanyak; mengikuti: kartu tinggi supaya merebut giliran memimpin
  const lead = !m.leadSuit
  const value = (c: Card) => (lead && level === 3 ? sameSuit(c) * 2 : 0) + highAce(c.r) * (lead ? 0.1 : 1)
  return { t: 'play', id: best(cards, value).id }
}

/** Semua kombinasi sah dari tangan; tangan paling banyak 13 kartu, jadi cukup dicoba satu per satu. */
function bigTwoPlays(m: BigTwoState, seat: Seat): Card[][] {
  const hand = m.hands[seat]
  const sets: Card[][] = []
  const pickFrom = (start: number, cur: Card[], size: number) => {
    if (cur.length === size) return void sets.push(cur)
    for (let i = start; i < hand.length; i++) pickFrom(i + 1, [...cur, hand[i]], size)
  }
  for (const size of m.table ? [m.table.combo.size] : [1, 2, 3, 5]) pickFrom(0, [], size)
  return sets.filter((cards) => {
    const combo = comboOf(cards)
    if (!combo || (m.mustInclude && !cards.some((c) => c.id === m.mustInclude))) return false
    return !m.table || beats(combo, m.table.combo)
  })
}

function bigTwo(m: BigTwoState, seat: Seat, { level, rnd }: Think): BigTwoAction | null {
  if (m.turn !== seat) return null
  const plays = bigTwoPlays(m, seat)
  const pass = m.table ? ({ t: 'pass' } as const) : null
  if (!plays.length) return pass
  const toIds = (cards: Card[]) => ({ t: 'play', ids: cards.map((c) => c.id) }) as const
  if (level === 1) return pass && rnd() < 0.25 ? pass : toIds(pickOne(plays, rnd))
  const top = (cards: Card[]) => Math.max(...cards.map(btValue))
  const danger = m.hands.some((h, i) => i !== seat && h.length <= 2)
  if (level === 3 && pass && !danger && top(plays[0]) >= 44 && plays.every((p) => top(p) >= 44)) return pass // simpan As & 2
  // memimpin: habiskan kartu sebanyak mungkin; selalu pakai yang paling rendah
  return toIds(best(plays, (p) => (m.table ? 0 : p.length * 100) - top(p)))
}

function remi41(m: Remi41State, seat: Seat, { level, rnd }: Think): Remi41Action | null {
  if (m.turn !== seat) return null
  const hand = m.hands[seat]
  /** nilai terbaik setelah membuang satu kartu, kartu `keep` tidak boleh dibuang */
  const after = (cards: Card[], keep?: string) => {
    const options = cards.filter((c) => c.id !== keep)
    return best(options, (c) => value41(cards.filter((k) => k !== c)).value)
  }
  if (m.step === 'draw') {
    const top = m.discard[m.discard.length - 1]
    if (!top) return { t: 'drawDeck' }
    if (level === 1) return { t: rnd() < 0.3 ? 'drawDiscard' : 'drawDeck' }
    const cards = [...hand, top]
    const worthIt = value41(cards.filter((c) => c !== after(cards, top.id))).value > value41(hand).value + (level === 3 ? 2 : 4)
    return { t: worthIt ? 'drawDiscard' : 'drawDeck' }
  }
  if (level === 1) return { t: 'discard', id: pickOne(hand.filter((c) => c.id !== m.took), rnd).id }
  return { t: 'discard', id: after(hand, m.took ?? undefined).id }
}

/** Kekuatan dua kartu sebelum flop, 0..1. */
function holePower([a, b]: Card[]): number {
  const [x, y] = [highAce(a.r), highAce(b.r)]
  if (x === y) return 0.6 + (x / 14) * 0.35
  return (x + y) / 40 + (a.s === b.s ? 0.06 : 0) + (Math.abs(x - y) === 1 ? 0.04 : 0)
}

const CATEGORY_POWER = [0.2, 0.5, 0.68, 0.78, 0.84, 0.88, 0.93, 0.97, 1]

function poker(m: PokerState, seat: Seat, { level, rnd }: Think): PokerAction | null {
  if (m.result || m.turn !== seat) return null
  const hole = m.hands[seat]
  const power = m.board.length ? CATEGORY_POWER[evaluate([...hole, ...m.board])[0]] : holePower(hole)
  const pot = m.committed.reduce((a, b) => a + b, 0)
  return betAction({ need: toCall(m, seat), stack: m.stack[seat], bet: m.bet[seat], minTo: minRaiseTo(m), pot }, power, level, rnd)
}

function joker(m: JokerState, seat: Seat, { rnd }: Think): JokerAction | null {
  if (m.turn !== seat) return null
  return { t: 'pick', i: Math.floor(rnd() * m.hands[jokerTarget(m, seat)].length) }
}

/** Yakin atau curiga jalan terakhir bohong? Hanya memakai jumlah kartu & kartu tangan sendiri. */
function suspicious(m: BohongState, seat: Seat, { level, rnd, mem }: Think): boolean {
  const last = m.last
  if (!last || last.by === seat) return false
  const key = `${last.by}:${m.pile.length}`
  if (mem.bohongSeen === key) return false // satu keputusan untuk tiap jalan
  mem.bohongSeen = key
  const total = m.hands.length >= 6 ? 8 : 4
  const mine = m.hands[seat].filter((c) => c.r === last.claim).length
  if (mine + last.cards.length > total) return level > 1
  const odds = level === 1 ? 0.05 : ((mine + last.cards.length) / total) * (level === 2 ? 0.3 : 0.45)
  return rnd() < odds
}

function bohong(m: BohongState, seat: Seat, think: Think): BohongAction | null {
  if (suspicious(m, seat, think)) return { t: 'call' }
  if (m.turn !== seat) return null
  if (awaitingOut(m)) return { t: 'accept' }
  const { level, rnd } = think
  const hand = m.hands[seat]
  const honest = hand.filter((c) => c.r === m.claim)
  if (honest.length) return { t: 'play', ids: (level === 1 ? honest.slice(0, 1) : honest.slice(0, 4)).map((c) => c.id) }
  const bluff = level === 3 && hand.length > 3 && rnd() < 0.3 ? 2 : 1
  const cards = [...hand].sort(() => rnd() - 0.5).slice(0, bluff)
  return { t: 'play', ids: cards.map((c) => c.id) }
}

function blackjack(m: BlackjackState, seat: Seat, { level, rnd }: Think): BlackjackAction | null {
  if (m.step === 'bet') {
    const stack = m.stack[seat]
    if (m.bets[seat] > 0 || m.done[seat] || stack <= 0) return null
    const raw = stack * [0.05 + rnd() * 0.3, 0.1, 0.08][level - 1]
    return { t: 'bet', amount: Math.min(stack, Math.max(MIN_BET, Math.floor(raw / 10) * 10)) }
  }
  if (m.step !== 'play' || m.turn !== seat || m.done[seat]) return null
  const hand = m.hands[seat]
  const { total, soft } = bjTotal(hand)
  if (level === 1) return { t: total < 15 ? 'hit' : 'stand' }
  if (level === 2) return { t: total < (soft ? 18 : 17) ? 'hit' : 'stand' }
  // strategi dasar: kartu bandar yang terbuka hanya m.dealer[0]
  const up = Math.min(10, highAce(m.dealer[0].r) === 14 ? 11 : m.dealer[0].r)
  const weak = up >= 2 && up <= 6
  if (hand.length === 2 && m.stack[seat] >= m.bets[seat] && !soft && (total === 11 || (total === 10 && up < 10))) return { t: 'double' }
  if (soft) return { t: total <= 17 || (total === 18 && up >= 9) ? 'hit' : 'stand' }
  if (total >= 17) return { t: 'stand' }
  if (total >= 13) return { t: weak ? 'stand' : 'hit' }
  if (total === 12) return { t: up >= 4 && up <= 6 ? 'stand' : 'hit' }
  return { t: 'hit' }
}

function seven(m: SevenState, seat: Seat, { level, rnd }: Think): SevenAction | null {
  if (m.turn !== seat) return null
  const hand = m.hands[seat]
  const ids = sevenPlayable(m, seat)
  // tidak bisa jalan: tutup kartu paling kecil supaya penaltinya ringan
  if (!ids.length) return { t: 'close', id: (level === 1 ? pickOne(hand, rnd) : best(hand, (c) => -c.r)).id }
  const cards = hand.filter((c) => ids.includes(c.id))
  if (level === 1) return { t: 'play', id: pickOne(cards, rnd).id }
  // utamakan kartu yang membuka jalan untuk kartu sendiri berikutnya
  const opens = (c: Card) => hand.filter((k) => k.s === c.s && (c.r <= 7 ? k.r < c.r : k.r > c.r)).length
  return { t: 'play', id: best(cards, (c) => (level === 3 ? opens(c) * 2 : 0) + rnd()).id }
}

function decide(m: RemiState['m'], seat: Seat, think: Think): ModeAction | null {
  switch (m.kind) {
    case 'cangkulan':
      return cangkulan(m, seat, think)
    case 'bigtwo':
      return bigTwo(m, seat, think)
    case 'remi41':
      return remi41(m, seat, think)
    case 'poker':
      return poker(m, seat, think)
    case 'joker':
      return joker(m, seat, think)
    case 'bohong':
      return bohong(m, seat, think)
    case 'blackjack':
      return blackjack(m, seat, think)
    case 'seven':
      return seven(m, seat, think)
  }
}

export const remiBot: BotPolicy<RemiState, RemiAction> = ({ state: s, seat, level, rnd, mem }) => {
  if (s.phase !== 'play') return null
  const action = decide(s.m, seat, { level, rnd, mem })
  if (!action) return null
  // Bohong: beri waktu manusia menekan "Bohong!" sebelum jalan berikutnya
  const delay = s.m.kind === 'bohong' ? (action.t === 'call' ? 1000 + rnd() * 900 : 2600 + rnd() * 900) : 1100 + rnd() * 800
  return { action, delay }
}
