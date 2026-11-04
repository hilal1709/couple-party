// Satu level Tali Jodoh di satu HP: loop 60 Hz, kirim-terima pose lewat saluran live,
// tampilan three.js (MSAA + bloom + FXAA), dan laporan HUD ke React.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { initialTier, type Tier } from '@/games/kart/render/quality'
import { hermite, syncClock } from '@/games/kart/sim/interp'
import type { LiveChannel, Seat } from '../types'
import { LEVELS } from './levels'
import { Stage } from './render/stage'
import { clock } from './render/shaders'
import { Client, poseOf, type ClientEvent, type Pose } from './sim/client'
import { Duo } from './sim/duo'
import { ROUTES } from './sim/routes'
import { NO_INPUT, type Hold, type Input } from './sim/physics'
import type { TaliAction, TaliState } from './types'

const DT = 1 / 60
const SEND_EVERY = 0.05
/** pasangan ditampilkan selambat ini (ms): cukup untuk dua paket + jitter */
const INTERP_DELAY = 120
/** tanpa paket selama ini, pasangan dianggap terputus dan tali dilepas sementara */
const STALE_MS = 2500

export type Sound = 'jump' | 'land' | 'hook' | 'brace' | 'candy' | 'checkpoint' | 'fall' | 'press' | 'lever' | 'goal' | 'reel'

export type Hud = {
  secs: number
  tip: string | null
  candy: number
  candyOf: number
  /** pasangan sudah terlihat lewat jaringan */
  partner: boolean
  /** sedang menunggu pasangan di gerbang */
  waiting: boolean
  hold: Hold
  reel: boolean
  fallen: boolean
  fps: number
}

type Packet = { k: 'p'; lv: number; at: number; p: number[] }
type Sample = { t: number; p: Pose; gone: boolean }

export type RoundOpts = {
  canvas: HTMLCanvasElement
  state: TaliState
  seat: Seat
  act: (a: TaliAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onSound: (s: Sound) => void
  /** demo: kedua karakter dijalankan rute otomatis di HP ini */
  auto?: (s: TaliState) => void
}

function pack(p: Pose, gone: boolean): number[] {
  const flags = (p.ground ? 1 : 0) | (p.hold << 1) | (p.reel ? 8 : 0) | (gone ? 16 : 0) | (p.face > 0 ? 32 : 0)
  return [+p.x.toFixed(3), +p.y.toFixed(3), +p.vx.toFixed(2), +p.vy.toFixed(2), flags, p.on, +p.air.toFixed(2)]
}

function unpack(a: number[]): { p: Pose; gone: boolean } {
  const f = a[4]
  return { p: { x: a[0], y: a[1], vx: a[2], vy: a[3], ground: !!(f & 1), hold: ((f >> 1) & 3) as Hold, reel: !!(f & 8), on: a[5], face: f & 32 ? 1 : -1, air: a[6] }, gone: !!(f & 16) }
}

export class Round {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer | null = null
  private tier: Tier
  private stage: Stage | null = null
  private client: Client
  private duo: Duo | null = null
  private auto: Generator<void, boolean> | null = null
  private state: TaliState
  private input: Input = { ...NO_INPUT }
  private raf = 0
  private last = 0
  private acc = 0
  private sendAcc = 0
  private hudAcc = 0
  private frames = 0
  private fps = 60
  private remote: Sample[] = []
  private remoteOff: number | null = null
  private lastPacket = 0
  private stopLive: (() => void) | null = null
  private disposed = false
  private landedMine = false
  private landedOther = false
  private wasFallen = false
  private otherSeen: Pose | null = null
  private reelSoundT = 0

  private o: RoundOpts

  constructor(o: RoundOpts) {
    this.o = o
    this.state = o.state
    this.tier = initialTier()
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !this.tier.post, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = this.tier.shadow > 0
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.tier.ratio))
    const def = LEVELS[o.state.level]
    this.client = new Client(def, o.seat, o.state, (a) => this.o.act(a), (e) => this.onEvent(e, true))
    if (o.auto) {
      this.duo = new Duo(o.state, 6)
      this.auto = this.duo.play(ROUTES[def.id] ?? [])
    }
  }

  async start() {
    const def = LEVELS[this.state.level]
    this.stage = await Stage.create(def, this.tier, this.renderer.capabilities.getMaxAnisotropy())
    if (this.disposed) return
    this.renderer.toneMappingExposure = this.stage.theme.exposure
    this.setupPost()
    this.resize()
    window.addEventListener('resize', this.resize)
    if (this.o.live) this.stopLive = this.o.live.on((d, from) => this.onLive(d, from))
    const me = this.client.body
    this.stage.updateCamera(0, new THREE.Vector3(me.x, me.y, 0), null, this.aspect(), true)
    // kompilasi shader sekali sebelum main supaya frame pertama tidak tersendat
    this.renderer.compile(this.stage.scene, this.stage.camera)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  /** MSAA di render target + bloom + tone mapping; FXAA menambal kalau MSAA kurang dari 4x */
  private setupPost() {
    if (!this.tier.post || !this.stage) return
    const samples = Math.min(this.tier.samples, this.renderer.capabilities.maxSamples)
    const c = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples }))
    c.addPass(new RenderPass(this.stage.scene, this.stage.camera))
    const [strength, radius, threshold] = this.stage.theme.bloom
    c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold))
    c.addPass(new OutputPass())
    if (samples < 4) c.addPass(new FXAAPass())
    this.composer = c
  }

  private aspect() {
    const c = this.o.canvas
    return c.clientWidth / Math.max(1, c.clientHeight)
  }

  private resize = () => {
    const c = this.o.canvas
    const w = c.clientWidth
    const h = c.clientHeight
    this.renderer.setSize(w, h, false)
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())
    this.composer?.setSize(w, h)
    if (this.stage) {
      this.stage.camera.aspect = w / Math.max(1, h)
      this.stage.camera.updateProjectionMatrix()
    }
  }

  setState(s: TaliState) {
    this.state = s
    this.client.setState(s)
  }

  setInput(p: Partial<Input>) {
    Object.assign(this.input, p)
  }

  /** jam bersama (detik): jam host; tamu menaksirnya dari paket host */
  private shared(): number {
    const off = this.o.seat === 0 ? 0 : this.remoteOff ?? 0
    return ((Date.now() - off) % 1e8) / 1000
  }

  private onLive(d: unknown, from: Seat) {
    const m = d as Packet
    if (!m || m.k !== 'p' || from === this.o.seat || m.lv !== this.state.levelId) return
    const now = Date.now()
    this.remoteOff = syncClock(this.remoteOff, now - m.at)
    this.lastPacket = now
    const { p, gone } = unpack(m.p)
    const t = m.at + this.remoteOff
    const prev = this.remote[this.remote.length - 1]
    // lompatan jauh (respawn): buang riwayat supaya tidak meluncur menyeberangi level
    if (prev && Math.hypot(prev.p.x - p.x, prev.p.y - p.y) > 5) this.remote = []
    this.remote.push({ t, p, gone })
    if (this.remote.length > 30) this.remote.shift()
  }

  /** pose pasangan pada waktu tampil (tertunda INTERP_DELAY) */
  private partner(now: number): { p: Pose; gone: boolean } | null {
    if (!this.remote.length || now - this.lastPacket > STALE_MS) return null
    const t = now - INTERP_DELAY
    const r = this.remote
    let i = r.length - 1
    while (i > 0 && r[i - 1].t > t) i--
    const b = r[i]
    const a = r[Math.max(0, i - 1)]
    if (a === b || t >= b.t) {
      // ekstrapolasi pendek dari paket terakhir
      const dt = Math.min(0.15, Math.max(0, (t - b.t) / 1000))
      return { p: { ...b.p, x: b.p.x + b.p.vx * dt, y: b.p.y + b.p.vy * dt }, gone: b.gone }
    }
    const h = Math.max(1, b.t - a.t) / 1000
    const f = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t || 1)))
    const near = f < 0.5 ? a : b
    return {
      p: { ...near.p, x: hermite(a.p.x, a.p.vx, b.p.x, b.p.vx, f, h), y: hermite(a.p.y, a.p.vy, b.p.y, b.p.vy, f, h), vx: a.p.vx + (b.p.vx - a.p.vx) * f, vy: a.p.vy + (b.p.vy - a.p.vy) * f },
      gone: near.gone,
    }
  }

  private onEvent(e: ClientEvent, mine: boolean) {
    const st = this.stage
    const b = this.client.body
    if (!st) return
    if (e === 'land') {
      if (mine) this.landedMine = true
      st.fx.emit('dust', b.x, b.y - 0.4, 0.3, 6)
    }
    if (e === 'jump') st.fx.emit('dust', b.x, b.y - 0.4, 0.3, 5)
    if (e === 'fall') {
      const water = this.client.def.hazards.some((h) => h.k === 'air' && b.x > h.b[0] && b.x < h.b[0] + h.b[2])
      st.fx.emit(water ? 'splash' : 'poof', b.x, Math.max(b.y, this.client.def.killY + 1), 0.3, 24)
    }
    if (e === 'goal') st.fx.emit('confetti', b.x, b.y + 1, 0.3, 26)
    if (e === 'land' || e === 'jump' || e === 'hook' || e === 'brace' || e === 'candy' || e === 'checkpoint' || e === 'fall' || e === 'press' || e === 'lever' || e === 'goal') this.o.onSound(e)
  }

  private loop = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    // HP lambat tetap berjalan dengan kecepatan asli: sampai 15 langkah fisika per frame
    const frame = Math.min(0.25, (now - this.last) / 1000)
    this.last = now
    this.frames++
    this.hudAcc += frame
    this.acc += frame
    const wall = Date.now()
    let other: { p: Pose; gone: boolean } | null = null
    while (this.acc >= DT) {
      this.acc -= DT
      if (this.duo && this.auto) {
        const r = this.auto.next()
        if (r.done) this.auto = null
        this.o.auto?.(this.duo.state)
        continue
      }
      other = this.partner(wall)
      this.client.step(this.input, this.shared(), DT, other && !other.gone ? other.p : null)
    }
    if (!this.duo) other = this.partner(wall)
    this.sendAcc += frame
    if (this.sendAcc >= SEND_EVERY && this.o.live && !this.duo) {
      this.sendAcc = 0
      const pkt: Packet = { k: 'p', lv: this.state.levelId, at: Date.now(), p: pack(poseOf(this.client.body, this.client.reeling), this.client.fallen >= 0) }
      this.o.live.send(pkt)
    }
    this.render(frame, other)
    if (this.hudAcc >= 0.1) {
      this.fps = this.frames / this.hudAcc
      this.frames = 0
      this.hudAcc = 0
      this.emitHud(!!other || !!this.duo)
    }
  }

  private render(dt: number, other: { p: Pose; gone: boolean } | null) {
    const st = this.stage
    if (!st) return
    clock.value += dt
    const s = this.duo ? this.duo.state : this.state
    const cl = this.duo ? this.duo.clients[this.o.seat] : this.client
    const mePose = poseOf(cl.body, cl.reeling)
    const otherPose = this.duo ? poseOf(this.duo.clients[1 - this.o.seat].body, this.duo.clients[1 - this.o.seat].reeling) : other?.p ?? null
    const otherGone = this.duo ? this.duo.clients[1 - this.o.seat].fallen >= 0 : !other || other.gone
    const mood = s.phase === 'play' ? 'play' : 'cheer'
    const mine = st.actors[this.o.seat]
    const theirs = st.actors[1 - this.o.seat]
    mine.visible = cl.fallen < 0
    mine.update(dt, mePose, mood, this.landedMine, st.groundBelow(cl.rt, mePose.x, mePose.y))
    this.landedMine = false
    if (otherPose && !otherGone) {
      theirs.visible = true
      const landed = !!this.otherSeen && !this.otherSeen.ground && otherPose.ground
      if (landed) st.fx.emit('dust', otherPose.x, otherPose.y - 0.4, 0.3, 5)
      theirs.update(dt, otherPose, mood, landed || this.landedOther, st.groundBelow(cl.rt, otherPose.x, otherPose.y))
      this.landedOther = false
    } else theirs.visible = false
    this.otherSeen = otherPose
    const ropeOn = cl.fallen < 0 && !!otherPose && !otherGone
    st.rope.visible = ropeOn
    if (ropeOn) st.rope.update(dt, mine.waist, theirs.waist, cl.rope, (x, y) => st.groundBelow(cl.rt, x, y))
    if (cl.reeling && cl.rope > 1.35) {
      this.reelSoundT -= dt
      if (this.reelSoundT <= 0) {
        this.reelSoundT = 0.22
        this.o.onSound('reel')
      }
    }
    const seen = cl.groups()
    st.update(dt, cl.rt, s, seen, cl.local, this.duo ? this.duo.t : this.shared())
    if (this.wasFallen && cl.fallen < 0) st.updateCamera(dt, mine.root.position, null, this.aspect(), true)
    this.wasFallen = cl.fallen >= 0
    st.updateCamera(dt, mine.root.position, otherPose && !otherGone ? theirs.root.position : null, this.aspect())
    st.fx.update(dt, this.o.canvas.clientHeight)
    if (this.composer) this.composer.render(dt)
    else this.renderer.render(st.scene, st.camera)
  }

  private emitHud(partner: boolean) {
    const cl = this.duo ? this.duo.clients[this.o.seat] : this.client
    const s = this.duo ? this.duo.state : this.state
    const x = cl.body.x
    let tip: string | null = null
    for (const [tx, text] of cl.def.tips) if (x >= tx - 1 && x <= tx + 9) tip = text
    this.o.onHud({
      secs: Math.floor(cl.elapsed),
      tip,
      candy: s.candy.filter(Boolean).length,
      candyOf: s.candy.length,
      partner,
      waiting: cl.inGoal() && s.phase === 'play',
      hold: cl.body.hold,
      reel: cl.reeling,
      fallen: cl.fallen >= 0,
      fps: Math.round(this.fps),
    })
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.stopLive?.()
    this.composer?.passes.forEach((p) => p.dispose())
    this.composer?.dispose()
    this.stage?.dispose()
    this.renderer.dispose()
  }
}
