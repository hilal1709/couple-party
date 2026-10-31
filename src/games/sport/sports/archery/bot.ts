import type { BotLevel } from '../../../types'
import type { ArcheryMatch } from '../../types'
import { windDrift, type ArrowAim } from './sim'

const WOBBLE: Record<BotLevel, number> = { 1: 0.32, 2: 0.17, 3: 0.08 }
/** bot gampang kurang pandai membaca angin */
const WIND_READ: Record<BotLevel, number> = { 1: 0.4, 2: 0.8, 3: 1 }

const noise = (rnd: () => number) => (rnd() + rnd() + rnd() - 1.5) / 1.5

export function botShot(m: ArcheryMatch, level: BotLevel, rnd: () => number): { aim: ArrowAim; draw: number } {
  const draw = 1
  return { aim: { x: -windDrift(m.wind, draw) * WIND_READ[level] + noise(rnd) * WOBBLE[level], y: noise(rnd) * WOBBLE[level] }, draw }
}
