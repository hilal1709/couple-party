import type { BotLevel } from '../../../types'
import type { BowlingMatch } from '../../types'
import { HEAD_Z, PIN_SPOTS, startX, type BowlThrow } from './sim'

/** meleset tiap tingkat, meter di depan pin */
const WOBBLE: Record<BotLevel, number> = { 1: 0.16, 2: 0.08, 3: 0.04 }
/** kantong pin: sedikit di samping pin depan */
const POCKET = 0.045

/** kira-kira normal, cukup untuk sebaran lemparan */
const noise = (rnd: () => number) => (rnd() + rnd() + rnd() - 1.5) / 1.5

/** Incar kantong kalau pin penuh, kalau tidak incar tengah pin yang tersisa. */
export function botThrow(m: BowlingMatch, level: BotLevel, rnd: () => number): BowlThrow {
  const left = PIN_SPOTS.filter((_, i) => m.standing[i])
  const full = left.length === 10
  const side = rnd() < 0.5 ? -1 : 1
  const target = full ? side * POCKET : left.reduce((a, p) => a + p[0], 0) / Math.max(1, left.length)
  const x = (rnd() - 0.5) * 0.5
  const aim = target + noise(rnd) * WOBBLE[level]
  return { x, dir: (aim - startX(x)) / HEAD_Z, speed: 6.5 + rnd() * 2.5, spin: 0 }
}
