/** Panahan: titik kena dihitung host dari bidikan, tarikan, dan angin. Satuan meter dari pusat sasaran. */

export const TARGET_DIST = 18
export const TARGET_R = 0.61
const RING = TARGET_R / 10
export const AIM_MAX = 1.4
const WIND_PUSH = 0.32

export type ArrowAim = { x: number; y: number }

/** detik terbang: makin penuh tarikan, makin cepat */
export const flightTime = (draw: number) => TARGET_DIST / (28 + draw * 32)

/** geseran angin yang diperkirakan pada tarikan ini */
export const windDrift = (wind: number, draw: number) => wind * flightTime(draw) * WIND_PUSH * 2

/** panah turun kalau tarikan tidak penuh */
export const drawDrop = (draw: number) => (1 - draw) * 1.1

export function arrowHit(aim: ArrowAim, draw: number, wind: number): ArrowAim {
  return { x: aim.x + windDrift(wind, draw), y: aim.y - drawDrop(draw) }
}

/** 10 di tengah, 1 di ring luar, 0 kalau meleset dari sasaran */
export function ringScore(p: ArrowAim) {
  const r = Math.sqrt(p.x * p.x + p.y * p.y)
  return r > TARGET_R ? 0 : Math.max(1, 10 - Math.floor(r / RING))
}
