import { deal, removeIds, shuffled } from '../cards'
import type { BigTwoAction, BigTwoState, Card, Combo, ComboKind } from '../types'
import type { ModeEngine } from './mode'

/** 3 terendah … K, As, 2 tertinggi */
export const btRank = (r: number) => (r + 10) % 13
const SUIT_V = { D: 0, C: 1, H: 2, S: 3, X: 0 } as const
/** nilai satu kartu: angka lalu jenis (♦ < ♣ < ♥ < ♠) */
export const btValue = (c: Card) => btRank(c.r) * 4 + SUIT_V[c.s]

const FIVE_ORDER: ComboKind[] = ['straight', 'flush', 'full', 'four', 'sflush']

export function comboOf(cards: Card[]): Combo | null {
  const n = cards.length
  const ranks = cards.map((c) => btRank(c.r))
  const top = Math.max(...cards.map(btValue))
  const same = ranks.every((r) => r === ranks[0])
  if (n === 1) return { kind: 'single', size: 1, key: top }
  if (n === 2) return same ? { kind: 'pair', size: 2, key: top } : null
  if (n === 3) return same ? { kind: 'triple', size: 3, key: ranks[0] } : null
  if (n !== 5) return null
  const counts = new Map<number, number>()
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1))
  const sorted = [...ranks].sort((a, b) => a - b)
  // kartu 2 tidak boleh ikut straight
  const straight = new Set(ranks).size === 5 && sorted[4] - sorted[0] === 4 && sorted[4] < 12
  const flush = cards.every((c) => c.s === cards[0].s)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1])
  let kind: ComboKind | null = null
  let sub = top
  if (straight && flush) kind = 'sflush'
  else if (groups[0][1] === 4) {
    kind = 'four'
    sub = groups[0][0]
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    kind = 'full'
    sub = groups[0][0]
  } else if (flush) kind = 'flush'
  else if (straight) kind = 'straight'
  if (!kind) return null
  return { kind, size: 5, key: FIVE_ORDER.indexOf(kind) * 1000 + sub }
}

export const beats = (a: Combo, b: Combo) => a.size === b.size && a.key > b.key

export function bigTwoPenalty(left: number) {
  return left * (left === 13 ? 3 : left >= 10 ? 2 : 1)
}

export const bigtwo: ModeEngine<BigTwoState, BigTwoAction> = {
  deal({ n, rng }) {
    const [deck, r] = shuffled(1, rng)
    const { hands } = deal(deck, n, 13)
    // pemegang kartu terendah (3♦ kalau ada) jalan duluan dan wajib memakainya
    let low: Card = hands[0][0]
    let turn = 0
    hands.forEach((h, i) =>
      h.forEach((c) => {
        if (btValue(c) < btValue(low)) {
          low = c
          turn = i
        }
      }),
    )
    return { m: { kind: 'bigtwo', hands, turn, table: null, passed: Array(n).fill(false), mustInclude: low.id }, rng: r }
  },

  reduce(m, a, by) {
    if (by !== m.turn) return null
    const n = m.hands.length
    if (a.t === 'play') {
      const ids = [...new Set(a.ids)]
      const cards = ids.map((id) => m.hands[by].find((c) => c.id === id))
      if (cards.some((c) => !c)) return null
      const combo = comboOf(cards as Card[])
      if (!combo) return null
      if (m.mustInclude && !ids.includes(m.mustInclude)) return null
      if (m.table && !beats(combo, m.table.combo)) return null
      const hands = m.hands.map((h, i) => (i === by ? removeIds(h, ids) : h))
      const next: BigTwoState = {
        ...m,
        hands,
        table: { by, cards: cards as Card[], combo },
        passed: Array(n).fill(false),
        mustInclude: null,
        turn: (by + 1) % n,
      }
      const event = combo.kind === 'four' || combo.kind === 'sflush' ? ({ t: 'bomb', by } as const) : ({ t: 'play', by, n: ids.length } as const)
      if (hands[by].length === 0) return { m: next, event, done: { deltas: hands.map((h) => -bigTwoPenalty(h.length)), winners: [by] } }
      return { m: next, event }
    }
    if (a.t === 'pass') {
      if (!m.table) return null
      const passed = m.passed.map((p, i) => p || i === by)
      for (let k = 1; k <= n; k++) {
        const s = (by + k) % n
        if (s === m.table.by) return { m: { ...m, passed: Array(n).fill(false), table: null, turn: s }, event: { t: 'pass', by } }
        if (!passed[s]) return { m: { ...m, passed, turn: s }, event: { t: 'pass', by } }
      }
      return null
    }
    return null
  },
}
