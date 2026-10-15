import { legalMovesAll, reduce, target } from './engine'
import { trackIndex } from './board'
import type { LudoAction, LudoState } from './types'

export { lcg } from '../domino/dev'

/** Pilihan bot sederhana: utamakan menangkap lawan, lalu masuk rumah, lalu acak (tes & demo). */
export function botAction(s: LudoState, rnd: () => number): LudoAction | null {
  if (s.phase === 'roll') return { type: 'roll' }
  if (s.phase !== 'move') return null
  const moves = legalMovesAll(s)
  if (!moves.length) return null
  const score = (m: { owner: number; piece: number }) => {
    const to = target(s, m.owner, m.piece, s.die!)!
    const t = trackIndex(s.opts.arms, s.arm[m.owner], to)
    const hits = t === null ? 0 : s.prog.some((ps, seat) => s.team[seat] !== s.team[m.owner] && ps.some((p) => trackIndex(s.opts.arms, s.arm[seat], p) === t))
    return (hits ? 10 : 0) + (s.prog[m.owner][m.piece] < 0 ? 4 : 0) + rnd() * 3
  }
  const best = moves.reduce((a, b) => (score(b) > score(a) ? b : a))
  return { type: 'move', owner: best.owner, piece: best.piece }
}

/** Satu langkah bot yang sah; null kalau game selesai. */
export function randomStep(s: LudoState, rnd: () => number): LudoState | null {
  const a = botAction(s, rnd)
  if (!a) return null
  const next = reduce(s, a, s.turn)
  return next === s ? null : next
}
