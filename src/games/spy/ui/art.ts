import type { Role } from '../types'

/** Sprite hasil render Blender (scripts/blender/spy.py → export.py spy). */
const SPRITES = import.meta.glob('/src/assets/spy/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/spy/${name}.webp`]

export const PAPER = '#fff4fa'

/** Warna penanda tiap kursi (sama dengan game lain supaya pemain mengenali warnanya). */
export const SEAT_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']

export const ROLE_SPRITE: Record<Role, string> = {
  warga: 'role-warga',
  penyusup: 'role-penyusup',
  mrwhite: 'role-mrwhite',
  spy: 'role-spy',
}

export const ROLE_ALT: Record<Role, string> = {
  warga: 'Maskot warga bertopi pesta tersenyum',
  penyusup: 'Maskot berkumis palsu dan berkacamata hitam',
  mrwhite: 'Maskot putih polos tanpa wajah',
  spy: 'Maskot bermantel dan bertopi fedora',
}
