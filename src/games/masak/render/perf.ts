import type { Tier } from '@/games/kart/render/quality'
import { store } from '@/net/transport'

/**
 * Anggaran grafis Dapur Kacau di atas tingkat bersama Kart (Hemat/Sedang/Tinggi):
 * batas fps (layar 90–144 Hz tidak dirender penuh), bloom hanya di Tinggi, bayangan tidak digambar tiap frame.
 */
export type Perf = {
  tier: Tier
  /** frame per detik maksimum */
  fps: 30 | 60
  /** efek layar (bloom + SMAA) lewat EffectComposer; selain itu MSAA bawaan kanvas */
  post: boolean
  /** peta bayangan digambar ulang tiap sekian frame */
  shadowEvery: number
  /** kerapatan dunia luar: pejalan kaki, burung (0..1) */
  life: number
  /** pengali jumlah partikel cuaca */
  weather: number
}

const BATTERY_KEY = 'couple-party:masak-hemat-baterai'

export function savedBattery(): boolean {
  try {
    return store.getItem(BATTERY_KEY) === '1'
  } catch {
    return false
  }
}

export function saveBattery(on: boolean) {
  try {
    store.setItem(BATTERY_KEY, on ? '1' : '0')
  } catch {
    /* penyimpanan diblokir: berlaku sampai aplikasi ditutup */
  }
}

export function perfOf(t: Tier, battery = savedBattery()): Perf {
  if (t.q === 'low') return { tier: { ...t, ratio: 1.25, particles: 80 }, fps: 30, post: false, shadowEvery: 1, life: 0, weather: 0.4 }
  // Sedang: tanpa composer (hemat dua pass layar penuh), MSAA kanvas tetap menghaluskan tepi
  if (t.q === 'med') return { tier: { ...t, ratio: 1.5, post: false, samples: 0, particles: 180 }, fps: battery ? 30 : 60, post: false, shadowEvery: battery ? 1 : 2, life: 0.6, weather: 0.7 }
  return { tier: { ...t, ratio: 1.75, particles: 300 }, fps: battery ? 30 : 60, post: true, shadowEvery: battery ? 1 : 2, life: 1, weather: 1 }
}
