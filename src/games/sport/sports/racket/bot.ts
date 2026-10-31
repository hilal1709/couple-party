import type { BotLevel, BotMove, Seat } from '../../../types'
import type { RacketMatch, ShotKind, SportAction } from '../../types'

const REACH: Record<BotLevel, number> = { 1: 0.72, 2: 0.86, 3: 0.95 }
/** seberapa jauh dari tengah jendela pukul */
const SLOPPY: Record<BotLevel, number> = { 1: 0.7, 2: 0.45, 3: 0.2 }

export function racketBot(m: RacketMatch, seat: Seat, level: BotLevel, rnd: () => number, mem: Record<string, unknown>): BotMove<SportAction> | null {
  const aim = (rnd() - 0.5) * 1.7
  if (m.phase === 'serve' && m.server === seat) return { action: { type: 'hit', id: m.phaseId, x: aim, shot: 'drive', power: 0.6, err: 0 }, delay: 900 + rnd() * 700 }
  const b = m.ball
  if (m.phase !== 'rally' || !b || b.by === seat || mem.seen === b.id) return null
  mem.seen = b.id
  // bola keluar dibiarkan; bola cepat & ke pinggir lebih sering lolos
  if (b.out) return null
  const chance = REACH[level] - m.hits * 0.008 - Math.abs(b.x) * 0.08 - (b.kind === 'smash' ? 0.3 : 0)
  if (rnd() > chance) return null
  const shot: ShotKind = b.kind === 'lob' && rnd() < 0.6 ? 'smash' : rnd() < 0.15 ? 'lob' : 'drive'
  const err = (rnd() - 0.5) * 2 * SLOPPY[level]
  return { action: { type: 'hit', id: b.id, x: aim, shot, power: 0.4 + rnd() * 0.5, err }, delay: b.ms }
}
