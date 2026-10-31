import { MAP_INFO } from '../maps'
import type { PetakOptions } from '../types'

export const LEVEL_TITLE = { 1: 'Gampang', 2: 'Sedang', 3: 'Susah' } as const

const BOT_NAMES = ['Mang Ujang', 'Bu RT', 'Pak Kumis', 'Teh Imas', 'Bang Jago', 'Mbak Sri', 'Kang Asep', 'Cak Slamet']
export const botName = (actor: number) => BOT_NAMES[actor % BOT_NAMES.length]

export const SIZE_TITLE = { kecil: 'Kecil', sedang: 'Sedang', besar: 'Besar' } as const

export function mapTitle(o: PetakOptions) {
  return o.map === 'acak' ? 'Map acak' : MAP_INFO[o.map].title
}

export function summary(o: PetakOptions) {
  return `${mapTitle(o)} · ${o.rounds} ronde · ${o.seekers} pencari · bot ${LEVEL_TITLE[o.level]}`
}

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

export const HIDE_TIP = ['Pencari lagi tutup mata. Ketuk Cat, ambil warna tembok, lalu lukis badanmu.', 'Pipet juga mengambil corak: kayu, bata, genteng. Pakai Cap pola.', 'Pilih pose yang pas. Saat diam, matamu ikut terpejam.']

export const CAUGHT_LINE = ['Ketangkap! Catnya kurang rapi.', 'Ketahuan! Tembok nggak punya ekor.', 'Yah, kamuflasenya luntur.']

export const rankLine = (rank: number) => (rank === 0 ? 'Bunglon sejati!' : rank === 1 ? 'Nyaris jadi tembok.' : 'Latihan ngecat lagi, ya.')
