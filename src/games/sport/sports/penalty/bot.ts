import type { BotLevel, BotMove, Seat } from '../../../types'
import type { Dive, PenaltyMatch, SportAction } from '../../types'

/** meleset dari bidikan tiap tingkat */
const WOBBLE: Record<BotLevel, number> = { 1: 0.32, 2: 0.2, 3: 0.1 }
const DIVES: Dive[] = ['L', 'R', 'L', 'R', 'C']

/** Keduanya memilih tanpa melihat pilihan lawan: bot hanya membaca giliran. */
export function penaltyBot(m: PenaltyMatch, seat: Seat, level: BotLevel, rnd: () => number): BotMove<SportAction> | null {
  if (m.phase !== 'set') return null
  const delay = 900 + rnd() * 1500
  if (m.taker === seat) {
    if (m.kick) return null
    const w = WOBBLE[level]
    const x = (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.35) + (rnd() - 0.5) * w
    return { action: { type: 'kick', id: m.shotId, x, y: 0.2 + rnd() * 0.55 + (rnd() - 0.5) * w, power: 0.5 + rnd() * 0.5 }, delay }
  }
  if (m.dive) return null
  return { action: { type: 'dive', id: m.shotId, dir: DIVES[Math.floor(rnd() * DIVES.length)] }, delay }
}
