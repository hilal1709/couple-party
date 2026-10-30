import type { BotLevel, BotPolicy, Seat } from '../types'
import { BOARD, groupOf, ownable } from './board'
import { actorOf, canBuild, canMortgage, canSell, canUnmortgage, tradable } from './engine'
import type { MonopolyAction, MonopolyState } from './types'

const squares = Array.from({ length: 40 }, (_, i) => i)
const pick = <T,>(xs: T[], rnd: () => number): T | undefined => xs[Math.floor(rnd() * xs.length)]
const priceOf = (sq: number) => ownable(sq)?.price ?? 0

/** Petak ini melengkapi komplek milik `who`? */
const completes = (s: MonopolyState, who: Seat, sq: number) => {
  const g = groupOf(sq)
  return g.length > 1 && g.every((i) => i === sq || s.owner[i] === who)
}

const worth = (s: MonopolyState, who: Seat, sq: number) => priceOf(sq) * (completes(s, who, sq) ? 2 : 1)

/** Jawaban untuk tawaran yang masuk: untung-rugi dihitung dari sisi `by`. */
export function respond(s: MonopolyState, by: Seat, rnd: () => number, level: BotLevel = 2): MonopolyAction {
  const t = s.trade!
  if (level === 1) return { type: rnd() < 0.5 ? 'accept' : 'reject' }
  const gain = t.giveCash + t.give.reduce((v, sq) => v + worth(s, by, sq), 0)
  // susah: lawan yang jadi punya komplek dihitung sebagai kerugian
  const loss = t.getCash + t.get.reduce((v, sq) => v + (level === 3 ? worth(s, t.from, sq) : priceOf(sq)), 0)
  return { type: gain >= loss * (level === 3 ? 1.1 : 1) ? 'accept' : 'reject' }
}

/** Beli petak yang melengkapi komplek sendiri dari pemain lain. */
function proposal(s: MonopolyState, by: Seat, rnd: () => number): MonopolyAction | null {
  const wanted = squares.filter((sq) => {
    const o = s.owner[sq]
    return o !== null && o !== by && !s.bankrupt[o] && tradable(s, o, sq) && completes(s, by, sq)
  })
  const sq = pick(wanted, rnd)
  if (sq === undefined) return null
  // cukup mahal untuk diterima: pemilik melepas petak yang melengkapi komplek lawan
  const offer = Math.floor((priceOf(sq) * 2.4) / 10) * 10
  if (offer > s.cash[by] - 150) return null
  return { type: 'propose', trade: { to: s.owner[sq]!, give: [], get: [sq], giveCash: offer, getCash: 0 } }
}

/** Langkah kursi yang sedang harus bertindak. */
export function decide(s: MonopolyState, by: Seat, rnd: () => number, level: BotLevel = 2): MonopolyAction | null {
  const cash = s.cash[by]
  const mine = squares.filter((sq) => s.owner[sq] === by)

  switch (s.phase) {
    case 'buy': {
      const price = ownable(s.pos[by])!.price
      const want = level === 1 ? rnd() < 0.7 : level === 2 ? cash - price > 80 || rnd() < 0.3 : cash - price > 40 || completes(s, by, s.pos[by])
      return { type: want && cash >= price ? 'buy' : 'decline' }
    }
    case 'auction': {
      const au = s.auction!
      const next = au.bid + 10 + Math.floor(rnd() * 5) * 10
      const limit = priceOf(au.sq) * (level === 1 ? 0.7 : level === 2 ? 1.1 : completes(s, by, au.sq) ? 1.8 : 1.25)
      return next <= cash - 50 && next <= limit && rnd() < (level === 1 ? 0.5 : 0.85) ? { type: 'bid', amount: next } : { type: 'passBid' }
    }
    case 'debt': {
      const mort = mine.find((sq) => canMortgage(s, by, sq))
      if (level === 3 && mort !== undefined) return { type: 'mortgage', sq: mort }
      const sell = mine.find((sq) => canSell(s, by, sq))
      if (sell !== undefined) return { type: 'sell', sq: sell }
      if (mort !== undefined) return { type: 'mortgage', sq: mort }
      return { type: 'bankrupt' }
    }
    case 'roll':
    case 'done': {
      const reserve = [400, 150, 100][level - 1]
      const build = mine.filter((sq) => canBuild(s, by, sq) && cash - (BOARD[sq] as { house: number }).house > reserve)
      if (build.length && rnd() < [0.2, 0.6, 1][level - 1]) return { type: 'build', sq: pick(build, rnd)! }
      const un = mine.filter((sq) => canUnmortgage(s, by, sq) && cash > 500)
      if (un.length && rnd() < 0.3) return { type: 'unmortgage', sq: un[0] }
      if (s.phase === 'done') {
        const offer = s.opts.trade && !s.trade && rnd() < 0.15 ? proposal(s, by, rnd) : null
        return offer ?? { type: 'endTurn' }
      }
      if (s.jail[by] >= 0 && s.jailCards[by].length) return { type: 'jailCard' }
      if (s.jail[by] >= 0 && cash > 300 && rnd() < 0.5) return { type: 'payJail' }
      return { type: 'roll' }
    }
  }
  return null
}

export const monopolyBot: BotPolicy<MonopolyState, MonopolyAction> = ({ state: s, seat, level, rnd }) => {
  if (s.phase === 'end' || s.bankrupt[seat]) return null
  const answering = s.trade?.to === seat && (s.phase === 'roll' || s.phase === 'done' || s.phase === 'debt')
  if (answering) return { action: respond(s, seat, rnd, level), delay: 1800 + rnd() * 900 }
  if (actorOf(s) !== seat) return null
  // tawaran lama yang tidak dijawab sampai giliran berikutnya: tarik lagi
  if (s.trade?.from === seat && s.phase === 'roll') return { action: { type: 'cancel' }, delay: 600 }
  const action = decide(s, seat, rnd, level)
  return action && { action, delay: 900 + rnd() * 600 }
}
