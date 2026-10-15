import type { Mode } from '../types'

/** Sprite hasil render Blender (scripts/blender/domino.py → export.py domino). */
const SPRITES = import.meta.glob('/src/assets/domino/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/domino/${name}.webp`]

export const modeArt = (m: Mode) => sprite(`mode-${m}`)
