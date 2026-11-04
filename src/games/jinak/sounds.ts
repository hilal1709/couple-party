import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import type { JinakState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }

/**
 * Suara untuk perubahan `prev → next`. Murni: semua HP menghitung dari state yang sama.
 * Semua sampel CC0 yang sudah ada di app (Kenney), tanpa file baru.
 */
export function cuesFor(prev: JinakState | null, next: JinakState, seat: Seat): SoundCue[] {
  const out: SoundCue[] = []
  if (!prev) return out
  const mine = next.defuser === seat
  if (prev.phase === 'intro' && next.phase === 'live') out.push({ sfx: 'bom-light' })
  if (next.event && next.event.id !== prev.event?.id) {
    const e = next.event
    const mod = next.modules[e.mod]
    if (e.kind === 'strike') out.push({ sfx: 'spy-guess-wrong', volume: mine ? 1 : 0.8 }, { sfx: 'bom-reject', delay: 80, volume: 0.6 })
    if (e.kind === 'step') out.push({ sfx: 'ui-select', volume: 0.7 })
    if (e.kind === 'solve' && next.phase === 'live') out.push({ sfx: 'spy-guess-right', volume: mine ? 1 : 0.7 })
    if (mod?.kind === 'kabel' && e.kind !== 'step') out.unshift({ sfx: 'bom-cut' })
  }
  if (prev.phase === 'live' && next.phase === 'defused') out.push({ sfx: 'jingle-champion', delay: 250 })
  if (prev.phase === 'live' && next.phase === 'boom') out.push({ sfx: 'bom-boom' }, { sfx: 'bom-lose', delay: 1400, volume: 0.8 })
  return out
}
