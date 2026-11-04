import type { RacketShot, RacketSport, ShotKind } from '../../types'

/** ukuran lapangan (meter): setengah lebar, setengah panjang, tinggi net */
export const SIZE: Record<RacketSport, { hw: number; hl: number; net: number }> = {
  tenis: { hw: 4, hl: 8, net: 0.9 },
  badminton: { hw: 2.6, hl: 5, net: 1.15 },
}

/** lari lawan/bot: cukup cepat untuk bola biasa, telat untuk bola tajam ke pinggir */
export const FOE_SPEED: Record<RacketSport, number> = { tenis: 6, badminton: 4.6 }
/** jeda reaksi sebelum mulai lari mengejar bola, detik (ditambah acak 0..REACT_JITTER) */
export const REACT_S = 0.16
export const REACT_JITTER = 0.1
/** jangkauan raket dari badan ke titik bola, meter */
export const REACH: Record<RacketSport, number> = { tenis: 1.25, badminton: 1.05 }
/** posisi siap: sedikit di depan baseline */
export const homeDepth = (sport: RacketSport) => SIZE[sport].hl - 0.4
/** setelah memukul, pemain kembali ke sepertiga posisi x-nya */
export const RECOVER = 0.3

/** x lapangan (-1..1) → meter dari tengah */
export const courtMeters = (sport: RacketSport, x: number) => x * SIZE[sport].hw * 0.92

/** kedalaman titik datang bola di sisi penerima: lob jauh ke belakang, smash dekat net */
export function landDepth(sport: RacketSport, kind: ShotKind, serve: boolean) {
  const { hl } = SIZE[sport]
  if (serve) return hl - 0.9
  return kind === 'lob' ? hl - 0.2 : kind === 'smash' ? hl * 0.5 : hl - 1.1
}

/**
 * Seberapa terkejar bola ini oleh pemain yang berdiri di `fromX` (x lapangan) di posisi siap:
 * 0 = pas di tempat, 1 = batas terjauh yang masih sempat, >1 = tidak terkejar.
 */
export function chaseLoad(sport: RacketSport, s: RacketShot, fromX: number) {
  const dx = courtMeters(sport, s.x - fromX)
  const dz = landDepth(sport, s.kind, s.serve) - homeDepth(sport)
  const need = Math.max(0, Math.hypot(dx, dz) - REACH[sport])
  const time = Math.max(0.05, s.ms / 1000 - REACT_S - REACT_JITTER / 2)
  return need / (FOE_SPEED[sport] * time)
}
