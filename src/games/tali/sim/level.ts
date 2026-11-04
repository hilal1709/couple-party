// Keadaan level yang berubah tiap frame (pintu, lift, platform gerak, pijakan runtuh),
// dihitung sendiri di tiap HP dari jam bersama dan status grup di state game.
import type { LevelDef, SolidDef } from '../levels/types'
import type { Box, Collider, Space } from './physics'

/** detik pijakan runtuh bergoyang sebelum jatuh, dan lama sebelum muncul lagi */
export const CRUMBLE_SHAKE = 0.55
export const CRUMBLE_BACK = 3.2
/** pintu naik cepat, turun pelan: ada waktu untuk lari lewat di bawahnya */
const DOOR_OPEN = 4
const DOOR_CLOSE = 1.4
const LIFT_SPEED = 1.6

/** grup hidup kalau salah satu tombolnya terinjak cukup badan, atau tuasnya menyala (tiap tarikan tuas membalik) */
export function groupsOn(def: LevelDef, press: number[], levers: boolean[]): boolean[] {
  const n = 1 + Math.max(-1, ...def.buttons.map((b) => b.g), ...def.levers.map((l) => l.g), ...def.wind.map((w) => w.g ?? -1))
  const btn = Array<boolean>(n).fill(false)
  const lev = Array<boolean>(n).fill(false)
  def.buttons.forEach((b, i) => {
    if (bits(press[i] ?? 0) >= (b.need ?? 1)) btn[b.g] = true
  })
  def.levers.forEach((l, i) => {
    if (levers[i]) lev[l.g] = !lev[l.g]
  })
  return btn.map((b, g) => b || lev[g])
}

export const bits = (m: number) => {
  let c = 0
  for (let v = m; v; v &= v - 1) c++
  return c
}

/** posisi geser benda gerak pada waktu t (detik jam bersama) */
export function moveOffset(s: SolidDef, t: number): [number, number] {
  if (s.move) {
    const f = 0.5 - 0.5 * Math.cos(((t / s.move.period + (s.move.phase ?? 0)) % 1) * Math.PI * 2)
    return [s.move.d[0] * f, s.move.d[1] * f]
  }
  if (s.orbit) {
    const a = ((t / s.orbit.period + (s.orbit.phase ?? 0)) % 1) * Math.PI * 2
    return [Math.cos(a) * s.orbit.r, Math.sin(a) * s.orbit.r]
  }
  return [0, 0]
}

export type SolidLive = {
  def: SolidDef
  /** kotak saat ini */
  b: Box
  vx: number
  vy: number
  /** 0..1: pintu terangkat (ikut bergeser ke atas setinggi badannya) / lift sampai tujuan */
  open: number
  /** detik sejak mulai dipijak (pijakan runtuh); -1 = utuh */
  crumble: number
  /** detik sejak jatuh; -1 = masih ada */
  gone: number
  solid: boolean
}

export class LevelRuntime {
  readonly live: SolidLive[]
  private t: number | null = null
  private groups: boolean[] = []

  constructor(readonly def: LevelDef) {
    this.live = def.solids.map((d) => ({ def: d, b: [...d.b] as Box, vx: 0, vy: 0, open: 0, crumble: -1, gone: -1, solid: true }))
  }

  /**
   * Maju ke waktu `t` (detik jam bersama). `standing` = indeks pijakan yang sedang dipijak badan mana pun.
   */
  update(t: number, dt: number, groups: boolean[], standing: number[]): void {
    const first = this.t === null
    this.t = t
    this.groups = groups
    for (let i = 0; i < this.live.length; i++) {
      const s = this.live[i]
      const d = s.def
      const [x0, y0, w, h] = d.b
      let ox = 0
      let oy = 0
      if (d.move || d.orbit) [ox, oy] = moveOffset(d, t)
      if (d.lift) {
        const want = groups[d.lift.g] ? 1 : 0
        const len = Math.hypot(d.lift.d[0], d.lift.d[1]) || 1
        const step = ((d.lift.speed ?? LIFT_SPEED) * dt) / len
        s.open = first ? want : s.open + Math.max(-step, Math.min(step, want - s.open))
        ox = d.lift.d[0] * s.open
        oy = d.lift.d[1] * s.open
      }
      if (d.door !== undefined) {
        const want = groups[d.door] ? 1 : 0
        const up = (DOOR_OPEN * dt) / Math.max(1, h)
        const down = (DOOR_CLOSE * dt) / Math.max(1, h)
        s.open = first ? want : s.open + Math.max(-down, Math.min(up, want - s.open))
        oy = h * s.open
      }
      if (d.crumble) {
        if (s.gone >= 0) {
          s.gone += dt
          if (s.gone >= CRUMBLE_BACK) {
            s.gone = -1
            s.crumble = -1
            s.solid = true
          }
        } else if (s.crumble >= 0) {
          s.crumble += dt
          if (s.crumble >= CRUMBLE_SHAKE) {
            s.gone = 0
            s.solid = false
          }
        } else if (standing.includes(i)) s.crumble = 0
      }
      const nx = x0 + ox
      const ny = y0 + oy
      s.vx = first || dt <= 0 ? 0 : (nx - s.b[0]) / dt
      s.vy = first || dt <= 0 ? 0 : (ny - s.b[1]) / dt
      s.b[0] = nx
      s.b[1] = ny
    }
  }

  space(): Space {
    const solids: Collider[] = []
    for (let i = 0; i < this.live.length; i++) {
      const s = this.live[i]
      if (!s.solid) continue
      solids.push({ b: s.b, vx: s.vx, vy: s.vy, oneway: s.def.oneway, belt: s.def.belt, id: i })
    }
    return { solids, hooks: this.def.hooks, wind: this.def.wind.filter((w) => w.g === undefined || this.groups[w.g]) }
  }
}
