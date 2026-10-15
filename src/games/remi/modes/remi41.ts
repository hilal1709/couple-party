import { deal, removeIds, shuffled, SUITS } from '../cards'
import type { Card, Remi41Action, Remi41State, Suit } from '../types'
import type { ModeEngine } from './mode'

/** As = 11, J/Q/K = 10, lainnya sesuai angka */
export const pts41 = (c: Card) => (c.r === 1 ? 11 : c.r >= 11 ? 10 : c.r)

/** Nilai tangan: jumlah jenis terbanyak dikurangi kartu jenis lain. */
export function value41(hand: Card[]): { value: number; suit: Suit } {
  let best = { value: -Infinity, suit: 'S' as Suit }
  const total = hand.reduce((a, c) => a + pts41(c), 0)
  for (const s of SUITS) {
    const own = hand.filter((c) => c.s === s).reduce((a, c) => a + pts41(c), 0)
    const v = own - (total - own)
    if (v > best.value) best = { value: v, suit: s }
  }
  return best
}

export const remi41: ModeEngine<Remi41State, Remi41Action> = {
  deal({ n, rng, round }) {
    const [deck, r] = shuffled(1, rng)
    const { hands, rest } = deal(deck, n, 4)
    return { m: { kind: 'remi41', hands, deck: rest, discard: [], turn: (round - 1) % n, step: 'draw', took: null, closer: null }, rng: r }
  },

  reduce(m, a, by) {
    if (by !== m.turn) return null
    const n = m.hands.length
    const give = (c: Card) => m.hands.map((h, i) => (i === by ? [...h, c] : h))
    if (a.t === 'drawDeck') {
      if (m.step !== 'draw' || !m.deck.length) return null
      const [top, ...deck] = m.deck
      return { m: { ...m, deck, hands: give(top), step: 'discard', took: null }, event: { t: 'draw', by, from: 'deck' } }
    }
    if (a.t === 'drawDiscard') {
      if (m.step !== 'draw' || !m.discard.length) return null
      const top = m.discard[m.discard.length - 1]
      return { m: { ...m, discard: m.discard.slice(0, -1), hands: give(top), step: 'discard', took: top.id }, event: { t: 'draw', by, from: 'discard' } }
    }
    if (a.t === 'discard') {
      const card = m.hands[by].find((c) => c.id === a.id)
      if (m.step !== 'discard' || !card || a.id === m.took) return null
      const hands = m.hands.map((h, i) => (i === by ? removeIds(h, [a.id]) : h))
      const next: Remi41State = { ...m, hands, discard: [...m.discard, card], step: 'draw', took: null, turn: (by + 1) % n }
      const values = hands.map((h) => value41(h).value)
      if (values[by] === 41) {
        return { m: { ...next, closer: by, turn: by }, event: { t: 'close41', by }, done: { deltas: values, winners: [by] } }
      }
      if (next.deck.length === 0) {
        const top = Math.max(...values)
        return { m: next, event: { t: 'discard', by }, done: { deltas: values, winners: values.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0) } }
      }
      return { m: next, event: { t: 'discard', by } }
    }
    return null
  },
}
