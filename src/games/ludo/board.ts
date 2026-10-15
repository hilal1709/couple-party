import { ARM, LANE, type Arms, type Prog, type Special } from './types'

/**
 * Papan Ludo umum untuk 4, 6, atau 8 lengan.
 * Tiap lengan 3 kolom x 6 baris: kolom keluar (indeks 0..5, dari dalam ke luar), ujung (6),
 * kolom masuk (7..12, dari luar ke dalam). Kolom tengah = jalur rumah pemilik lengan.
 * Jalur keliling = ARM * arms petak, berurutan searah jarum jam.
 */

/** Panjang jalur keliling yang ditempuh satu bidak (start sampai ujung lengannya sendiri). */
export const trackLen = (arms: Arms) => ARM * arms - 1
/** Nilai Prog saat bidak finis. */
export const finishOf = (arms: Arms) => trackLen(arms) + LANE

/** Petak start lengan `a` (kolom masuk, baris kedua dari luar). */
export const startOf = (a: number) => ARM * a + 8

/** Petak jalur keliling (0..ARM*arms-1) untuk bidak di lengan `a` dengan kemajuan `p`; null kalau di kandang/rumah. */
export function trackIndex(arms: Arms, a: number, p: Prog): number | null {
  if (p < 0 || p >= trackLen(arms)) return null
  return (startOf(a) + p) % (ARM * arms)
}

/** Petak aman: semua start + bintang 8 langkah setelah start. */
export const isSafe = (t: number) => t % ARM === 8 || t % ARM === 3

/** Petak jahil (kalau diaktifkan). Tidak pernah di petak aman maupun jalur rumah. */
export function specialAt(t: number): Special | null {
  const a = Math.floor(t / ARM)
  const i = t % ARM
  if (i === 10) return a % 2 === 0 ? 'boost' : 'slip'
  if (i === 1) return a % 2 === 0 ? 'bomb' : 'portal'
  return null
}

/** Efek langkah petak jahil. */
export const BOOST = 3
export const SLIP = 3

/* ---------- geometri (satuan = 1 petak) ---------- */

const R0: Record<Arms, number> = { 4: 1.5, 6: 2.62, 8: 3.66 }
const YARD_R: Record<Arms, number> = { 4: 4.5 * Math.SQRT2, 6: 6.5, 8: 7.95 }

export type Pt = { x: number; y: number }

/** Arah lengan `k` (radian). Lengan 0 menghadap kiri, berputar searah jarum jam di layar. */
export const armAngle = (arms: Arms, k: number) => Math.PI + (k * 2 * Math.PI) / arms
/** Jari-jari dalam lengan (tepi kotak tengah). */
export const innerR = (arms: Arms) => R0[arms]
/** Apotema poligon papan: ujung lengan menyentuh sisi poligon. */
export const apothem = (arms: Arms) => R0[arms] + 6
export const circumR = (arms: Arms) => apothem(arms) / Math.cos(Math.PI / arms)

/** Titik tengah sel lengan `k`, baris `u` (0 = paling dalam), kolom `v` (-1 keluar, 0 rumah, 1 masuk). */
export function cellPt(arms: Arms, k: number, u: number, v: number): Pt {
  const th = armAngle(arms, k)
  const r = R0[arms] + u + 0.5
  return { x: Math.cos(th) * r - Math.sin(th) * v, y: Math.sin(th) * r + Math.cos(th) * v }
}

/** Sel (lengan, baris, kolom) dari petak jalur keliling. */
export function trackCell(t: number): { k: number; u: number; v: number } {
  const k = Math.floor(t / ARM)
  const i = t % ARM
  if (i <= 5) return { k, u: i, v: -1 }
  if (i === 6) return { k, u: 5, v: 0 }
  return { k, u: 12 - i, v: 1 }
}

export const trackPt = (arms: Arms, t: number) => {
  const c = trackCell(t)
  return cellPt(arms, c.k, c.u, c.v)
}

/** Titik finis pemain lengan `a` (segitiga tengah). */
export function homePt(arms: Arms, a: number): Pt {
  const th = armAngle(arms, a)
  const r = R0[arms] * 0.55
  return { x: Math.cos(th) * r, y: Math.sin(th) * r }
}

/** Pusat kandang pemain lengan `a`: di sudut antara lengannya dan lengan berikutnya. */
export function yardCenter(arms: Arms, a: number): Pt {
  const th = armAngle(arms, a) + Math.PI / arms
  return { x: Math.cos(th) * YARD_R[arms], y: Math.sin(th) * YARD_R[arms] }
}

const SLOTS: Pt[] = [
  { x: -0.62, y: -0.62 },
  { x: 0.62, y: -0.62 },
  { x: -0.62, y: 0.62 },
  { x: 0.62, y: 0.62 },
]

export function yardPt(arms: Arms, a: number, piece: number): Pt {
  const c = yardCenter(arms, a)
  const o = SLOTS[piece % 4]
  return { x: c.x + o.x, y: c.y + o.y }
}

/** Titik di papan untuk bidak `piece` milik lengan `a` dengan kemajuan `p`. */
export function progPt(arms: Arms, a: number, piece: number, p: Prog): Pt {
  if (p < 0) return yardPt(arms, a, piece)
  const L = trackLen(arms)
  if (p < L) return trackPt(arms, trackIndex(arms, a, p)!)
  if (p < L + LANE) return cellPt(arms, a, 4 - (p - L), 0)
  return homePt(arms, a)
}

/** Sebar kursi di lengan papan supaya jarak antarpemain rata. */
export function armsFor(players: number, arms: Arms): number[] {
  return Array.from({ length: players }, (_, i) => Math.round((i * arms) / players) % arms)
}

/** Papan terkecil yang muat untuk sejumlah pemain. */
export const minArms = (players: number): Arms => (players <= 4 ? 4 : players <= 6 ? 6 : 8)
