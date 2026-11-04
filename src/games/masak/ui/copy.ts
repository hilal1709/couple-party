import { KITCHENS } from '../kitchens'
import type { MasakOptions } from '../types'

export const LEVEL_TITLE = { 1: 'Gampang', 2: 'Sedang', 3: 'Susah' } as const

const BOT_NAMES = ['Chef Ucup', 'Bu Kantin', 'Mas Gerobak', 'Teh Dapur', 'Om Wajan', 'Mbak Sambal', 'Koh Bakmi', 'Bang Gorengan']
export const botName = (actor: number) => BOT_NAMES[actor % BOT_NAMES.length]

export function summary(o: MasakOptions) {
  return `${o.mode === 'versus' ? 'Tanding · ' : ''}${KITCHENS[o.kitchen].title} · ${o.secs / 60} menit · ${o.total} koki · bot ${LEVEL_TITLE[o.level]}`
}

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

export const STAR_LINE = ['Dapurnya kebakaran semangat, tapi pelanggan kabur.', 'Lumayan! Pelanggan pulang kenyang.', 'Dapur kompak, antrean lancar.', 'Chef bintang tiga! Sombong dikit boleh.']
