import { store } from '@/net/transport'

/** 'auto' = dipilih dari kemampuan HP lalu disetel ulang oleh pengukur frame */
export type GfxChoice = 'auto' | 'low' | 'med' | 'high'
export type ButtonSize = 'kecil' | 'sedang' | 'besar'

export type PuncakSettings = {
  gfx: GfxChoice
  /** pengali kecepatan kamera (0,4–2) */
  sens: number
  invertY: boolean
  vibrate: boolean
  buttons: ButtonSize
  /** statistik frame di pojok layar */
  stats: boolean
}

export const DEFAULTS: PuncakSettings = { gfx: 'auto', sens: 1, invertY: false, vibrate: true, buttons: 'sedang', stats: false }

export const BUTTON_SCALE: Record<ButtonSize, number> = { kecil: 0.86, sedang: 1, besar: 1.16 }

const KEY = 'couple-party:puncak-settings'

/** membaca setelan tersimpan; nilai rusak/asing diganti bawaan */
export function parseSettings(raw: string | null): PuncakSettings {
  if (!raw) return { ...DEFAULTS }
  try {
    const v = JSON.parse(raw) as Partial<PuncakSettings>
    return {
      gfx: v.gfx === 'low' || v.gfx === 'med' || v.gfx === 'high' || v.gfx === 'auto' ? v.gfx : DEFAULTS.gfx,
      sens: typeof v.sens === 'number' && Number.isFinite(v.sens) ? Math.min(2, Math.max(0.4, v.sens)) : DEFAULTS.sens,
      invertY: typeof v.invertY === 'boolean' ? v.invertY : DEFAULTS.invertY,
      vibrate: typeof v.vibrate === 'boolean' ? v.vibrate : DEFAULTS.vibrate,
      buttons: v.buttons === 'kecil' || v.buttons === 'besar' || v.buttons === 'sedang' ? v.buttons : DEFAULTS.buttons,
      stats: typeof v.stats === 'boolean' ? v.stats : DEFAULTS.stats,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const loadSettings = () => parseSettings(store.getItem(KEY))
export const saveSettings = (s: PuncakSettings) => store.setItem(KEY, JSON.stringify(s))
