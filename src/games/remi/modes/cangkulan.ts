import type { Seat } from '../../types'
import { deal, highAce, removeIds, shuffled } from '../cards'
import type { CangkulanAction, CangkulanState, TrickPlay } from '../types'
import type { ModeEngine, Step } from './mode'

/** Kartu yang boleh dimainkan: ikut jenis pembuka; kalau memimpin, bebas. */
export function cangkulPlayable(m: CangkulanState, seat: Seat): string[] {
  const hand = m.hands[seat]
  if (m.turn !== seat) return []
  if (!m.leadSuit) return hand.map((c) => c.id)
  return hand.filter((c) => c.s === m.leadSuit).map((c) => c.id)
}

export const mustDig = (m: CangkulanState, seat: Seat) => m.turn === seat && !!m.leadSuit && cangkulPlayable(m, seat).length === 0

function trickWinner(plays: TrickPlay[], suit: string, fallback: Seat): Seat {
  let best: TrickPlay | null = null
  for (const p of plays) {
    if (p.by < 0 || p.card.s !== suit) continue
    if (!best || highAce(p.card.r) > highAce(best.card.r)) best = p
  }
  return best ? best.by : fallback
}

function advance(m: CangkulanState, n: number): Step<CangkulanState> {
  if (m.acted.length < n) {
    let t = m.turn
    for (let k = 1; k <= n; k++) {
      t = (m.turn + k) % n
      if (!m.acted.includes(t)) break
    }
    return { m: { ...m, turn: t, dug: 0 } }
  }
  const winner = trickWinner(m.trick, m.leadSuit!, m.acted[0])
  return {
    m: { ...m, trick: [], acted: [], leadSuit: null, turn: winner, dug: 0, lastTrick: { plays: m.trick, winner } },
    event: { t: 'trick', winner },
  }
}

export const cangkulan: ModeEngine<CangkulanState, CangkulanAction> = {
  deal({ n, rng, opts, round }) {
    const [deck, r] = shuffled(1, rng)
    const { hands, rest } = deal(deck, n, opts.cangkulHand)
    const [open, ...pile] = rest
    return {
      m: {
        kind: 'cangkulan',
        hands,
        deck: pile,
        trick: [{ by: -1, card: open }],
        acted: [],
        leadSuit: open.s as CangkulanState['leadSuit'],
        turn: (round - 1) % n,
        lastTrick: null,
        dug: 0,
      },
      rng: r,
    }
  },

  reduce(m, a, by) {
    if (by !== m.turn) return null
    const n = m.hands.length
    const hand = m.hands[by]
    if (a.t === 'play') {
      if (!cangkulPlayable(m, by).includes(a.id)) return null
      const card = hand.find((c) => c.id === a.id)!
      const hands = m.hands.map((h, i) => (i === by ? removeIds(h, [a.id]) : h))
      const next: CangkulanState = {
        ...m,
        hands,
        trick: [...m.trick, { by, card }],
        acted: [...m.acted, by],
        leadSuit: m.leadSuit ?? (card.s as CangkulanState['leadSuit']),
      }
      if (hands[by].length === 0) {
        return {
          m: { ...next, lastTrick: { plays: next.trick, winner: by } },
          event: { t: 'play', by, n: 1 },
          done: { deltas: hands.map((h) => -h.length), winners: [by] },
        }
      }
      const step = advance(next, n)
      return { ...step, event: step.event ?? { t: 'play', by, n: 1 } }
    }
    if (a.t === 'dig') {
      if (!mustDig(m, by) || m.deck.length === 0) return null
      const [top, ...deck] = m.deck
      return {
        m: { ...m, deck, hands: m.hands.map((h, i) => (i === by ? [...h, top] : h)), dug: m.dug + 1 },
        event: { t: 'dig', by, n: m.dug + 1 },
      }
    }
    if (a.t === 'pass') {
      if (!mustDig(m, by) || m.deck.length > 0) return null
      const step = advance({ ...m, acted: [...m.acted, by] }, n)
      return { ...step, event: step.event ?? { t: 'pass', by } }
    }
    return null
  },
}
