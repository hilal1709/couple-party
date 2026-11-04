// Dua pemain disimulasikan sekaligus, lengkap dengan reducer dan jeda jaringan buatan.
// Dipakai tes (membuktikan tiap level bisa diselesaikan) dan demo main otomatis.
import { reduce } from '../engine'
import { LEVELS } from '../levels'
import type { TaliAction, TaliState } from '../types'
import { Client, poseOf, type Pose } from './client'
import { NO_INPUT, type Input } from './physics'

export type Who = 0 | 1

export type Cmd =
  /** jalan ke x lalu berhenti */
  | { w: Who; go: number; tol?: number }
  /** lari ke `to`, lompat saat melewati `at`; `grab` = pegang kait di udara, selesai saat tergantung */
  | { w: Who; to: number; at: number; tol?: number; grab?: boolean }
  /** lompat di tempat; `dir` arah selama `t` detik */
  | { w: Who; jump: -1 | 0 | 1; t?: number }
  | { w: Who; hold: boolean }
  | { w: Who; reel: boolean }
  | { wait: number }
  /** jalankan bersamaan sampai semuanya selesai */
  | { par: Cmd[] }
  | { until: (d: Duo) => boolean; max?: number }

type Task = { cmd: Cmd; t: number; jumped?: boolean; dir?: number }

export class Duo {
  state: TaliState
  clients: Client[]
  t = 0
  log: string[] = []
  /** catat posisi setelah tiap perintah */
  trace = false
  private hist: Pose[][] = [[], []]
  private holdOn = [false, false]
  private reelOn = [false, false]

  /** jeda jaringan dalam langkah 1/60 detik */
  readonly lag: number

  constructor(state: TaliState, lag = 6) {
    this.lag = lag
    this.state = state
    this.clients = [0, 1].map((seat) => new Client(LEVELS[state.level], seat, state, (a) => this.dispatch(a, seat)))
  }

  private queue: [TaliAction, number][] = []

  private dispatch(a: TaliAction, by: number) {
    this.queue.push([a, by])
  }

  private flush() {
    const q = this.queue
    this.queue = []
    for (const [a, by] of q) {
      const next = reduce(this.state, a, by)
      if (next !== this.state) {
        this.log.push(`${this.t.toFixed(2)} ${by}:${a.type}${'i' in a ? a.i : ''}`)
        this.state = next
      }
    }
    if (q.length) for (const c of this.clients) c.setState(this.state)
  }

  /** pose pasangan seperti diterima HP `seat` (tertunda `lag` langkah) */
  private seen(seat: Who): Pose | null {
    const h = this.hist[seat === 0 ? 1 : 0]
    if (!h.length) return null
    return h[Math.max(0, h.length - 1 - this.lag)]
  }

  step(inputs: [Input, Input], dt = 1 / 60) {
    this.t += dt
    for (const seat of [0, 1] as const) {
      const c = this.clients[seat]
      c.step(inputs[seat], this.t, dt, this.seen(seat))
      const h = this.hist[seat]
      h.push(poseOf(c.body, c.reeling))
      if (h.length > 30) h.shift()
    }
    this.flush()
  }

  /** jalankan skrip; mengembalikan true kalau level selesai */
  run(script: Cmd[], max = 600): boolean {
    const it = this.play(script, max)
    let r = it.next()
    while (!r.done) r = it.next()
    return r.value
  }

  /** skrip langkah demi langkah: satu `next()` = satu langkah 1/60 detik (untuk demo main otomatis) */
  *play(script: Cmd[], max = 600): Generator<void, boolean> {
    for (const cmd of script) {
      const ok = yield* this.exec(cmd, max)
      if (this.trace) this.log.push(`${this.t.toFixed(2)} selesai ${JSON.stringify(cmd, (_k, v) => (typeof v === 'function' ? 'fn' : v))} → ${this.clients.map((c) => `(${c.body.x.toFixed(2)}, ${c.body.y.toFixed(2)} h${c.body.hold})`).join(' ')}`)
      if (!ok) return this.state.phase !== 'play'
      if (this.state.phase !== 'play') return true
    }
    // beri waktu reducer menerima laporan finis
    for (let i = 0; i < 30 && this.state.phase === 'play'; i++) {
      this.idle()
      yield
    }
    return this.state.phase !== 'play'
  }

  private idle() {
    this.step([this.input(0, 0, false), this.input(1, 0, false)])
  }

  private input(w: Who, x: number, jump: boolean): Input {
    return { ...NO_INPUT, x, jump, hold: this.holdOn[w], reel: this.reelOn[w] }
  }

  /** satu perintah sampai selesai; false = waktu habis */
  private *exec(cmd: Cmd, max: number): Generator<void, boolean> {
    const tasks: Task[] = 'par' in cmd ? cmd.par.map((c) => ({ cmd: c, t: 0 })) : [{ cmd, t: 0 }]
    const limit = 'until' in cmd && cmd.max ? cmd.max : max
    let spent = 0
    const spawn = this.state.spawnId
    while (tasks.length) {
      if (spent > limit) {
        this.log.push(`waktu habis: ${JSON.stringify(cmd, (_k, v) => (typeof v === 'function' ? 'fn' : v))}`)
        return false
      }
      if (this.state.spawnId !== spawn) {
        this.log.push(`jatuh saat ${JSON.stringify(cmd, (_k, v) => (typeof v === 'function' ? 'fn' : v))}`)
        return false
      }
      const ins: [Input, Input] = [this.input(0, 0, false), this.input(1, 0, false)]
      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i]
        const r = this.drive(task, ins)
        task.t += 1 / 60
        if (r) tasks.splice(i, 1)
      }
      this.step(ins)
      spent += 1 / 60
      yield
      if (this.state.phase !== 'play') return true
    }
    return true
  }

  /** isi input satu langkah; true = tugas selesai */
  private drive(task: Task, ins: [Input, Input]): boolean {
    const c = task.cmd
    if ('wait' in c) return task.t >= c.wait
    if ('until' in c) return c.until(this)
    if ('par' in c) throw new Error('par bersarang tidak didukung')
    const w = c.w
    const b = this.clients[w].body
    if ('hold' in c) {
      this.holdOn[w] = c.hold
      ins[w].hold = c.hold
      return task.t > 0.05
    }
    if ('reel' in c) {
      this.reelOn[w] = c.reel
      ins[w].reel = c.reel
      return true
    }
    if ('go' in c) {
      const dx = c.go - b.x
      if (Math.abs(dx) < (c.tol ?? 0.15) && Math.abs(b.vx) < 1.5) return true
      ins[w].x = Math.max(-1, Math.min(1, dx * 1.6))
      return task.t > 8
    }
    if ('to' in c) {
      const dir = (task.dir ??= Math.sign(c.to - b.x) || 1)
      ins[w].x = dir
      const passed = dir > 0 ? b.x >= c.at : b.x <= c.at
      if (passed && !task.jumped) {
        task.jumped = true
        task.t = 0
      }
      if (task.jumped && task.t < 0.35) ins[w].jump = true
      if (c.grab && task.jumped && task.t > 0.08 && !b.ground) {
        this.holdOn[w] = true
        ins[w].hold = true
        if (b.hold === 2) return true
      }
      const past = dir > 0 ? b.x > c.to : b.x < c.to
      if (task.jumped && task.t > 0.3 && b.ground && (past || Math.abs(c.to - b.x) < (c.tol ?? 0.4))) {
        ins[w].x = 0
        return true
      }
      if (task.jumped && task.t > 0.3 && past) ins[w].x = 0
      return task.t > 6
    }
    if ('jump' in c) {
      // satu langkah dilepas dulu supaya tekanan baru terbaca
      ins[w].jump = task.t > 0.03 && task.t < 0.38
      ins[w].x = task.t < (c.t ?? 0.6) ? c.jump : 0
      return task.t > (c.t ?? 0.6) && (b.ground || b.hold !== 0)
    }
    return true
  }
}
