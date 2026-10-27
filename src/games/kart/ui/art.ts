import type { ItemKind } from '../types'

/** Sprite hasil render Blender (scripts/blender/kart.py → export.py kart). */
const SPRITES = import.meta.glob('/src/assets/kart/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string): string | undefined => SPRITES[`/src/assets/kart/${name}.webp`]

export const charSprite = (id: string) => sprite(`char-${id}`)

export const ITEM_SPRITE: Record<ItemKind, string> = {
  roket: 'item-roket',
  pisang: 'item-pisang',
  pisang3: 'item-pisang3',
  perisai: 'item-perisai',
  sambal: 'item-sambal',
  sambal3: 'item-sambal3',
  awan: 'item-awan',
  magnet: 'item-magnet',
  petasan: 'item-petasan',
}
