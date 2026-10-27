import { Howl } from 'howler'
import { getSettings, sfx, type SfxName } from '@/audio/audio'
import type { Sound } from './race'

const BASE = `${import.meta.env.BASE_URL}audio`

/** bunyi kejadian balapan → file SFX kart-* (public/audio/sfx) */
export function playSound(s: Sound, info: { rate?: number; volume?: number } = {}) {
  sfx(`kart-${s}` as SfxName, info)
}

/**
 * Dengung mesin kart sendiri: satu loop yang nadanya naik mengikuti kecepatan.
 * Dimatikan saat suara dimatikan di pengaturan.
 */
export class Engine {
  private h: Howl | null = null
  private id = 0
  start() {
    if (this.h) return
    this.h = new Howl({ src: [`${BASE}/sfx/kart-engine.ogg`], loop: true, volume: 0 })
    this.id = this.h.play()
  }
  /** `speed` 0..1 dari kecepatan puncak */
  set(speed: number, boost: boolean) {
    if (!this.h) return
    const st = getSettings()
    const vol = st.muted ? 0 : st.sfx * (0.18 + speed * 0.22)
    this.h.volume(vol, this.id)
    this.h.rate(0.7 + speed * 0.9 + (boost ? 0.15 : 0), this.id)
  }
  stop() {
    this.h?.unload()
    this.h = null
  }
}
