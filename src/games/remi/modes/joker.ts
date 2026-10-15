import { shuffle } from '../../rng'
import type { Seat } from '../../types'
import { deal, nextWhere, shuffled } from '../cards'
import type { Card, JokerAction, JokerState } from '../types'
import type { ModeEngine } from './mode'

/** poin minus untuk yang terakhir memegang Joker */
export const JOKER_PENALTY = 5

/** Buang semua pasangan angka dari tangan (Joker tidak punya pasangan). */
export function dropPairs(hand: Card[]): Card[] {
  const out: Card[] = []
  const open = new Map<number, Card>()
  for (const c of hand) {
    if (c.s === 'X') {
      out.push(c)
      continue
    }
    const mate = open.get(c.r)
    if (mate) open.delete(c.r)
    else open.set(c.r, c)
  }
  return [...out, ...open.values()].sort((a, b) => hand.indexOf(a) - hand.indexOf(b))
}

/** Kursi yang kartunya diambil oleh `seat`: pemain berikutnya yang masih pegang kartu. */
export const jokerTarget = (m: JokerState, seat: Seat) => nextWhere(seat, m.hands.length, (s) => s !== seat && m.hands[s].length > 0)

export const joker: ModeEngine<JokerState, JokerAction> = {
  deal({ n, rng, round }) {
    const [deck, r] = shuffled(1, rng, true)
    const start = (round - 1) % n
    // bagi mulai dari pemain pertama ronde ini
    const raw = deal(deck, n, Infinity).hands
    const hands = raw.map((_, i) => dropPairs(raw[(i - start + n) % n]))
    const finished = hands.map((h, i) => (h.length ? -1 : i)).filter((i) => i >= 0)
    const turn = hands[start].length ? start : nextWhere(start, n, (s) => hands[s].length > 0)
    return { m: { kind: 'joker', hands, turn, finished, last: null }, rng: r }
  },

  reduce(m, a, by, rng) {
    const n = m.hands.length
    if (a.t === 'shuffle') {
      if (m.hands[by].length < 2) return null
      const [hand, r] = shuffle(m.hands[by], rng)
      return { m: { ...m, hands: m.hands.map((h, i) => (i === by ? hand : h)) }, rng: r, event: { t: 'shuffle', by } }
    }
    if (a.t !== 'pick' || by !== m.turn) return null
    const from = jokerTarget(m, by)
    const card = m.hands[from][a.i]
    if (from === by || !card) return null
    const victim = m.hands[from].filter((_, i) => i !== a.i)
    const mate = card.s === 'X' ? undefined : m.hands[by].find((c) => c.r === card.r && c.s !== 'X')
    const mine = mate ? m.hands[by].filter((c) => c !== mate) : [...m.hands[by], card]
    const hands = m.hands.map((h, i) => (i === by ? mine : i === from ? victim : h))
    const finished = [...m.finished]
    for (const s of [from, by]) if (!hands[s].length && !finished.includes(s)) finished.push(s)
    const last = { by, from, paired: mate ? [mate, card] : null }
    const left = hands.map((h, i) => (h.length ? i : -1)).filter((i) => i >= 0)
    const event = { t: 'pick', by, from, paired: !!mate } as const
    if (left.length <= 1) {
      const loser = left[0] ?? by
      return {
        m: { ...m, hands, finished, last, turn: loser },
        event,
        done: { deltas: hands.map((_, i) => (i === loser ? -JOKER_PENALTY : 0)), winners: hands.map((_, i) => i).filter((i) => i !== loser) },
      }
    }
    const turn = hands[from].length ? from : nextWhere(from, n, (s) => hands[s].length > 0)
    return { m: { ...m, hands, finished, last, turn }, event }
  },
}
