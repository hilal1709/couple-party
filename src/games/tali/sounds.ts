import { sfx, type SfxName } from '@/audio/audio'
import type { Sound } from './round'

const VOL: Partial<Record<Sound, number>> = { land: 0.5, reel: 0.45, jump: 0.7, brace: 0.6 }

export function playSound(s: Sound) {
  sfx(`tali-${s}` as SfxName, { volume: VOL[s] ?? 1 })
}
