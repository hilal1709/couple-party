import { reduce } from './engine'
import { minRaiseTo } from './modes/qiuqiu'
import type { DominoAction, DominoState, ModeState } from './types'

/** RNG kecil untuk simulasi acak yang bisa diulang (tes & demo). */
export function lcg(seed: number) {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

/** Kandidat aksi kasar; yang tidak sah ditolak reducer. */
export function candidates(m: ModeState, seat: number, rnd: () => number): DominoAction[] {
  if (m.kind === 'chain') {
    const ids = m.hands[seat].map((t) => t.id)
    return [...ids.flatMap((id) => [{ t: 'play', id, side: 'L' } as const, { t: 'play', id, side: 'R' } as const]), { t: 'draw' }, { t: 'pass' }]
  }
  return [
    { t: 'check' },
    { t: 'call' },
    { t: 'raise', to: minRaiseTo(m) },
    ...(rnd() < 0.1 ? [{ t: 'allin' } as const] : []),
    ...(rnd() < 0.15 ? [{ t: 'fold' } as const] : []),
  ]
}

/** Satu langkah acak yang sah (atau `next` di akhir ronde); null kalau macet. */
export function randomStep(s: DominoState, rnd: () => number): DominoState | null {
  if (s.phase === 'roundEnd') return reduce(s, { t: 'next' }, 0)
  if (s.phase === 'end') return null
  const n = s.scores.length
  const order = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5)
  for (const seat of order) {
    for (const a of candidates(s.m, seat, rnd).sort(() => rnd() - 0.5)) {
      const next = reduce(s, a, seat)
      if (next !== s) return next
    }
  }
  return null
}
