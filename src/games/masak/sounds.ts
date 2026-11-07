import { Howl } from 'howler'
import { getSettings, sfx, type SfxName } from '@/audio/audio'
import type { Fx } from './sim/kitchen'

export type Sound = 'slip' | 'served' | 'order' | 'wrong' | 'missed' | 'grab' | 'burnt' | 'win' | 'lose' | 'potong' | 'desis' | 'api' | 'semprot' | 'cuci' | 'dash' | 'ding' | 'bip' | 'hitung' | 'mulai'

export function playSound(s: Sound, volume = 1) {
  sfx(`masak-${s}` as SfxName, { volume })
}

/** suara untuk kejadian dapur dari host */
const FX_SOUND: Partial<Record<Fx['kind'], Sound>> = {
  served: 'served',
  order: 'order',
  wrong: 'wrong',
  missed: 'missed',
  burnt: 'burnt',
  fire: 'api',
  cooked: 'ding',
  washed: 'cuci',
  out: 'semprot',
  tangkap: 'grab',
  jatuh: 'grab',
  mendarat: 'grab',
}

export const fxSound = (f: Fx) => FX_SOUND[f.kind] ?? null

/** loop rebusan kompor: keras-pelannya mengikuti jumlah kompor yang sedang memasak */
export class Boil {
  private h: Howl
  constructor() {
    this.h = new Howl({ src: [`${import.meta.env.BASE_URL}audio/sfx/masak-rebus.ogg`], loop: true, volume: 0 })
    this.h.play()
  }
  set(cooking: number) {
    const st = getSettings()
    const v = st.muted ? 0 : st.sfx * Math.min(1, cooking * 0.35)
    if (Math.abs(this.h.volume() - v) > 0.01) this.h.fade(this.h.volume(), v, 300)
  }
  stop() {
    this.h.unload()
  }
}
