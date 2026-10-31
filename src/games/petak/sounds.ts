import { Howl } from 'howler'
import { getSettings, sfx, type SfxName } from '@/audio/audio'
import type { Sound } from './round'

const BASE = `${import.meta.env.BASE_URL}audio`

export function playSound(s: Sound, volume = 1) {
  sfx(`petak-${s}` as SfxName, { volume })
}

/** suara lingkungan map: satu loop pelan di bawah musik */
export class Ambient {
  private h: Howl | null = null
  start(name: string) {
    const st = getSettings()
    this.h = new Howl({ src: [`${BASE}/sfx/petak-amb-${name}.ogg`], loop: true, volume: st.muted ? 0 : st.sfx * 0.5 })
    this.h.play()
  }
  stop() {
    this.h?.unload()
    this.h = null
  }
}
