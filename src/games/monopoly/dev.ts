import { decide, respond } from './bot'
import { actorOf, reduce } from './engine'
import type { MonopolyAction, MonopolyState } from './types'

export { lcg } from '../domino/dev'

/** Pilihan bot sederhana untuk kursi yang sedang harus bertindak (tes & demo). */
export function botAction(s: MonopolyState, rnd: () => number): { by: number; a: MonopolyAction } | null {
  if (s.trade && rnd() < 0.6) return { by: s.trade.to, a: respond(s, s.trade.to, rnd, 1) }
  const by = actorOf(s)
  if (by === null) return null
  const a = decide(s, by, rnd)
  return a && { by, a }
}

/** Satu langkah bot yang sah; null kalau game selesai atau macet. */
export function randomStep(s: MonopolyState, rnd: () => number): MonopolyState | null {
  for (let tries = 0; tries < 6; tries++) {
    const b = botAction(s, rnd)
    if (!b) return null
    const next = reduce(s, b.a, b.by)
    if (next !== s) return next
  }
  return null
}
