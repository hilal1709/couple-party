import * as THREE from 'three'
import { buzz, setHaptics } from './platform/haptics'
import type { PuncakSettings } from './platform/settings'
import { FrameStats, Governor, shouldDraw } from './render/perf'
import { profileFor, ratioFor, type Profile } from './render/quality'
import { randomLook, type PuncakLook } from './look'
import { AnimPicker, type AnimIn } from './render/animPick'
import { Climber, loadClimber } from './render/climber'
import type { LiveChannel, Seat } from '../types'
import { actorOf } from './engine'
import { MountainScene } from './render/scene'
import { newBot, routeIndexNear, thinkBot, type Bot } from './sim/bots'
import { drain, easeFatigue, fatigueTotal, maxStamina, newBody, stepBody, type Body, type BodyEvent, type Env, type Input, type Mode } from './sim/climb'
import { hitHazards, stormAt, weatherAt, windAt, type Sky } from './sim/hazards'
import { applyToBody, ITEMS, planRope, type ItemId } from './sim/items'
import { CAMP_R, campGather, campRevive, carrierOf, carry, cloneMount, dropItem, give, LIVES, lightCamp, newMount, openChest, pick, pull, putDown, REACH, revive, setDown, stash, throwItem, tickDown, spendItem, unstash, type Fx, type Mount } from './sim/mount'
import { buildWorld, loadRapier, type ClimbWorld } from './sim/world'
import { isNetMsg, MODES, ratesFor, packCore, packInput, packSlow, ratesFromQuery, SIM_DT, unpackCore, unpackInput, unpackSlow, type NetMsg, type NetRates, type SnapMsg } from './net/protocol'
import { HostClock, InputQueue, Interp, Predictor } from './net/sync'
import { buildTerrain, gradAt, groundTop, zoneAt, type Terrain } from './sim/terrain'
import type { Sound } from './sounds'
import type { PuncakAction, PuncakState } from './types'

const MNT_MIN = 0.25
const MNT_BEAT = 1
const SUMMIT_R = 7
const FRAGILE_SECS = 1.3
const FRAGILE_BACK = 6
type Op =
  | { op: 'open'; chest: number }
  | { op: 'pick'; drop: number }
  | { op: 'use'; slot: number; x: number; y: number; z: number; rope: ReturnType<typeof planRope> }
  | { op: 'drop'; slot: number; x: number; y: number; z: number }
  | { op: 'give'; slot: number; to: number }
  | { op: 'down' }
  | { op: 'revive'; to: number }
  | { op: 'pull'; to: number; x: number; y: number; z: number }
  | { op: 'stash'; slot: number }
  | { op: 'unstash'; bag: number }
  | { op: 'throw'; slot: number }
  | { op: 'carry'; to: number }
  | { op: 'putdown' }
/** gerak = NetMsg (input/snapshot/ping); aksi & isi gunung tetap lewat 'do' + 'mnt' (dikirim ulang sampai di-ack) */
type Wire = NetMsg | ({ k: 'do'; a: number; n: number } & Op) | { k: 'mnt'; s: Mount }

/** kualitas jaringan untuk HUD (null = host / main sendiri) */
export type NetInfo = { q: 'baik' | 'lemah' | 'putus'; loss: number; synced: boolean } | null

const r2 = (v: number) => Math.round(v * 100) / 100

export type Action = { kind: 'open' | 'pick' | 'revive' | 'pull' | 'cook' | 'carry' | 'putdown'; label: string; id: number } | null

export type Hud = {
  stamina: number
  max: number
  fat: Body['fat']
  mode: Mode
  buffs: Body['buffs']
  inv: (ItemId | null)[]
  /** isi ransel; hanya bisa dibongkar saat berdiri */
  bag: (ItemId | null)[]
  canBag: boolean
  /** stamina bonus (bar kedua) */
  bonus: number
  /** sedang menggendong teman (aktor) */
  carrying: number | null
  /** di api unggun yang belum menyala: berapa pendaki sudah berkumpul */
  campWait: { have: number; need: number } | null
  /** suasana: kekuatan suara hutan, air terjun, dan api unggun (0..1) */
  amb: { hutan: number; air: number; api: number }
  /** musik zona tinggi (tebing ke atas, atau badai) */
  high: boolean
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
  net: NetInfo
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
  settings: PuncakSettings
  /** konteks WebGL hilang (true) / pulih (false) */
  onGl?: (lost: boolean) => void
}

export type Perf = ReturnType<FrameStats['read']> & ReturnType<MountainScene['stats']> & { scale: number; q: string; cap: number }

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
  private vys: number[] = []
  private yaws: number[] = []
  private turns: number[] = []
  private pickers: AnimPicker[] = []
  /** dunia tabrakan panjat (Rapier); null sampai WASM selesai dimuat */
  private world: ClimbWorld | null = null
  private frustum = new THREE.Frustum()
  private lodMat = new THREE.Matrix4()
  private lodSphere = new THREE.Sphere(new THREE.Vector3(), 1.6)
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
  private mntIn = 0
  // ---------- jaringan (host-otoritatif) ----------
  private rates: NetRates
  /** klien: prediksi badan sendiri */
  private pred = new Predictor()
  /** host: antrean input per pemain */
  private queues: InputQueue[] = []
  /** klien: buffer interpolasi per aktor lain */
  private interps: Interp[] = []
  private clock = new HostClock()
  /** klien: sudah menerima keadaan dari host (sebelum itu badan sendiri tidak disimulasikan) */
  private synced = false
  private lastSnap = 0
  private snapN = 0
  private snapSeen = 0
  private snapGot = 0
  private snapMissed = 0
  private needIn = 0
  private inAcc = 0
  private snapAcc = 0
  private simAcc = 0
  /** posisi sebelum tick terakhir (badan lokal digambar di antara dua tick) */
  private prev: { x: number; y: number; z: number }[] = []
  private wantFull = true
  private pingIn = 0
  private pingId = 0
  private pings = new Map<number, number>()
  private dirty = false
  private seenFx = 0
  private seq = 0
  private ops = new Map<number, Wire>()
  private opsIn = 0
  private rtt: number | null = null
  private hudIn = 0
  private frames = 0
  private fpsAt = 0
  private fps = 60
  private profile: Profile
  private gov: Governor
  private stats = new FrameStats()
  private lastDrawn = 0
  /** aplikasi di latar / konteks GL hilang: loop berhenti */
  private paused = false
  /** menu jeda saat main sendiri: dunia berhenti, gambar tetap jalan */
  private frozen = false
  private sens = 1
  private invertY = false
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
    this.profile = profileFor(o.settings.gfx)
    this.gov = new Governor({ target: this.profile.fps, minScale: this.profile.minScale, steps: this.profile.steps })
    this.scene = new MountainScene(o.canvas, this.profile.tier)
    this.applySettings(o.settings)
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
      this.queues.push(new InputQueue())
      this.interps.push(new Interp())
      this.prev.push({ x, y, z })
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
    // tanpa saluran live (main sendiri / demo) HP ini langsung jadi otoritas
    this.synced = this.host || !o.live
    // laju jaringan menurut jumlah pemain manusia (kuota Supabase); dev: ?net=in:15,snap:12
    const humans = o.state.actors.filter((a) => a.seat !== null).length
    this.rates = ratesFromQuery(import.meta.env.DEV ? new URLSearchParams(location.search).get('net') : null, ratesFor(humans))
  }

  private onContextLost = (e: Event) => {
    // preventDefault = minta browser memulihkan konteks; three.js memuat ulang sumber dayanya sendiri
    e.preventDefault()
    this.setPaused(true)
    this.o.onGl?.(true)
  }
  private onContextRestored = () => {
    this.setPaused(false)
    this.o.onGl?.(false)
  }

  /** aplikasi ke latar / kembali. Loop berhenti total supaya baterai & GPU istirahat. */
  setPaused(on: boolean) {
    if (on === this.paused || !this.alive) return
    this.paused = on
    cancelAnimationFrame(this.raf)
    if (!on) {
      this.input.x = this.input.y = 0
      this.lastT = this.lastDrawn = performance.now()
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  /** menu jeda: main sendiri = dunia berhenti; ada teman = dunia jalan terus, hanya input dilepas */
  setFrozen(on: boolean) {
    this.frozen = on
    this.input = { x: 0, y: 0, jump: false, grip: false, run: false }
  }

  applySettings(st: PuncakSettings) {
    this.sens = st.sens
    this.invertY = st.invertY
    setHaptics(st.vibrate)
  }

  /** statistik untuk overlay / laporan performa */
  perf(): Perf {
    return { ...this.stats.read(), ...this.scene.stats(), scale: this.gov.scale, q: this.profile.tier.q, cap: this.profile.fps }
  }

  private resizeNow() {
    const el = this.o.canvas
    const h = el.clientHeight || 1
    this.scene.resize(el.clientWidth || 1, h)
    this.scene.setRatio(ratioFor(this.profile, h, this.gov.scale))
  }

  async start() {
    this.o.canvas.addEventListener('webglcontextlost', this.onContextLost)
    this.o.canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    if (this.o.live) this.stopLive = this.o.live.on((d, from) => this.onLive(d, from))
    this.ro = new ResizeObserver(() => this.resizeNow())
    this.ro.observe(this.o.canvas)
    this.resizeNow()
    // Rapier (WASM) dimuat bersama model; dunia tabrakan panjat dibangun dari medan yang sama di semua HP
    const [gltf] = await Promise.all([
      loadClimber(),
      this.scene.load(this.t),
      loadRapier()
        .then(() => {
          if (this.alive) this.world = buildWorld(this.t)
        })
        .catch((e) => console.warn('Rapier gagal dimuat, panjat memakai heightfield', e)),
    ])
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
    this.lastT = this.lastDrawn = performance.now()
    this.fpsAt = this.lastT
    if (!this.paused) this.raf = requestAnimationFrame(this.frame)
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
    dx *= this.sens
    dy *= this.sens * (this.invertY ? -1 : 1)
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
    else if (a.kind === 'carry') this.request({ op: 'carry', to: a.id })
    else if (a.kind === 'putdown') this.request({ op: 'putdown' })
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

  /** saku → ransel */
  stashSlot(slot: number) {
    if (!this.mount.inv[this.me]?.[slot]) return
    if (this.body.mode !== 'ground') {
      this.o.onPop({ text: 'Buka ransel saat berdiri', tone: 'paper' })
      return
    }
    this.request({ op: 'stash', slot })
  }

  /** ransel → saku */
  unstashSlot(bag: number) {
    if (!this.mount.bag[this.me]?.[bag]) return
    if (this.body.mode !== 'ground') {
      this.o.onPop({ text: 'Buka ransel saat berdiri', tone: 'paper' })
      return
    }
    if (!this.mount.inv[this.me].includes(null)) {
      this.o.onPop({ text: 'Saku penuh', tone: 'paper' })
      return
    }
    this.request({ op: 'unstash', bag })
  }

  /** lempar barang ke arah hadap kamera */
  throwSlot(slot: number) {
    if (!this.mount.inv[this.me]?.[slot] || this.body.mode === 'down') return
    // badan menghadap arah kamera dulu supaya lemparan ke tempat yang dilihat pemain
    if (this.body.mode === 'ground') this.body.yaw = this.camYaw
    this.request({ op: 'throw', slot })
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
    const msg = { k: 'do', a: this.me, n, ...op } satisfies Wire
    // aksi penting dikirim ulang sampai host mengonfirmasi (mount.ack) — saluran live tidak menjamin sampai
    this.ops.set(n, msg)
    this.o.live?.send(msg)
  }

  private posOf(i: number) {
    return this.isLocal(i) ? this.bodies[i] : this.remotes[i]
  }
  private modeOf(i: number) {
    return this.isLocal(i) ? this.bodies[i].mode : this.remotes[i].mode
  }
  /** host menyimulasikan SEMUA badan (otoritas); klien hanya badannya sendiri (prediksi) */
  private isLocal(i: number) {
    return this.host || i === this.me
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
      case 'use': {
        // posisi & tali dihitung host dari badan aslinya, bukan dari angka kiriman klien
        const b = this.bodies[actor]
        const item = m.inv[actor]?.[op.slot]
        const roped = item === 'paku' || item === 'tangga'
        const rope = roped ? planRope(this.t, b, item === 'tangga' ? 'tangga' : 'tali', 0) : null
        if (roped && !rope) break
        ok = spendItem(m, actor, op.slot, { x: r2(b.x), y: r2(b.y), z: r2(b.z) }, rope)
        break
      }
      case 'drop': {
        const b = this.bodies[actor]
        ok = dropItem(m, actor, op.slot, { x: r2(b.x + Math.sin(b.yaw) * 0.8), y: r2(b.y), z: r2(b.z + Math.cos(b.yaw) * 0.8) })
        break
      }
      case 'give': {
        const q = this.posOf(op.to)
        if (q && near(q.x, q.y, q.z, 3)) ok = give(m, actor, op.slot, op.to)
        break
      }
      case 'down':
        // pingsan pemain diputuskan sim host; permintaan klien hanya berlaku kalau badannya memang pingsan
        if (this.bodies[actor].mode === 'down' || this.s.actors[actor]?.seat === null || actor === this.me) ok = setDown(m, actor, fatigueTotal(this.bodies[actor]) >= 0.95)
        break
      case 'revive': {
        const q = this.posOf(op.to)
        // pingsan karena kelelahan (semua segmen penuh) tidak bisa dibangunkan di tempat: gendong ke api unggun
        if (q && near(q.x, q.y, q.z, 2.6)) ok = revive(m, op.to, actor)
        break
      }
      case 'stash': {
        if (this.bodies[actor].mode === 'ground') ok = stash(m, actor, op.slot)
        break
      }
      case 'unstash': {
        if (this.bodies[actor].mode === 'ground') ok = unstash(m, actor, op.bag)
        break
      }
      case 'throw': {
        const b = this.bodies[actor]
        ok = throwItem(m, this.t, actor, op.slot, { x: b.x, y: b.y, z: b.z, yaw: b.yaw }, this.s.actors.map((_, i) => this.posOf(i)))
        break
      }
      case 'carry': {
        const q = this.posOf(op.to)
        if (q && near(q.x, q.y, q.z, 2.4) && this.bodies[actor].mode === 'ground') ok = carry(m, actor, op.to)
        break
      }
      case 'putdown':
        ok = putDown(m, actor)
        break
      case 'pull': {
        const q = this.posOf(op.to)
        const b = this.bodies[actor]
        if (q && Math.hypot(q.x - p.x, q.z - p.z) < 3.4 && q.y < p.y + 0.5 && q.y > p.y - 5) ok = pull(m, op.to, actor, { x: b.x - Math.sin(b.yaw) * 0.6, y: b.y, z: b.z - Math.cos(b.yaw) * 0.6 })
        break
      }
    }
    if (ok) this.dirty = true
  }

  private onLive(d: unknown, from: Seat) {
    const m = d as Wire
    if (isNetMsg(m)) {
      this.onNet(m, from)
      return
    }
    if (m?.k === 'do' && this.host) {
      if (this.s.actors[m.a]?.seat !== from) return
      // kiriman ulang dari aksi yang sudah dijalankan: abaikan
      if (m.n <= (this.mount.ack[m.a] ?? 0)) {
        this.dirty = true
        return
      }
      this.apply(m.a, m as unknown as Op)
      this.mount.ack[m.a] = Math.max(this.mount.ack[m.a] ?? 0, m.n)
      this.dirty = true
    } else if (m?.k === 'mnt' && !this.host && from === 0) {
      this.mount = m.s
      const done = this.mount.ack[this.me] ?? 0
      for (const n of this.ops.keys()) if (n <= done) this.ops.delete(n)
    }
  }

  private onNet(m: NetMsg, from: Seat) {
    const live = this.o.live
    switch (m.k) {
      case 'in': {
        // host: input hanya diterima dari pemilik kursinya
        if (!this.host || m.a === this.me || this.s.actors[m.a]?.seat !== from) return
        this.queues[m.a].push(m.s, m.i)
        return
      }
      case 'need':
        if (!this.host || this.s.actors[m.a]?.seat !== from) return
        this.wantFull = true
        this.snapAcc = 1
        this.dirty = true
        this.mntIn = 0
        return
      case 'ping':
        if (this.host) live?.send({ k: 'pong', id: m.id, to: from } satisfies Wire)
        return
      case 'pong': {
        if (this.host || m.to !== this.o.seat) return
        const at = this.pings.get(m.id)
        if (at === undefined) return
        this.pings.delete(m.id)
        const ms = performance.now() - at
        this.rtt = this.rtt === null ? ms : this.rtt * 0.7 + ms * 0.3
        return
      }
      case 'snap':
        if (!this.host && from === 0) this.onSnap(m)
        return
    }
  }

  /** klien: snapshot host. Badan sendiri diselaraskan; aktor lain masuk buffer interpolasi. */
  private onSnap(m: SnapMsg) {
    if (m.n <= this.snapSeen) return
    if (this.snapSeen && m.n > this.snapSeen + 1) this.snapMissed += m.n - this.snapSeen - 1
    this.snapSeen = m.n
    this.snapGot++
    const now = performance.now()
    this.lastSnap = now
    this.clock.seen(m.ms, now)
    const slow = new Map((m.w ?? []).map((r) => [r[0], r.slice(1)]))
    for (const row of m.b) {
      const [a, ack, ...core] = row
      if (!this.s.actors[a]) continue
      if (a !== this.me) {
        this.interps[a].push(m.ms, { x: core[0], y: core[1], z: core[2], yaw: core[6], mode: core[7], flags: core[15], stamina: core[8] })
        const sl = slow.get(a)
        if (sl) unpackSlow(this.bodies[a], sl)
        this.bodies[a].stamina = core[8]
        continue
      }
      const b = this.bodies[a]
      if (!this.synced) {
        // pertama tersambung (atau tersambung ulang setelah aplikasi dibuka lagi): ambil keadaan host,
        // nomor input dilanjutkan dari ack host supaya input baru tidak dianggap lama
        unpackCore(b, core)
        const sl = slow.get(a)
        if (sl) unpackSlow(b, sl)
        this.pred = new Predictor()
        this.pred.seq = ack
        this.prev[a] = { x: b.x, y: b.y, z: b.z }
        this.mount.t = m.ms
        this.synced = true
        continue
      }
      this.pred.reconcile(b, core, slow.get(a), ack, (bb, inp) => void stepBody(bb, inp, this.envFor(a, this.mount.t / 1000), SIM_DT))
    }
  }

  // ---------- per frame ----------

  private envFor(i: number, secs: number): Env {
    const b = this.bodies[i]
    const heads: Env['heads'] = []
    this.s.actors.forEach((_, j) => {
      if (j === i) return
      const p = this.posOf(j)
      // jadi pijakan: teman yang berdiri, memanjat, atau bergantung di tali bisa diinjak kepalanya
      const md = this.modeOf(j)
      if (md === 'ground' || md === 'climb' || md === 'rope') heads.push(p)
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
      world: this.world ?? undefined,
      ropes: [...this.t.vines, ...this.mount.ropes],
      heads,
      broken: new Set(this.broken.keys()),
      wind: [wind[0] * w.gust, wind[1] * w.gust],
      coldK: (1 + storm * 2.5 + (this.s.opts.weather === 'ekstrem' ? 0.5 : 0)) * w.cold,
      warm,
      lift,
      wet: w.wet,
      load: this.mount.carry[i] !== null && this.mount.carry[i] !== undefined ? 1 : 0,
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
    if (this.me < 0 || !this.synced) return
    const b = this.body
    // input dikuantisasi dulu: host menerapkan nilai yang persis sama dengan prediksi ini
    const packed = packInput(this.worldMove())
    const inp = unpackInput(packed)
    this.input.jump = false
    const seq = this.host ? 0 : this.pred.record(packed)
    if (this.mount.down[this.me] !== null && b.mode !== 'down') b.mode = 'down'
    const ev = stepBody(b, inp, this.envFor(this.me, secs), dt)
    this.hazards(b, secs, dt, true)
    if (!this.host) this.pred.stamp(seq, b)
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
          buzz('down')
          this.o.onPop({ text: e.why === 'lava' ? 'Kecebur lava!' : e.why === 'awan' ? 'Jatuh ke awan!' : 'Pingsan!', tone: 'rose' })
          this.downSent = performance.now()
        }
        this.request2(i, { op: 'down' })
      }
      if (!mine) continue
      if (e.k === 'jump') this.o.onSound('lompat', 0.5)
      if (e.k === 'grab') {
        this.o.onSound('pegang', 0.7)
        buzz('grab')
      }
      if (e.k === 'top') this.o.onSound('pegang', 0.5)
      if (e.k === 'splash') {
        this.o.onSound('cebur', 0.9)
        this.scene.puff('splash', b.x, b.y + 0.4, b.z, 12)
      }
      if (e.k === 'land') {
        this.o.onSound('jatuh', Math.min(1, 0.3 + e.drop / 12))
        this.scene.puff(b.surface === 'salju' ? 'snow' : 'dust', b.x, b.y, b.z, Math.min(16, 4 + Math.round(e.drop)))
        if (e.hurt > 0.05) this.o.onPop({ text: 'Aduh! Kaki keseleo', tone: 'rose' })
        buzz(e.hurt > 0.05 ? 'hardLand' : 'land')
        this.scene.bump(Math.min(0.3, 0.06 + e.drop * 0.025))
      }
      if (e.k === 'tired') this.o.onPop({ text: 'Tangan lemas!', tone: 'rose' })
      if (e.k === 'slip') {
        this.pickers[i]?.trigger('slip')
        this.o.onSound('napas', 0.8)
        buzz('slip')
      }
    }
  }

  /** aksi atas nama aktor lokal (pemain sendiri atau bot di host) */
  private request2(i: number, op: Op) {
    if (i === this.me) this.request(op)
    else if (this.host) this.apply(i, op)
  }

  /** host: badan pemain lain maju sesuai input yang sudah tiba (0, 1, atau beberapa per tick) */
  private stepRemotes(secs: number) {
    this.s.actors.forEach((a, i) => {
      if (i === this.me || a.seat === null) return
      const b = this.bodies[i]
      const { inputs } = this.queues[i].take()
      if (this.mount.down[i] !== null) {
        b.mode = 'down'
        return
      }
      for (const inp of inputs) {
        const ev = stepBody(b, inp, this.envFor(i, secs), SIM_DT)
        this.hazards(b, secs, SIM_DT, false)
        this.events(i, ev)
      }
    })
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

  /** teman pingsan yang digendong menempel di punggung penggendongnya (badan lokal saja) */
  private followCarry() {
    this.mount.carry.forEach((to, c) => {
      if (to === null || !this.isLocal(to)) return
      const p = this.posOf(c)
      const yaw = this.isLocal(c) ? this.bodies[c].yaw : this.remotes[c].yaw
      const b = this.bodies[to]
      Object.assign(b, { x: p.x - Math.sin(yaw) * 0.35, y: p.y + 0.85, z: p.z - Math.cos(yaw) * 0.35, yaw, vx: 0, vy: 0, vz: 0, mode: 'down' })
      b.peak = b.y
    })
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
    if (tickDown(m, this.t, bots, dt * 1000)) this.dirty = true
    // api unggun menyala saat SEMUA pendaki manusia berkumpul (yang pingsan boleh digendong ke sana)
    const pos = this.s.actors.map((_, i) => this.posOf(i))
    const people = this.s.actors.map((a, i) => (a.seat !== null ? i : -1)).filter((i) => i >= 0)
    for (let k = this.t.camps.length - 1; k > m.lit; k--) {
      if (campGather(m, this.t, k, pos, people).ready) {
        if (lightCamp(m, k)) this.dirty = true
        break
      }
    }
    if (campRevive(m, this.t, pos)) this.dirty = true
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
          // bangun dengan segmen status berkurang supaya tidak langsung pingsan lagi; di api unggun beristirahat penuh
          easeFatigue(b, f.camp ? 0.25 : 0.6)
          b.fat.cold = f.camp ? 0 : b.fat.cold
          b.stamina = f.camp ? maxStamina(b) : Math.min(maxStamina(b), 0.45)
        }
        this.o.onSound('bangun', 0.8)
        if (f.actor === this.me) this.o.onPop({ text: `${name(f.by)} membangunkanmu`, tone: 'electric' })
        break
      case 'pull':
        for (const i of locals) {
          const b = this.bodies[i]
          if (i === f.by) drain(b, 0.2)
          if (i !== f.actor) continue
          // tarik tangan: badan terangkat ke tepian lewat gerak naik tepian (bukan teleport)
          const y1 = groundTop(this.t, f.x, f.z)
          Object.assign(b, { mode: 'mantle', vx: 0, vy: 0, vz: 0, rope: null, mantle: { x0: b.x, y0: b.y, z0: b.z, x1: f.x, y1, z1: f.z, t: 0 } })
          b.peak = Math.max(b.y, y1)
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
          b.fat.fall = Math.max(0, b.fat.fall - 0.2)
          easeFatigue(b, 0.6)
          b.stamina = maxStamina(b)
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
      case 'throw':
        this.o.onSound(f.to === this.me ? 'tangkap' : 'lempar', 0.6)
        if (f.to === this.me) this.o.onPop({ text: `Tangkap! ${ITEMS[f.item].title} dari ${name(f.actor)}`, tone: 'electric' })
        else if (f.actor === this.me && f.to !== null) this.o.onPop({ text: `${name(f.to)} menangkap ${ITEMS[f.item].title}`, tone: 'electric' })
        break
      case 'carry':
        if (f.actor === this.me) this.o.onPop({ text: f.on ? `${name(f.by)} menggendongmu` : 'Diturunkan', tone: 'electric' })
        if (f.by === this.me) this.o.onPop({ text: f.on ? `Menggendong ${name(f.actor)} · bawa ke api unggun` : `${name(f.actor)} diturunkan`, tone: 'paper' })
        if (f.by === this.me && f.on) this.o.onSound('gendong', 0.8)
        if (!f.on) {
          // diturunkan di tanah di depan penggendong
          for (const i of locals) {
            if (i !== f.actor) continue
            const b = this.bodies[i]
            b.y = groundTop(this.t, b.x, b.z)
            b.peak = b.y
          }
        }
        break
      case 'stash':
        if (f.actor === this.me) this.o.onSound('ambil', 0.5)
        break
      case 'camp':
        // beristirahat di api unggun baru: dingin hilang, luka berkurang, stamina penuh
        for (const i of locals) {
          const b = this.bodies[i]
          const c = this.t.camps[f.zone]
          if (Math.hypot(c.x - b.x, c.z - b.z) > CAMP_R * 1.5 || b.mode === 'down') continue
          b.fat.cold = 0
          b.fat.heat = 0
          b.fat.fall *= 0.5
          b.fat.hunger = Math.max(0, b.fat.hunger - 0.1)
          b.stamina = maxStamina(b)
        }
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
    const held = m.carry[this.me]
    if (held !== null && held !== undefined) return { kind: 'putdown', label: 'Turunkan', id: held }
    for (let i = 0; i < this.s.actors.length; i++) {
      if (i === this.me) continue
      const p = this.posOf(i)
      const d = Math.hypot(p.x - b.x, p.z - b.z)
      if (m.down[i] !== null && d < 2.2 && Math.abs(p.y - b.y) < 2.5 && carrierOf(m, i) === null) {
        // terlalu lelah untuk dibangunkan di tempat (semua segmen penuh): harus digendong ke api unggun
        if (!m.spent?.[i]) return { kind: 'revive', label: 'Bangunkan', id: i }
        if (b.mode === 'ground') return { kind: 'carry', label: 'Gendong', id: i }
      }
      const mode = this.modeOf(i)
      if ((mode === 'climb' || mode === 'rope') && b.mode === 'ground' && d < 3 && p.y < b.y - 0.8 && p.y > b.y - 4.5) return { kind: 'pull', label: 'Tarik', id: i }
    }
    for (const d of m.drops) if (Math.hypot(d.x - b.x, d.z - b.z) < 1.8 && Math.abs(d.y - b.y) < 2) return { kind: 'pick', label: 'Ambil', id: d.id }
    for (const c of this.t.chests) if (!m.opened.includes(c.id) && Math.hypot(c.x - b.x, c.z - b.z) < 2.2 && Math.abs(c.y - b.y) < 2) return { kind: 'open', label: c.kind === 'peti' ? 'Buka peti' : c.kind === 'tas' ? 'Buka tas' : 'Ambil sarang', id: c.id }
    const warm = this.t.camps.some((c, k) => k <= m.lit && Math.hypot(c.x - b.x, c.z - b.z) < CAMP_R)
    if (warm && m.inv[this.me]?.includes('mi')) return { kind: 'cook', label: 'Masak mi', id: 0 }
    return null
  }

  /** kekuatan suara alam di sekitar pemain */
  private ambience(zi: number, storm: number): Hud['amb'] {
    const b = this.body
    const kind = this.t.kinds?.[Math.min(zi, this.t.zones - 1)]
    const leafy = kind ? ({ kemah: 0.45, hutan: 1, batu: 0.3, tebing: 0.12, punggung: 0, puncak: 0 } as const)[kind] : this.t.m.amb === 'hutan' ? 0.7 : 0.25
    let air = 0
    for (const f of this.t.falls) air = Math.max(air, 1 - Math.hypot(f.x - b.x, f.z - b.z) / 45)
    let api = 0
    this.t.camps.forEach((c, k) => {
      if (k <= this.mount.lit) api = Math.max(api, 1 - Math.hypot(c.x - b.x, c.y - b.y, c.z - b.z) / 14)
    })
    return { hutan: leafy * (1 - Math.min(1, storm * 1.5)), air: Math.max(0, air), api: Math.max(0, api) }
  }

  /** di dekat api unggun yang belum menyala: jumlah pendaki yang sudah berkumpul */
  private campWait(): Hud['campWait'] {
    if (this.me < 0) return null
    const m = this.mount
    const b = this.body
    const k = this.t.camps.findIndex((c, i) => i > m.lit && Math.hypot(c.x - b.x, c.z - b.z) < CAMP_R && Math.abs(c.y - b.y) < 4)
    if (k < 0) return null
    const people = this.s.actors.map((a, i) => (a.seat !== null ? i : -1)).filter((i) => i >= 0)
    const g = campGather(m, this.t, k, this.s.actors.map((_, i) => this.posOf(i)), people)
    return g.ready ? null : { have: g.have, need: g.need }
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

  /** jaringan per tick sim: klien kirim input (+ minta keadaan, ping); host kirim snapshot & isi gunung */
  private netTick(dt: number) {
    const live = this.o.live
    if (!live) return
    const now = performance.now()
    if (!this.host) {
      // belum tersambung, atau snapshot berhenti datang (sinyal putus lalu pulih): minta keadaan lengkap
      if (!this.synced || now - this.lastSnap > 2000) {
        this.needIn -= dt
        if (this.needIn <= 0) {
          this.needIn = 1
          if (this.me >= 0) live.send({ k: 'need', a: this.me } satisfies Wire)
        }
      }
      if (this.me >= 0 && this.synced) {
        this.inAcc += dt
        if (this.inAcc >= 1 / this.rates.input - 1e-6) {
          this.inAcc = 0
          const r = this.pred.recent(this.rates.redundancy)
          if (r.inputs.length) live.send({ k: 'in', a: this.me, s: r.first, i: r.inputs } satisfies Wire)
        }
      }
      this.opsIn -= dt
      if (this.opsIn <= 0 && this.ops.size) {
        this.opsIn = 0.5
        for (const msg of this.ops.values()) live.send(msg)
      }
      this.pingIn -= dt
      if (this.pingIn <= 0) {
        this.pingIn = 3
        const id = ++this.pingId
        this.pings.set(id, now)
        for (const [k, at] of this.pings) if (now - at > 10000) this.pings.delete(k)
        live.send({ k: 'ping', id } satisfies Wire)
      }
      return
    }
    this.snapAcc += dt
    if (this.snapAcc >= 1 / this.rates.snap - 1e-6) {
      this.snapAcc = 0
      this.snapN++
      const full = this.wantFull || this.snapN % this.rates.slowEvery === 0
      this.wantFull = false
      const msg: SnapMsg = { k: 'snap', n: this.snapN, ms: Math.round(this.mount.t), b: this.bodies.map((b, i) => [i, this.queues[i].ack, ...packCore(b)]) }
      if (full) msg.w = this.bodies.map((b, i) => [i, ...packSlow(b)])
      live.send(msg satisfies Wire)
    }
    this.mntIn -= dt
    if ((this.dirty && this.mntIn <= MNT_BEAT - MNT_MIN) || this.mntIn <= 0) {
      this.mntIn = MNT_BEAT
      this.dirty = false
      live.send({ k: 'mnt', s: cloneMount(this.mount) } satisfies Wire)
    }
  }

  /** klien: aktor lain diambil dari buffer interpolasi, sedikit di belakang waktu host */
  private updateRemotes() {
    const hn = this.clock.now(performance.now())
    if (hn === null) return
    const delay = (1000 / this.rates.snap) * 1.5 + 40
    this.s.actors.forEach((_, i) => {
      if (this.isLocal(i)) return
      const p = this.interps[i].sample(hn - delay)
      if (!p) return
      Object.assign(this.remotes[i], { x: p.x, y: p.y, z: p.z, yaw: p.yaw, mode: MODES[p.mode] ?? 'ground', moving: !!(p.flags & 4), umbrella: !!(p.flags & 2) })
    })
  }

  /** satu langkah sim tetap ({@link SIM_DT}) */
  private tick(dt: number) {
    const secs = this.mount.t / 1000
    this.bodies.forEach((b, i) => {
      if (this.isLocal(i)) this.prev[i] = { x: b.x, y: b.y, z: b.z }
    })
    this.time += dt
    // yang digendong ikut penggendongnya sebelum host memeriksa api unggun
    this.followCarry()
    if (this.host) this.hostTick(dt)
    else this.mount.t += dt * 1000
    this.fxTick()
    this.stepMe(dt, secs)
    if (this.host) {
      this.stepRemotes(secs)
      this.stepBots(dt, secs)
    }
    this.followCarry()
    this.fragile(dt, performance.now())
    if (this.me >= 0) {
      const b = this.body
      this.progress[this.me] = routeIndexNear(this.t, b.x, b.y, b.z, this.progress[this.me], 30)
    }
    this.s.actors.forEach((a, i) => {
      if (a.seat !== null && i !== this.me) {
        const p = this.posOf(i)
        this.progress[i] = routeIndexNear(this.t, p.x, p.y, p.z, this.progress[i], 30)
      }
    })
    this.netTick(dt)
  }

  private applyBodies(dt: number, alpha: number) {
    const k = 1 - Math.exp(-dt * 12)
    const cam = this.scene.camera
    cam.updateMatrixWorld()
    this.frustum.setFromProjectionMatrix(this.lodMat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
    this.roots.forEach((root, i) => {
      const local = this.isLocal(i)
      const mode = local ? this.bodies[i].mode : this.remotes[i].mode
      let p: { x: number; y: number; z: number; yaw: number } = this.remotes[i]
      if (local) {
        const b = this.bodies[i]
        const q = this.prev[i] ?? b
        // badan lokal digambar di antara dua tick sim; badan sendiri di klien + sisa koreksi rekonsiliasi
        const mine = i === this.me && !this.host
        p = {
          x: q.x + (b.x - q.x) * alpha + (mine ? this.pred.ox : 0),
          y: q.y + (b.y - q.y) * alpha + (mine ? this.pred.oy : 0),
          z: q.z + (b.z - q.z) * alpha + (mine ? this.pred.oz : 0),
          yaw: b.yaw,
        }
      }
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
      // aktor jauh sudah dihaluskan buffer interpolasi; tidak perlu penghalusan kedua (menambah jeda)
      root.position.set(tx, ty, tz)
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
      const prevSpeed = this.speeds[i] ?? 0
      const ks = Math.min(1, dt * 8)
      this.speeds[i] = prevSpeed + (sp - prevSpeed) * ks
      const accel = dt > 0 ? (this.speeds[i] - prevSpeed) / dt : 0
      this.vys[i] = (this.vys[i] ?? 0) + ((dt > 0 ? dy / dt : 0) - (this.vys[i] ?? 0)) * ks
      const yawNow = root.rotation.y
      const dYaw = Math.atan2(Math.sin(yawNow - (this.yaws[i] ?? yawNow)), Math.cos(yawNow - (this.yaws[i] ?? yawNow)))
      this.yaws[i] = yawNow
      this.turns[i] = (this.turns[i] ?? 0) + ((dt > 0 ? dYaw / dt : 0) - (this.turns[i] ?? 0)) * ks
      const b = local ? this.bodies[i] : null
      const mine = local && i === this.me
      const pickIn: AnimIn = {
        mode,
        y: p.y,
        moving,
        speed: this.speeds[i],
        turnRate: this.turns[i],
        // pemain/bot lokal: laju naik dari sim (tanpa jeda penghalusan), teman: dari pose teramati
        vy: b ? b.vy : this.vys[i],
        sideways: mine && Math.abs(this.input.x) > Math.abs(this.input.y) + 0.2,
        straining: mine && mode === 'climb' && this.input.y > 0.3 && Math.abs(this.vys[i]) < 0.12 && this.speeds[i] < 0.15,
        lunge: !!b && b.lunge > 0,
        tired: !!b && b.stamina < 0.2,
        hurt: !!b && b.fat.fall > 0.3,
        end: this.s.phase === 'end',
      }
      const picker = (this.pickers[i] ??= new AnimPicker())
      const { clip, speed, once } = picker.pick(pickIn, dt)
      if (clip !== this.anims[i] || picker.fresh) {
        this.anims[i] = clip
        c.play(clip, { once, speed, restart: picker.fresh })
      } else c.speed(speed)
      // condong: ke dalam tikungan & ke depan saat mempercepat, hanya saat berjalan di tanah
      const onGround = mode === 'ground' && !picker.fresh
      c.lean(onGround ? clampN(-this.turns[i] * this.speeds[i] * 0.012, 0.2) : 0, onGround ? Math.max(-0.08, Math.min(0.12, accel * 0.02)) : 0, dt)
      // LOD animasi: dekat penuh, jauh dikurangi, di luar layar tidak diperbarui & tidak digambar
      if (i === this.me) {
        c.setLod(1)
        // Hemat: badan sendiri juga mesh gabungan (1 draw call)
        c.setMerged(this.profile.tier.q === 'low')
      } else {
        this.lodSphere.center.copy(root.position).setY(root.position.y + 0.8)
        const seen = this.frustum.intersectsSphere(this.lodSphere)
        const d = root.position.distanceTo(this.scene.camera.position)
        c.root.visible = seen
        c.setLod(!seen ? 0 : d < 22 ? 1 : d < 50 ? 2 : 4)
        // LOD mesh: teman jauh (atau semua teman di Hemat) digambar sebagai satu mesh gabungan
        c.setMerged(this.profile.tier.q === 'low' || d > 25)
      }
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
    if (!this.alive || this.paused) return
    this.raf = requestAnimationFrame(this.frame)
    // batas frame per profil (Low 30): sisa frame layar dilewati supaya HP tidak panas
    if (!shouldDraw(now, this.lastDrawn, this.profile.fps)) return
    const interval = now - this.lastDrawn
    this.lastDrawn = now
    const workFrom = performance.now()
    const dt = Math.min(0.1, (now - this.lastT) / 1000)
    this.lastT = now
    // sim berjalan dengan langkah tetap 1/30 dtk, terpisah dari laju gambar
    if (!this.frozen) {
      this.simAcc += dt
      let n = 0
      while (this.simAcc >= SIM_DT && n < 4) {
        this.tick(SIM_DT)
        this.simAcc -= SIM_DT
        n++
      }
      // HP sangat lambat: jangan mengejar tanpa batas (spiral kematian)
      if (n === 4) this.simAcc = 0
    } else if (this.o.live) {
      // menu jeda saat bersama teman: jaringan tetap jalan
      this.netTick(dt)
    }
    const secs = this.mount.t / 1000
    if (!this.host) this.updateRemotes()
    this.pred.decay(dt)
    this.applyBodies(dt, this.simAcc / SIM_DT)
    const focus = this.me >= 0 ? this.body : this.bodies[0]
    const mine = this.me >= 0 ? this.chibis[this.me] : null
    const running = focus.mode === 'ground' && Math.hypot(focus.vx, focus.vz) > 4.6
    this.scene.fovAdd += ((running ? 5 : 0) - this.scene.fovAdd) * Math.min(1, dt * 3)
    this.scene.lead = focus.mode === 'ground' ? [focus.vx, focus.vz] : [0, 0]
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
    this.watchFps(now, interval, performance.now() - workFrom)
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

  private watchFps(now: number, interval: number, work: number) {
    this.stats.push(interval)
    const a = this.gov.feed(interval, work)
    if (a?.kind === 'scale') this.resizeNow()
    else if (a?.kind === 'step') this.scene.degrade(a.step)
    this.frames++
    if (now - this.fpsAt < 1000) return
    this.fps = Math.round((this.frames * 1000) / (now - this.fpsAt))
    this.frames = 0
    this.fpsAt = now
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
      bag: m.bag?.[this.me] ?? [],
      canBag: b.mode === 'ground',
      bonus: b.bonus,
      carrying: m.carry?.[this.me] ?? null,
      campWait: this.campWait(),
      amb: this.ambience(zi, storm),
      high: (this.t.kinds ? zi >= Math.max(1, this.t.kinds.indexOf('tebing')) : zi >= this.t.zones - 1) || storm > 0.6,
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
      net: this.netInfo(),
    })
  }

  private netInfo(): NetInfo {
    if (this.host || !this.o.live) return null
    const total = this.snapGot + this.snapMissed
    const loss = total > 0 ? this.snapMissed / total : 0
    // jendela bergeser kasar: hitungan dibagi dua tiap ±10 dtk supaya HUD mengikuti keadaan sekarang
    if (total > 100) {
      this.snapGot = Math.round(this.snapGot / 2)
      this.snapMissed = Math.round(this.snapMissed / 2)
    }
    const stale = !this.synced || performance.now() - this.lastSnap > 1500
    const q = stale ? 'putus' : (this.rtt ?? 0) > 350 || loss > 0.12 ? 'lemah' : 'baik'
    return { q, loss, synced: this.synced }
  }

  /** statistik jaringan untuk overlay & uji */
  netStats() {
    return { rtt: this.rtt, synced: this.synced, agreed: this.pred.agreed, corrected: this.pred.corrected, lastError: this.pred.lastError, worstError: this.pred.worstError, pending: this.pred.pending(), snaps: this.snapSeen, missed: this.snapMissed, acks: this.queues.map((q) => q.ack), dropped: this.queues.map((q) => q.dropped) }
  }

  dispose() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.stopLive?.()
    this.o.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.o.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.scene.dispose()
    this.world?.dispose()
    this.world = null
  }
}

const clampN = (v: number, m: number) => Math.max(-m, Math.min(m, v))
