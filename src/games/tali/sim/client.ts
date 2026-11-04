// Satu pemain di satu HP: badan sendiri, tali, dan keadaan level lokal.
// Kejadian penting (tombol, permen, checkpoint, jatuh, finis) dilaporkan lewat `emit`
// ke reducer di HP host; semua HP lalu menerima state yang sama.
import type { Seat } from '../../types'
import type { LevelDef } from '../levels/types'
import type { TaliAction, TaliState } from '../types'
import { groupsOn, LevelRuntime } from './level'
import { overlaps, R, ROPE_MAX, spawnBody, stepBody, stepRope, type Body, type Hold, type Input, type Partner } from './physics'

/** keadaan pasangan yang dikirim lewat jaringan */
export type Pose = Partner & { on: number; face: 1 | -1; air: number }

export const CANDY_REACH = 0.8
export const GOAL_HALF = 1.6
const BUTTON_W = 1.2
/** jeda tampilan setelah jatuh sebelum laporan dikirim (detik) */
const FALL_DELAY = 0.45

export function spawnPoint(def: LevelDef, checkpoint: number, seat: Seat): [number, number] {
  const [x, y] = checkpoint < 0 ? def.spawn : def.checkpoints[checkpoint]
  return [x + (seat === 0 ? 0.6 : -0.6), y + R + 0.05]
}

export function poseOf(b: Body, reel: boolean): Pose {
  // kecepatan dunia: termasuk benda yang dipijak, supaya pasangan di kepala ikut terbawa
  return { x: b.x, y: b.y, vx: b.vx + (b.ground ? b.carryX : 0), vy: b.vy + (b.ground ? b.carryY : 0), hold: b.hold, ground: b.ground, reel, on: b.on, face: b.face, air: b.air }
}

export type ClientEvent = 'jump' | 'land' | 'hook' | 'brace' | 'candy' | 'checkpoint' | 'fall' | 'press' | 'lever' | 'goal'

export class Client {
  body: Body
  rope = ROPE_MAX
  readonly rt: LevelRuntime
  /** detik sejak level dimulai di HP ini */
  elapsed = 0
  /** sedang jatuh, menunggu state baru dari host */
  fallen = -1
  private state: TaliState
  private spawnSeen: number
  private pressed: boolean[]
  private got = new Set<number>()
  private sentCheckpoint = -1
  private atGoal = false
  private lastHold: Hold = 0
  private holdHeld = false
  reeling = false

  constructor(
    readonly def: LevelDef,
    readonly seat: Seat,
    state: TaliState,
    private emit: (a: TaliAction) => void,
    private onEvent: (e: ClientEvent) => void = () => {},
  ) {
    this.state = state
    this.spawnSeen = state.spawnId
    this.rt = new LevelRuntime(def)
    this.pressed = def.buttons.map(() => false)
    const [x, y] = spawnPoint(def, state.checkpoint, seat)
    this.body = spawnBody(x, y, seat === 0 ? 1 : -1)
  }

  setState(s: TaliState) {
    this.state = s
    if (s.spawnId !== this.spawnSeen) {
      this.spawnSeen = s.spawnId
      this.respawn()
    }
  }

  private respawn() {
    const [x, y] = spawnPoint(this.def, this.state.checkpoint, this.seat)
    this.body = spawnBody(x, y, this.body.face)
    this.rope = ROPE_MAX
    this.fallen = -1
    this.atGoal = false
    this.pressed = this.pressed.map(() => false)
  }

  /** status grup dengan tombol milik sendiri langsung dipakai, tanpa menunggu host */
  groups(): boolean[] {
    const bit = 1 << this.seat
    const press = this.state.press.map((m, i) => (this.pressed[i] ? m | bit : m & ~bit))
    return groupsOn(this.def, press, this.state.levers)
  }

  /** Satu langkah. `t` = detik jam bersama; `partner` null = pasangan belum terlihat. */
  step(input: Input, t: number, dt: number, partner: Pose | null) {
    this.elapsed += dt
    const standing = [this.body.on]
    if (partner) standing.push(partner.on)
    this.rt.update(t, dt, this.groups(), standing)
    if (this.state.phase !== 'play') return
    if (this.fallen >= 0) {
      const was = this.fallen
      this.fallen += dt
      // laporan dikirim setelah animasi jatuh; diulang kalau host belum menjawab (paket hilang)
      if (was < FALL_DELAY && this.fallen >= FALL_DELAY) this.emit({ type: 'fall' })
      else if (this.fallen > FALL_DELAY + 3) {
        this.fallen = FALL_DELAY
        this.emit({ type: 'fall' })
      }
      return
    }
    this.reeling = input.reel
    this.rope = stepRope(this.rope, input.reel || !!partner?.reel, dt)
    const before = this.body.hold
    stepBody(this.body, input, this.rt.space(), partner, this.rope, dt)
    const b = this.body
    if (b.jumped) this.onEvent('jump')
    if (b.landed) this.onEvent('land')
    if (b.hold !== before && b.hold === 2) this.onEvent('hook')
    if (b.hold !== before && b.hold === 1) this.onEvent('brace')
    this.lastHold = b.hold

    // tuas: tekan Pegang di dekatnya
    if (input.hold && !this.holdHeld) {
      this.def.levers.forEach((l, i) => {
        if (Math.abs(b.x - l.x) < 0.9 && Math.abs(b.y - R - l.y) < 1.2) {
          this.emit({ type: 'lever', i })
          this.onEvent('lever')
        }
      })
    }
    this.holdHeld = input.hold

    this.def.buttons.forEach((btn, i) => {
      const on = b.ground && b.on !== -2 && Math.abs(b.x - btn.x) < (btn.w ?? BUTTON_W) / 2 + 0.2 && Math.abs(b.y - R - btn.y) < 0.35
      if (on !== this.pressed[i]) {
        this.pressed[i] = on
        this.emit({ type: 'press', i, on })
        if (on) this.onEvent('press')
      }
    })

    this.def.candy.forEach(([cx, cy], i) => {
      if (this.state.candy[i] || this.got.has(i)) return
      if ((b.x - cx) ** 2 + (b.y - cy) ** 2 < CANDY_REACH ** 2) {
        this.got.add(i)
        this.emit({ type: 'collect', i })
        this.onEvent('candy')
      }
    })

    this.def.checkpoints.forEach(([cx, cy], i) => {
      if (i <= this.state.checkpoint || i <= this.sentCheckpoint) return
      if (b.x >= cx - 0.5 && Math.abs(b.y - R - cy) < 2.5) {
        this.sentCheckpoint = i
        this.emit({ type: 'checkpoint', i })
        this.onEvent('checkpoint')
      }
    })

    const [gx, gy] = this.def.goal
    const goal = Math.abs(b.x - gx) < GOAL_HALF && b.y - R > gy - 0.3 && b.y < gy + 3.5
    if (goal !== this.atGoal) {
      this.atGoal = goal
      this.emit({ type: 'goal', on: goal, ms: this.elapsed * 1000 })
      if (goal) this.onEvent('goal')
    }

    if (b.y < this.def.killY || this.def.hazards.some((h) => overlaps(b.x, b.y, R * 0.8, h.b))) {
      this.fallen = 0
      this.onEvent('fall')
    }
  }

  get holdState() {
    return this.lastHold
  }

  inGoal() {
    return this.atGoal
  }
}
