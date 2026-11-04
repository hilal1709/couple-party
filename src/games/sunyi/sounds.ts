import { Howl } from 'howler'
import { getSettings, sfx, type SfxName } from '@/audio/audio'
import type { Sound } from './round'

const BASE = `${import.meta.env.BASE_URL}audio`

export function playSound(s: Sound, volume = 1) {
  sfx(`sunyi-${s}` as SfxName, { volume, rate: s === 'langkah' ? 0.9 + Math.random() * 0.2 : undefined })
}

export function playEnd(win: boolean) {
  sfx(win ? 'sunyi-kabur' : 'sunyi-kalah')
}

/** suara malam kampung (loop) + bisikan Penunggu yang volumenya mengikuti jaraknya */
export class Ambient {
  private amb: Howl | null = null
  private whisper: Howl | null = null
  start() {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx
    this.amb = new Howl({ src: [`${BASE}/sfx/sunyi-amb.ogg`], loop: true, volume: v * 0.55 })
    this.amb.play()
    this.whisper = new Howl({ src: [`${BASE}/sfx/sunyi-bisik.ogg`], loop: true, volume: 0 })
    this.whisper.play()
  }
  /** `pan` -1 kiri .. 1 kanan */
  presence(level: number, pan: number) {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx
    this.whisper?.volume(v * level * level * 0.9)
    this.whisper?.stereo(Math.max(-1, Math.min(1, pan)) * 0.8)
    this.amb?.volume(v * 0.55 * (1 - level * 0.6))
  }
  stop() {
    this.amb?.unload()
    this.whisper?.unload()
    this.amb = this.whisper = null
  }
}
