import type { Seat } from '../../types'
import { deal, nextWhere, removeIds, shuffled } from '../cards'
import type { Card, SevenAction, SevenState, Suit } from '../types'
import type { ModeEngine } from './mode'

export const FIRST = 'H7'

export function sevenPlayable(m: SevenState, seat: Seat): string[] {
  const hand = m.hands[seat]
  const opened = Object.values(m.rows).some(Boolean)
  if (!opened) return hand.some((c) => c.id === FIRST) ? [FIRST] : []
  return hand
    .filter((c) => {
      const row = m.rows[c.s as Suit]
      return row ? c.r === row.lo - 1 || c.r === row.hi + 1 : c.r === 7
    })
    .map((c) => c.id)
}

export const sevenPenalty = (closed: Card[]) => closed.reduce((a, c) => a + c.r, 0)

export const seven: ModeEngine<SevenState, SevenAction> = {
  deal({ n, rng }) {
    const [deck, r] = shuffled(1, rng)
    const { hands } = deal(deck, n, Infinity)
    const turn = hands.findIndex((h) => h.some((c) => c.id === FIRST))
    return {
      m: { kind: 'seven', hands, rows: { S: null, H: null, C: null, D: null }, closed: hands.map(() => []), turn, last: null },
      rng: r,
    }
  },

  reduce(m, a, by) {
    if (by !== m.turn) return null
    const card = m.hands[by].find((c) => c.id === a.id)
    if (!card) return null
    const playable = sevenPlayable(m, by)
    let next: SevenState
    if (a.t === 'play') {
      if (!playable.includes(a.id)) return null
      const s = card.s as Suit
      const row = m.rows[s]
      next = {
        ...m,
        rows: { ...m.rows, [s]: row ? { lo: Math.min(row.lo, card.r), hi: Math.max(row.hi, card.r) } : { lo: 7, hi: 7 } },
        last: { by, card },
      }
    } else if (a.t === 'close') {
      if (playable.length) return null
      next = { ...m, closed: m.closed.map((c, i) => (i === by ? [...c, card] : c)), last: { by, card: null } }
    } else return null
    const hands = m.hands.map((h, i) => (i === by ? removeIds(h, [a.id]) : h))
    next = { ...next, hands, turn: nextWhere(by, hands.length, (s) => hands[s].length > 0) }
    const event = a.t === 'play' ? ({ t: 'play', by, n: 1 } as const) : ({ t: 'closeCard', by } as const)
    if (hands.every((h) => h.length === 0)) {
      const pen = next.closed.map(sevenPenalty)
      const low = Math.min(...pen)
      return { m: next, event, done: { deltas: pen.map((p) => -p), winners: pen.map((p, i) => (p === low ? i : -1)).filter((i) => i >= 0) } }
    }
    return { m: next, event }
  },
}
