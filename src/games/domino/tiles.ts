import { shuffle } from '../rng'
import type { Seat } from '../types'
import type { Tile } from './types'

/** 28 kartu domino balak enam. */
export function makeSet(): Tile[] {
  const out: Tile[] = []
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) out.push({ id: `d${a}${b}`, a, b })
  return out
}

export const shuffledSet = (rng: number) => shuffle(makeSet(), rng)

export const pips = (t: Tile) => t.a + t.b
export const isDouble = (t: Tile) => t.a === t.b
export const handPips = (h: Tile[]) => h.reduce((s, t) => s + pips(t), 0)
export const tileLabel = (t: Tile) => (isDouble(t) ? `balak ${t.a}` : `${t.a}-${t.b}`)

/** Bagi `per` kartu ke tiap pemain (bergantian). */
export function dealTiles(set: Tile[], players: number, per: number): { hands: Tile[][]; rest: Tile[] } {
  const hands: Tile[][] = Array.from({ length: players }, () => [])
  let i = 0
  for (; i < per * players && i < set.length; i++) hands[i % players].push(set[i])
  return { hands, rest: set.slice(i) }
}

/** Sortir tangan dari angka kecil ke besar supaya gampang dicari. */
export const sortTiles = (h: Tile[]) => [...h].sort((x, y) => x.a - y.a || x.b - y.b)

export function nextWhere(seat: Seat, n: number, ok: (s: Seat) => boolean): Seat {
  for (let k = 1; k <= n; k++) {
    const s = (seat + k) % n
    if (ok(s)) return s
  }
  return seat
}
