/** Sprite hasil render Blender (scripts/blender/sport.py → export.py sport). */
const SPRITES = import.meta.glob('/src/assets/sport/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string): string | undefined => SPRITES[`/src/assets/sport/${name}.webp`]
