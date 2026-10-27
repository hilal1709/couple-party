import { CUPS, LEVEL_INFO } from '../data'
import { isCup } from '../engine'
import { TRACKS } from '../tracks'
import type { KartOptions, TrackId } from '../types'

export function courseTitle(c: KartOptions['course']) {
  return isCup(c) ? CUPS[c].title : TRACKS[c as TrackId].title
}

export function summary(o: KartOptions) {
  return `${courseTitle(o.course)} · ${o.laps} putaran · ${o.bots ? `bot ${LEVEL_INFO[o.level].title}` : 'tanpa bot'}`
}

/** waktu balapan m:ss.d */
export function clock(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const d = Math.floor((ms % 1000) / 100)
  return `${m}:${String(s).padStart(2, '0')}.${d}`
}

export const ordinal = (n: number) => `${n}`

export const RANK_LINE = ['Juara! Nggak ada yang bisa ngejar.', 'Nyaris! Tinggal dikit lagi.', 'Podium! Lumayan banget.']
export const rankLine = (r: number, total: number) => RANK_LINE[r] ?? (r === total - 1 ? 'Paling buncit… yang penting finish.' : 'Lumayan, masih bisa dikejar balapan depan.')
