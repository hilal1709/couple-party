import { Howl } from 'howler'
import { getSettings, sfx, type SfxName } from '@/audio/audio'

export type Sound =
  | 'langkah'
  | 'lompat'
  | 'pegang'
  | 'napas'
  | 'jatuh'
  | 'cebur'
  | 'peti'
  | 'ambil'
  | 'makan'
  | 'tali'
  | 'api'
  | 'pingsan'
  | 'bangun'
  | 'peluit'
  | 'batu'
  | 'uap'
  | 'sengat'
  | 'pakai'
  | 'menang'
  | 'kalah'
  | 'lempar'
  | 'tangkap'
  | 'gendong'

export function playSound(s: Sound, volume = 1) {
  sfx(`puncak-${s}` as SfxName, { volume, rate: s === 'langkah' ? 0.9 + Math.random() * 0.25 : undefined })
}

/** angin terus-menerus: keras-pelannya mengikuti kecepatan angin & ketinggian */
export class WindLoop {
  private h: Howl
  constructor() {
    this.h = new Howl({ src: [`${import.meta.env.BASE_URL}audio/sfx/puncak-angin.ogg`], loop: true, volume: 0 })
    this.h.play()
  }
  set(strength: number) {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx * Math.min(0.9, 0.08 + strength * 0.07)
    if (Math.abs(this.h.volume() - v) > 0.02) this.h.fade(this.h.volume(), v, 400)
  }
  stop() {
    this.h.unload()
  }
}

/** suasana alam yang berulang (hutan, air terjun, api unggun): keras-pelannya diatur 0..1 */
export class AmbLoop {
  private h: Howl
  private gain: number
  constructor(name: 'hutan' | 'airterjun' | 'unggun', gain: number) {
    this.gain = gain
    this.h = new Howl({ src: [`${import.meta.env.BASE_URL}audio/sfx/puncak-${name}.ogg`], loop: true, volume: 0 })
    this.h.play()
  }
  set(level: number) {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx * this.gain * Math.max(0, Math.min(1, level))
    if (Math.abs(this.h.volume() - v) > 0.02) this.h.fade(this.h.volume(), v, 700)
  }
  stop() {
    this.h.unload()
  }
}

/** derau hujan terus-menerus, keras-pelannya mengikuti kekuatan hujan (suara hujan CC0 dari Kart) */
export class RainLoop {
  private h: Howl
  constructor() {
    this.h = new Howl({ src: [`${import.meta.env.BASE_URL}audio/sfx/kart-rain.ogg`], loop: true, volume: 0 })
    this.h.play()
  }
  set(strength: number) {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx * Math.min(0.8, strength * 0.7)
    if (Math.abs(this.h.volume() - v) > 0.02) this.h.fade(this.h.volume(), v, 600)
  }
  stop() {
    this.h.unload()
  }
}
