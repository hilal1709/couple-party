import { deal, nextWhere, removeIds, shuffled } from '../cards'
import type { BohongAction, BohongState } from '../types'
import type { ModeEngine, Outcome } from './mode'

const finish = (m: BohongState, winner: number): Outcome => ({
  deltas: m.hands.map((h) => -h.length),
  winners: [winner],
})

/** Pemain terakhir sudah habis kartu dan menunggu: dituduh atau diterima. */
export const awaitingOut = (m: BohongState) => !!m.last && m.hands[m.last.by].length === 0

export const bohong: ModeEngine<BohongState, BohongAction> = {
  deal({ n, rng, round }) {
    const [deck, r] = shuffled(n >= 6 ? 2 : 1, rng)
    const start = (round - 1) % n
    const raw = deal(deck, n, Infinity).hands
    const hands = raw.map((_, i) => raw[(i - start + n) % n])
    return { m: { kind: 'bohong', hands, pile: [], claim: 1, turn: start, last: null, reveal: null }, rng: r }
  },

  reduce(m, a, by) {
    const n = m.hands.length
    if (a.t === 'call') {
      const last = m.last
      if (!last || last.by === by) return null
      const lied = last.cards.some((c) => c.r !== last.claim)
      const taker = lied ? last.by : by
      const hands = m.hands.map((h, i) => (i === taker ? [...h, ...m.pile] : h))
      const next: BohongState = {
        ...m,
        hands,
        pile: [],
        last: null,
        reveal: { caller: by, by: last.by, cards: last.cards, claim: last.claim, lied, taker },
      }
      const event = { t: 'call', by, lied } as const
      if (!lied && hands[last.by].length === 0) return { m: next, event, done: finish(next, last.by) }
      return { m: next, event }
    }
    if (by !== m.turn) return null
    if (a.t === 'accept') {
      if (!awaitingOut(m)) return null
      return { m, event: { t: 'pass', by }, done: finish(m, m.last!.by) }
    }
    if (a.t === 'play') {
      if (awaitingOut(m)) return null
      const ids = [...new Set(a.ids)]
      const cards = ids.map((id) => m.hands[by].find((c) => c.id === id))
      if (ids.length < 1 || ids.length > 4 || cards.some((c) => !c)) return null
      const hands = m.hands.map((h, i) => (i === by ? removeIds(h, ids) : h))
      return {
        m: {
          ...m,
          hands,
          pile: [...m.pile, ...(cards as BohongState['pile'])],
          last: { by, cards: cards as BohongState['pile'], claim: m.claim },
          claim: (m.claim % 13) + 1,
          turn: nextWhere(by, n, (s) => hands[s].length > 0),
          reveal: null,
        },
        event: { t: 'play', by, n: ids.length },
      }
    }
    return null
  },
}
