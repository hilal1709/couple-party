/** Nomor titik MediaPipe Pose yang dipakai. */
export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lAnkle: 27,
  rAnkle: 28,
} as const

export type Pt = { x: number; y: number; z?: number; visibility?: number }

export const seen = (p: Pt | undefined, min = 0.5) => !!p && (p.visibility ?? 1) >= min

/** Bahu & pinggul terlihat: cukup untuk membaca gerak badan atas. */
export function torsoVisible(lm: Pt[]) {
  return [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip].every((i) => seen(lm[i]))
}

/** panjang badan di gambar; semua kecepatan dibagi ini supaya tidak tergantung jarak ke kamera */
export function torsoLength(lm: Pt[]) {
  const sx = (lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2
  const sy = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
  const hx = (lm[LM.lHip].x + lm[LM.rHip].x) / 2
  const hy = (lm[LM.lHip].y + lm[LM.rHip].y) / 2
  return Math.max(0.05, Math.hypot(sx - hx, sy - hy))
}
