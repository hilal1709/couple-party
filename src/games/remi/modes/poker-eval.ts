import { highAce } from '../cards'
import type { Card } from '../types'

export const HAND_NAMES = [
  'Kartu tinggi',
  'One pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
]

/** Kartu tertinggi straight dari kumpulan angka (As bisa rendah: A-2-3-4-5), 0 kalau tidak ada. */
function straightHigh(ranks: number[]): number {
  const set = new Set(ranks)
  if (set.has(14)) set.add(1)
  for (let hi = 14; hi >= 5; hi--) {
    let ok = true
    for (let k = 0; k < 5; k++) if (!set.has(hi - k)) ok = false
    if (ok) return hi
  }
  return 0
}

/**
 * Skor tangan terbaik dari 5–7 kartu: [kategori, ...pembanding], dibandingkan berurutan.
 * Kategori 0 = kartu tinggi … 8 = straight flush.
 */
export function evaluate(cards: Card[]): number[] {
  const ranks = cards.map((c) => highAce(c.r))
  const bySuit = new Map<string, number[]>()
  cards.forEach((c, i) => bySuit.set(c.s, [...(bySuit.get(c.s) ?? []), ranks[i]]))
  const flushRanks = [...bySuit.values()].find((r) => r.length >= 5)
  if (flushRanks) {
    const sf = straightHigh(flushRanks)
    if (sf) return [8, sf]
  }
  const counts = new Map<number, number>()
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1))
  // kelompok: jumlah terbanyak dulu, lalu angka tertinggi
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const kick = (exclude: number[], k: number) =>
    [...new Set(ranks)]
      .filter((r) => !exclude.includes(r))
      .sort((a, b) => b - a)
      .slice(0, k)
  if (groups[0][1] === 4) return [7, groups[0][0], ...kick([groups[0][0]], 1)]
  if (groups[0][1] === 3 && groups.length > 1 && groups[1][1] >= 2) return [6, groups[0][0], groups[1][0]]
  if (flushRanks) return [5, ...flushRanks.sort((a, b) => b - a).slice(0, 5)]
  const st = straightHigh(ranks)
  if (st) return [4, st]
  if (groups[0][1] === 3) return [3, groups[0][0], ...kick([groups[0][0]], 2)]
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return [2, groups[0][0], groups[1][0], ...kick([groups[0][0], groups[1][0]], 1)]
  if (groups[0][1] === 2) return [1, groups[0][0], ...kick([groups[0][0]], 3)]
  return [0, ...kick([], 5)]
}

export function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d) return d
  }
  return 0
}
