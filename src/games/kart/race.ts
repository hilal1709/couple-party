import * as THREE from 'three'
import type { LiveChannel, Seat } from '../types'
import { CHARACTERS, LEVEL_INFO, statsFor, type Stats } from './data'
import { COUNTDOWN, FINISH_GRACE, humansDone } from './engine'
import { loadModels, makeKart, geometry } from './render/models'
import { buildWorld, type World } from './render/world'
import { botInput, newBrain, type BotBrain } from './sim/bots'
import { BOX_RESPAWN, blockPush, entityPose, hazardContact, onPad } from './sim/hazards'
import { bounce, collide, driftLevel, hitKart, spawnKart, stepKart, type Input, type Kart } from './sim/physics'
import { buildTrack, pointAt, type Track } from './sim/track'
import { TRACKS } from './tracks'
import type { Entity, KartAction, KartState } from './types'

const DT = 1 / 60
const SEND_EVERY = 0.1
const INTERP_DELAY = 130

export type Hud = {
  /** detik tersisa hitung mundur (≤ 0 = sudah jalan) */
  count: number
  rank: number
  total: number
  lap: number
  laps: number
  speed: number
  drift: number
  boost: boolean
  timeMs: number
  finished: boolean
  wrongWay: boolean
  rolling: boolean
  /** posisi semua kart di minimap (0..1) */
  dots: { x: number; z: number; me: boolean; color: string }[]
  slow: boolean
  shield: boolean
}

export type Sound = 'go' | 'count' | 'lap' | 'final' | 'boost' | 'drift' | 'hit' | 'bump' | 'box' | 'item' | 'jump' | 'land' | 'finish' | 'fall' | 'shield' | 'rain' | 'blast' | 'throw' | 'champion' | 'lose'

export type Controls = Input & { item: boolean }

type Remote = { buf: { t: number; p: number[] }[] }

/** pose ringkas yang dikirim ke HP lain: [kart, x, y, z, yaw, kecepatan, slide, flags, kemajuan] */
type Pose = [number, number, number, number, number, number, number, number, number]
const F_DRIFT = 1, F_BOOST = 2, F_SPIN = 4, F_SHIELD = 8, F_AIR = 16, F_SLOW = 32

const r2 = (v: number) => Math.round(v * 100) / 100
/** dev: kart sendiri disetir AI (?autopilot=1) untuk tangkapan layar */
const AUTOPILOT = import.meta.env.DEV && new URLSearchParams(location.search).has('autopilot')

type Opts = {
  canvas: HTMLCanvasElement
  state: KartState
  seat: Seat
  live?: LiveChannel
  act: (a: KartAction) => void
  onHud: (h: Hud) => void
  onSound: (s: Sound, info?: { rate?: number; volume?: number }) => void
}

export class Race {
  private o: Opts
  private t: Track
  private world!: World
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private meshes: THREE.Group[] = []
  private karts: Kart[] = []
  private stats: Stats[] = []
  /** kart yang disimulasikan HP ini: milik sendiri (+ semua bot kalau host) */
  private mine: number
  private local = new Set<number>()
  private brains = new Map<number, BotBrain>()
  private remotes = new Map<number, Remote>()
  /** kemajuan (meter total) & putaran yang sudah lewat per kart */
  private prog: number[]
  private crossed: number[]
  private state: KartState
  private startAt = performance.now()
  private goAt: number
  private acc = 0
  private sendAcc = 0
  private hudAcc = 0
  private raf = 0
  private last = performance.now()
  private born = new Map<number, number>()
  private handled = new Set<string>()
  private seenEvents = 0
  private rolling = new Map<number, number>()
  private botItemT = new Map<number, number>()
  private firstFinishAt = 0
  private ended = false
  private wrongT = 0
  private countShown = 99
  private entityMeshes = new Map<number, THREE.Object3D>()
  private fxGroup = new THREE.Group()
  private clouds = new Map<number, THREE.Object3D>()
  private shieldMeshes = new Map<number, THREE.Mesh>()
  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()
  private fpsT = 0
  private fpsN = 0
  private ratio: number
  private stopLive?: () => void
  private disposed = false
  controls: Controls = { steer: 0, gas: true, brake: false, drift: false, item: false }

  constructor(o: Opts) {
    this.o = o
    this.state = o.state
    const id = o.state.schedule[o.state.race]
    this.t = buildTrack(TRACKS[id])
    this.goAt = this.startAt + COUNTDOWN * 1000
    this.mine = o.state.racers.findIndex((r) => r.seat === o.seat)
    this.ratio = Math.min(1.5, window.devicePixelRatio || 1)
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: this.ratio < 1.5, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.ratio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.5, 2200)
    const n = o.state.racers.length
    this.prog = Array(n).fill(0)
    this.crossed = Array(n).fill(0)
    o.state.racers.forEach((r, i) => {
      // pemain di barisan belakang grid (kamera bebas, ada yang dikejar)
      this.karts.push(spawnKart(this.t, n - 1 - i))
      this.stats.push(statsFor(r.char, r.body))
      const local = i === this.mine || (r.seat === null && o.seat === 0)
      if (local) this.local.add(i)
      else this.remotes.set(i, { buf: [] })
      if (r.seat === null) this.brains.set(i, newBrain(i * 7919 + 13))
    })
    this.stopLive = o.live?.on((d) => this.onLive(d))
  }

  /** muat model lalu mulai loop render */
  async start() {
    const th = this.t.def
    await loadModels([
      ...th.theme.props.map(([n]) => n),
      ...th.hazards.flatMap((h) => ('model' in h ? [h.model] : [])),
      'jamur-pantul', 'batu-jatuh', 'pisang', 'roket', 'petasan',
      ...this.state.racers.flatMap((r) => [`kart-${r.body}`, `char-${CHARACTERS[r.char].id}`]),
    ])
    if (this.disposed) return
    this.world = buildWorld(this.t)
    this.world.scene.add(this.fxGroup)
    this.state.racers.forEach((r) => {
      const c = CHARACTERS[r.char]
      const m = makeKart(c.id, c.color, r.body)
      // bayangan bulat di bawah kart
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 14), new THREE.MeshBasicMaterial({ color: '#121212', transparent: true, opacity: 0.3, depthWrite: false }))
      sh.rotation.x = -Math.PI / 2
      sh.position.y = 0.08
      m.add(sh)
      m.userData.shadow = sh
      this.meshes.push(m)
      this.world.scene.add(m)
    })
    this.resize()
    this.placeCamera(true)
    this.startAt = performance.now()
    this.goAt = this.startAt + COUNTDOWN * 1000
    this.last = performance.now()
    this.loop()
  }

  resize() {
    const c = this.o.canvas
    const w = c.clientWidth || window.innerWidth
    const h = c.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** state baru dari host: item, benda, kejadian */
  setState(s: KartState) {
    this.state = s
    for (const e of s.entities) if (!this.born.has(e.id)) this.born.set(e.id, performance.now())
    for (const [r, at] of this.rolling) if (s.items[r] || performance.now() - at > 2500) this.rolling.delete(r)
    for (const ev of s.events) {
      if (ev.id <= this.seenEvents) continue
      this.seenEvents = Math.max(this.seenEvents, ev.id)
      if (ev.kind === 'awan') {
        const ranks = this.ranks()
        for (const i of this.local) {
          if (i !== ev.by && ranks.indexOf(i) < ranks.indexOf(ev.by) && this.state.times[i] === null) {
            this.karts[i].slowT = 4
            if (i === this.mine) this.o.onSound('rain')
          }
        }
        // semua HP menampilkan awan di atas kart yang kena
        ranks.slice(0, ranks.indexOf(ev.by)).forEach((i) => this.showCloud(i))
      }
    }
    // kotak item: begitu item datang, mainkan bunyi
    if (this.mine >= 0 && s.items[this.mine] && !this.lastItem) this.o.onSound('item')
    this.lastItem = this.mine >= 0 ? s.items[this.mine] : null
  }
  private lastItem: KartState['items'][number] = null

  private onLive(d: unknown) {
    const m = d as { p?: Pose[] }
    if (!m.p) return
    const now = performance.now()
    for (const p of m.p) {
      const r = this.remotes.get(p[0])
      if (!r) continue
      r.buf.push({ t: now, p })
      if (r.buf.length > 12) r.buf.shift()
      this.prog[p[0]] = p[8]
    }
  }

  /** peringkat saat ini: yang sudah finish menurut urutan, sisanya menurut kemajuan */
  private ranks(): number[] {
    const done = this.state.order.filter((i) => this.state.times[i] !== null)
    const rest = this.karts.map((_, i) => i).filter((i) => !done.includes(i))
    rest.sort((a, b) => this.prog[b] - this.prog[a])
    return [...done, ...rest]
  }

  useItem() {
    if (this.mine < 0) return
    this.fire(this.mine)
  }

  private fire(i: number) {
    const item = this.state.items[i]
    const k = this.karts[i]
    if (!item || k.spinT > 0 || k.fallT > 0 || performance.now() < this.goAt) return
    const fx = Math.sin(k.yaw)
    const fz = Math.cos(k.yaw)
    let x = k.x, z = k.z, s = k.s, back = false
    switch (item) {
      case 'pisang':
      case 'pisang3':
        x = k.x - fx * 3.5
        z = k.z - fz * 3.5
        back = true
        break
      case 'roket':
        s = k.s + 5
        if (i === this.mine) this.o.onSound('throw', { rate: 1.3 })
        break
      case 'petasan': {
        const p = pointAt(this.t, k.s + 30, k.lateral)
        x = p.x
        z = p.z
        if (i === this.mine) this.o.onSound('throw')
        break
      }
      case 'sambal':
      case 'sambal3':
        k.boostT = Math.max(k.boostT, 1.5)
        if (i === this.mine) this.o.onSound('boost', { rate: 1.1 })
        break
      case 'perisai':
        k.shieldT = 12
        if (i === this.mine) this.o.onSound('shield')
        break
      case 'magnet':
        k.magnetT = 2.8
        if (i === this.mine) this.o.onSound('boost', { rate: 0.8 })
        break
    }
    this.o.act({ type: 'use', racer: i, x: r2(x), z: r2(z), s: r2(s), lane: r2(k.lateral), back })
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const frame = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.acc += frame
    let steps = 0
    while (this.acc >= DT && steps < 5) {
      this.tick(now)
      this.acc -= DT
      steps++
    }
    if (steps === 5) this.acc = 0
    this.render(now, frame)
    this.adapt(frame)
  }

  private raceTime(now: number) {
    return Math.max(0, (now - this.goAt) / 1000)
  }

  private tick(now: number) {
    const go = now >= this.goAt
    const time = this.raceTime(now)
    const s = this.state
    const skill = LEVEL_INFO[s.opts.level].skill
    const ranks = this.ranks()
    const leaderProg = this.prog[ranks[0]] ?? 0

    for (const i of this.local) {
      const k = this.karts[i]
      const finished = s.times[i] !== null || this.crossed[i] - 1 >= s.opts.laps
      const isBot = s.racers[i].seat === null || finished || AUTOPILOT
      let inp: Input
      if (!go) inp = { steer: 0, gas: false, brake: false, drift: false }
      else if (isBot) {
        const brain = this.brains.get(i) ?? this.ensureBrain(i)
        inp = botInput(k, brain, this.t, DT, finished ? 0.6 : skill)
      } else inp = this.controls

      // bot: rubber-band ringan supaya balapan tetap rapat
      let speed = 1
      if (s.racers[i].seat === null) {
        speed = LEVEL_INFO[s.opts.level].speed
        const gap = leaderProg - this.prog[i]
        const humanBest = Math.max(...s.racers.map((r, j) => (r.seat !== null ? this.prog[j] : -Infinity)))
        if (this.prog[i] > humanBest + 120) speed *= 0.92
        else if (gap > 200) speed *= 1.06
      }
      const ev = stepKart(k, inp, this.stats[i], this.t, DT, { speed })
      const me = i === this.mine
      if (ev.lap) {
        this.crossed[i]++
        const done = this.crossed[i] - 1
        if (done >= 1 && done < s.opts.laps) {
          this.o.act({ type: 'lap', racer: i, lap: done })
          if (me) this.o.onSound(done === s.opts.laps - 1 ? 'final' : 'lap')
        }
        if (done >= s.opts.laps && s.times[i] === null && !this.handled.has(`fin${i}`)) {
          this.handled.add(`fin${i}`)
          this.o.act({ type: 'finish', racer: i, time: (now - this.goAt) | 0 })
          if (me) this.o.onSound('finish')
          if (s.racers[i].seat !== null && !this.firstFinishAt) this.firstFinishAt = now
        }
      }
      if (me) {
        if (ev.boost) this.o.onSound('boost', { rate: 0.9 + ev.boost * 0.1 })
        if (ev.jump) this.o.onSound('jump')
        if (ev.land) this.o.onSound('land')
        if (ev.bump) this.o.onSound('bump', { volume: 0.5 })
        if (ev.fell) this.o.onSound('fall')
      }
      this.prog[i] = (this.crossed[i] - 1) * this.t.length + k.s

      if (!go) continue
      // panel turbo
      if (onPad(this.t, k.s, k.lateral) && k.boostT < 0.6) {
        k.boostT = 1
        if (me) this.o.onSound('boost', { rate: 1.2, volume: 0.7 })
      }
      // rintangan
      const hz = hazardContact(this.t, time, k.x, k.z, k.y)
      if (hz === 'bounce' && !k.airborne) {
        bounce(k, 1)
        if (me) this.o.onSound('jump', { rate: 1.3 })
      } else if (hz === 'hit' && hitKart(k, 1.2) && me) this.o.onSound('hit')
      const push = blockPush(this.t, k.x, k.z)
      if (push) {
        k.x += push.nx * push.depth
        k.z += push.nz * push.depth
        if (k.speed > 18) {
          k.speed *= 0.5
          if (me) this.o.onSound('bump')
        }
      }
      // tabrakan antar kart
      for (let j = 0; j < this.karts.length; j++) {
        if (j === i) continue
        const other = this.local.has(j) ? this.karts[j] : this.remotePose(j, now)
        if (other && collide(k, this.stats[i].weight, other, this.stats[j].weight) && me && Math.abs(k.speed) > 15) this.o.onSound('bump', { volume: 0.6 })
      }
      // kotak item
      for (const b of this.world.boxes) {
        if (now < b.hiddenUntil) continue
        if ((b.x - k.x) ** 2 + (b.z - k.z) ** 2 > 2.6 ** 2 || Math.abs(b.y - k.y - 1.4) > 3) continue
        b.hiddenUntil = now + BOX_RESPAWN * 1000
        if (!s.items[i] && !this.rolling.has(i) && s.times[i] === null) {
          this.rolling.set(i, now)
          this.o.act({ type: 'box', racer: i, rank: ranks.indexOf(i) })
          if (me) this.o.onSound('box')
          if (!me) this.botItemT.set(i, 1.5 + Math.random() * 4)
        }
      }
      // benda item
      for (const e of s.entities) this.checkEntity(i, k, e, now)
      // bot memakai item
      if (s.racers[i].seat === null && s.items[i]) {
        const left = (this.botItemT.get(i) ?? 2) - DT
        this.botItemT.set(i, left)
        if (left <= 0) {
          this.botItemT.set(i, 1 + Math.random() * 3)
          this.fire(i)
        }
      }
    }

    // kart sendiri: deteksi salah arah
    if (this.mine >= 0 && go) {
      const k = this.karts[this.mine]
      const dot = Math.sin(k.yaw) * this.t.tx[k.i] + Math.cos(k.yaw) * this.t.tz[k.i]
      this.wrongT = dot < -0.3 && k.speed > 4 ? this.wrongT + DT : 0
    }

    // host menutup balapan
    if (this.o.seat === 0 && !this.ended && s.phase === 'race') {
      const grace = this.firstFinishAt && now - this.firstFinishAt > FINISH_GRACE * 1000
      if (humansDone(s) || grace) {
        this.ended = true
        const rest = ranks.filter((i) => s.times[i] === null)
        this.o.act({ type: 'end', rest })
      }
    }
    if (s.times.some((t, i) => t !== null && s.racers[i].seat !== null) && !this.firstFinishAt) this.firstFinishAt = now
  }

  private ensureBrain(i: number) {
    const b = newBrain(i * 31 + 7)
    this.brains.set(i, b)
    return b
  }

  private checkEntity(i: number, k: Kart, e: Entity, now: number) {
    const key = `${e.id}:${i}`
    if (this.handled.has(key)) return
    const age = (now - (this.born.get(e.id) ?? now)) / 1000
    const p = entityPose(this.t, e, age)
    if (!p || !p.live) return
    if (e.by === i && age < 1.2) return
    if ((p.x - k.x) ** 2 + (p.z - k.z) ** 2 > (p.r + 1.3) ** 2 || Math.abs(p.y - k.y) > 4) return
    this.handled.add(key)
    const shielded = k.shieldT > 0
    const hit = hitKart(k, e.kind === 'petasan' ? 1.5 : 1.15)
    if (e.kind === 'petasan') k.vy = 9
    if (hit || shielded) this.o.act({ type: 'hit', racer: i, id: e.id })
    if (i === this.mine) this.o.onSound(shielded ? 'shield' : e.kind === 'petasan' ? 'blast' : 'hit')
  }

  /** pose kart HP lain yang diinterpolasi */
  private remotePose(i: number, now: number): { x: number; y: number; z: number; yaw: number; slide: number; flags: number; speed: number } | null {
    const r = this.remotes.get(i)
    if (!r || !r.buf.length) return null
    const t = now - INTERP_DELAY
    let a = r.buf[0]
    let b = r.buf[r.buf.length - 1]
    for (let k = 0; k < r.buf.length - 1; k++) {
      if (r.buf[k].t <= t && r.buf[k + 1].t >= t) {
        a = r.buf[k]
        b = r.buf[k + 1]
        break
      }
    }
    if (t >= b.t) {
      // ekstrapolasi sebentar dengan kecepatan terakhir
      const dt = Math.min(0.25, (t - b.t) / 1000)
      const p = b.p
      return { x: p[1] + Math.sin(p[4]) * p[5] * dt, y: p[2], z: p[3] + Math.cos(p[4]) * p[5] * dt, yaw: p[4], slide: p[6], flags: p[7], speed: p[5] }
    }
    const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t)
    let dy = b.p[4] - a.p[4]
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    const L = (u: number, v: number) => u + (v - u) * f
    return { x: L(a.p[1], b.p[1]), y: L(a.p[2], b.p[2]), z: L(a.p[3], b.p[3]), yaw: a.p[4] + dy * f, slide: L(a.p[6], b.p[6]), flags: b.p[7], speed: b.p[5] }
  }

  private render(now: number, frame: number) {
    const time = this.raceTime(now)
    this.world.update(time, now)
    const poses: Pose[] = []
    this.karts.forEach((k, i) => {
      const m = this.meshes[i]
      let x = k.x, y = k.y, z = k.z, yaw = k.yaw, slide = k.slide, flags = 0, speed = k.speed
      if (this.local.has(i)) {
        flags = (k.drift ? F_DRIFT : 0) | (k.boostT > 0 ? F_BOOST : 0) | (k.spinT > 0 ? F_SPIN : 0) | (k.shieldT > 0 ? F_SHIELD : 0) | (k.airborne ? F_AIR : 0) | (k.slowT > 0 ? F_SLOW : 0)
        poses.push([i, r2(x), r2(y), r2(z), r2(yaw), r2(speed), r2(slide), flags | (driftLevel(k) << 8), Math.round(this.prog[i])])
        if (k.fallT > 0) y -= (1.2 - k.fallT) * 6
      } else {
        const p = this.remotePose(i, now)
        if (p) ({ x, y, z, yaw, slide, flags, speed } = p)
        // HP lain: pakai posisi interpolasi juga untuk tabrakan
        k.x = x; k.y = y; k.z = z
      }
      m.position.set(x, y, z)
      m.rotation.y = yaw + slide
      const ud = m.userData as { tilt: THREE.Group; wheels: THREE.Mesh[]; shadow: THREE.Mesh }
      ud.tilt.rotation.z = (flags & F_DRIFT ? (slide > 0 ? 1 : -1) * 0.12 : 0) + Math.sin(now / 90 + i) * Math.min(0.02, Math.abs(speed) / 2000)
      ud.tilt.position.y = flags & F_AIR ? 0 : Math.abs(Math.sin(now / 70 + i)) * Math.min(0.06, Math.abs(speed) / 600)
      for (const w of ud.wheels) w.rotation.x += (speed * frame) / 0.48
      const gi = Math.round(k.s / 2)
      const gy = this.t.py[((gi % this.t.n) + this.t.n) % this.t.n]
      ud.shadow.position.y = Math.max(0.08, gy - y + 0.1)
      this.shieldFx(i, m, (flags & F_SHIELD) !== 0)
    })

    // kirim pose ke HP lain
    this.sendAcc += frame
    if (this.o.live && this.sendAcc >= SEND_EVERY && poses.length) {
      this.sendAcc = 0
      this.o.live.send({ p: poses })
    }

    this.renderEntities(now)
    this.updateClouds(now)
    this.placeCamera(false, frame)
    this.renderer.render(this.world.scene, this.camera)

    // hitung mundur
    const left = (this.goAt - now) / 1000
    const c = Math.ceil(left)
    if (c !== this.countShown && c <= 3 && c >= 0) {
      this.countShown = c
      this.o.onSound(c === 0 ? 'go' : 'count')
    }

    this.hudAcc += frame
    if (this.hudAcc >= 0.1) {
      this.hudAcc = 0
      this.emitHud(now, left)
    }
  }

  private emitHud(now: number, left: number) {
    const s = this.state
    const ranks = this.ranks()
    const i = Math.max(0, this.mine)
    const k = this.karts[i]
    const bounds = this.bounds ?? (this.bounds = this.mapBounds())
    this.o.onHud({
      count: left,
      rank: ranks.indexOf(i) + 1,
      total: this.karts.length,
      lap: Math.min(s.opts.laps, Math.max(1, this.crossed[i])),
      laps: s.opts.laps,
      speed: Math.round(Math.abs(k.speed) * 3.6),
      drift: driftLevel(k),
      boost: k.boostT > 0,
      timeMs: s.times[i] ?? Math.max(0, now - this.goAt),
      finished: s.times[i] !== null || this.crossed[i] - 1 >= s.opts.laps,
      wrongWay: this.wrongT > 1,
      rolling: this.rolling.has(i),
      dots: this.karts.map((kk, j) => ({
        x: (kk.x - bounds.x) / bounds.w,
        z: (kk.z - bounds.z) / bounds.w,
        me: j === i,
        color: CHARACTERS[s.racers[j].char].color,
      })),
      slow: k.slowT > 0,
      shield: k.shieldT > 0,
    })
  }

  private bounds?: { x: number; z: number; w: number }
  mapBounds() {
    const t = this.t
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < t.n; i++) {
      minX = Math.min(minX, t.px[i]); maxX = Math.max(maxX, t.px[i])
      minZ = Math.min(minZ, t.pz[i]); maxZ = Math.max(maxZ, t.pz[i])
    }
    const w = Math.max(maxX - minX, maxZ - minZ) * 1.08
    return { x: (minX + maxX) / 2 - w / 2, z: (minZ + maxZ) / 2 - w / 2, w }
  }

  /** garis lintasan untuk minimap (0..1) */
  mapPath(): string {
    const b = this.mapBounds()
    const pts: string[] = []
    for (let i = 0; i < this.t.n; i += 6) pts.push(`${(((this.t.px[i] - b.x) / b.w) * 100).toFixed(1)},${(((this.t.pz[i] - b.z) / b.w) * 100).toFixed(1)}`)
    return pts.join(' ')
  }

  private placeCamera(snap: boolean, frame = 0) {
    const i = Math.max(0, this.mine)
    const k = this.karts[i]
    const m = this.meshes[i]
    if (!m) return
    const fx = Math.sin(k.yaw)
    const fz = Math.cos(k.yaw)
    const back = 8.5 + Math.min(3, Math.abs(k.speed) / 14)
    const want = new THREE.Vector3(m.position.x - fx * back, m.position.y + 3.8, m.position.z - fz * back)
    const look = new THREE.Vector3(m.position.x + fx * 6, m.position.y + 1.6, m.position.z + fz * 6)
    if (snap) {
      this.camPos.copy(want)
      this.camLook.copy(look)
    } else {
      const f = 1 - Math.pow(0.0008, frame)
      this.camPos.lerp(want, f)
      this.camLook.lerp(look, Math.min(1, f * 1.6))
    }
    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)
    const fov = 68 + (k.boostT > 0 ? 10 : 0) + Math.min(6, Math.abs(k.speed) / 8)
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, frame * 4)
      this.camera.updateProjectionMatrix()
    }
  }

  private renderEntities(now: number) {
    const alive = new Set<number>()
    for (const e of this.state.entities) {
      const age = (now - (this.born.get(e.id) ?? now)) / 1000
      const p = entityPose(this.t, e, age)
      if (!p) continue
      alive.add(e.id)
      let m = this.entityMeshes.get(e.id)
      if (!m) {
        m = new THREE.Mesh(geometry(e.kind), new THREE.MeshLambertMaterial({ vertexColors: true }))
        this.fxGroup.add(m)
        this.entityMeshes.set(e.id, m)
      }
      m.position.set(p.x, p.y, p.z)
      if (e.kind === 'roket') {
        const q = pointAt(this.t, e.s + age * 62, e.lane)
        m.rotation.y = q.yaw
      } else if (e.kind === 'petasan') {
        m.rotation.z = age * 8
        const blast = p.live
        m.scale.setScalar(blast ? 1 + (age - 0.8) * 10 : 1)
        ;(m as THREE.Mesh).visible = age < 1.3
        if (blast && !this.handled.has(`snd${e.id}`)) {
          this.handled.add(`snd${e.id}`)
          this.o.onSound('blast', { volume: 0.6 })
        }
      }
    }
    for (const [id, m] of this.entityMeshes) {
      if (alive.has(id)) continue
      this.fxGroup.remove(m)
      this.entityMeshes.delete(id)
    }
  }

  private showCloud(i: number) {
    if (this.clouds.has(i)) return
    const g = new THREE.Group()
    const mat = new THREE.MeshLambertMaterial({ color: '#5a6a8a' })
    for (const [x, y, s] of [[0, 0, 1.2], [1, 0.2, 0.9], [-1, 0.1, 0.9]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat)
      b.position.set(x, y, 0)
      g.add(b)
    }
    g.userData.until = performance.now() + 4000
    this.fxGroup.add(g)
    this.clouds.set(i, g)
  }

  private updateClouds(now: number) {
    for (const [i, c] of this.clouds) {
      if (now > (c.userData.until as number)) {
        this.fxGroup.remove(c)
        this.clouds.delete(i)
        continue
      }
      const m = this.meshes[i]
      c.position.set(m.position.x, m.position.y + 6.5, m.position.z)
    }
  }

  private shieldFx(i: number, m: THREE.Group, on: boolean) {
    let s = this.shieldMeshes.get(i)
    if (on && !s) {
      s = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), new THREE.MeshLambertMaterial({ color: '#7fd0ff', transparent: true, opacity: 0.35, emissive: new THREE.Color('#2f7bff'), emissiveIntensity: 0.4 }))
      s.position.y = 1.6
      m.add(s)
      this.shieldMeshes.set(i, s)
    }
    if (s) s.visible = on
  }

  /** turunkan resolusi kalau HP kewalahan */
  private adapt(frame: number) {
    this.fpsT += frame
    this.fpsN++
    if (this.fpsT < 2) return
    const fps = this.fpsN / this.fpsT
    this.fpsT = 0
    this.fpsN = 0
    if (fps < 40 && this.ratio > 0.75) {
      this.ratio = Math.max(0.75, this.ratio - 0.25)
      this.renderer.setPixelRatio(this.ratio)
      this.resize()
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.stopLive?.()
    this.world?.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((mt) => mt?.dispose())
      }
    })
    this.renderer.dispose()
  }
}
