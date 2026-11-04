import { nextRand } from '../../rng'
import type { Seat } from '../../types'
import { pushOut, rayHit } from '../../petak/sim/walk'
import type { Level } from '@/voice/loudness'
import { PATROL } from '../map'
import type { Difficulty } from '../types'
import { findPath, type Nav } from './nav'

/**
 * Penunggu: buta, tapi pendengarannya tajam. Mengejar ke arah suara terakhir yang ia dengar,
 * lalu celingukan. Hanya dijalankan di HP host; HP lain menerima posisinya.
 */
export type GhostMode = 'jalan' | 'curiga' | 'buru' | 'pergi'

export type Ghost = {
  x: number
  z: number
  yaw: number
  mode: GhostMode
  /** tujuan sekarang */
  tx: number
  tz: number
  path: [number, number][]
  /** detik menunggu/celingukan */
  wait: number
  /** detik tuli setelah menyergap */
  deaf: number
  repath: number
  /** pemain yang terakhir terdengar */
  prey: Seat | null
  rng: number
}

export type Listener = { seat: Seat; x: number; z: number; down: boolean; level: Level; moving: boolean; running: boolean }

/** radius terdengar (m) per tingkat suara mic */
export const VOICE_RANGE: Record<Level, number> = { diam: 0, bisik: 2.2, normal: 15, teriak: 38 }
export const STEP_RANGE = { walk: 2.8, run: 10 }
export const HEARING: Record<Difficulty, number> = { santai: 0.72, normal: 1, seram: 1.3 }
const SPEED: Record<GhostMode, number> = { jalan: 1.25, curiga: 2.5, buru: 3.55, pergi: 0 }
const PACE: Record<Difficulty, number> = { santai: 0.85, normal: 1, seram: 1.12 }
export const CATCH_RANGE = 0.95
/** dinding meredam suara */
const MUFFLE = 0.6

export function newGhost(x: number, z: number, seed: number): Ghost {
  return { x, z, yaw: 0, mode: 'jalan', tx: x, tz: z, path: [], wait: 2, deaf: 0, repath: 0, prey: null, rng: seed >>> 0 || 7 }
}

/** seberapa jauh suara pemain ini terdengar dari posisi Penunggu */
export function noiseRange(p: Listener, boxes: Nav['boxes'], gx: number, gz: number, diff: Difficulty): number {
  if (p.down) return 0
  let r = Math.max(VOICE_RANGE[p.level], p.running ? STEP_RANGE.run : p.moving ? STEP_RANGE.walk : 0)
  r *= HEARING[diff]
  if (r > 0 && rayHit(boxes, gx, gz, p.x, p.z, 1.4) < 1) r *= MUFFLE
  return r
}

function goTo(g: Ghost, nav: Nav, x: number, z: number) {
  g.tx = x
  g.tz = z
  g.path = findPath(nav, g.x, g.z, x, z) ?? []
  g.repath = 1.2
}

function nextPatrol(g: Ghost, nav: Nav, away?: { x: number; z: number }[]) {
  let v: number
  ;[v, g.rng] = nextRand(g.rng)
  let pick = PATROL[Math.floor(v * PATROL.length)]
  if (away?.length) {
    // titik terjauh dari para pemain
    pick = [...PATROL].sort((a, b) => far(b, away) - far(a, away))[Math.floor(v * 3)]
  }
  goTo(g, nav, pick[0], pick[1])
}
const far = (p: [number, number], ps: { x: number; z: number }[]) => Math.min(...ps.map((q) => Math.hypot(p[0] - q.x, p[1] - q.z)))

export type GhostEvent = { caught: Seat | null; heard: Seat | null }

/** satu langkah simulasi */
export function stepGhost(g: Ghost, dt: number, nav: Nav, players: Listener[], diff: Difficulty): GhostEvent {
  const ev: GhostEvent = { caught: null, heard: null }
  g.deaf = Math.max(0, g.deaf - dt)

  // dengar: pilih suara paling "keras" relatif terhadap jaraknya
  if (g.deaf <= 0 && g.mode !== 'pergi') {
    let best: Listener | null = null
    let margin = 0
    for (const p of players) {
      const d = Math.hypot(p.x - g.x, p.z - g.z)
      const m = noiseRange(p, nav.boxes, g.x, g.z, diff) - d
      if (m > margin) {
        margin = m
        best = p
      }
    }
    if (best) {
      ev.heard = best.seat
      g.prey = best.seat
      const d = Math.hypot(best.x - g.x, best.z - g.z)
      g.mode = d < 14 ? 'buru' : 'curiga'
      g.wait = 0
      if (Math.hypot(best.x - g.tx, best.z - g.tz) > 1.2 || g.repath <= 0) goTo(g, nav, best.x, best.z)
    }
  }

  // sergap
  if (g.mode !== 'pergi') {
    for (const p of players) {
      if (!p.down && Math.hypot(p.x - g.x, p.z - g.z) < CATCH_RANGE) {
        ev.caught = p.seat
        g.mode = 'pergi'
        g.wait = 2.2
        g.path = []
        g.prey = null
        return ev
      }
    }
  }

  if (g.mode === 'pergi') {
    g.wait -= dt
    if (g.wait <= 0) {
      // menghilang ke sudut terjauh, lalu tuli sebentar supaya korban sempat dibangunkan
      const alive = players.filter((p) => !p.down)
      const spot = [...PATROL].sort((a, b) => far(b, players) - far(a, players))[0]
      g.x = spot[0]
      g.z = spot[1]
      g.mode = 'jalan'
      g.deaf = 9
      nextPatrol(g, nav, alive.length ? alive : players)
    }
    return ev
  }

  g.repath -= dt
  if (g.path.length === 0) {
    g.wait -= dt
    // celingukan
    g.yaw += Math.sin(g.wait * 2.1) * dt * 1.5
    if (g.wait <= 0) {
      // tidak ada suara lagi: kembali berkeliling
      g.mode = 'jalan'
      g.prey = null
      nextPatrol(g, nav)
    }
    return ev
  }

  // jalan mengikuti jalur
  let move = SPEED[g.mode] * PACE[diff] * dt
  while (move > 0 && g.path.length) {
    const [px, pz] = g.path[0]
    const dx = px - g.x
    const dz = pz - g.z
    const d = Math.hypot(dx, dz)
    if (d < 1e-3) {
      g.path.shift()
      continue
    }
    const k = Math.min(1, move / d)
    g.x += dx * k
    g.z += dz * k
    const want = Math.atan2(dx, dz)
    const turn = Math.atan2(Math.sin(want - g.yaw), Math.cos(want - g.yaw))
    g.yaw += turn * Math.min(1, dt * 6)
    move -= d * k
    if (k >= 1) g.path.shift()
  }
  ;[g.x, g.z] = pushOut(nav.boxes, g.x, g.z, 0, 0.3)
  if (!g.path.length) {
    let v: number
    ;[v, g.rng] = nextRand(g.rng)
    g.wait = g.mode === 'jalan' ? 1.5 + v * 3 : 3 + v * 2
  }
  return ev
}
