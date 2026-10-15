import { BOARD, ownable } from './board'
import { actorOf, canBuild, canMortgage, canSell, canUnmortgage, reduce, tradable } from './engine'
import type { MonopolyAction, MonopolyState } from './types'

export { lcg } from '../domino/dev'

const squares = Array.from({ length: 40 }, (_, i) => i)
const pick = <T,>(xs: T[], rnd: () => number): T | undefined => xs[Math.floor(rnd() * xs.length)]

/** Pilihan bot sederhana untuk kursi yang sedang harus bertindak (tes & demo). */
export function botAction(s: MonopolyState, rnd: () => number): { by: number; a: MonopolyAction } | null {
  if (s.trade && rnd() < 0.6) return { by: s.trade.to, a: { type: rnd() < 0.5 ? 'accept' : 'reject' } }
  const by = actorOf(s)
  if (by === null) return null
  const cash = s.cash[by]
  const mine = squares.filter((sq) => s.owner[sq] === by)

  switch (s.phase) {
    case 'buy': {
      const price = ownable(s.pos[by])!.price
      return { by, a: { type: cash - price > 80 || (cash >= price && rnd() < 0.3) ? 'buy' : 'decline' } }
    }
    case 'auction': {
      const au = s.auction!
      const next = au.bid + 10 + Math.floor(rnd() * 5) * 10
      const worth = ownable(au.sq)!.price * 1.2
      return { by, a: next <= cash - 50 && next <= worth && rnd() < 0.7 ? { type: 'bid', amount: next } : { type: 'passBid' } }
    }
    case 'debt': {
      const sell = mine.find((sq) => canSell(s, by, sq))
      if (sell !== undefined) return { by, a: { type: 'sell', sq: sell } }
      const mort = mine.find((sq) => canMortgage(s, by, sq))
      if (mort !== undefined) return { by, a: { type: 'mortgage', sq: mort } }
      return { by, a: { type: 'bankrupt' } }
    }
    case 'roll':
    case 'done': {
      const build = mine.filter((sq) => canBuild(s, by, sq) && cash - (BOARD[sq] as { house: number }).house > 150)
      if (build.length && rnd() < 0.6) return { by, a: { type: 'build', sq: pick(build, rnd)! } }
      const un = mine.filter((sq) => canUnmortgage(s, by, sq) && cash > 500)
      if (un.length && rnd() < 0.3) return { by, a: { type: 'unmortgage', sq: un[0] } }
      if (s.opts.trade && !s.trade && rnd() < 0.04) {
        const to = pick(
          s.pos.map((_, i) => i).filter((i) => i !== by && !s.bankrupt[i]),
          rnd,
        )
        const theirs = squares.filter((sq) => to !== undefined && tradable(s, to, sq))
        const give = mine.filter((sq) => tradable(s, by, sq))
        if (to !== undefined && (theirs.length || give.length)) {
          const t = { to, give: give.slice(0, 1), get: theirs.slice(0, 1), giveCash: Math.min(cash, 50), getCash: 0 }
          return { by, a: { type: 'propose', trade: t } }
        }
      }
      if (s.phase === 'done') return { by, a: { type: 'endTurn' } }
      if (s.jail[by] >= 0 && s.jailCards[by].length) return { by, a: { type: 'jailCard' } }
      if (s.jail[by] >= 0 && cash > 300 && rnd() < 0.5) return { by, a: { type: 'payJail' } }
      return { by, a: { type: 'roll' } }
    }
  }
  return null
}

/** Satu langkah bot yang sah; null kalau game selesai atau macet. */
export function randomStep(s: MonopolyState, rnd: () => number): MonopolyState | null {
  for (let tries = 0; tries < 6; tries++) {
    const b = botAction(s, rnd)
    if (!b) return null
    const next = reduce(s, b.a, b.by)
    if (next !== s) return next
  }
  return null
}
