import type { Power } from '../types'

/** Sprite hasil render Blender (scripts/blender/bom.py → export.py bom). */
const SPRITES = import.meta.glob('/src/assets/bom/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/bom/${name}.webp`]

export const PAPER = '#fff4fa'

/** Warna penanda tiap kursi (sama dengan game lain supaya pemain mengenali warnanya). */
export const SEAT_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']

export const POWER_SPRITE: Record<Power, string> = {
  balik: 'power-balik',
  lompat: 'power-lompat',
  pendek: 'power-pendek',
}
