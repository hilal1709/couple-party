import { MOUNTAINS } from '../mountains'
import type { PuncakOptions } from '../types'

export const LEVEL_TITLE = { 1: 'Gampang', 2: 'Sedang', 3: 'Susah' } as const
export const WEATHER_TITLE = { cerah: 'Cerah', angin: 'Berangin', ekstrem: 'Ekstrem' } as const
export const LOOT_TITLE = { sedikit: 'Sedikit', normal: 'Normal', banyak: 'Banyak' } as const

const BOT_NAMES = ['Mas Porter', 'Teh Ranger', 'Om Pemandu', 'Mbak Pendaki']
export const botName = (actor: number) => BOT_NAMES[actor % BOT_NAMES.length]

export function summary(o: PuncakOptions) {
  const m = o.mountain === 'acak' ? 'Gunung acak' : MOUNTAINS[o.mountain].title
  return `${m} · ${o.zones === 4 ? 'rute penuh' : 'rute pendek'} · ${WEATHER_TITLE[o.weather]} · item ${LOOT_TITLE[o.loot].toLowerCase()} · ${o.total} pendaki`
}

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

export const STAR_LINE = ['Gunungnya menang kali ini. Istirahat dulu, besok coba lagi.', 'Sampai puncak! Foto dulu dong.', 'Cepat & kompak. Pendaki beneran nih.', 'Sempurna! Puncak ditaklukkan tanpa drama.']
