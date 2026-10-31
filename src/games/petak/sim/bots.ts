import type { BotLevel } from '../../types'
import type { MapData, Spot } from '../maps'
import { buildNav, findPath, randomCell } from './nav'
import { canSee, type Walker } from './walk'

/** jarak tangkap pemain dan bot; host memberi toleransi kecil untuk jeda jaringan */
export const CATCH_RANGE = 4
export const CATCH_TOLERANCE = 1.2
/** bot pencari hanya melihat sejauh ini, dalam kerucut di depannya */
const SIGHT = 15
const FOV_COS = Math.cos((60 * Math.PI) / 180)
const NOTICE: Record<BotLevel, number> = { 1: 0.22, 2: 0.45, 3: 0.85 }

export type Brain = { path: [number, number][]; next: number; target: number | null; arrived: boolean; wait: number; seen: [number, number][] }

export const newBrain = (): Brain => ({ path: [], next: 0, target: null, arrived: false, wait: 0, seen: [] })

/** arah gerak menuju titik jalur berikutnya; [0,0] kalau sudah sampai */
function follow(b: Brain, w: Walker): [number, number] {
  while (b.next < b.path.length) {
    const [x, z] = b.path[b.next]
    const dx = x - w.x
    const dz = z - w.z
    const d = Math.hypot(dx, dz)
    // titik terakhir menempel dinding, jadi cukup sampai dekat
    if (d < (b.next === b.path.length - 1 ? 0.7 : 0.35)) {
      b.next++
      continue
    }
    return [dx / d, dz / d]
  }
  return [0, 0]
}

function goTo(b: Brain, w: Walker, map: MapData, x: number, z: number) {
  b.path = findPath(buildNav(map), w.x, w.z, x, z)
  b.next = 0
}

/** bot hider: berjalan ke titiknya, lalu diam dan berpose */
export function hiderBot(b: Brain, w: Walker, spot: Spot, map: MapData): { move: [number, number]; settled: boolean } {
  if (b.arrived) return { move: [0, 0], settled: true }
  if (!b.path.length) goTo(b, w, map, spot.x, spot.z)
  const move = follow(b, w)
  if (move[0] === 0 && move[1] === 0) {
    b.arrived = true
    w.x = spot.x
    w.z = spot.z
    w.yaw = spot.yaw
    return { move, settled: true }
  }
  return { move, settled: false }
}

export type Sighting = { actor: number; x: number; z: number; moving: boolean; camo: number }

/** Peluang per detik bot melihat hider ini. Hanya memakai yang tampak: jarak, sudut, gerakan, dan kualitas samaran. */
export function noticeRate(w: Walker, h: Sighting, map: MapData, level: BotLevel): number {
  const dx = h.x - w.x
  const dz = h.z - w.z
  const d = Math.hypot(dx, dz)
  if (d > SIGHT || d < 0.01) return 0
  const facing = (dx * Math.sin(w.yaw) + dz * Math.cos(w.yaw)) / d
  if (facing < FOV_COS || !canSee(map.boxes, w.x, w.z, h.x, h.z)) return 0
  const near = 1 - d / SIGHT
  return NOTICE[level] * near * (1 - h.camo) ** 1.5 * (h.moving ? 5 : 1) + (d < 2 ? 0.2 : 0)
}

/** tujuan berkeliling: bot gampang asal jalan; bot lain memilih tempat yang jauh dari yang baru didatangi */
function nextStop(b: Brain, w: Walker, map: MapData, level: BotLevel, rnd: () => number): [number, number] {
  const nav = buildNav(map)
  b.seen.push([w.x, w.z])
  if (b.seen.length > 8) b.seen.shift()
  if (level === 1) return randomCell(nav, w.x, w.z, rnd)
  let best: [number, number] = [w.x, w.z]
  let score = -1
  for (let i = 0; i < 8; i++) {
    const c = randomCell(nav, w.x, w.z, rnd)
    const near = Math.min(...b.seen.map(([x, z]) => Math.hypot(c[0] - x, c[1] - z)))
    if (near > score) {
      score = near
      best = c
    }
  }
  return best
}

/** bot pencari: berkeliling; `hiders` hanya hider yang belum tertangkap */
export function seekerBot(b: Brain, w: Walker, hiders: Sighting[], map: MapData, level: BotLevel, dt: number, rnd: () => number): { move: [number, number]; grab: number | null } {
  if (b.target !== null) {
    const t = hiders.find((h) => h.actor === b.target)
    if (!t) b.target = null
    else {
      const d = Math.hypot(t.x - w.x, t.z - w.z)
      if (d <= CATCH_RANGE - 0.8) {
        b.target = null
        b.path = []
        return { move: [0, 0], grab: t.actor }
      }
      if (b.next >= b.path.length) goTo(b, w, map, t.x, t.z)
      return { move: follow(b, w), grab: null }
    }
  }
  for (const h of hiders) {
    if (rnd() < noticeRate(w, h, map, level) * dt) {
      b.target = h.actor
      goTo(b, w, map, h.x, h.z)
      return { move: follow(b, w), grab: null }
    }
  }
  if (b.wait > 0) {
    b.wait -= dt
    // berhenti sebentar sambil menoleh
    w.yaw += dt * 1.4
    return { move: [0, 0], grab: null }
  }
  const move = follow(b, w)
  if (move[0] === 0 && move[1] === 0) {
    const [x, z] = nextStop(b, w, map, level, rnd)
    goTo(b, w, map, x, z)
    b.wait = 0.8 + rnd() * 1.6
  }
  return { move, grab: null }
}
