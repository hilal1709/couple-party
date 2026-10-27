import { CatmullRomCurve3, Vector3 } from 'three'
import type { Hazard, TrackDef } from '../tracks'

/** jarak antar sampel lintasan (meter) */
export const STEP = 2

/**
 * Lintasan yang sudah disampel: titik tengah, arah, dan sisi kanan tiap STEP meter.
 * Semua query posisi (jarak ke jalan, tinggi, kemajuan) memakai data ini.
 */
export type Track = {
  def: TrackDef
  length: number
  n: number
  /** x, y, z titik tengah per sampel */
  px: Float32Array
  py: Float32Array
  pz: Float32Array
  /** arah maju (dx, dz ternormalisasi) */
  tx: Float32Array
  tz: Float32Array
  /** setengah lebar jalan */
  half: number
  /** grip & hambatan per sampel (dari hazard 'grip') */
  grip: Float32Array
  drag: Float32Array
  /** tanjakan: tinggi tambahan per sampel */
  ramp: Float32Array
  /** indeks sampel ujung tiap tanjakan */
  rampAt: number[]
}

export function buildTrack(def: TrackDef): Track {
  const curve = new CatmullRomCurve3(
    def.points.map(([x, z, y]) => new Vector3(x, (y ?? 0) * 1.6, z)),
    true,
    'centripetal',
  )
  const length = curve.getLength()
  const n = Math.round(length / STEP)
  const pts = curve.getSpacedPoints(n)
  const px = new Float32Array(n)
  const py = new Float32Array(n)
  const pz = new Float32Array(n)
  const tx = new Float32Array(n)
  const tz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    px[i] = pts[i].x
    py[i] = pts[i].y
    pz[i] = pts[i].z
  }
  for (let i = 0; i < n; i++) {
    const a = (i + n - 2) % n
    const b = (i + 2) % n
    const dx = px[b] - px[a]
    const dz = pz[b] - pz[a]
    const l = Math.hypot(dx, dz) || 1
    tx[i] = dx / l
    tz[i] = dz / l
  }
  const grip = new Float32Array(n).fill(1)
  const drag = new Float32Array(n)
  for (const h of def.hazards) {
    if (h.kind !== 'grip') continue
    for (let i = Math.floor(h.from * n); i < Math.ceil(h.to * n); i++) {
      grip[i % n] = h.grip
      drag[i % n] = h.drag
    }
  }
  // tanjakan: naik pelan 14 m lalu putus (kart terlempar). Digeser ke lurusan terdekat supaya
  // kart tidak mendarat di luar tikungan.
  const yaw = (i: number) => Math.atan2(tx[(i + n) % n], tz[(i + n) % n])
  const bend = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(yaw(b) - yaw(a)), Math.cos(yaw(b) - yaw(a))))
  const straight = (i: number) => bend(i - 20, i) < 0.12 && bend(i, i + 45) < 0.12
  const ramp = new Float32Array(n)
  const up = Math.round(14 / STEP)
  const rampAt: number[] = []
  for (const r of def.ramps) {
    let end = Math.floor(r * n)
    for (let d = 0; d < n / 6; d++) {
      if (straight(end + d)) {
        end += d
        break
      }
      if (straight(end - d)) {
        end -= d
        break
      }
    }
    end = (end + n) % n
    rampAt.push(end)
    for (let k = 0; k < up; k++) ramp[(end - up + k + n) % n] = ((k + 1) / up) * 2.2
  }
  return { def, length, n, px, py, pz, tx, tz, half: def.width / 2, grip, drag, ramp, rampAt }
}

/** indeks sampel di jarak s (meter, boleh di luar 0..length) */
export const indexAt = (t: Track, s: number) => ((Math.round(s / STEP) % t.n) + t.n) % t.n

/** posisi dunia dari jarak s & offset samping (meter, + = kanan) */
export function pointAt(t: Track, s: number, lateral: number): { x: number; y: number; z: number; yaw: number } {
  const i = indexAt(t, s)
  // kanan = putar arah maju 90° searah jarum jam (dilihat dari atas, z ke bawah)
  const rx = -t.tz[i]
  const rz = t.tx[i]
  return { x: t.px[i] + rx * lateral, y: t.py[i], z: t.pz[i] + rz * lateral, yaw: Math.atan2(t.tx[i], t.tz[i]) }
}

export type Near = { i: number; lateral: number; s: number }

/**
 * Sampel terdekat dari (x, z). `hint` = indeks terakhir supaya cukup mencari di sekitarnya;
 * tanpa hint dicari ke seluruh lintasan.
 */
export function nearest(t: Track, x: number, z: number, hint = -1): Near {
  let best = -1
  let bd = Infinity
  if (hint < 0) {
    for (let i = 0; i < t.n; i++) {
      const d = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
  } else {
    for (let k = -25; k <= 25; k++) {
      const i = (hint + k + t.n) % t.n
      const d = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
  }
  const lateral = (x - t.px[best]) * -t.tz[best] + (z - t.pz[best]) * t.tx[best]
  // geser s di antara sampel supaya kemajuan halus
  const along = (x - t.px[best]) * t.tx[best] + (z - t.pz[best]) * t.tz[best]
  return { i: best, lateral, s: best * STEP + along }
}

/** tinggi jalan di sampel i (tanpa tanjakan) */
export const groundAt = (t: Track, i: number) => t.py[i]

export function hazardsOf(t: Track, kind: Hazard['kind']) {
  return t.def.hazards.filter((h) => h.kind === kind)
}

/** kelengkungan (radian per meter) di sekitar sampel i, + = belok kanan */
export function curvature(t: Track, i: number, span = 8): number {
  const a = (i + t.n - span) % t.n
  const b = (i + span) % t.n
  const ya = Math.atan2(t.tx[a], t.tz[a])
  let d = Math.atan2(t.tx[b], t.tz[b]) - ya
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return -d / (span * 2 * STEP)
}
