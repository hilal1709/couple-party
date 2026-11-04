// Bot pasangan: memainkan bagiannya dari rute level, tapi menunggu pemain manusia.
// Perintah untuk kursi sendiri dijalankan; perintah untuk kursi pasangan menjadi syarat tunggu
// ("tunggu sampai pasangan kira-kira sudah melakukannya"). Ditambah aturan aman: tidak menjauh
// melebihi tali, tidak melompat sebelum pasangan dekat, dan kuda-kuda saat pasangan tergantung.
import type { LevelRuntime } from './level'
import type { Cmd, DuoLike, Who } from './duo'
import { NO_INPUT, overlaps, R, type Body, type Input } from './physics'

/** jarak terjauh dari pasangan sebelum bot berhenti melangkah menjauh */
const LEASH = 4.3
/** pasangan harus sedekat ini sebelum bot berani melompat */
const JUMP_NEAR = 3.4
/** batas waktu perintah milik bot sendiri (detik) sebelum dilewati */
const OWN_LIMIT = 12

type Task = { cmd: Cmd; t: number; jumped?: boolean; dir?: number; start?: { x: number; y: number; hook: number; ground: boolean }; seenAir?: boolean; waitT: number }

export type RunnerView = {
  me: Body
  other: Body
  rt: LevelRuntime
  /** panjang tali saat ini */
  rope: number
  levers: boolean[]
  spawnId: number
  checkpoint: number
}

export class Runner {
  readonly seat: Who
  readonly route: Cmd[]
  /** bot mengikuti inisiatif pasangan pada perintah serentak (par) */
  readonly follower: boolean
  /** jeda acak sebelum perintah sendiri (meniru manusia yang lambat; hanya untuk tes) */
  readonly dawdle: () => number
  /** tes: indeks langkah runner pasangan, supaya perintah yang sudah dia kerjakan tidak ditunggu lagi */
  peer: (() => number) | null = null
  idx = 0
  say: string | null = null
  private tasks: Task[] | null = null
  private holdOn = false
  private reelOn = false
  private spawn = -1
  private cpIdx = new Map<number, number>()
  private lastCp = -1
  private pause = 0
  private brace = false
  /** keadaan pasangan saat langkah pasangan terakhir selesai (patokan 'sudah pindah') */
  private mark: Task['start'] | null = null

  constructor(seat: Who, route: Cmd[], follower: boolean, dawdle: () => number = () => 0) {
    this.seat = seat
    this.route = route
    this.follower = follower
    this.dawdle = dawdle
  }

  get done() {
    return this.idx >= this.route.length
  }

  /** input satu langkah 1/60 detik */
  step(v: RunnerView, dt: number): Input {
    if (this.spawn === -1) this.spawn = v.spawnId
    if (v.checkpoint > this.lastCp) {
      for (let c = this.lastCp + 1; c <= v.checkpoint; c++) this.cpIdx.set(c, this.idx)
      this.lastCp = v.checkpoint
    }
    if (v.spawnId !== this.spawn) {
      // jatuh: ulang dari langkah saat checkpoint itu dicapai
      this.spawn = v.spawnId
      this.idx = v.checkpoint < 0 ? 0 : this.cpIdx.get(v.checkpoint) ?? 0
      this.tasks = null
      this.mark = null
      this.holdOn = false
      this.reelOn = false
      this.pause = 0.6
    }
    const ins: Input = { ...NO_INPUT, hold: this.holdOn, reel: this.reelOn }
    if (this.pause > 0) {
      this.pause -= dt
      return ins
    }
    if (this.done) return this.guard(v, ins)
    if (!this.tasks) {
      const c = this.route[this.idx]
      const list = 'par' in c ? c.par : [c]
      // sesudah menunggu momen (perahu merapat, pintu terbuka) langsung bergerak, tanpa melamun
      const prev = this.route[this.idx - 1]
      const timed = !!prev && 'until' in prev
      this.tasks = list.map((cmd) => ({ cmd, t: 0, waitT: this.mine(cmd) && !timed ? this.dawdle() : 0 }))
    }
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const task = this.tasks[i]
      if (task.waitT > 0) {
        task.waitT -= dt
        continue
      }
      const ok = this.drive(task, v, ins, this.tasks)
      task.t += dt
      if (ok) this.tasks.splice(i, 1)
    }
    if (!this.tasks.length) {
      this.tasks = null
      this.idx++
    }
    return this.guard(v, ins)
  }

  private mine(c: Cmd) {
    return 'w' in c && c.w === this.seat
  }

  /** aturan aman di atas rute: jangan menjauh, tahan pasangan yang tergantung */
  private guard(v: RunnerView, ins: Input): Input {
    const { me, other } = v
    const dx = other.x - me.x
    const dist = Math.hypot(dx, other.y - me.y)
    // hanya saat sejajar: kalau pasangan di bawah (sedang ditarik naik), bot boleh mundur dari tepi
    if (Math.abs(ins.x) > 0.1 && Math.sign(ins.x) !== Math.sign(dx) && dist > LEASH && me.ground && Math.abs(other.y - me.y) < 1.5) ins.x = 0
    // pasangan menggantung di tali di bawah sana: kuda-kuda supaya tidak ikut terseret
    const dangling = !other.ground && other.hold === 0 && other.y < me.y - 0.8 && dist > v.rope - 0.4
    if (dangling && me.ground && !ins.jump) this.brace = true
    else if (other.ground || other.hold || dist < v.rope - 1) this.brace = false
    // kuda-kuda di dekat tuas akan ikut menariknya: jangan
    const nearLever = v.rt.def.levers.some((l) => Math.abs(l.x - me.x) < 1.3 && Math.abs(l.y - (me.y - R)) < 1.5)
    if (this.brace && me.ground && !nearLever) {
      ins.hold = true
      ins.x = 0
    }
    const leaping = this.tasks?.some((t) => 'to' in t.cmd && t.cmd.w === this.seat) ?? false
    if (me.ground && !ins.jump && !leaping && Math.abs(ins.x) > 0.1 && this.unsafe(v, me.x + Math.sign(ins.x) * (R + 0.08), me.y)) ins.x = 0
    return ins
  }

  /** di depan tidak ada pijakan dan di bawahnya bahaya / jurang tanpa dasar */
  private unsafe(v: RunnerView, x: number, y: number): boolean {
    let top: number | null = null
    for (const s of v.rt.live) {
      if (!s.solid) continue
      const [bx, by, bw, bh] = s.b
      const t = by + bh
      if (x < bx || x > bx + bw || t > y + 0.3) continue
      if (top === null || t > top) top = t
    }
    if (top === null) return true
    if (top > y - R - 0.15) return false
    for (let py = top + R; py < y; py += 0.4) if (v.rt.def.hazards.some((h) => overlaps(x, py, R, h.b))) return true
    return false
  }

  private drive(task: Task, v: RunnerView, ins: Input, all: Task[]): boolean {
    const c = task.cmd
    const { me, other } = v
    if ('say' in c) {
      this.say = c.say
      return true
    }
    if ('wait' in c) return task.t >= c.wait
    if ('until' in c) return c.until(this.world(v)) || task.t > (c.max ?? 30) * 3
    if ('par' in c) return true
    if (c.w !== this.seat) {
      const ok = this.partnerDid(task, v)
      if (ok) this.mark = { x: v.other.x, y: v.other.y, hook: v.other.hold === 2 ? v.other.hook : -1, ground: v.other.ground }
      return ok
    }
    // perintah milik bot
    if (task.t > OWN_LIMIT && !task.jumped) return true
    if ('hold' in c) {
      // tarik tuas: kalau belum persis di dekatnya, jalan dulu
      const lever = c.hold && !me.hold ? v.rt.def.levers.find((l) => Math.abs(l.x - me.x) < 3 && Math.abs(l.y - (me.y - R)) < 1.5) : undefined
      if (lever && Math.abs(lever.x - me.x) > 0.6 && task.t < 3) {
        ins.x = Math.max(-1, Math.min(1, (lever.x - me.x) * 1.6))
        ins.hold = false
        return false
      }
      this.holdOn = c.hold
      ins.hold = c.hold
      return task.t > 0.05 + (lever ? 0.1 : 0)
    }
    if ('reel' in c) {
      this.reelOn = c.reel
      ins.reel = c.reel
      return true
    }
    const dist = Math.hypot(other.x - me.x, other.y - me.y)
    if ('go' in c) {
      const dx = c.go - me.x
      if (Math.abs(dx) < (c.tol ?? 0.15) && Math.abs(me.vx) < 1.5) return true
      ins.x = Math.max(-1, Math.min(1, dx * 1.6))
      return false
    }
    if ('to' in c) {
      // rute selalu maju: sasaran yang sudah terlewat (misal setelah respawn) tidak dilompati mundur
      if (!task.jumped && task.dir === undefined && c.to < me.x + 0.2) return true
      const dir = (task.dir ??= Math.sign(c.to - me.x) || 1)
      if (!task.jumped) {
        // ikuti inisiatif: kalau pasangan juga harus melompat di langkah ini, tunggu dia melompat dulu
        const partnerJump = this.follower && all.some((o) => o !== task && 'w' in o.cmd && o.cmd.w !== this.seat && ('to' in o.cmd || 'jump' in o.cmd))
        const waiting = (partnerJump && other.ground && (dir > 0 ? other.x < c.at + 0.3 : other.x > c.at - 0.3)) || (!c.grab && other.hold === 0 && dist > JUMP_NEAR && Math.sign(other.x - me.x) !== dir)
        const atEdge = dir > 0 ? me.x >= c.at - 0.6 : me.x <= c.at + 0.6
        if (waiting && atEdge) {
          // berhenti di tepi, jangan sampai kelewat titik lompat
          ins.x = Math.max(-1, Math.min(1, (c.at - 0.6 * dir - me.x) * 1.6))
          task.t = 0
          return false
        }
      }
      ins.x = dir
      const passed = dir > 0 ? me.x >= c.at : me.x <= c.at
      if (passed && !task.jumped) {
        task.jumped = true
        task.t = 0
      }
      if (task.jumped && task.t > 0.03 && task.t < 0.38) ins.jump = true
      if (c.grab && task.jumped && task.t > 0.08 && !me.ground) {
        this.holdOn = true
        ins.hold = true
        if (me.hold === 2) return true
      }
      const past = dir > 0 ? me.x > c.to : me.x < c.to
      if (task.jumped && task.t > 0.3 && me.ground && (past || Math.abs(c.to - me.x) < (c.tol ?? 0.4))) {
        ins.x = 0
        return true
      }
      if (task.jumped && task.t > 0.3 && past) ins.x = 0
      if (task.jumped && task.t > 0.4 && me.ground && !past && me.on !== -1) {
        // mendarat sebelum tujuan (misal di perahu): lanjut jalan
        ins.x = dir
      }
      return !!task.jumped && task.t > 6
    }
    if ('jump' in c) {
      if (this.follower && task.t < 0.02 && all.some((o) => o !== task && 'w' in o.cmd && o.cmd.w !== this.seat && 'jump' in o.cmd) && other.ground && other.hold === 0 && !task.jumped) {
        // lompat serentak: tunggu pasangan melompat duluan
        task.t = 0
        return false
      }
      task.jumped = true
      ins.jump = task.t > 0.03 && task.t < 0.38
      ins.x = task.t < (c.t ?? 0.6) ? c.jump : 0
      return task.t > (c.t ?? 0.6) && (me.ground || me.hold !== 0)
    }
    return true
  }

  /** perintah untuk pasangan: sudahkah dia kira-kira melakukannya? */
  private partnerDid(task: Task, v: RunnerView): boolean {
    const c = task.cmd
    const o = v.other
    if (this.peer && this.peer() > this.idx) return true
    task.start ??= this.mark ?? { x: o.x, y: o.y, hook: o.hold === 2 ? o.hook : -1, ground: o.ground }
    if (!o.ground && o.hold === 0) task.seenAir = true
    // tarik tuas / kuda-kuda pasangan: syarat sebenarnya ada di perintah `until` sesudahnya
    if ('hold' in c) return true
    if ('reel' in c) return true
    // rute selalu maju ke kanan: pasangan yang sudah melewati titik itu juga dihitung
    if ('go' in c) return (Math.abs(o.x - c.go) < 0.6 && Math.abs(o.vx) < 1.5) || o.x > c.go + 0.6
    if ('to' in c) {
      if (c.grab) return o.hold === 2 || (o.ground && o.x >= c.to - 1.4)
      return (o.ground || o.hold === 2) && o.x >= c.to - 1.4
    }
    if ('jump' in c) {
      const s = task.start
      if (o.hold === 2 && o.hook !== s.hook) return true
      if (task.seenAir && (o.ground || o.hold === 2) && Math.hypot(o.x - s.x, o.y - s.y) > 0.6) return true
      // sudah lompat sebelum bot sempat melihat: dia sudah jauh di depan dan berdiri
      return o.ground && o.x > s.x + 2
    }
    return true
  }

  private world(v: RunnerView): DuoLike {
    const a = { body: v.me, rt: v.rt }
    const b = { body: v.other, rt: v.rt }
    return { clients: this.seat === 0 ? [a, b] : [b, a] }
  }
}

