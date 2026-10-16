import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import type { BomState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }
export type FxName = 'bom-boom' | 'bom-pass' | 'bom-cancel' | 'bom-power'
export type FxCue = { anim: FxName; size: number; delay?: number }

/**
 * Suara & efek untuk perubahan `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama.
 */
export function cuesFor(prev: BomState | null, next: BomState, seat: Seat): { sounds: SoundCue[]; fx: FxCue[] } {
  const sounds: SoundCue[] = []
  const fx: FxCue[] = []
  if (!prev) return { sounds, fx }

  // kata baru diterima
  if (next.log.length && next.log.at(-1) !== prev.log.at(-1) && next.log.at(-1)!.ok && next.phaseId === prev.phaseId) {
    sounds.push({ sfx: 'bom-accept', volume: next.log.at(-1)!.by === seat ? 1 : 0.6 })
  }
  // protes masuk
  if (next.review && prev.review && next.review.id === prev.review.id && next.review.votes.length > prev.review.votes.length) {
    sounds.push({ sfx: 'bom-protest', volume: next.review.by === seat ? 1 : 0.6 })
  }
  // kejadian khusus (power-up, batal, hadiah)
  if (next.event && next.event.id !== prev.event?.id) {
    const e = next.event
    if (e.kind === 'cancel') {
      sounds.push({ sfx: 'bom-cancel' })
      fx.push({ anim: 'bom-cancel', size: 45 })
    } else if (e.kind === 'gift') sounds.push({ sfx: 'bom-power', volume: e.by === seat ? 1 : 0.5, rate: 1.15 })
    else {
      sounds.push({ sfx: e.power === 'pendek' ? 'bom-cut' : 'bom-power' })
      fx.push({ anim: 'bom-power', size: 40 })
    }
  }
  // bom pindah tangan dalam ronde yang sama
  if (next.phase === 'live' && prev.phase === 'live' && next.turnId !== prev.turnId && next.holder !== prev.holder) {
    sounds.push({ sfx: 'bom-pass', rate: 0.95 + (next.holder % 4) * 0.04 })
    if (next.holder === seat) sounds.push({ sfx: 'bom-turn', delay: 120 })
    if (next.event?.kind !== 'cancel') fx.push({ anim: 'bom-pass', size: 30 })
  }

  if (next.phaseId === prev.phaseId) return { sounds, fx }

  switch (next.phase) {
    case 'live':
      sounds.push({ sfx: 'bom-light' })
      if (next.holder === seat) sounds.push({ sfx: 'bom-turn', delay: 300 })
      break
    case 'boom':
    case 'end': {
      sounds.push({ sfx: 'bom-boom', volume: next.lastBoom === seat ? 1 : 0.8 })
      fx.push({ anim: 'bom-boom', size: 80 })
      const h = next.lastBoom
      if (h !== null && !next.alive[h] && next.phase === 'boom') sounds.push({ sfx: 'bom-out', delay: 700 })
      if (next.phase === 'end') sounds.push({ sfx: next.winner === seat ? 'bom-champion' : 'bom-lose', delay: 900 })
      break
    }
  }
  return { sounds, fx }
}
