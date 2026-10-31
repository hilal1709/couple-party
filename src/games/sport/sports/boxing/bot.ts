import type { BotLevel, BotMove, Seat } from '../../../types'
import type { BoxingMatch, BoxOutcome, SportAction } from '../../types'
import { IMPACT_MS } from './engine'

/** peluang tangkis, hindar; sisanya kena */
const DEFENSE: Record<BotLevel, [number, number]> = { 1: [0.15, 0.05], 2: [0.3, 0.15], 3: [0.4, 0.3] }
const PUNCH_CHANCE: Record<BotLevel, number> = { 1: 0.45, 2: 0.6, 3: 0.75 }

/**
 * Tiap keputusan pendek (kurang dari sedetik) karena driver bot hanya memegang satu aksi:
 * di antara pukulan bot mengganti sikap, supaya tetap bisa bereaksi saat dipukul.
 */
export function boxingBot(m: BoxingMatch, seat: Seat, level: BotLevel, rnd: () => number): BotMove<SportAction> | null {
  if (m.phase !== 'fight') return null
  const incoming = m.attacks.find((a) => a.by !== seat)
  if (incoming) {
    const [guard, dodge] = DEFENSE[level]
    const r = rnd()
    const outcome: BoxOutcome = r < guard ? 'block' : r < guard + dodge ? 'dodge' : 'hit'
    return { action: { type: 'resolve', id: incoming.id, outcome }, delay: IMPACT_MS }
  }
  if (m.stance[seat] === 'guard') return { action: { type: 'stance', stance: 'none' }, delay: 300 + rnd() * 300 }
  if (!m.attacks.some((a) => a.by === seat) && rnd() < PUNCH_CHANCE[level]) {
    return { action: { type: 'punch', hand: rnd() < 0.5 ? 'L' : 'R', power: 0.2 + rnd() * 0.6 }, delay: 500 + rnd() * 400 }
  }
  return { action: { type: 'stance', stance: 'guard' }, delay: 350 + rnd() * 450 }
}
