import { nextRand } from '../rng'
import type { Look } from './types'

export const SKINS = ['#ffdcc2', '#f6c9a4', '#e0a878', '#c68652', '#8d5a33', '#5c3a21']
export const HAIRS = ['#121212', '#4a2c17', '#8a5a2b', '#e3b23c', '#ff37a6', '#43b929', '#3a6fe0', '#f4f1ea']
export const SHIRTS = ['#ff37a6', '#5cf64a', '#3a6fe0', '#ffcc1f', '#ff6b35', '#8a4fff', '#fff4fa', '#121212']
export const PANTS = ['#21252e', '#2f4c8c', '#7a5230', '#fff4fa', '#ff37a6', '#43b929']
export const HAIR_STYLES = ['Rapi', 'Jabrik', 'Bob', 'Kuncir']
export const ACCESSORIES = ['Polos', 'Topi', 'Kacamata', 'Bando']

const pick = (seed: number, n: number): [number, number] => {
  const [r, next] = nextRand(seed)
  return [Math.floor(r * n), next]
}

export function randomLook(seed: number): [Look, number] {
  let s = seed
  const take = (n: number) => {
    const [v, next] = pick(s, n)
    s = next
    return v
  }
  const look = { skin: take(SKINS.length), hair: take(HAIRS.length), style: take(HAIR_STYLES.length), shirt: take(SHIRTS.length), pants: take(PANTS.length), acc: take(ACCESSORIES.length) }
  return [look, s]
}

/** Buang nilai di luar daftar: `look` datang dari HP lain. */
export function cleanLook(l: Look): Look {
  const fit = (v: number, n: number) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0)
  return { skin: fit(l.skin, SKINS.length), hair: fit(l.hair, HAIRS.length), style: fit(l.style, HAIR_STYLES.length), shirt: fit(l.shirt, SHIRTS.length), pants: fit(l.pants, PANTS.length), acc: fit(l.acc, ACCESSORIES.length) }
}
