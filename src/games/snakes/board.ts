import { nextRand, shuffle } from '../rng'
import { GOAL, type Board, type Effect, type SnakesOptions, type Tile } from './types'

const SNAKES = 6
const LADDERS = 6
const EFFECTS: Effect[] = ['fwd3', 'back3', 'again', 'skip', 'swap', 'teleport']

/** Bilangan bulat acak di [lo, hi]. */
function int(seed: number, lo: number, hi: number): [number, number] {
  const [r, s] = nextRand(seed)
  return [lo + Math.floor(r * (hi - lo + 1)), s]
}

/**
 * Papan ber-seed. Kotak 1 & 100 selalu polos, tiap kotak paling banyak dipakai satu
 * ujung ular/tangga, dan kotak spesial tidak pernah menempel di ujung ular/tangga,
 * jadi tidak ada rantai yang berputar.
 */
export function makeBoard(opts: SnakesOptions, seed: number): [Board, number] {
  let s = seed
  const used = new Set<number>([1, GOAL])
  const jumps: Record<number, number> = {}

  const place = (count: number, pick: (seed: number) => [number, number, number]) => {
    let placed = 0
    for (let tries = 0; placed < count && tries < 500; tries++) {
      const [from, to, ns] = pick(s)
      s = ns
      if (used.has(from) || used.has(to) || from === to) continue
      // tidak boleh di baris yang sama: ular/tangga harus pindah baris
      if (Math.floor((from - 1) / 10) === Math.floor((to - 1) / 10)) continue
      used.add(from).add(to)
      jumps[from] = to
      placed++
    }
  }

  place(SNAKES, (seed) => {
    const [head, s1] = int(seed, 21, 99)
    const [drop, s2] = int(s1, 10, 32)
    return [head, Math.max(2, head - drop), s2]
  })
  place(LADDERS, (seed) => {
    const [foot, s1] = int(seed, 2, 80)
    const [rise, s2] = int(s1, 10, 32)
    return [foot, Math.min(99, foot + rise), s2]
  })

  const free = Array.from({ length: GOAL - 2 }, (_, i) => i + 2).filter((n) => !used.has(n))
  const [spots, s3] = shuffle(free, s)
  s = s3

  const wanted: Tile[] = []
  if (opts.challenges) wanted.push(...Array.from({ length: 9 }, (): Tile => ({ kind: 'challenge' })))
  if (opts.quiz) wanted.push(...Array.from({ length: 7 }, (): Tile => ({ kind: 'quiz' })))
  if (opts.items) wanted.push(...Array.from({ length: 7 }, (): Tile => ({ kind: 'item' })))
  if (opts.effects) {
    // tiap efek muncul minimal sekali, sisanya acak
    for (let i = 0; i < 9; i++) {
      let fx = EFFECTS[i % EFFECTS.length]
      if (i >= EFFECTS.length) {
        const [k, ns] = int(s, 0, EFFECTS.length - 1)
        s = ns
        fx = EFFECTS[k]
      }
      wanted.push({ kind: 'fx', fx })
    }
  }

  const tiles: Record<number, Tile> = {}
  wanted.forEach((t, i) => {
    if (spots[i] !== undefined) tiles[spots[i]] = t
  })
  return [{ jumps, tiles }, s]
}

/** Koordinat kolom/baris (0 = kiri/bawah) untuk kotak 1..100, zig-zag seperti papan asli. */
export function cellOf(n: number): { col: number; row: number } {
  const i = Math.max(1, Math.min(GOAL, n)) - 1
  const row = Math.floor(i / 10)
  const k = i % 10
  return { row, col: row % 2 === 0 ? k : 9 - k }
}
