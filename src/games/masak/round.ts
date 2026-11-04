import * as THREE from 'three'
import { initialTier, TIERS, type Quality } from '@/games/kart/render/quality'
import { spawnWalker, step, type Walker } from '@/games/petak/sim/walk'
import { Chibi, loadChibi } from '@/games/sport/render/chibi'
import { randomLook } from '@/games/sport/look'
import type { Look } from '@/games/sport/types'
import type { LiveChannel, Seat } from '../types'
import { actorOf } from './engine'
import { CELL, layoutOf, type Layout } from './kitchens'
import { KitchenScene, make } from './render/scene'
import { COOK_SPEED, moveCook, newBot, stepBot, type Bot, type Plan } from './sim/bots'
import { advance, canWork, chop, cloneKit, gapOpen, lavaOn, lavaSoon, liftUp, newKit, prank, slip, turnSoon, use, type Fx, type Kit } from './sim/kitchen'
import type { Sound } from './sounds'
import type { MasakAction, MasakState } from './types'

const SEND_EVERY = 0.1
/** paling cepat kirim isi dapur, dan detak paling lambat saat tidak ada perubahan */
const KIT_MIN = 0.066
const KIT_BEAT = 0.5
/** jarak terjauh koki ke pusat stasiun yang dilayani host (petak 1,2 m + toleransi jeda jaringan) */
const REACH = CELL * 1.5 + 0.6
const CHIBI_SCALE = 1.4
/** sudut lengan atas & bawah saat membawa barang (radian, sumbu X lokal tulang) */
const ARM_UP0 = -1.4
const ARM_FORE0 = 0.1
const DASH_SECS = 0.22
/** letak topi di ruang tulang kepala */
const HAT_POS = [0, 0.42, 0] as const
const HAT_SCALE = 1.25
const DASH_COOL = 0.9
const DASH_SPEED = 2.6
const SLIP_SECS = 0.85
const PUSH_SECS = 0.7
const SLIP_SPEED = 1.9
/** jarak injak kulit pisang */
const PEEL_R = 0.42

export type Hud = {
  /** sisa detik */
  secs: number
  score: number
  /** versus: skor tiap tim (tim sendiri di indeks tim) */
  scores: number[]
  team: number
  /** jatah iseng tim sendiri */
  jahil: number
  /** layar tertutup tepung */
  flour: boolean
  /** Pizzeria: loket bisa dipakai */
  lift: boolean
  /** Truk Taco: belok sebentar lagi (-1 kiri, 1 kanan, 0 tidak) */
  turn: number
  /** Ramen Kereta: sambungan gerbong sedang lepas */
  gap: boolean
  /** Gunung Api: lava sedang naik atau sebentar lagi */
  lava: 'on' | 'soon' | null
  served: number
  missed: number
  orders: { id: number; r: string; left: number }[]
  holding: boolean
  /** tombol tahan untuk stasiun di depan: potong, cuci, semprot; null = tidak ada */
  work: 'Potong' | 'Cuci' | 'Semprot' | null
  chopping: boolean
  /** jumlah kompor yang sedang memasak, untuk keras-pelannya loop rebusan */
  cooking: number
  /** jeda aksi bolak-balik ke host, ms (rata-rata bergerak); null = host sendiri */
  rtt: number | null
  fps: number
}

/** [aktor, x, z, yaw, bergerak] */
type Pose = [number, number, number, number, number]
type Op = 'use' | 'chop' | 'unchop' | 'iseng' | 'slip'
type Wire = { k: 'pose'; a: Pose[] } | { k: 'do'; a: number; op: Op; si: number; n: number } | { k: 'kit'; t: number; s: Kit }

const r2 = (v: number) => Math.round(v * 100) / 100

export type RoundOptions = {
  canvas: HTMLCanvasElement
  state: MasakState
  seat: Seat
  look: Look | null
  act: (a: MasakAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onFx: (f: Fx) => void
  onSound: (s: Sound, volume: number) => void
}

type Remote = { x: number; z: number; yaw: number; moving: boolean }

/** satu ronde di satu HP: dunia, koki, kendali, jaringan, dan (di host) isi dapur + bot */
export class Round {
  private o: RoundOptions
  private s: MasakState
  private L: Layout
  private scene: KitchenScene
  private kits: Kit[]
  private team: number
  /** jarak geser dapur tim 1 di sumbu x */
  private off: number
  private me: number
  private host: boolean
  private walkers: Walker[] = []
  private remotes: Remote[] = []
  private bots: (Bot | null)[] = []
  private chibis: (Chibi | null)[] = []
  private roots: THREE.Group[] = []
  private handPts: THREE.Vector3[] = []
  private stopLive: (() => void) | undefined
  private raf = 0
  private alive = true
  private ro: ResizeObserver | null = null
  private lastT = 0
  private input = { x: 0, y: 0 }
  private target: number | null = null
  private sendIn = 0
  private kitIn = 0
  private kitDirty: boolean[] = [false, false]
  private fired = false
  private seenFx = [0, 0]
  private slipT = 0
  private vel = { x: 0, z: 0 }
  private push = [
    { t: 0, dir: 0 },
    { t: 0, dir: 0 },
  ]
  private seq = 0
  private sent = new Map<number, number>()
  private rtt: number | null = null
  private hudIn = 0
  private frames = 0
  private fpsAt = 0
  private fps = 60
  private anims: string[] = []

  constructor(o: RoundOptions) {
    this.o = o
    this.s = o.state
    this.L = layoutOf(o.state.opts.kitchen)
    this.me = actorOf(o.state, o.seat)
    this.host = o.seat === 0
    const url = import.meta.env.DEV ? (new URLSearchParams(location.search).get('q') as Quality | null) : null
    const tier = url && TIERS[url] ? TIERS[url] : initialTier()
    this.scene = new KitchenScene(o.canvas, tier, this.L)
    const teams = o.state.opts.mode === 'versus' ? 2 : 1
    // pesanan kedua dapur memakai benih yang sama supaya adil
    this.kits = Array.from({ length: teams }, () => newKit(o.state.opts.kitchen, o.state.actors.length, o.state.seed, teams > 1))
    this.team = this.me >= 0 ? o.state.actors[this.me].team : 0
    this.off = this.L.w * CELL + 4.8
    const rank = [0, 0]
    o.state.actors.forEach((a) => {
      const [x, z] = this.L.spawns[rank[a.team]++ % this.L.spawns.length]
      this.walkers.push(spawnWalker(x, z, Math.PI))
      this.remotes.push({ x, z, yaw: Math.PI, moving: false })
      this.bots.push(a.seat === null ? newBot() : null)
      this.chibis.push(null)
      const root = new THREE.Group()
      root.position.set(x, 0, z)
      this.scene.actors.add(root)
      this.roots.push(root)
      this.handPts.push(new THREE.Vector3(x, 0.8, z))
      this.anims.push('')
    })
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
    // tekstur & koki dulu, baru jam ronde jalan: layar muat menutupi dapur yang belum jadi
    const [gltf] = await Promise.all([loadChibi(), this.scene.load(this.s.opts.kitchen, this.kits.length, this.off)])
    this.scene.focus(this.team * this.off)
    if (!this.alive) return
    const pbr = this.scene.shadows
    this.s.actors.forEach((_, i) => {
      const look = (i === this.me ? this.o.look : null) ?? this.s.looks[i] ?? randomLook(i * 977 + 13)[0]
      const c = new Chibi(gltf, look, pbr)
      c.root.scale.setScalar(CHIBI_SCALE)
      if (!this.scene.shadows) c.root.traverse((m) => ((m as THREE.Mesh).castShadow = false))
      this.roots[i].add(c.root)
      this.chibis[i] = c
      this.dressChef(c)
    })
    this.lastT = performance.now()
    this.fpsAt = this.lastT
    this.raf = requestAnimationFrame(this.frame)
  }

  /** topi koki di tulang kepala; aksesori Sport (topi/kacamata/bando) disembunyikan supaya tidak bertumpuk */
  private dressChef(c: Chibi) {
    c.root.traverse((o) => {
      if (/^acc_\d$/.test(o.name)) o.visible = false
    })
    const head = c.bone('head')
    if (!head || head.getObjectByName('topi_koki')) return
    const hat = make('topi_koki')
    hat.name = 'topi_koki'
    hat.position.set(HAT_POS[0], HAT_POS[1], HAT_POS[2])
    hat.scale.setScalar(HAT_SCALE)
    head.add(hat)
  }

  setState(s: MasakState) {
    const prev = this.s
    this.s = s
    // tampilan orang lain menyusul saat `look` mereka masuk
    s.looks.forEach((l, i) => {
      const c = this.chibis[i]
      if (l && l !== prev.looks[i] && i !== this.me && c) {
        c.setLook(l)
        this.dressChef(c)
      }
    })
  }

  // ---------- kendali ----------
  setMove(x: number, y: number) {
    this.input.x = x
    this.input.y = y
  }

  private dashT = 0
  private dashCool = 0

  /** tombol Dash: lari sebentar ke arah hadap */
  dash() {
    if (this.me < 0 || this.over() || this.dashCool > 0) return
    this.dashT = DASH_SECS
    this.dashCool = DASH_COOL
    this.o.onSound('dash', 0.8)
  }

  /** tombol Ambil/Taruh */
  grab() {
    if (this.me < 0 || this.target === null || this.over()) return
    this.o.onSound('grab', 0.7)
    this.request('use', this.target)
  }

  /** tombol Iseng: pakai satu jatah iseng ke dapur lawan */
  iseng() {
    if (this.me < 0 || this.over() || this.kits.length < 2 || this.kit.jahil <= 0) return
    this.request('iseng', -1)
  }

  /** dapur tim sendiri (penonton: tim 0) */
  private get kit() {
    return this.kits[this.team]
  }

  private teamOf(i: number) {
    return this.s.actors[i]?.team ?? 0
  }

  /** tombol Potong ditahan/dilepas */
  holdChop(on: boolean) {
    if (this.me < 0 || this.over()) return
    if (on && this.target !== null) this.request('chop', this.target)
    if (!on) this.request('unchop', this.target ?? -1)
  }

  private request(op: Op, si: number) {
    if (this.host) {
      this.apply(this.me, op, si)
      return
    }
    const n = ++this.seq
    this.sent.set(n, performance.now())
    this.o.live?.send({ k: 'do', a: this.me, op, si, n } satisfies Wire)
  }

  /** host: jalankan aksi koki di dapur timnya; tandai dapur yang berubah untuk dikirim */
  private apply(actor: number, op: Op, si: number): boolean {
    const t = this.teamOf(actor)
    const k = this.kits[t]
    let changed = false
    if (op === 'unchop') changed = chop(k, actor, si, false)
    else if (op === 'slip') changed = slip(k, si)
    else if (op === 'iseng') {
      const foe = this.kits[1 - t]
      if (foe && prank(k, foe)) {
        this.kitDirty[1 - t] = true
        changed = true
      }
    } else {
      const p = this.posOf(actor)
      const st = this.L.stations[si]
      if (!st || Math.hypot(st.x - p.x, st.z - p.z) > REACH) return false
      changed = op === 'use' ? use(k, actor, si) : chop(k, actor, si, true)
    }
    if (changed) this.kitDirty[t] = true
    return changed
  }

  private over() {
    return this.kits[0].t >= this.s.opts.secs * 1000
  }

  private posOf(i: number) {
    return i === this.me || (this.host && this.s.actors[i].seat === null) ? this.walkers[i] : this.remotes[i]
  }

  private onLive(d: unknown, from: Seat) {
    const m = d as Wire
    if (m?.k === 'pose') {
      for (const [a, x, z, yaw, moving] of m.a) {
        const actor = this.s.actors[a]
        if (!actor || a === this.me) continue
        if (actor.seat === null ? from !== 0 : actor.seat !== from) continue
        Object.assign(this.remotes[a], { x, z, yaw, moving: !!moving })
      }
    } else if (m?.k === 'do' && this.host) {
      if (this.s.actors[m.a]?.seat !== from) return
      this.apply(m.a, m.op, m.si)
      // tetap dicatat walau tidak berubah, supaya pengirim bisa mengukur jeda
      const t = this.teamOf(m.a)
      this.kits[t].ack[m.a] = Math.max(this.kits[t].ack[m.a], m.n)
      this.kitDirty[t] = true
    } else if (m?.k === 'kit' && !this.host && from === 0 && this.kits[m.t]) {
      this.kits[m.t] = m.s
      if (m.t !== this.team) return
      const done = this.kit.ack[this.me] ?? 0
      for (const [n, at] of this.sent) {
        if (n > done) continue
        const ms = performance.now() - at
        this.rtt = this.rtt === null ? ms : this.rtt * 0.7 + ms * 0.3
        this.sent.delete(n)
      }
    }
  }

  // ---------- per frame ----------
  private stepMe(dt: number) {
    if (this.me < 0) return
    const w = this.walkers[this.me]
    const chopping = this.kit.chop[this.me] !== null
    // kamera menghadap -z: stik atas = menjauh dari kamera
    let mx = chopping || this.over() ? 0 : this.input.x
    let mz = chopping || this.over() ? 0 : -this.input.y
    this.dashT = Math.max(0, this.dashT - dt)
    this.dashCool = Math.max(0, this.dashCool - dt)
    this.slipT = Math.max(0, this.slipT - dt)
    let speed = COOK_SPEED * (this.dashT > 0 ? DASH_SPEED : 1)
    if (this.dashT > 0 && !chopping) {
      // dash: terus ke arah hadap walau stik dilepas
      mx = Math.sin(w.yaw)
      mz = Math.cos(w.yaw)
    }
    // terpeleset: meluncur tanpa kendali sambil berputar
    const peel = this.slipT <= 0 ? this.kit.peels.find((p) => Math.hypot(p.x - w.x, p.z - w.z) < PEEL_R) : undefined
    if (peel) {
      this.slipT = SLIP_SECS
      this.o.onSound('slip', 1)
      this.request('slip', peel.id)
      // lokal dulu supaya tidak terpeleset dua kali sebelum host menjawab
      this.kit.peels = this.kit.peels.filter((p) => p !== peel)
    }
    if (this.slipT > 0) {
      mx = Math.sin(w.yaw)
      mz = Math.cos(w.yaw)
      speed = COOK_SPEED * SLIP_SPEED * (this.slipT / SLIP_SECS)
    }
    // truk belok: semua koki terdorong ke samping sebentar
    const push = this.push[this.team]
    if (push.t > 0) {
      mx += push.dir * 0.9 * (push.t / PUSH_SECS)
      speed = Math.max(speed, COOK_SPEED)
    }
    moveCook(this.kit, w, this.vel, mx, mz, speed, dt)
    if (this.slipT > 0) w.yaw += dt * 14
    // jalan sambil memotong = berhenti memotong
    if (chopping && Math.hypot(this.input.x, this.input.y) > 0.3) this.request('unchop', -1)
    this.target = this.aim(w)
  }

  /** stasiun tepat di depan koki: petak yang disentuh titik 0,8 m di depannya */
  private aim(w: Walker): number | null {
    const fx = w.x + Math.sin(w.yaw) * 0.8
    const fz = w.z + Math.cos(w.yaw) * 0.8
    let best: number | null = null
    let bd = CELL * 0.95
    this.L.stations.forEach((st, si) => {
      const d = Math.max(Math.abs(st.x - fx), Math.abs(st.z - fz))
      if (d < bd && Math.hypot(st.x - w.x, st.z - w.z) < CELL * 1.6) {
        bd = d
        best = si
      }
    })
    return best
  }

  private stepBots(dt: number) {
    this.bots.forEach((b, i) => {
      if (!b) return
      const w = this.walkers[i]
      if (this.over()) return step(w, 0, 0, 0, dt, this.L)
      const t = this.teamOf(i)
      const k = this.kits[t]
      // bot juga bisa terpeleset
      const peel = k.peels.find((p) => Math.hypot(p.x - w.x, p.z - w.z) < PEEL_R)
      if (peel && slip(k, peel.id)) {
        this.kitDirty[t] = true
        b.wait = SLIP_SECS + 0.3
        b.plan = null
      }
      // bot sesekali memakai jatah iseng; makin pintar makin cepat
      const foe = this.kits[1 - t]
      if (foe && k.jahil > 0 && Math.random() < dt * 0.15 * this.s.opts.level && prank(k, foe)) {
        this.kitDirty[0] = this.kitDirty[1] = true
      }
      const push = this.push[t]
      if (push.t > 0) moveCook(k, w, { x: 0, z: 0 }, push.dir * (push.t / PUSH_SECS), 0, COOK_SPEED * 0.9, dt)
      const claims = this.bots.flatMap((o, j) => (o && j !== i && o.plan && this.teamOf(j) === t ? [o.plan] : [])) as Plan[]
      if (stepBot(k, i, b, w, dt, this.s.opts.level, claims)) this.kitDirty[t] = true
    })
  }

  private send(dt: number) {
    const live = this.o.live
    if (!live) return
    this.sendIn -= dt
    if (this.sendIn <= 0) {
      this.sendIn = SEND_EVERY
      const a: Pose[] = []
      const add = (i: number) => {
        const w = this.walkers[i]
        a.push([i, r2(w.x), r2(w.z), r2(w.yaw), w.moving ? 1 : 0])
      }
      if (this.me >= 0) add(this.me)
      if (this.host) this.s.actors.forEach((x, i) => x.seat === null && add(i))
      if (a.length) live.send({ k: 'pose', a } satisfies Wire)
    }
    if (!this.host) return
    this.kitIn -= dt
    if ((this.kitDirty.some(Boolean) && this.kitIn <= KIT_BEAT - KIT_MIN) || this.kitIn <= 0) {
      const beat = this.kitIn <= 0
      this.kitIn = KIT_BEAT
      this.kits.forEach((k, t) => {
        if (!beat && !this.kitDirty[t]) return
        this.kitDirty[t] = false
        live.send({ k: 'kit', t, s: cloneKit(k) } satisfies Wire)
      })
    }
  }

  private applyBodies(dt: number) {
    const k = 1 - Math.exp(-dt * 12)
    this.roots.forEach((root, i) => {
      const local = i === this.me || (this.host && this.s.actors[i].seat === null)
      const p = local ? this.walkers[i] : this.remotes[i]
      const ox = this.teamOf(i) * this.off
      if (local) root.position.set(p.x + ox, 0, p.z)
      else {
        root.position.x += (p.x + ox - root.position.x) * k
        root.position.z += (p.z - root.position.z) * k
      }
      const turn = Math.atan2(Math.sin(p.yaw - root.rotation.y), Math.cos(p.yaw - root.rotation.y))
      root.rotation.y += turn * Math.min(1, k * 1.6)
      this.handPts[i].set(root.position.x + Math.sin(root.rotation.y) * 0.5, 0.86, root.position.z + Math.cos(root.rotation.y) * 0.5)
      const c = this.chibis[i]
      if (!c) return
      const clip = p.moving ? 'walk' : 'idle'
      if (clip !== this.anims[i]) {
        this.anims[i] = clip
        c.play(clip, { speed: clip === 'walk' ? 1.3 : 1 })
      }
      c.update(dt)
      this.armPose(i, c)
    })
  }

  private arms: ({ uL: THREE.Object3D; uR: THREE.Object3D; fL: THREE.Object3D; fR: THREE.Object3D } | null)[] = []
  private armMix: number[] = []
  armUp = ARM_UP0
  armFore = ARM_FORE0
  private time = 0
  private static Q = new THREE.Quaternion()
  private static X = new THREE.Vector3(1, 0, 0)

  /**
   * Pose lengan di atas klip jalan/diam: bawa barang = kedua lengan ke depan; potong = tangan kanan naik-turun;
   * cuci = kedua tangan menggosok; semprot = lengan lurus ke depan. Ditimpa setelah mixer supaya klip Sport tetap dipakai.
   */
  private armPose(i: number, c: Chibi) {
    const b = (this.arms[i] ??= (() => {
      const uL = c.bone('upper_L')
      const uR = c.bone('upper_R')
      const fL = c.bone('fore_L')
      const fR = c.bone('fore_R')
      return uL && uR && fL && fR ? { uL, uR, fL, fR } : null
    })())
    if (!b) return
    const k = this.kits[this.teamOf(i)]
    const holding = k.hands[i] !== null
    const si = k.chop[i]
    const kind = si !== null ? this.L.stations[si].kind : null
    const ext = holding && k.items[k.hands[i]!]?.k === 'ext'
    const want = holding || si !== null ? 1 : 0
    this.armMix[i] = (this.armMix[i] ?? 0) + (want - (this.armMix[i] ?? 0)) * 0.25
    const mix = this.armMix[i]
    if (mix < 0.01) return
    const t = this.time
    const Q = Round.Q
    const X = Round.X
    const ARM_UP = this.armUp
    const ARM_FORE = this.armFore
    let upL = ARM_UP
    let upR = ARM_UP
    let foL = ARM_FORE
    let foR = ARM_FORE
    if (kind === 'board') {
      upL = ARM_UP * 0.8
      upR = ARM_UP * 0.9 + Math.sin(t * 22) * 0.35
      foR = ARM_FORE + Math.sin(t * 22) * 0.5
    } else if (kind === 'sink') {
      upL = ARM_UP * 0.85 + Math.sin(t * 9) * 0.18
      upR = ARM_UP * 0.85 - Math.sin(t * 9) * 0.18
    } else if (ext) {
      upL = upR = ARM_UP * 1.1
      foL = foR = 0.15
    }
    b.uL.quaternion.multiply(Q.setFromAxisAngle(X, upL * mix))
    b.uR.quaternion.multiply(Q.setFromAxisAngle(X, upR * mix))
    b.fL.quaternion.multiply(Q.setFromAxisAngle(X, foL * mix))
    b.fR.quaternion.multiply(Q.setFromAxisAngle(X, foR * mix))
  }

  private timers() {
    if (!this.host || this.fired || !this.over()) return
    this.fired = true
    const ks = this.kits
    this.o.act({ type: 'finish', result: { score: ks.map((k) => k.score), served: ks.map((k) => k.served), missed: ks.map((k) => k.missed) } })
  }

  private frame = (now: number) => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    this.time += dt
    this.push.forEach((p) => (p.t = Math.max(0, p.t - dt)))
    if (!this.over()) this.kits.forEach((k, t) => advance(k, dt * 1000, this.host, this.s.actors.filter((a) => a.team === t).length))
    this.stepMe(dt)
    if (this.host) this.stepBots(dt)
    this.timers()
    this.send(dt)
    this.applyBodies(dt)
    this.scene.sync(this.kits, this.handPts, this.off)
    this.scene.effects(this.kits, dt, this.handPts, this.off)
    this.scene.setTarget(this.target, this.team * this.off)
    this.scene.animate(this.kits, dt)
    this.loopSounds(dt)
    this.kits.forEach((k, t) => {
      for (const f of k.fx) {
        if (f.n <= this.seenFx[t]) continue
        this.seenFx[t] = f.n
        // lemparan iseng terlihat melayang dari dapur pelempar ke dapur lawan
        if (f.kind === 'iseng') this.scene.toss(t * this.off, (1 - t) * this.off)
        if (f.kind === 'belok') {
          this.push[t] = { t: PUSH_SECS, dir: f.pts ?? 1 }
          if (t === this.team) this.scene.bump(f.pts ?? 1)
        }
        if (t === this.team) this.o.onFx(f)
      }
    })
    this.scene.render()
    this.watchFps(now)
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.15
      this.pushHud()
    }
  }

  private knockIn = 0
  private sizzleIn = 0

  /** suara yang berulang selama keadaannya berlangsung: ketuk pisau, semprot, cuci, desis wajan */
  private loopSounds(dt: number) {
    const k = this.kit
    this.knockIn -= dt
    this.sizzleIn -= dt
    if (this.knockIn <= 0) {
      this.knockIn = 0.17
      k.chop.forEach((si, a) => {
        if (si === null) return
        const v = a === this.me ? 0.9 : 0.4
        const ext = k.items[k.hands[a] ?? -1]?.k === 'ext'
        const kind = this.L.stations[si].kind
        if (ext) this.o.onSound('semprot', v * 0.6)
        else if (kind === 'sink') Math.random() < 0.4 && this.o.onSound('cuci', v * 0.6)
        else this.o.onSound('potong', v)
      })
    }
    if (this.sizzleIn <= 0) {
      this.sizzleIn = 1.1
      const cooking = this.L.stations.some((st, si) => st.kind === 'stove' && k.items[k.hold[si] ?? -1]?.k === 'food')
      if (cooking) this.o.onSound('desis', 0.35)
      if (k.fire.some((f) => f > 0)) this.o.onSound('api', 0.5)
    }
  }

  private watchFps(now: number) {
    this.frames++
    if (now - this.fpsAt < 1000) return
    this.fps = Math.round((this.frames * 1000) / (now - this.fpsAt))
    this.frames = 0
    this.fpsAt = now
    // empat detik berturut-turut di bawah 24 fps: turunkan grafis satu langkah
    this.slow = this.fps < 24 ? this.slow + 1 : 0
    if (this.slow >= 4) {
      this.slow = 0
      this.scene.lowerQuality()
    }
  }

  private slow = 0

  private workLabel(t: number | null): Hud['work'] {
    if (this.me < 0) return null
    const k = this.kit
    const si = k.chop[this.me] ?? t
    if (si === null || !(k.chop[this.me] !== null || canWork(k, this.me, si))) return null
    if (k.items[k.hands[this.me] ?? -1]?.k === 'ext') return 'Semprot'
    return this.L.stations[si].kind === 'sink' ? 'Cuci' : 'Potong'
  }

  private pushHud() {
    const k = this.kit
    const t = this.target
    this.o.onHud({
      secs: Math.max(0, Math.ceil(this.s.opts.secs - k.t / 1000)),
      score: k.score,
      scores: this.kits.map((x) => x.score),
      team: this.team,
      jahil: k.jahil,
      flour: k.flour > k.t,
      lift: liftUp(k),
      turn: turnSoon(k),
      gap: gapOpen(k),
      lava: lavaOn(k) >= 0 ? 'on' : lavaSoon(k) >= 0 ? 'soon' : null,
      served: k.served,
      missed: k.missed,
      orders: k.orders.map((o) => ({ id: o.id, r: o.r, left: Math.max(0, (o.born + o.life - k.t) / o.life) })),
      holding: this.me >= 0 && k.hands[this.me] !== null,
      work: this.workLabel(t),
      cooking: this.L.stations.filter((st, si) => st.kind === 'stove' && k.items[k.hold[si] ?? -1]?.k === 'food' && k.fire[si] <= 0).length,
      chopping: this.me >= 0 && k.chop[this.me] !== null,
      rtt: this.host ? null : this.rtt,
      fps: this.fps,
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
