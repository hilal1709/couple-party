import { botAction } from './bot'
import { reduce } from './engine'
import type { LudoState } from './types'

export { lcg } from '../domino/dev'
export { botAction }

/** Satu langkah bot yang sah; null kalau game selesai. */
export function randomStep(s: LudoState, rnd: () => number): LudoState | null {
  const a = botAction(s, rnd)
  if (!a) return null
  const next = reduce(s, a, s.turn)
  return next === s ? null : next
}
