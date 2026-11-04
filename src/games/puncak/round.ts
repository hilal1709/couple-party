import * as THREE from 'three'
import { initialTier, TIERS, type Quality } from '@/games/kart/render/quality'
import { puncakTier } from './render/quality'
import { randomLook, type PuncakLook } from './look'
import { Climber, loadClimber, type ClimbClip } from './render/climber'
import type { LiveChannel, Seat } from '../types'
import { actorOf } from './engine'
import { MountainScene } from './render/scene'
import { newBot, routeIndexNear, thinkBot, type Bot } from './sim/bots'
import { maxStamina, newBody, stepBody, type Body, type BodyEvent, type Env, type Input, type Mode } from './sim/climb'
import { hitHazards, stormAt, weatherAt, windAt, type Sky } from './sim/hazards'
import { applyToBody, ITEMS, planRope, type ItemId } from './sim/items'
import { cloneMount, dropItem, give, LIVES, lightCamp, newMount, openChest, pick, pull, REACH, revive, setDown, tickDown, spendItem, type Fx, type Mount } from './sim/mount'
import { buildTerrain, gradAt, groundTop, zoneAt, type Terrain } from './sim/terrain'
import type { Sound } from './sounds'
import type { PuncakAction, PuncakState } from './types'

const SEND_EVERY = 0.1
const MNT_MIN = 0.1
const MNT_BEAT = 0.5
const CAMP_R = 6
const SUMMIT_R = 7
const FRAGILE_SECS = 1.3
const FRAGILE_BACK = 6
const MODES: Mode[] = ['ground', 'air', 'climb', 'rope', 'slide', 'swim', 'down']

/** [aktor, x, y, z, yaw, mode, bergerak, payung] */
type Pose = [number, number, number, number, number, number, number, number]
type Op =
  | { op: 'open'; chest: number }
  | { op: 'pick'; drop: number }
  | { op: 'use'; slot: number; x: number; y: number; z: number; rope: ReturnType<typeof planRope> }
  | { op: 'drop'; slot: number; x: number; y: number; z: number }
  | { op: 'give'; slot: number; to: number }
  | { op: 'down' }
  | { op: 'revive'; to: number }
  | { op: 'pull'; to: number; x: number; y: number; z: number }
type Wire = { k: 'pose'; a: Pose[] } | ({ k: 'do'; a: number; n: number } & Op) | { k: 'mnt'; s: Mount }

const r2 = (v: number) => Math.round(v * 100) / 100

export type Action = { kind: 'open' | 'pick' | 'revive' | 'pull' | 'cook'; label: string; id: number } | null

export type Hud = {
  stamina: number
  max: number
  fat: Body['fat']
  mode: Mode
  buffs: Body['buffs']
  inv: (ItemId | null)[]
  action: Action
  /** pasangan terdekat dalam jangkauan untuk diberi barang */
  giveTo: number | null
  alt: number
  zone: string
  zoneIndex: number
  lives: number
  lit: number
  secs: number
  /** layar: penanda pasangan [aktor, x%, y%, jarak, pingsan, di luar layar] */
  marks: [number, number, number, number, boolean, boolean][]
  chests: [number, number][]
  /** arah ke api unggun berikutnya relatif kamera (radian) & jarak */
  compass: [number, number] | null
  downLeft: number | null
  storm: number
  /** cuaca yang sedang berlangsung & kekuatannya */
  sky: Sky
  skyK: number
  wind: number
  umbrella: boolean
  summit: boolean
  fps: number
  rtt: number | null
}

export type Pop = { text: string; tone: 'electric' | 'rose' | 'paper' }

export type RoundOptions = {
  canvas: HTMLCanvasElement
  state: PuncakState
  seat: Seat
  look: PuncakLook | null
  /** mulai dengan kamera orang pertama */
  fp?: boolean
  act: (a: PuncakAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onPop: (p: Pop) => void
  onSound: (s: Sound, volume: number) => void
  nameOf: (actor: number) => string
}

type Remote = { x: number; y: number; z: number; yaw: number; mode: Mode; moving: boolean; umbrella: boolean }

const SKY_POP: Record<Sky, string> = {
  cerah: 'Langit cerah lagi',
  berawan: 'Mendung datang',
  hujan: 'Hujan! Tebing licin',
  badai: 'Badai petir! Pegangan boros',
  pasir: 'Badai pasir!',
  abu: 'Hujan abu kawah',
  salju: 'Salju turun, makin dingin',
  kabut: 'Kabut tebal turun',
}

/** satu ronde pendakian di satu HP */
export class Round {
  private o: RoundOptions
  private s: PuncakState
  private t: Terrain
  private scene: MountainScene
  private mount: Mount
  private me: number
  private host: boolean
  private bodies: Body[] = []
  private remotes: Remote[] = []
  private bots: (Bot | null)[] = []
  private chibis: (Climber | null)[] = []
  /** kecepatan datar teramati per aktor (m/s), untuk memilih jalan/lari */
  private speeds: number[] = []
  private lastPos: THREE.Vector3[] = []
  /** kamera orang pertama */
  private fp = false
  private fpPitch = 0
  private eyeV = new THREE.Vector3()
  private roots: THREE.Group[] = []
  private anims: string[] = []
  private stopLive: (() => void) | undefined
  private raf = 0
  private alive = true
  private ro: ResizeObserver | null = null
  private lastT = 0
  private input = { x: 0, y: 0, jump: false, grip: false, run: false }
  private camYaw = 0
  private camPitch = 0.32
  private camDist = 6.5
  private lookAt = 0
  private sendIn = 0
  private mntIn = 0
  private dirty = false
  private seenFx = 0
  private seq = 0
  private sent = new Map<number, number>()
  private rtt: number | null = null
  private hudIn = 0
  private frames = 0
  private fpsAt = 0
  private fps = 60
  private slow = 0
  private fired = false
  private broken = new Map<number, number>()
  private standing = new Map<number, number>()
  private downSent = 0
  private stepIn = 0
  private breathIn = 0
  private chibiScale = 1
  private progress: number[] = []

  constructor(o: RoundOptions) {
    this.o = o
    this.fp = !!o.fp
    this.s = o.state
    this.t = buildTerrain(o.state.mountain, o.state.opts.zones, o.state.seed)
    this.me = actorOf(o.state, o.seat)
    this.host = o.seat === 0
    const url = import.meta.env.DEV ? (new URLSearchParams(location.search).get('q') as Quality | null) : null
    const tier = puncakTier(url && TIERS[url] ? TIERS[url] : initialTier())
    this.scene = new MountainScene(o.canvas, tier)
    const n = o.state.actors.length
    this.mount = newMount(this.t, n, LIVES[o.state.opts.weather], o.state.opts.loot, o.state.seed)
    const st = this.t.start
    o.state.actors.forEach((a, i) => {
      const off = (i - (n - 1) / 2) * 1.6
      const x = st.x + Math.cos(st.yaw) * off
      const z = st.z - Math.sin(st.yaw) * off
      const y = groundTop(this.t, x, z)
      this.bodies.push(newBody(x, y, z, st.yaw))
      this.remotes.push({ x, y, z, yaw: st.yaw, mode: 'ground', moving: false, umbrella: false })
      const bot = a.seat === null ? newBot() : null
      // bot mulai dari titik rute terdekat di depan, bukan titik pertama di belakang garis start
      if (bot) bot.wp = Math.min(this.t.route.length - 1, routeIndexNear(this.t, x, y, z) + 1)
      this.bots.push(bot)
      this.chibis.push(null)
      const root = new THREE.Group()
      root.position.set(x, y, z)
      this.scene.actors.add(root)
      this.roots.push(root)
      this.anims.push('')
      this.progress.push(0)
    })
    this.camYaw = st.yaw
  }

  private onContextLost = (e: Event) => e.preventDefault()

  async start() {
    this.o.canvas.addEventListener('webglcontextlost', this.onContextLost)
    if (this.o.live) this.stopLive = this.o.live.on((d, from) => this.onLive(d, from))
    const el = this.o.canvas
    const size = () => this.scene.resize(el.clientWidth || 1, el.clientHeight || 1)
    this.ro = new ResizeObserver(size)
    this.ro.observe(el)
    size()
    const [gltf] = await Promise.all([loadClimber(), this.scene.load(this.t)])
    if (!this.alive) return
    this.s.actors.forEach((_, i) => {
      const look = (i === this.me ? this.o.look : null) ?? this.s.looks[i] ?? randomLook(i * 977 + 13)[0]
      const c = new Climber(gltf, look, this.scene.shadows, this.scene.quality !== 'low')
      if (i === this.me) c.setHeadless(this.fp)
      if (i === 0 || this.chibiScale === 1) {
        const box = new THREE.Box3().setFromObject(c.root)
        const h = box.max.y - box.min.y
        if (h > 0.1) this.chibiScale = 1.45 / h
      }
      c.root.scale.setScalar(this.chibiScale)
      this.roots[i].add(c.root)
      this.chibis[i] = c
    })
    this.lastT = performance.now()
    this.fpsAt = this.lastT
    this.raf = requestAnimationFrame(this.frame)
  }

  setState(s: PuncakState) {
    const prev = this.s
    this.s = s
    s.looks.forEach((l, i) => {
      const c = this.chibis[i]
      if (l && l !== prev.looks[i] && c) c.setLook(l)
    })
  }

  // ---------- kendali ----------
  setMove(x: number, y: number) {
    this.input.x = x
    this.input.y = y
  }
  jump() {
    this.input.jump = true
  }
  grip(on: boolean) {
    this.input.grip = on
  }
  /** tombol Lari: ditahan = lari; ditekan saat memanjat = lunge ke atas */
  run(on: boolean) {
    const b = this.body
    if (on && !this.input.run && b && b.mode === 'climb') this.input.jump = true
    this.input.run = on
  }
  /** geser kamera (piksel layar) */
  look(dx: number, dy: number) {
    this.camYaw -= dx * 0.006
    if (this.fp) this.fpPitch = Math.max(-1.3, Math.min(1.3, this.fpPitch - dy * 0.004))
    else this.camPitch = Math.max(-0.35, Math.min(1.25, this.camPitch + dy * 0.004))
    this.lookAt = performance.now()
  }
  /** pindah kamera orang pertama / ketiga */
  setFirstPerson(on: boolean) {
    this.fp = on
    this.fpPitch = 0
    this.chibis[this.me]?.setHeadless(on)
  }
  zoom(f: number) {
    if (this.fp) return
    this.camDist = Math.max(3.2, Math.min(14, this.camDist * f))
  }

  private get body() {
    return this.bodies[this.me]
  }

  /** tombol aksi konteks */
  doAction() {
    const a = this.actionNear()
    if (!a || this.me < 0) return
    if (a.kind === 'open') this.request({ op: 'open', chest: a.id })
    else if (a.kind === 'pick') this.request({ op: 'pick', drop: a.id })
    else if (a.kind === 'revive') this.request({ op: 'revive', to: a.id })
    else if (a.kind === 'pull') {
      const b = this.body
      this.request({ op: 'pull', to: a.id, x: b.x + Math.sin(b.yaw) * -0.6, y: b.y, z: b.z + Math.cos(b.yaw) * -0.6 })
    } else if (a.kind === 'cook') {
      const slot = this.mount.inv[this.me].indexOf('mi')
      if (slot >= 0) this.useSlot(slot)
    }
  }

  useSlot(slot: number) {
    if (this.me < 0) return
    const item = this.mount.inv[this.me]?.[slot]
    if (!item) return
    const b = this.body
    if (b.mode === 'down') return
    let rope = null
    if (item === 'paku' || item === 'tangga') {
      rope = planRope(this.t, b, item === 'tangga' ? 'tangga' : 'tali', 0)
      if (!rope) {
        this.o.onPop({ text: 'Hadapkan ke tebing dulu', tone: 'paper' })
        return
      }
    }
    // payung: buka-tutup langsung di HP sendiri (tidak menunggu host)
    if (item === 'payung') {
      if (b.mode !== 'air') {
        this.o.onPop({ text: 'Buka payung saat melayang', tone: 'paper' })
        return
      }
      b.umbrella = !b.umbrella
      this.o.onSound('pakai', 0.6)
      return
    }
    this.request({ op: 'use', slot, x: r2(b.x), y: r2(b.y), z: r2(b.z), rope })
  }

  dropSlot(slot: number) {
    const b = this.body
    if (!b || !this.mount.inv[this.me]?.[slot]) return
    this.request({ op: 'drop', slot, x: r2(b.x + Math.sin(b.yaw) * 0.8), y: r2(b.y), z: r2(b.z + Math.cos(b.yaw) * 0.8) })
  }

  giveSlot(slot: number) {
    const to = this.giveTarget()
    if (to === null) return
    this.request({ op: 'give', slot, to })
  }

  private request(op: Op) {
    if (this.host) {
      this.apply(this.me, op)
      return
    }
    const n = ++this.seq
    this.sent.set(n, performance.now())
    this.o.live?.send({ k: 'do', a: this.me, n, ...op } satisfies Wire)
  }

  private posOf(i: number) {
    return this.isLocal(i) ? this.bodies[i] : this.remotes[i]
  }
  private modeOf(i: number) {
    return this.isLocal(i) ? this.bodies[i].mode : this.remotes[i].mode
  }
  private isLocal(i: number) {
    return i === this.me || (this.host && this.s.actors[i]?.seat === null)
  }

  /** host: jalankan aksi; jarak diperiksa dari posisi terakhir yang diketahui */
  private apply(actor: number, op: Op) {
    const m = this.mount
    const p = this.posOf(actor)
    const near = (x: number, y: number, z: number, r = REACH) => Math.hypot(x - p.x, z - p.z) < r + 1 && Math.abs(y - p.y) < 3
    let ok = false
    if (m.down[actor] !== null && op.op !== 'down') return
    switch (op.op) {
      case 'open': {
        const c = this.t.chests.find((x) => x.id === op.chest)
        if (c && near(c.x, c.y, c.z)) ok = openChest(m, this.t, actor, op.chest, this.s.opts.loot)
        break
      }
      case 'pick': {
        const d = m.drops.find((x) => x.id === op.drop)
        if (d && near(d.x, d.y, d.z)) ok = pick(m, actor, op.drop)
        break
      }
      case 'use':
        ok = spendItem(m, actor, op.slot, { x: op.x, y: op.y, z: op.z }, op.rope)
        break
      case 'drop':
        ok = dropItem(m, actor, op.slot, { x: op.x, y: op.y, z: op.z })
        break
      case 'give': {
        const q = this.posOf(op.to)
        if (q && near(q.x, q.y, q.z, 3)) ok = give(m, actor, op.slot, op.to)
        break
      }
      case 'down':
        ok = setDown(m, actor)
        break
      case 'revive': {
        const q = this.posOf(op.to)
        if (q && near(q.x, q.y, q.z, 2.6)) ok = revive(m, op.to, actor)
        break
      }
      case 'pull': {
        const q = this.posOf(op.to)
        if (q && Math.hypot(q.x - p.x, q.z - p.z) < 3.4 && q.y < p.y + 0.5 && q.y > p.y - 5) ok = pull(m, op.to, actor, { x: op.x, y: op.y, z: op.z })
        break
      }
    }
    if (ok) this.dirty = true
  }

  private onLive(d: unknown, from: Seat) {
    const m = d as Wire
    if (m?.k === 'pose') {
      for (const [a, x, y, z, yaw, mode, moving, umb] of m.a) {
        const actor = this.s.actors[a]
        if (!actor || a === this.me) continue
        if (actor.seat === null ? from !== 0 : actor.seat !== from) continue
        if (this.host && actor.seat === null) continue
        Object.assign(this.remotes[a], { x, y, z, yaw, mode: MODES[mode] ?? 'ground', moving: !!moving, umbrella: !!umb })
      }
    } else if (m?.k === 'do' && this.host) {
      if (this.s.actors[m.a]?.seat !== from) return
      this.apply(m.a, m as unknown as Op)
      this.mount.ack[m.a] = Math.max(this.mount.ack[m.a] ?? 0, m.n)
      this.dirty = true
    } else if (m?.k === 'mnt' && !this.host && from === 0) {
      this.mount = m.s
      const done = this.mount.ack[this.me] ?? 0
      for (const [n, at] of this.sent) {
        if (n > done) continue
        const ms = performance.now() - at
        this.rtt = this.rtt === null ? ms : this.rtt * 0.7 + ms * 0.3
        this.sent.delete(n)
      }
    }
  }

  // ---------- per frame ----------

  private envFor(i: number, secs: number): Env {
    const b = this.bodies[i]
    const heads: Env['heads'] = []
    this.s.actors.forEach((_, j) => {
      if (j === i) return
      const p = this.posOf(j)
      if (this.modeOf(j) === 'ground') heads.push(p)
    })
    const lit = this.t.camps.filter((_, k) => k <= this.mount.lit)
    const warm = lit.some((c) => Math.hypot(c.x - b.x, c.z - b.z) < CAMP_R && Math.abs(c.y - b.y) < 3)
    let lift = 0
    for (const u of this.t.updrafts) if (Math.hypot(u.x - b.x, u.z - b.z) < u.r && b.y < u.a && b.y > u.y - 40) lift = 9
    const storm = stormAt(this.t, this.s.opts.weather, secs)
    const w = this.skyNow(secs)
    const wind = windAt(this.t, this.s.opts.weather, secs, b.y)
    return {
      t: this.t,
      ropes: [...this.t.vines, ...this.mount.ropes],
      heads,
      broken: new Set(this.broken.keys()),
      wind: [wind[0] * w.gust, wind[1] * w.gust],
      coldK: (1 + storm * 2.5 + (this.s.opts.weather === 'ekstrem' ? 0.5 : 0)) * w.cold,
      warm,
      lift,
      wet: w.wet,
    }
  }

  private worldMove(): Input {
    const F = [Math.sin(this.camYaw), Math.cos(this.camYaw)]
    const R = [-Math.cos(this.camYaw), Math.sin(this.camYaw)]
    const mx = F[0] * this.input.y + R[0] * this.input.x
    const mz = F[1] * this.input.y + R[1] * this.input.x
    const b = this.body
    let side = this.input.x
    if (b && (b.mode === 'climb' || b.mode === 'rope')) {
      const [gx, gz] = gradAt(this.t, b.x, b.z)
      const l = Math.hypot(gx, gz) || 1
      side = mx * (-gz / l) + mz * (gx / l)
    }
    const len = Math.hypot(this.input.x, this.input.y)
    return { mx, mz, up: this.input.y, side, jump: this.input.jump, grip: this.input.grip, sprint: len > 0.3 && (this.input.run || len > 0.93) }
  }

  private stepMe(dt: number, secs: number) {
    if (this.me < 0) return
    const b = this.body
    const inp = this.worldMove()
    this.input.jump = false
    if (this.mount.down[this.me] !== null && b.mode !== 'down') b.mode = 'down'
    const ev = stepBody(b, inp, this.envFor(this.me, secs), dt)
    this.hazards(b, secs, dt, true)
    this.events(this.me, ev)
    // kamera ikut menghadap dinding saat memanjat (kalau tidak sedang digeser)
    if ((b.mode === 'climb' || b.mode === 'rope') && performance.now() - this.lookAt > 1500) {
      const d = Math.atan2(Math.sin(b.yaw - this.camYaw), Math.cos(b.yaw - this.camYaw))
      this.camYaw += d * Math.min(1, dt * 1.5)
    }
    if (b.mode === 'down' && this.mount.down[this.me] === null && performance.now() - this.downSent > 1500) {
      this.downSent = performance.now()
      this.request({ op: 'down' })
    }
  }

  private hazards(b: Body, secs: number, dt: number, mine: boolean) {
    for (const h of hitHazards(this.t, b, secs, dt)) {
      if (!mine) continue
      const snd: Record<typeof h.k, Sound> = { batu: 'batu', uap: 'uap', kepiting: 'jatuh', lebah: 'sengat', kelelawar: 'jatuh' }
      this.o.onSound(snd[h.k], 0.9)
      if (h.k === 'batu') this.o.onPop({ text: 'Awas batu!', tone: 'rose' })
      if (h.k === 'uap') this.o.onPop({ text: 'Fuuush! Panas!', tone: 'rose' })
    }
  }

  private events(i: number, ev: BodyEvent[]) {
    const mine = i === this.me
    const b = this.bodies[i]
    for (const e of ev) {
      if (e.k === 'down') {
        if (mine) {
          this.o.onSound('pingsan', 1)
          this.o.onPop({ text: e.why === 'lava' ? 'Kecebur lava!' : e.why === 'awan' ? 'Jatuh ke awan!' : 'Pingsan!', tone: 'rose' })
          this.downSent = performance.now()
        }
        this.request2(i, { op: 'down' })
      }
      if (!mine) continue
      if (e.k === 'jump') this.o.onSound('lompat', 0.5)
      if (e.k === 'grab') this.o.onSound('pegang', 0.7)
      if (e.k === 'top') this.o.onSound('pegang', 0.5)
      if (e.k === 'splash') {
        this.o.onSound('cebur', 0.9)
        this.scene.puff('splash', b.x, b.y + 0.4, b.z, 12)
      }
      if (e.k === 'land') {
        this.o.onSound('jatuh', Math.min(1, 0.3 + e.drop / 12))
        this.scene.puff(b.surface === 'salju' ? 'snow' : 'dust', b.x, b.y, b.z, Math.min(16, 4 + Math.round(e.drop)))
        if (e.hurt > 0.05) this.o.onPop({ text: 'Aduh! Kaki keseleo', tone: 'rose' })
      }
      if (e.k === 'tired') this.o.onPop({ text: 'Tangan lemas!', tone: 'rose' })
      if (e.k === 'slip') this.o.onSound('napas', 0.8)
    }
  }

  /** aksi atas nama aktor lokal (pemain sendiri atau bot di host) */
  private request2(i: number, op: Op) {
    if (i === this.me) this.request(op)
    else if (this.host) this.apply(i, op)
  }

  private stepBots(dt: number, secs: number) {
    const mates = this.s.actors.map((a, j) => ({ actor: j, body: this.isLocal(j) ? this.bodies[j] : this.asBody(j), down: this.mount.down[j] !== null, human: a.seat !== null, progress: this.progress[j] }))
    this.bots.forEach((bot, i) => {
      if (!bot) return
      const b = this.bodies[i]
      if (this.mount.down[i] !== null) {
        b.mode = 'down'
        return
      }
      const it = thinkBot(this.t, bot, b, this.s.opts.level, dt, mates.filter((m) => m.actor !== i))
      if (it.teleport) Object.assign(b, { x: it.teleport.x, y: it.teleport.y, z: it.teleport.z, mode: 'air', vy: 0, peak: it.teleport.y })
      if (it.revive !== null) this.apply(i, { op: 'revive', to: it.revive })
      if (it.pull !== null) this.apply(i, { op: 'pull', to: it.pull, x: b.x, y: b.y, z: b.z })
      const ev = stepBody(b, it.input, this.envFor(i, secs), dt)
      // bot tidak kehabisan tenaga; lelahnya ringan
      b.stamina = Math.max(b.stamina, 0.5 + this.s.opts.level * 0.15)
      b.fat.hunger = Math.min(b.fat.hunger, 0.1)
      this.hazards(b, secs, dt, false)
      this.events(i, ev)
      this.progress[i] = bot.wp
    })
  }

  private asBody(j: number): Body {
    const r = this.remotes[j]
    const b = newBody(r.x, r.y, r.z, r.yaw)
    b.mode = r.mode
    return b
  }

  /** papan kristal pecah setelah dipijak sebentar, lalu tumbuh lagi */
  private fragile(dt: number, now: number) {
    for (const [id, at] of this.broken) if (now - at > FRAGILE_BACK * 1000) this.broken.delete(id)
    for (const d of this.t.decks) {
      if (!d.fragile || this.broken.has(d.id)) continue
      const on = this.s.actors.some((_, i) => {
        const p = this.posOf(i)
        return Math.hypot(p.x - d.x, p.z - d.z) < d.hz + 0.5 && Math.abs(p.y - d.top) < 1.2
      })
      const t = (this.standing.get(d.id) ?? 0) + (on ? dt : -dt)
      this.standing.set(d.id, Math.max(0, t))
      if (t > FRAGILE_SECS) {
        this.broken.set(d.id, now)
        this.standing.set(d.id, 0)
        this.o.onSound('batu', 0.6)
        this.scene.particles.burst('spark', 18, d.x, d.top, d.z, 0, 2, 0, 4, ['#b48cff', '#7ae8ff', '#ffffff'], 0.6)
      }
    }
  }

  private hostTick(dt: number) {
    const m = this.mount
    m.t += dt * 1000
    const bots = this.s.actors.map((a) => a.seat === null)
    if (tickDown(m, this.t, bots)) this.dirty = true
    // api unggun menyala saat ada yang sampai
    this.s.actors.forEach((_, i) => {
      if (m.down[i] !== null) return
      const p = this.posOf(i)
      this.t.camps.forEach((c, k) => {
        if (k > m.lit && Math.hypot(c.x - p.x, c.z - p.z) < CAMP_R && Math.abs(c.y - p.y) < 4 && lightCamp(m, k)) this.dirty = true
      })
    })
    if (this.fired) return
    const humans = this.s.actors.map((a, i) => (a.seat !== null ? i : -1)).filter((i) => i >= 0)
    const sm = this.t.summit
    const atTop = humans.length > 0 && humans.every((i) => {
      const p = this.posOf(i)
      return m.down[i] === null && Math.hypot(p.x - sm.x, p.z - sm.z) < SUMMIT_R && p.y > sm.y - 3
    })
    if (atTop || m.lives <= 0) {
      this.fired = true
      // kirim isi terakhir dulu supaya HP lain melihat keadaan akhir
      this.o.live?.send({ k: 'mnt', s: cloneMount(m) } satisfies Wire)
      this.o.act({ type: 'finish', result: { win: atTop, secs: Math.round(m.t / 1000), falls: m.falls, items: m.used, camp: m.lit, lives: m.lives } })
    }
  }

  /** kejadian dari host: diterapkan ke badan lokal (pemain sendiri; bot di host) */
  private fxTick() {
    for (const f of this.mount.fx) {
      if (f.n <= this.seenFx) continue
      this.seenFx = f.n
      this.applyFx(f)
    }
  }

  private applyFx(f: Fx) {
    const locals = this.bodies.map((_, i) => i).filter((i) => this.isLocal(i))
    const name = (a: number) => (a === this.me ? 'Kamu' : this.o.nameOf(a))
    switch (f.kind) {
      case 'open':
        this.o.onSound('peti', 0.8)
        if (f.actor === this.me) this.o.onPop({ text: `Dapat: ${f.items.map((i) => ITEMS[i].title).join(', ')}`, tone: 'electric' })
        break
      case 'pick':
        if (f.actor === this.me) {
          this.o.onSound('ambil', 0.8)
          this.o.onPop({ text: ITEMS[f.item].title, tone: 'electric' })
        }
        break
      case 'full':
        if (f.actor === this.me) this.o.onPop({ text: 'Tas penuh (4 slot)', tone: 'paper' })
        break
      case 'give':
        if (f.to === this.me) this.o.onPop({ text: `${name(f.actor)} kasih ${ITEMS[f.item].title}`, tone: 'electric' })
        if (f.to === this.me || f.actor === this.me) this.o.onSound('ambil', 0.7)
        break
      case 'use': {
        const item = f.item
        if (item === 'peluit') {
          this.o.onSound('peluit', f.actor === this.me ? 0.8 : 1)
          if (f.actor !== this.me) this.o.onPop({ text: `${name(f.actor)} memanggil!`, tone: 'rose' })
          this.scene.particles.burst('star', 20, f.x, f.y + 2, f.z, 0, 4, 0, 3, ['#ffcc1f', '#ffffff'], 0.8)
        }
        for (const i of locals) {
          const b = this.bodies[i]
          if (item === 'piknik' ? Math.hypot(b.x - f.x, b.z - f.z) < 6 : i === f.actor) {
            const warm = this.envFor(i, this.mount.t / 1000).warm
            const out = applyToBody(b, this.t, item, { warm, lucky: f.lucky })
            if (i === this.me) {
              this.o.onPop({ text: out.text, tone: out.good === false ? 'rose' : 'electric' })
              this.o.onSound(ITEMS[item].kind === 'makan' ? 'makan' : item === 'paku' || item === 'tangga' || item === 'kait' ? 'tali' : 'pakai', 0.8)
            }
          }
        }
        if (item === 'suar') this.scene.particles.burst('fire', 24, f.x, f.y + 1, f.z, 0, 6, 0, 2, ['#ff2a2a', '#ffb347'], 1)
        break
      }
      case 'down':
        if (f.actor !== this.me) {
          this.o.onPop({ text: `${name(f.actor)} pingsan! Bangunkan`, tone: 'rose' })
          this.o.onSound('pingsan', 0.6)
        }
        break
      case 'revive':
        for (const i of locals) {
          if (i !== f.actor) continue
          const b = this.bodies[i]
          b.mode = 'ground'
          b.y = groundTop(this.t, b.x, b.z)
          b.peak = b.y
          b.stamina = 0.45
        }
        this.o.onSound('bangun', 0.8)
        if (f.actor === this.me) this.o.onPop({ text: `${name(f.by)} membangunkanmu`, tone: 'electric' })
        break
      case 'pull':
        for (const i of locals) {
          if (i !== f.actor) continue
          const b = this.bodies[i]
          Object.assign(b, { x: f.x, y: groundTop(this.t, f.x, f.z), z: f.z, mode: 'ground', vx: 0, vy: 0, vz: 0, rope: null })
          b.peak = b.y
        }
        if (f.actor === this.me) this.o.onPop({ text: `Ditarik ${name(f.by)}!`, tone: 'electric' })
        this.o.onSound('pegang', 0.6)
        break
      case 'respawn':
        f.actors.forEach((a, k) => {
          if (!locals.includes(a)) return
          const b = this.bodies[a]
          const x = f.x + Math.cos(k * 2.1) * 1.5
          const z = f.z + Math.sin(k * 2.1) * 1.5
          Object.assign(b, { x, y: groundTop(this.t, x, z) + 0.2, z, mode: 'air', vx: 0, vy: 0, vz: 0, rope: null, umbrella: false })
          b.peak = b.y
          b.stamina = maxStamina(b)
          b.fat.fall = Math.max(0, b.fat.fall - 0.2)
        })
        if (f.actors.includes(this.me)) {
          this.o.onPop({ text: f.life ? 'Kembali ke api unggun · nyawa −1' : 'Kembali ke api unggun', tone: 'rose' })
          this.o.onSound('bangun', 0.6)
        }
        if (f.actors.some((a) => this.bots[a] && this.host)) {
          f.actors.forEach((a) => {
            const bot = this.bots[a]
            if (bot) bot.wp = routeIndexNear(this.t, this.bodies[a].x, this.bodies[a].y, this.bodies[a].z)
          })
        }
        break
      case 'camp':
        this.o.onSound('api', 1)
        this.o.onPop({ text: f.zone + 1 < this.t.zones ? `Api unggun ${f.zone + 1} menyala! ${this.t.m.zones[f.zone].title}` : 'Api unggun terakhir!', tone: 'electric' })
        break
    }
  }

  /** tombol aksi: peti/barang/teman di dekat badan sendiri */
  private actionNear(): Action {
    if (this.me < 0) return null
    const b = this.body
    if (b.mode === 'down') return null
    const m = this.mount
    for (let i = 0; i < this.s.actors.length; i++) {
      if (i === this.me) continue
      const p = this.posOf(i)
      const d = Math.hypot(p.x - b.x, p.z - b.z)
      if (m.down[i] !== null && d < 2.2 && Math.abs(p.y - b.y) < 2.5) return { kind: 'revive', label: 'Bangunkan', id: i }
      const mode = this.modeOf(i)
      if ((mode === 'climb' || mode === 'rope') && b.mode === 'ground' && d < 3 && p.y < b.y - 0.8 && p.y > b.y - 4.5) return { kind: 'pull', label: 'Tarik', id: i }
    }
    for (const d of m.drops) if (Math.hypot(d.x - b.x, d.z - b.z) < 1.8 && Math.abs(d.y - b.y) < 2) return { kind: 'pick', label: 'Ambil', id: d.id }
    for (const c of this.t.chests) if (!m.opened.includes(c.id) && Math.hypot(c.x - b.x, c.z - b.z) < 2.2 && Math.abs(c.y - b.y) < 2) return { kind: 'open', label: c.kind === 'peti' ? 'Buka peti' : c.kind === 'tas' ? 'Buka tas' : 'Ambil sarang', id: c.id }
    const warm = this.t.camps.some((c, k) => k <= m.lit && Math.hypot(c.x - b.x, c.z - b.z) < CAMP_R)
    if (warm && m.inv[this.me]?.includes('mi')) return { kind: 'cook', label: 'Masak mi', id: 0 }
    return null
  }

  private giveTarget(): number | null {
    if (this.me < 0) return null
    const b = this.body
    let best: number | null = null
    let bd = 3
    this.s.actors.forEach((_, i) => {
      if (i === this.me || this.mount.down[i] !== null) return
      const p = this.posOf(i)
      const d = Math.hypot(p.x - b.x, p.z - b.z)
      if (d < bd && Math.abs(p.y - b.y) < 2) {
        bd = d
        best = i
      }
    })
    return best
  }

  private send(dt: number) {
    const live = this.o.live
    if (!live) return
    this.sendIn -= dt
    if (this.sendIn <= 0) {
      this.sendIn = SEND_EVERY
      const a: Pose[] = []
      const add = (i: number) => {
        const b = this.bodies[i]
        a.push([i, r2(b.x), r2(b.y), r2(b.z), r2(b.yaw), MODES.indexOf(b.mode), b.moving ? 1 : 0, b.umbrella ? 1 : 0])
      }
      if (this.me >= 0) add(this.me)
      if (this.host) this.s.actors.forEach((x, i) => x.seat === null && add(i))
      if (a.length) live.send({ k: 'pose', a } satisfies Wire)
    }
    if (!this.host) return
    this.mntIn -= dt
    if ((this.dirty && this.mntIn <= MNT_BEAT - MNT_MIN) || this.mntIn <= 0) {
      this.mntIn = MNT_BEAT
      this.dirty = false
      live.send({ k: 'mnt', s: cloneMount(this.mount) } satisfies Wire)
    }
  }

  private applyBodies(dt: number) {
    const k = 1 - Math.exp(-dt * 12)
    this.roots.forEach((root, i) => {
      const local = this.isLocal(i)
      const p = local ? this.bodies[i] : this.remotes[i]
      const mode = local ? this.bodies[i].mode : this.remotes[i].mode
      // memanjat: badan sedikit keluar dari permukaan tebing
      let ox = 0
      let oz = 0
      if (mode === 'climb') {
        ox = -Math.sin(p.yaw) * 0.32
        oz = -Math.cos(p.yaw) * 0.32
      }
      const tx = p.x + ox
      const ty = p.y + (mode === 'swim' ? -0.85 : 0)
      const tz = p.z + oz
      if (local) root.position.set(tx, ty, tz)
      else {
        root.position.x += (tx - root.position.x) * k
        root.position.y += (ty - root.position.y) * k
        root.position.z += (tz - root.position.z) * k
      }
      const turn = Math.atan2(Math.sin(p.yaw - root.rotation.y), Math.cos(p.yaw - root.rotation.y))
      root.rotation.y += turn * Math.min(1, k * 1.6)
      const c = this.chibis[i]
      if (!c) return
      const moving = local ? this.bodies[i].moving : this.remotes[i].moving
      // laju teramati dari pergeseran badan (sama untuk pemain lokal & jarak jauh)
      const last = (this.lastPos[i] ??= root.position.clone())
      const dx = root.position.x - last.x
      const dz = root.position.z - last.z
      const dy = root.position.y - last.y
      last.copy(root.position)
      const sp = dt > 0 ? Math.min(12, Math.hypot(dx, dz) / dt) : 0
      const vy = dt > 0 ? dy / dt : 0
      this.speeds[i] = (this.speeds[i] ?? 0) + (sp - (this.speeds[i] ?? 0)) * Math.min(1, dt * 8)
      const lunge = local && this.bodies[i].lunge > 0
      const sideways = local && i === this.me && Math.abs(this.input.x) > Math.abs(this.input.y) + 0.2
      const pick = (): [ClimbClip, number, boolean] => {
        if (this.s.phase === 'end') return ['cheer', 1, false]
        switch (mode) {
          case 'down':
            return ['ko', 1, true]
          case 'ground':
            if (!moving) return ['idle', 1, false]
            return this.speeds[i] > 4.6 ? ['run', 1.1, false] : ['walk', Math.max(0.8, this.speeds[i] / 2.4), false]
          case 'swim':
            return ['swim', 1, false]
          case 'climb':
            if (lunge) return ['lunge', 1, true]
            if (!moving) return ['climb_idle', 1, false]
            return [sideways ? 'climb_side' : 'climb_up', 1, false]
          case 'rope':
            return moving ? ['climb_up', 0.8, false] : ['hang', 1, false]
          case 'slide':
            return ['slide', 1, false]
          default:
            return [vy > 0.5 ? 'jump' : 'fall', 1, vy > 0.5]
        }
      }
      const [clip, speed, once] = pick()
      if (clip !== this.anims[i]) {
        this.anims[i] = clip
        c.play(clip, { once, speed })
      } else c.speed(speed)
      c.update(dt)
    })
  }

  private time = 0
  /** dev: ?wx=hujan|badai|pasir|abu|salju|kabut|berawan memaksa cuaca penuh (screenshot & uji) */
  private forced = import.meta.env.DEV ? (new URLSearchParams(location.search).get('wx') as Sky | null) : null
  private skyNow(secs: number) {
    const w = weatherAt(this.t, this.s.opts.weather, secs)
    if (!this.forced) return w
    const rainy = this.forced === 'hujan' || this.forced === 'badai'
    return { ...w, sky: this.forced, k: 1, wet: rainy ? 1 : 0, cold: this.forced === 'salju' ? 2.2 : 1, gust: this.forced === 'badai' || this.forced === 'pasir' ? 1.9 : 1 }
  }
  private sky: Sky | null = null

  private frame = (now: number) => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    this.time += dt
    if (this.host) this.hostTick(dt)
    else this.mount.t += dt * 1000
    const secs = this.mount.t / 1000
    this.fxTick()
    this.stepMe(dt, secs)
    if (this.host) this.stepBots(dt, secs)
    this.fragile(dt, now)
    if (this.me >= 0) {
      const b = this.body
      this.progress[this.me] = routeIndexNear(this.t, b.x, b.y, b.z, this.progress[this.me], 30)
    }
    this.s.actors.forEach((a, i) => {
      if (a.seat !== null && i !== this.me) {
        const p = this.remotes[i]
        this.progress[i] = routeIndexNear(this.t, p.x, p.y, p.z, this.progress[i], 30)
      }
    })
    this.send(dt)
    this.applyBodies(dt)
    const focus = this.me >= 0 ? this.body : this.bodies[0]
    const mine = this.me >= 0 ? this.chibis[this.me] : null
    if (this.fp && mine && this.body.mode !== 'down') {
      mine.eye(this.eyeV)
      // tulang kepala ada di leher: mata ±0,24 m di atasnya (skala model)
      this.eyeV.y += 0.24 * this.chibiScale
      // memanjat: pandangan pelan-pelan mendongak ke tebing
      if ((this.body.mode === 'climb' || this.body.mode === 'rope') && performance.now() - this.lookAt > 1500) this.fpPitch += (0.62 - this.fpPitch) * Math.min(1, dt * 1.2)
      this.scene.followFP(this.eyeV.x, this.eyeV.y, this.eyeV.z, this.camYaw, this.fpPitch, dt)
    } else this.scene.follow(focus.x, focus.y, focus.z, this.camYaw, this.camPitch, this.camDist, dt)
    const storm = stormAt(this.t, this.s.opts.weather, secs)
    const w = this.skyNow(secs)
    const w0 = windAt(this.t, this.s.opts.weather, secs, focus.y)
    const wind: [number, number] = [w0[0] * w.gust, w0[1] * w.gust]
    if (w.sky !== this.sky && (w.k > 0.05 || w.sky === 'cerah')) {
      if (w.sky !== 'cerah' || this.sky !== null) this.o.onPop({ text: SKY_POP[w.sky], tone: w.sky === 'cerah' ? 'electric' : w.sky === 'badai' ? 'rose' : 'paper' })
      this.sky = w.sky
    }
    this.scene.sync(this.mount, secs, new Set(this.broken.keys()), dt, this.me >= 0 ? { x: focus.x, y: focus.y, z: focus.z, torch: focus.buffs.obor > 0 || this.t.m.sky === 'malam' } : null)
    this.scene.weather(storm, wind, dt, w, secs)
    if (this.scene.thunder) {
      this.scene.thunder = false
      this.o.onSound('batu', 0.7)
    }
    this.sounds(dt, focus)
    this.scene.render(dt)
    this.watchFps(now)
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.1
      this.pushHud(storm, Math.hypot(...wind), w.sky, w.k)
    }
  }

  private sounds(dt: number, b: Body) {
    if (this.me < 0) return
    this.stepIn -= dt
    this.breathIn -= dt
    if (b.mode === 'ground' && b.moving && this.stepIn <= 0) {
      this.stepIn = Math.hypot(b.vx, b.vz) > 4.6 ? 0.27 : 0.38
      this.o.onSound('langkah', 0.35)
    }
    if ((b.mode === 'climb' || b.mode === 'rope') && b.moving && this.stepIn <= 0) {
      this.stepIn = 0.55
      this.o.onSound('pegang', 0.25)
    }
    if (b.stamina < 0.25 && b.mode === 'climb' && this.breathIn <= 0) {
      this.breathIn = 1.4
      this.o.onSound('napas', 0.6)
    }
  }

  private watchFps(now: number) {
    this.frames++
    if (now - this.fpsAt < 1000) return
    this.fps = Math.round((this.frames * 1000) / (now - this.fpsAt))
    this.frames = 0
    this.fpsAt = now
    this.slow = this.fps < 24 ? this.slow + 1 : 0
    if (this.slow >= 4) {
      this.slow = 0
      this.scene.lowerQuality()
    }
  }

  private pushHud(storm: number, wind: number, sky: Sky, skyK: number) {
    const m = this.mount
    const b = this.me >= 0 ? this.body : this.bodies[0]
    const cam = this.scene.camera
    const v = new THREE.Vector3()
    const marks: Hud['marks'] = []
    this.s.actors.forEach((_, i) => {
      if (i === this.me) return
      const p = this.posOf(i)
      v.set(p.x, p.y + 2, p.z).project(cam)
      const behind = v.z > 1
      const off = behind || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.9
      const x = behind ? -v.x : v.x
      const y = behind ? -v.y : v.y
      marks.push([i, Math.max(4, Math.min(96, (x * 0.5 + 0.5) * 100)), Math.max(8, Math.min(88, (-y * 0.5 + 0.5) * 100)), Math.round(Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z)), m.down[i] !== null, off])
    })
    const chests: Hud['chests'] = []
    if (b.buffs.teropong > 0) {
      for (const c of this.t.chests) {
        if (m.opened.includes(c.id) || Math.hypot(c.x - b.x, c.z - b.z) > 70) continue
        v.set(c.x, c.y + 1, c.z).project(cam)
        if (v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1) chests.push([(v.x * 0.5 + 0.5) * 100, (-v.y * 0.5 + 0.5) * 100])
      }
    }
    const next = this.t.camps[m.lit + 1] ?? this.t.summit
    const compass: Hud['compass'] =
      b.buffs.kompas > 0 ? [Math.atan2(next.x - b.x, next.z - b.z) - this.camYaw, Math.round(Math.hypot(next.x - b.x, next.z - b.z))] : null
    const zi = zoneAt(this.t, b.x, b.z)
    const d = m.down[this.me]
    this.o.onHud({
      stamina: b.stamina,
      max: maxStamina(b),
      fat: { ...b.fat },
      mode: b.mode,
      buffs: { ...b.buffs },
      inv: m.inv[this.me] ?? [],
      action: this.actionNear(),
      giveTo: this.giveTarget(),
      alt: Math.round(b.y - (this.t.m.sea?.y ?? 0)),
      zone: this.t.m.zones[Math.min(zi, this.t.zones - 1)].title,
      zoneIndex: zi,
      lives: m.lives,
      lit: m.lit,
      secs: Math.floor(m.t / 1000),
      marks,
      chests,
      compass,
      downLeft: d !== null && d !== undefined ? Math.max(0, Math.ceil(30 - (m.t - d) / 1000)) : null,
      storm,
      sky,
      skyK,
      wind,
      umbrella: b.umbrella,
      summit: Math.hypot(this.t.summit.x - b.x, this.t.summit.z - b.z) < SUMMIT_R,
      fps: this.fps,
      rtt: this.host ? null : this.rtt,
    })
  }

  dispose() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.stopLive?.()
    this.o.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.scene.dispose()
  }
}
