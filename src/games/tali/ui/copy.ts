import { LEVELS } from '../levels'
import type { TaliOptions } from '../types'

export const CHAR_NAME = ['Onde', 'Klepon'] as const

export function summary(o: TaliOptions) {
  return `Mulai ${LEVELS[o.start]?.title ?? 'Sawah'} · ${o.run ? 'lanjut terus' : 'satu level'}`
}

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs) % 60).padStart(2, '0')}`

export const FALL_LINE = ['Byur! Balik ke bendera terakhir.', 'Waduh, talinya kurang kompak.', 'Ulang dari checkpoint, santai aja.']

export function clearLine(stars: number) {
  return stars === 3 ? 'Kompak banget! Pasangan sejati.' : stars === 2 ? 'Mantap! Hampir sempurna.' : 'Lolos juga akhirnya!'
}

const KEY = 'couple-party:tali-bintang'

/** bintang terbaik per level di HP ini (untuk layar pilih level) */
export function savedStars(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[]
    return LEVELS.map((_, i) => Number(v[i]) || 0)
  } catch {
    return LEVELS.map(() => 0)
  }
}

export function saveStars(level: number, stars: number) {
  try {
    const v = savedStars()
    if (stars <= v[level]) return
    v[level] = stars
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    // penyimpanan diblokir: bintang hanya tampil selama sesi
  }
}
