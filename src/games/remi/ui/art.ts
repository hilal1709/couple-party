import type { Mode } from '../types'

/** Sprite hasil render Blender (scripts/blender/remi.py → export.py remi). */
const SPRITES = import.meta.glob('/src/assets/remi/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/remi/${name}.webp`]

export const modeArt = (m: Mode) => sprite(`mode-${m}`)

/** Warna penanda tiap kursi */
export const SEAT_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']
