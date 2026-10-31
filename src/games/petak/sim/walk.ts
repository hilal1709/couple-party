import type { Box, MapData } from '../maps'

export const RADIUS = 0.32
export const HIDER_SPEED = 3.4
export const SEEKER_SPEED = 3.9
/** setinggi ini bisa diinjak tanpa melompat (tangga, peti rendah) */
export const STEP = 0.46
const GRAVITY = 16
/** mata pengamat di atas tanah */
export const EYE = 1.05

export type Walker = { x: number; z: number; y: number; vy: number; yaw: number; moving: boolean }

export const spawnWalker = (x: number, z: number, yaw = 0): Walker => ({ x, z, y: 0, vy: 0, yaw, moving: false })

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

/** satu langkah simulasi; (mx, mz) = arah dunia, panjang 0..1 */
export function step(w: Walker, mx: number, mz: number, speed: number, dt: number, map: MapData) {
  const len = Math.hypot(mx, mz)
  w.moving = len > 0.05
  if (w.moving) {
    w.yaw = Math.atan2(mx, mz)
    const [x, z] = pushOut(map.boxes, w.x + mx * speed * dt, w.z + mz * speed * dt, w.y)
    w.x = x
    w.z = z
  }
  const g = groundAt(map.boxes, w.x, w.z, w.y)
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
