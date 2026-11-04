import { store } from '@/net/transport'
import { nextRand } from '../rng'

/** Tampilan pendaki gendut Puncak Berdua (indeks ke daftar warna & gaya di bawah). */
export type PuncakLook = {
  skin: number
  jacket: number
  pants: number
  /** 0 kupluk · 1 topi rimba · 2 helm · 3 ikat kepala */
  hat: number
  /** warna topi & ransel */
  cap: number
  /** 0 polos · 1 kumis · 2 jenggot · 3 kacamata */
  face: number
}

export const SKINS = ['#ffdcc2', '#f6c9a4', '#e0a878', '#c68652', '#8d5a33', '#5c3a21']
export const JACKETS = ['#ff37a6', '#5cf64a', '#3a6fe0', '#ffcc1f', '#ff6b35', '#8a4fff', '#e8432f', '#21b5a6']
export const PANTS = ['#3a4250', '#2f4c8c', '#7a5230', '#5a6b3a', '#21252e', '#9a8468']
export const CAPS = ['#5cf64a', '#ff37a6', '#ffcc1f', '#3a6fe0', '#ff6b35', '#fff4fa', '#121212', '#8a4fff']
/** ransel dipasangkan dengan warna topi supaya serasi tanpa pilihan tambahan */
export const PACKS = ['#ffcc1f', '#3a6fe0', '#ff6b35', '#ffcc1f', '#3a6fe0', '#ff37a6', '#ffcc1f', '#5cf64a']
/** rambut (kumis, jenggot, alis) mengikuti warna kulit */
export const HAIRS = ['#6b4428', '#4a2c17', '#3a2414', '#2a1a10', '#1a120c', '#121212']
export const HATS = ['Kupluk', 'Topi Rimba', 'Helm', 'Ikat Kepala']
export const FACES = ['Polos', 'Kumis', 'Jenggot', 'Kacamata']

export function randomLook(seed: number): [PuncakLook, number] {
  let s = seed
  const take = (n: number) => {
    const [r, next] = nextRand(s)
    s = next
    return Math.floor(r * n)
  }
  return [{ skin: take(SKINS.length), jacket: take(JACKETS.length), pants: take(PANTS.length), hat: take(HATS.length), cap: take(CAPS.length), face: take(FACES.length) }, s]
}

/** Buang nilai di luar daftar: `look` datang dari HP lain. */
export function cleanLook(l: PuncakLook): PuncakLook {
  const fit = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0)
  return { skin: fit(l?.skin, SKINS.length), jacket: fit(l?.jacket, JACKETS.length), pants: fit(l?.pants, PANTS.length), hat: fit(l?.hat, HATS.length), cap: fit(l?.cap, CAPS.length), face: fit(l?.face, FACES.length) }
}

const KEY = 'couple-party:puncak-look'

export function savedLook(): PuncakLook | null {
  try {
    const v = JSON.parse(store.getItem(KEY) ?? 'null') as PuncakLook | null
    return v && typeof v.jacket === 'number' ? cleanLook(v) : null
  } catch {
    return null
  }
}

export const saveLook = (look: PuncakLook) => store.setItem(KEY, JSON.stringify(look))

const CAM_KEY = 'couple-party:puncak-cam'
export const savedFirstPerson = () => {
  try {
    return store.getItem(CAM_KEY) === 'fp'
  } catch {
    return false
  }
}
export const saveFirstPerson = (fp: boolean) => store.setItem(CAM_KEY, fp ? 'fp' : 'tp')
