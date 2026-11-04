import type { Box, MapData } from '../maps'

export const RADIUS = 0.32
export const HIDER_SPEED = 3.4
export const SEEKER_SPEED = 3.9
/** setinggi ini bisa diinjak tanpa melompat (tangga, peti rendah) */
export const STEP = 0.46
const GRAVITY = 16
/** mata pengamat di atas tanah */
export const EYE = 1.05

/** kecepatan naik/turun saat terbang */
export const FLY_SPEED = 2.6
/** batas atas terbang di atas tanah: cukup untuk atap dan dinding atas, tidak sampai keluar map */
export const FLY_CEIL = 6
/** jarak terbang terjauh di luar titik-titik main map */
const FLY_MARGIN = 2

export type Walker = { x: number; z: number; y: number; vy: number; yaw: number; moving: boolean; fly: boolean }

export const spawnWalker = (x: number, z: number, yaw = 0): Walker => ({ x, z, y: 0, vy: 0, yaw, moving: false, fly: false })

type Bounds = { x0: number; x1: number; z0: number; z1: number }
const boundsCache = new WeakMap<MapData, Bounds>()

/** kotak main map dari titik muncul dan titik sembunyi; terbang tidak boleh keluar dari sini */
export function flyBounds(map: MapData): Bounds {
  let b = boundsCache.get(map)
  if (b) return b
  const pts = [...map.spawn.hider, ...map.spawn.seeker, ...map.spots.map((s) => [s.x, s.z])]
  const xs = pts.map((p) => p[0])
  const zs = pts.map((p) => p[1])
  b = { x0: Math.min(...xs) - FLY_MARGIN, x1: Math.max(...xs) + FLY_MARGIN, z0: Math.min(...zs) - FLY_MARGIN, z1: Math.max(...zs) + FLY_MARGIN }
  boundsCache.set(map, b)
  return b
}

/** jepit ke batas, tapi tidak menarik balik yang sudah di luar (mis. mulai terbang di pinggir) */
const keepIn = (v: number, old: number, lo: number, hi: number) => Math.max(Math.min(old, lo), Math.min(Math.max(old, hi), v))

/** titik dunia ke ruang lokal kotak */
function toLocal(b: Box, x: number, z: number): [number, number] {
  const dx = x - b.x
  const dz = z - b.z
  if (!b.yaw) return [dx, dz]
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  return [dx * c - dz * s, dx * s + dz * c]
}

function toWorldDir(b: Box, x: number, z: number): [number, number] {
  if (!b.yaw) return [x, z]
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  return [x * c + z * s, -x * s + z * c]
}

/** tinggi pijakan di (x,z) untuk kaki setinggi `y`: puncak kotak tertinggi yang masih bisa dijangkau */
export function groundAt(boxes: Box[], x: number, z: number, y: number): number {
  let ground = 0
  for (const b of boxes) {
    if (b.top > y + STEP || b.top <= ground) continue
    const [lx, lz] = toLocal(b, x, z)
    if (Math.abs(lx) <= b.hx && Math.abs(lz) <= b.hz) ground = b.top
  }
  return ground
}

/** dorong lingkaran keluar dari kotak yang lebih tinggi dari kaki */
export function pushOut(boxes: Box[], x: number, z: number, y: number, r = RADIUS): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      if (b.top <= y + STEP) continue
      const [lx, lz] = toLocal(b, x, z)
      const px = Math.max(-b.hx, Math.min(b.hx, lx))
      const pz = Math.max(-b.hz, Math.min(b.hz, lz))
      const dx = lx - px
      const dz = lz - pz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        const [wx, wz] = toWorldDir(b, (dx / d) * (r - d), (dz / d) * (r - d))
        x += wx
        z += wz
      } else {
        // pusat di dalam kotak: keluar lewat sisi terdekat
        const ex = b.hx - Math.abs(lx)
        const ez = b.hz - Math.abs(lz)
        const [wx, wz] = ex < ez ? toWorldDir(b, Math.sign(lx || 1) * (ex + r), 0) : toWorldDir(b, 0, Math.sign(lz || 1) * (ez + r))
        x += wx
        z += wz
      }
    }
  }
  return [x, z]
}

/** lingkaran di (x,z) tidak menyentuh kotak mana pun yang lebih tinggi dari kaki */
export function isClear(boxes: Box[], x: number, z: number, y: number, r: number): boolean {
  for (const b of boxes) {
    if (b.top <= y + STEP) continue
    const [lx, lz] = toLocal(b, x, z)
    const dx = Math.max(Math.abs(lx) - b.hx, 0)
    const dz = Math.max(Math.abs(lz) - b.hz, 0)
    if (dx * dx + dz * dz < r * r) return false
  }
  return true
}

/** satu langkah simulasi; (mx, mz) = arah dunia, panjang 0..1; `rise` -1..1 hanya berlaku saat terbang */
export function step(w: Walker, mx: number, mz: number, speed: number, dt: number, map: Pick<MapData, 'boxes'>, rise = 0) {
  const len = Math.hypot(mx, mz)
  w.moving = len > 0.05
  if (w.moving) {
    w.yaw = Math.atan2(mx, mz)
    let [x, z] = pushOut(map.boxes, w.x + mx * speed * dt, w.z + mz * speed * dt, w.y)
    if (w.fly && 'spots' in map) {
      const b = flyBounds(map as MapData)
      x = keepIn(x, w.x, b.x0, b.x1)
      z = keepIn(z, w.z, b.z0, b.z1)
    }
    w.x = x
    w.z = z
  }
  const g = groundAt(map.boxes, w.x, w.z, w.y)
  if (w.fly) {
    // melayang: tanpa gravitasi, tidak menembus pijakan, tidak melewati langit-langit
    w.vy = 0
    w.y = Math.max(g, Math.min(Math.max(g, FLY_CEIL), w.y + rise * FLY_SPEED * dt))
    if (Math.abs(rise) > 0.05) w.moving = true
    return
  }
  if (w.y > g) {
    w.vy -= GRAVITY * dt
    w.y = Math.max(g, w.y + w.vy * dt)
    if (w.y === g) w.vy = 0
  } else {
    w.y = g
    w.vy = 0
  }
}

/**
 * Ruas tertutup kotak? Uji ruas terhadap kotak di ruang lokalnya, pada ketinggian `y`.
 * Mengembalikan pecahan 0..1 titik kena pertama, 1 = bebas. Dipakai untuk pandangan bot dan kamera.
 */
export function rayHit(boxes: Box[], ax: number, az: number, bx: number, bz: number, y: number): number {
  let best = 1
  for (const b of boxes) {
    if (b.top < y) continue
    const [lax, laz] = toLocal(b, ax, az)
    const [lbx, lbz] = toLocal(b, bx, bz)
    const dx = lbx - lax
    const dz = lbz - laz
    let t0 = 0
    let t1 = best
    let hit = true
    for (const [p, d, h] of [[lax, dx, b.hx], [laz, dz, b.hz]]) {
      if (Math.abs(d) < 1e-7) {
        if (Math.abs(p) > h) hit = false
        continue
      }
      let n = (-h - p) / d
      let f = (h - p) / d
      if (n > f) [n, f] = [f, n]
      t0 = Math.max(t0, n)
      t1 = Math.min(t1, f)
      if (t0 > t1) hit = false
    }
    if (hit) best = Math.min(best, t0)
  }
  return best
}

export const canSee = (boxes: Box[], ax: number, az: number, bx: number, bz: number, y = EYE) => rayHit(boxes, ax, az, bx, bz, y) >= 1

/** pandangan 3D: ruas miring dari mata ke target, dicek dengan cuplikan tiap ~20 cm terhadap isi kotak */
export function canSee3(boxes: Box[], ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / 0.2))
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = ax + (bx - ax) * t
    const y = ay + (by - ay) * t
    const z = az + (bz - az) * t
    for (const b of boxes) {
      if (b.top <= y) continue
      const [lx, lz] = toLocal(b, x, z)
      if (Math.abs(lx) < b.hx && Math.abs(lz) < b.hz) return false
    }
  }
  return true
}
