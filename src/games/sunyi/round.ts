import { initialTier, TIERS, type Quality } from '@/games/kart/render/quality'
import { store } from '@/net/transport'
import { classify, LEVELS, needle, type Level, type Sensitivity } from '@/voice/loudness'
import { sharedMic, type Mic } from '@/voice/mic'
import { VoiceLink, type VoiceState } from '@/voice/rtc'
import { rayHit, spawnWalker, step, type Walker } from '../petak/sim/walk'
import type { LiveChannel, Seat } from '../types'
import { allCollected } from './engine'
import { BOXES, GATE, GATE_BOX, GHOST_SPAWN, ITEM_SPOTS, SPAWN, zoneAt } from './map'
import { World, type PartnerView, type Ring } from './render/world'
import { HEARING, newGhost, STEP_RANGE, stepGhost, VOICE_RANGE, type Ghost, type GhostMode, type Listener } from './sim/ghost'
import { buildNav, type Nav } from './sim/nav'
import type { SunyiAction, SunyiState } from './types'

export const WALK = 2.3
export const RUN = 4.2
const SEND_EVERY = 0.1
const PICK_RANGE = 1.7
const REVIVE_RANGE = 1.9
export const REVIVE_SECS = 2.5
const STAMINA_SECS = 5
const MODES: GhostMode[] = ['jalan', 'curiga', 'buru', 'pergi']
/** dev: ?lock=1 menahan tingkat grafis (untuk tangkapan layar di GPU lambat) */
const LOCK_Q = import.meta.env.DEV && new URLSearchParams(location.search).has('lock')

export type Sound = 'ambil' | 'sergap' | 'bangun' | 'jantung' | 'dengar' | 'langkah' | 'gerbang'

export type Hud = {
  phase: SunyiState['phase']
  level: Level
  meter: { v: number; danger: number; scream: number }
  micOk: boolean
  voice: VoiceState | 'solo'
  /** jarak ke pasangan (m); null = main sendiri */
  partnerDist: number | null
  partnerLevel: Level
  partnerDown: boolean
  /** Penunggu sedang memburu kamu */
  hunted: boolean
  /** 0..1 dekatnya Penunggu */
  fear: number
  canPick: number | null
  canRevive: boolean
  revive: number
  down: boolean
  stamina: number
  running: boolean
  light: boolean
  zone: string | null
  gateOpen: boolean
  atGate: boolean
  secs: number
  fps: number
  /** efek layar (vinyet, butir) dari shader; false = pakai vinyet CSS */
  post: boolean
}

const SENS_KEY = 'couple-party:sunyi-sens'
export const savedSens = (): Sensitivity => {
  const v = store.getItem(SENS_KEY)
  return v === 'peka' || v === 'santai' ? v : 'sedang'
}
export const saveSens = (s: Sensitivity) => store.setItem(SENS_KEY, s)

type Remote = PartnerView & { level: Level; at: number }
type Wire = { k: 'p'; d: number[] } | { k: 'g'; d: number[] }

const r2 = (v: number) => Math.round(v * 100) / 100

export type RoundOptions = {
  canvas: HTMLCanvasElement
  state: SunyiState
  seat: Seat
  act: (a: SunyiAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onSound: (s: Sound, volume?: number) => void
  /** volume suara bisikan Penunggu (loop) & detak jantung */
  onPresence: (whisper: number, pan: number) => void
}

export class Round {
  private o: RoundOptions
  private s: SunyiState
  private world: World
  private nav: Nav | null = null
  private mic: Mic
  private voice: VoiceLink | null = null
  private voiceState: VoiceState | 'solo'
  private me: Walker
  private pitch = 0
  private remote: Remote | null = null
  private ghost: Ghost
  /** posisi Penunggu yang ditampilkan (tamu: dihaluskan dari kiriman host) */
  private gView = { x: 0, z: 0, yaw: 0, mode: 'jalan' as GhostMode, prey: -1, speed: 0 }
  private gNet = { x: 0, z: 0, yaw: 0 }
  private host: boolean
  private peer: Seat | null
  private input = { x: 0, y: 0 }
  private run = false
  private light = true
  private stamina = 1
  private holding = false
  private reviveT = 0
  private level: Level = 'diam'
  private sens: Sensitivity
  private alive = true
  private raf = 0
  private lastT = 0
  private sendIn = 0
  private hudIn = 0
  private beatIn = 0
  private stepIn = 0
  private hit = 0
  private playT = 0
  private frames = 0
  private fpsAt = 0
  private fps = 60
  private slow = 0
  private lastPrey = -1
  private seenEvent = 0
  private gateWasOpen = false
  private escapeSent = false
  private loseSent = false
  private ro: ResizeObserver | null = null
  private stopLive: (() => void) | undefined

  constructor(o: RoundOptions) {
    this.o = o
    this.s = o.state
    this.host = o.seat === 0
    this.peer = o.state.opts.players > 1 ? (o.seat === 0 ? 1 : 0) : null
    this.voiceState = this.peer === null ? 'solo' : 'connecting'
    const url = import.meta.env.DEV ? (new URLSearchParams(location.search).get('q') as Quality | null) : null
    const tier = url && TIERS[url] ? TIERS[url] : initialTier()
    this.world = new World(o.canvas, tier)
    const [x, z] = SPAWN[o.seat % SPAWN.length]
    this.me = spawnWalker(x, z, Math.PI)
    this.ghost = newGhost(GHOST_SPAWN[0], GHOST_SPAWN[1], o.state.rng)
    Object.assign(this.gView, { x: this.ghost.x, z: this.ghost.z })
    Object.assign(this.gNet, { x: this.ghost.x, z: this.ghost.z })
    this.mic = sharedMic()
    this.sens = savedSens()
    this.seenEvent = o.state.last?.id ?? 0
    o.canvas.addEventListener('webglcontextlost', this.onContextLost)
  }

  private onContextLost = (e: Event) => e.preventDefault()

  async start() {
    await this.world.load(this.s.items)
    if (!this.alive) return
    if (this.host) this.nav = buildNav([...BOXES, GATE_BOX])
    if (this.o.live) this.stopLive = this.o.live.on((d, from) => this.onLive(d, from))
    this.world.setGate(allCollected(this.s))
    this.gateWasOpen = allCollected(this.s)
    const el = this.o.canvas
    const size = () => this.world.resize(el.clientWidth || 1, el.clientHeight || 1)
    this.ro = new ResizeObserver(size)
    this.ro.observe(el)
    size()
    this.lastT = performance.now()
    this.fpsAt = this.lastT
    this.raf = requestAnimationFrame(this.frame)
    if (this.mic.status === 'ok') this.startVoice()
  }

  /** dipanggil setelah mic menyala (layar cek mic) */
  startVoice() {
    if (this.voice || this.peer === null || !this.o.live || !this.mic.stream) return
    this.voice = new VoiceLink({ live: this.o.live, seat: this.o.seat, peer: this.peer, stream: this.mic.stream, onState: (s) => (this.voiceState = s) })
  }

  setState(s: SunyiState) {
    const prev = this.s
    this.s = s
    this.world.setItems(s.items)
    const open = allCollected(s)
    if (open && !this.gateWasOpen) this.o.onSound('gerbang')
    this.gateWasOpen = open
    this.world.setGate(open)
    if (s.phase === 'play' && prev.phase !== 'play') {
      this.playT = 0
      this.escapeSent = this.loseSent = false
      if (prev.phase === 'end') {
        this.respawn()
        this.world.placeItems(s.items)
      }
    }
    const ev = s.last
    if (ev && ev.id !== this.seenEvent) {
      this.seenEvent = ev.id
      if (ev.kind === 'pickup') this.o.onSound('ambil', ev.seat === this.o.seat ? 1 : 0.5)
      if (ev.kind === 'down') {
        this.o.onSound('sergap', ev.seat === this.o.seat ? 1 : 0.6)
        if (ev.seat === this.o.seat) this.hit = 1
      }
      if (ev.kind === 'revive') this.o.onSound('bangun')
    }
  }

  private respawn() {
    const [x, z] = SPAWN[this.o.seat % SPAWN.length]
    this.me = spawnWalker(x, z, Math.PI)
    this.pitch = 0
    this.ghost = newGhost(GHOST_SPAWN[0], GHOST_SPAWN[1], this.s.rng)
    this.stamina = 1
  }

  /* ---------- kendali dari UI ---------- */

  setMove(x: number, y: number) {
    this.input.x = x
    this.input.y = y
  }
  look(dx: number, dy: number) {
    this.me.yaw -= dx * 0.0055
    this.pitch = Math.max(-1.2, Math.min(1.1, this.pitch - dy * 0.0045))
  }
  setRun(on: boolean) {
    this.run = on
  }
  toggleLight() {
    this.light = !this.light
    this.voice?.resume()
    return this.light
  }
  setSens(s: Sensitivity) {
    this.sens = s
    saveSens(s)
  }
  /** tombol aksi: ketuk = ambil pusaka; tahan = bangunkan pasangan */
  interact(down: boolean) {
    this.holding = down
    this.voice?.resume()
    if (!down) return
    const pick = this.nearItem()
    if (pick !== null) this.o.act({ type: 'pickup', item: pick })
  }

  private nearItem(): number | null {
    if (this.s.phase !== 'play' || this.s.down[this.o.seat]) return null
    let best: number | null = null
    let bd = PICK_RANGE
    this.s.items.forEach((it, i) => {
      if (it.by !== null) return
      const p = ITEM_SPOTS[it.spot]
      const d = Math.hypot(p.x - this.me.x, p.z - this.me.z)
      if (d < bd && Math.abs(p.y - this.me.y) < 1.6) {
        bd = d
        best = i
      }
    })
    return best
  }

  private partnerDist() {
    const r = this.remote
    return r ? Math.hypot(r.x - this.me.x, r.z - this.me.z) : Infinity
  }

  /* ---------- jaringan ---------- */

  private onLive(d: unknown, from: Seat) {
    const m = d as Wire
    if (m?.k === 'p' && from === this.peer) {
      const [x, y, z, yaw, pitch, flags, lvl] = m.d
      const r = this.remote
      const next = { x, y, z, yaw, pitch, moving: !!(flags & 1), running: !!(flags & 2), light: !!(flags & 4), down: !!this.s.down[from], level: LEVELS[lvl] ?? 'diam', at: performance.now() }
      this.remote = r ? Object.assign(r, next) : next
    } else if (m?.k === 'g' && from === 0 && !this.host) {
      const [x, z, yaw, mode, prey, speed] = m.d
      Object.assign(this.gNet, { x, z, yaw })
      this.gView.mode = MODES[mode] ?? 'jalan'
      this.gView.prey = prey
      this.gView.speed = speed
    }
  }

  private send(dt: number) {
    this.sendIn -= dt
    if (this.sendIn > 0 || !this.o.live) return
    this.sendIn = SEND_EVERY
    const w = this.me
    const flags = (w.moving ? 1 : 0) | (w.moving && this.isRunning() ? 2 : 0) | (this.light ? 4 : 0)
    this.o.live.send({ k: 'p', d: [r2(w.x), r2(w.y), r2(w.z), r2(w.yaw), r2(this.pitch), flags, LEVELS.indexOf(this.level)] } satisfies Wire)
    if (this.host) {
      const g = this.ghost
      this.o.live.send({ k: 'g', d: [r2(g.x), r2(g.z), r2(g.yaw), MODES.indexOf(g.mode), g.prey ?? -1, r2(this.gView.speed)] } satisfies Wire)
    }
  }

  private isRunning() {
    return this.run && this.stamina > 0.05
  }

  /* ---------- simulasi ---------- */

  private frame = (now: number) => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    const s = this.s
    const meDown = !!s.down[this.o.seat]
    const playing = s.phase === 'play'
    if (playing) this.playT += dt

    // mic → tingkat suara
    if (this.mic.status === 'ok') {
      this.mic.read()
      this.level = classify(this.mic.meter, this.sens)
    } else this.level = 'diam'

    // gerak sendiri
    const boxes = allCollected(s) ? BOXES : [...BOXES, GATE_BOX]
    const can = playing && !meDown
    const running = can && this.isRunning() && (this.input.x !== 0 || this.input.y !== 0)
    this.stamina = Math.max(0, Math.min(1, this.stamina + (running ? -dt / STAMINA_SECS : dt / (STAMINA_SECS * 1.6))))
    if (can) {
      const fx = Math.sin(this.me.yaw)
      const fz = Math.cos(this.me.yaw)
      // stik: y = maju, x = geser ke kanan
      const mx = fx * this.input.y - fz * this.input.x
      const mz = fz * this.input.y + fx * this.input.x
      const len = Math.hypot(mx, mz)
      const k = len > 1 ? 1 / len : 1
      const yaw = this.me.yaw
      step(this.me, mx * k, mz * k, running ? RUN : WALK, dt, { boxes } as never)
      // step memutar badan ke arah langkah; pandangan tetap milik pemain
      this.me.yaw = yaw
      if (this.me.moving) {
        this.stepIn -= dt * (running ? 1.6 : 1)
        if (this.stepIn <= 0) {
          this.stepIn = 0.48
          this.o.onSound('langkah', running ? 0.55 : 0.25)
        }
      }
    } else this.me.moving = false

    // pasangan basi (koneksi putus): anggap diam di tempat
    if (this.remote) {
      this.remote.down = !!s.down[this.peer!]
      if (performance.now() - this.remote.at > 3000) this.remote.moving = false
    }

    if (this.host && this.nav && playing) this.simGhost(dt)
    else if (!this.host) {
      const k = 1 - Math.exp(-dt * 10)
      this.gView.x += (this.gNet.x - this.gView.x) * k
      this.gView.z += (this.gNet.z - this.gView.z) * k
      this.gView.yaw += Math.atan2(Math.sin(this.gNet.yaw - this.gView.yaw), Math.cos(this.gNet.yaw - this.gView.yaw)) * k
    }

    // bangunkan pasangan: tahan tombol di dekatnya
    const canRevive = can && !!this.remote && this.remote.down && this.partnerDist() < REVIVE_RANGE
    if (canRevive && this.holding) {
      this.reviveT += dt
      if (this.reviveT >= REVIVE_SECS) {
        this.reviveT = 0
        this.holding = false
        this.o.act({ type: 'revive', seat: this.peer! })
      }
    } else this.reviveT = Math.max(0, this.reviveT - dt * 2)

    this.send(dt)
    this.presence(dt, meDown)

    // proximity voice: makin jauh makin pelan, teredam dinding
    if (this.voice && this.remote) {
      const d = this.partnerDist()
      let v = Math.max(0.1, Math.min(1, 1 - (d - 3) / 32))
      if (rayHit(BOXES, this.me.x, this.me.z, this.remote.x, this.remote.z, 1.4) < 1) v *= 0.55
      this.voice.setVolume(v)
    }

    const fear = this.fearLevel()
    this.hit = Math.max(0, this.hit - dt * 0.7)
    this.world.update(dt, {
      eye: { x: this.me.x, y: this.me.y, z: this.me.z, yaw: this.me.yaw, pitch: this.pitch },
      light: this.light,
      moving: this.me.moving,
      running,
      fear,
      hit: this.hit,
      down: meDown,
      partner: this.remote,
      ghost: this.gView,
      rings: this.rings(),
    })
    this.world.render()

    this.frames++
    if (now - this.fpsAt > 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.fpsAt))
      this.frames = 0
      this.fpsAt = now
      this.slow = this.fps < 24 ? this.slow + 1 : 0
      if (this.slow >= 4 && !LOCK_Q && this.world.lowerQuality()) this.slow = 0
    }
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.12
      this.emitHud(fear, canRevive, running)
    }
  }

  private listeners(): Listener[] {
    const s = this.s
    const out: Listener[] = [{ seat: this.o.seat, x: this.me.x, z: this.me.z, down: !!s.down[this.o.seat], level: this.level, moving: this.me.moving, running: this.me.moving && this.isRunning() }]
    if (this.remote && this.peer !== null) out.push({ seat: this.peer, x: this.remote.x, z: this.remote.z, down: !!s.down[this.peer], level: this.remote.level, moving: this.remote.moving, running: this.remote.running })
    return out
  }

  /** host: Penunggu mendengar, memburu, menyergap; host juga memutuskan kabur & kalah */
  private simGhost(dt: number) {
    const s = this.s
    const g = this.ghost
    const px = g.x
    const pz = g.z
    const ls = this.listeners()
    const ev = stepGhost(g, dt, this.nav!, ls, s.opts.difficulty)
    this.gView.speed = Math.hypot(g.x - px, g.z - pz) / Math.max(dt, 1e-4)
    Object.assign(this.gView, { x: g.x, z: g.z, yaw: g.yaw, mode: g.mode, prey: g.prey ?? -1 })
    if (ev.caught !== null) this.o.act({ type: 'down', seat: ev.caught })
    if (!this.loseSent && s.down.every(Boolean)) {
      this.loseSent = true
      this.o.act({ type: 'lose', t: Math.round(this.playT) })
    }
    if (!this.escapeSent && allCollected(s) && !s.down.some(Boolean)) {
      const z = GATE.zone
      const inGate = (l: Listener) => l.x > z.x0 && l.x < z.x1 && l.z > z.z0 && l.z < z.z1
      // tamu harus terlihat di gerbang juga (kalau main berdua)
      if (ls.length === s.opts.players && ls.every(inGate)) {
        this.escapeSent = true
        this.o.act({ type: 'escape', t: Math.round(this.playT) })
      }
    }
  }

  private fearLevel() {
    if (this.s.phase !== 'play') return 0
    const d = Math.hypot(this.gView.x - this.me.x, this.gView.z - this.me.z)
    let f = Math.max(0, Math.min(1, 1 - (d - 2) / 16))
    if (this.gView.mode === 'buru' && this.gView.prey === this.o.seat) f = Math.max(f, 0.55)
    return f
  }

  /** bisikan Penunggu & detak jantung makin keras saat ia dekat; bunyi peringatan saat kamu terdengar */
  private presence(dt: number, meDown: boolean) {
    const dx = this.gView.x - this.me.x
    const dz = this.gView.z - this.me.z
    const d = Math.hypot(dx, dz)
    const playing = this.s.phase === 'play'
    const whisper = playing ? Math.max(0, Math.min(1, 1 - (d - 1.5) / 18)) : 0
    // arah stereo relatif terhadap pandangan
    const rel = Math.atan2(dx, dz) - this.me.yaw
    this.o.onPresence(whisper, -Math.sin(rel))
    if (playing && !meDown && whisper > 0.25) {
      this.beatIn -= dt
      if (this.beatIn <= 0) {
        this.beatIn = 1.1 - whisper * 0.65
        this.o.onSound('jantung', 0.3 + whisper * 0.7)
      }
    }
    const huntingMe = this.gView.mode === 'buru' && this.gView.prey === this.o.seat
    if (huntingMe && this.lastPrey !== this.o.seat) this.o.onSound('dengar')
    this.lastPrey = huntingMe ? this.o.seat : this.gView.mode === 'buru' ? this.gView.prey : -1
  }

  /** cincin suara: radius = sejauh apa Penunggu bisa mendengar kamu saat ini */
  private rings(): Ring[] {
    const diff = this.s.opts.difficulty
    const out: Ring[] = []
    const mine: Listener = this.listeners()[0]
    const range = (l: Listener) => Math.max(VOICE_RANGE[l.level], l.running ? STEP_RANGE.run : 0) * HEARING[diff]
    const r0 = range(mine)
    out.push({ x: this.me.x, y: this.me.y, z: this.me.z, radius: r0, amp: r0 > 3 ? Math.min(1, r0 / 15) : 0, mine: true })
    const p = this.remote
    if (p && this.peer !== null) {
      const r1 = range({ seat: this.peer, x: p.x, z: p.z, down: p.down, level: p.level, moving: p.moving, running: p.running })
      out.push({ x: p.x, y: p.y, z: p.z, radius: r1, amp: r1 > 3 && !p.down ? Math.min(1, r1 / 15) : 0, mine: false })
    }
    return out
  }

  private emitHud(fear: number, canRevive: boolean, running: boolean) {
    const s = this.s
    const z = GATE.zone
    const m = this.mic.status === 'ok' ? needle(this.mic.meter, this.sens) : { v: 0, danger: 0.5, scream: 0.8 }
    this.o.onHud({
      phase: s.phase,
      level: this.level,
      meter: m,
      micOk: this.mic.status === 'ok',
      voice: this.voiceState,
      partnerDist: this.peer === null ? null : this.remote ? Math.round(this.partnerDist()) : null,
      partnerLevel: this.remote?.level ?? 'diam',
      partnerDown: this.peer !== null && !!s.down[this.peer],
      hunted: this.gView.mode === 'buru' && this.gView.prey === this.o.seat,
      fear,
      canPick: this.nearItem(),
      canRevive,
      revive: this.reviveT / REVIVE_SECS,
      down: !!s.down[this.o.seat],
      stamina: this.stamina,
      running,
      light: this.light,
      zone: zoneAt(this.me.x, this.me.z)?.title ?? null,
      gateOpen: allCollected(s),
      atGate: this.me.x > z.x0 && this.me.x < z.x1 && this.me.z > z.z0 && this.me.z < z.z1,
      secs: Math.round(this.playT),
      fps: this.fps,
      post: this.world.hasPost,
    })
  }

  dispose() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.stopLive?.()
    this.voice?.close()
    this.o.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.world.dispose()
  }
}
