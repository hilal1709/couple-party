import * as THREE from 'three'
import { initialTier, TIERS, type Quality } from '@/games/kart/render/quality'
import { spawnWalker, step, type Walker } from '@/games/petak/sim/walk'
import type { LiveChannel, Seat } from '../types'
import { actorOf } from './engine'
import { CELL, code, COUNTER_TOP, ING, layoutOf, nextStep, type Layout } from './kitchens'
import { APRONS, Koki, loadKoki, TEAM_APRONS } from './render/koki'
import { KitchenScene } from './render/scene'
import { World } from './render/world'
import { perfOf, type Perf } from './render/perf'
import { COOK_SPEED, GRIP, moveCook, newBot, stepBot, type Bot, type Plan } from './sim/bots'
import { contentAt, fitsMenu, HAND_Y, isFood, isPlate, isPot, pickFloor, PICK_R, potFood, potTakes, resolveFlying, throwItem, type CookPose } from './sim/kitchen'
import { advance, canWork, chop, cloneKit, gapOpen, lavaOn, lavaSoon, liftUp, newKit, prank, slip, turnSoon, use, type Fx, type Kit } from './sim/kitchen'
import type { Sound } from './sounds'
import type { MasakAction, MasakState } from './types'

const SEND_EVERY = 0.1
/** paling cepat kirim isi dapur, dan detak paling lambat saat tidak ada perubahan */
const KIT_MIN = 0.066
const KIT_BEAT = 0.5
/** jarak terjauh koki ke pusat stasiun yang dilayani host (petak 1,2 m + toleransi jeda jaringan) */
const REACH = CELL * 1.5 + 0.6
/** koki.glb ±1,34 m dengan topi; meja 0,92 m */
const KOKI_SCALE = 1.35
/** barang dibawa sedikit di bawah titik tengah kedua tangan */
const CARRY_DROP = 0.06
const DASH_SECS = 0.26
const DASH_COOL = 0.9
const DASH_SPEED = 2.8
const SLIP_SECS = 0.85
const PUSH_SECS = 0.7
const SLIP_SPEED = 1.9
/** jarak injak kulit pisang */
const PEEL_R = 0.42
/** kartu cara masak, lalu hitung mundur 3-2-1 (detik) */
export const CARD_SECS = 6
const COUNT_SECS = 3
/** spanduk "Waktu habis!" tampil sekian detik sebelum layar hasil */
const OVER_SECS = 2.4
const NO_INTRO = import.meta.env.DEV && new URLSearchParams(location.search).get('intro') === '0'

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
  /** pengali tip beruntun saat ini */
  streak: number
  /** bahan di tangan bisa dilempar */
  canThrow: boolean
  /** label tombol Ambil/Taruh sesuai barang & stasiun di depan */
  grab: string
  /** pembuka ronde: kartu resep, angka hitung mundur, "go" sesaat setelah mulai; null = main */
  intro: 'card' | 3 | 2 | 1 | 'go' | null
  /** waktu habis, menunggu layar hasil */
  over: boolean
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
type Op = 'use' | 'chop' | 'unchop' | 'iseng' | 'slip' | 'throw' | 'pick'
type Wire = { k: 'pose'; a: Pose[] } | { k: 'do'; a: number; op: Op; si: number; n: number } | { k: 'kit'; t: number; s: Kit }

const r2 = (v: number) => Math.round(v * 100) / 100

export type RoundOptions = {
  canvas: HTMLCanvasElement
  state: MasakState
  seat: Seat
  act: (a: MasakAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onFx: (f: Fx) => void
  /** ikon barang siap (data URL per kunci), sekali setelah dapur dimuat */
  onIcons?: (icons: Map<string, string>) => void
  onSound: (s: Sound, volume: number) => void
}

type Remote = { x: number; z: number; yaw: number; moving: boolean }

/** satu ronde di satu HP: dunia, koki, kendali, jaringan, dan (di host) isi dapur + bot */
export class Round {
  private o: RoundOptions
  private s: MasakState
  private L: Layout
  private scene: KitchenScene
  private perf: Perf
  /** jeda minimum antar frame (ms) menurut batas fps, dan kapan frame berikutnya boleh digambar */
  private gap = 1000 / 60
  private nextAt = 0
  private world: World | null = null
  private kits: Kit[]
  private team: number
  /** jarak geser dapur tim 1 di sumbu x */
  private off: number
  private me: number
  private host: boolean
  private walkers: Walker[] = []
  private remotes: Remote[] = []
  private bots: (Bot | null)[] = []
  private kokis: (Koki | null)[] = []
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

  constructor(o: RoundOptions) {
    this.o = o
    this.s = o.state
    this.L = layoutOf(o.state.opts.kitchen)
    this.me = actorOf(o.state, o.seat)
    this.host = o.seat === 0
    const url = import.meta.env.DEV ? (new URLSearchParams(location.search).get('q') as Quality | null) : null
    const tier = url && TIERS[url] ? TIERS[url] : initialTier()
    this.perf = perfOf(tier)
    this.gap = 1000 / this.perf.fps
    this.scene = new KitchenScene(o.canvas, this.perf, this.L)
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
      this.kokis.push(null)
      const root = new THREE.Group()
      root.position.set(x, 0, z)
      this.scene.actors.add(root)
      this.roots.push(root)
      this.handPts.push(new THREE.Vector3(x, 0.8, z))
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
    const [gltf] = await Promise.all([loadKoki(), this.scene.load(this.s.opts.kitchen, this.kits.length, this.off)])
    this.scene.focus(this.team * this.off)
    if (!this.alive) return
    const versus = this.s.opts.mode === 'versus'
    this.s.actors.forEach((a, i) => {
      const animal = this.s.koki[i] ?? 'kucing'
      const c = new Koki(gltf, animal, versus ? TEAM_APRONS[a.team] : APRONS[i % APRONS.length], this.scene.shadows)
      c.root.scale.setScalar(KOKI_SCALE)
      this.roots[i].add(c.root)
      this.kokis[i] = c
      // cincin warna di lantai: tanda koki siapa
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(i === this.me ? 0.4 : 0.42, i === this.me ? 0.56 : 0.5, 40),
        new THREE.MeshBasicMaterial({ color: versus ? TEAM_APRONS[a.team] : APRONS[i % APRONS.length], transparent: true, opacity: i === this.me ? 0.95 : 0.7, depthWrite: false }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.015
      ring.renderOrder = 2
      this.roots[i].add(ring)
    })
    this.world = new World(this.scene, this.L, this.s.opts.kitchen, gltf, this.perf.life)
    this.o.onIcons?.(new Map([...this.scene.icons].map(([k, v]) => [k, v.url])))
    this.intro = NO_INTRO ? 0 : CARD_SECS + COUNT_SECS
    this.lastT = performance.now()
    this.fpsAt = this.lastT
    this.raf = requestAnimationFrame(this.frame)
  }

  setState(s: MasakState) {
    this.s = s
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
    if (this.me < 0 || this.locked() || this.dashCool > 0) return
    this.dashT = DASH_SECS
    this.dashCool = DASH_COOL
    this.o.onSound('dash', 0.8)
    const w = this.walkers[this.me]
    this.scene.dust(w.x + this.team * this.off, w.z, w.yaw)
  }

  /** tombol Ambil/Taruh */
  grab() {
    if (this.me < 0 || this.locked()) return
    const w = this.walkers[this.me]
    const floor = this.kit.hands[this.me] === null ? this.floorAhead(w) : null
    if (floor !== null) {
      this.o.onSound('grab', 0.7)
      this.request('pick', floor)
      return
    }
    if (this.target === null) return
    this.o.onSound('grab', 0.7)
    this.request('use', this.target)
  }

  /** tombol Lempar: bahan di tangan dilempar ke depan (bidik bantu ke rekan atau wadah di depan) */
  toss() {
    if (this.me < 0 || this.locked()) return
    const it = this.kit.items[this.kit.hands[this.me] ?? -1]
    if (!isFood(it)) return
    this.o.onSound('dash', 0.7)
    this.request('throw', -1)
  }

  /** barang di lantai terdekat di depan koki, kalau tangan kosong */
  private floorAhead(w: Walker): number | null {
    let best: number | null = null
    let bd = PICK_R
    for (const f of this.kit.floor) {
      const dx = f.x - w.x
      const dz = f.z - w.z
      const d = Math.hypot(dx, dz)
      if (d > bd) continue
      if (d > 0.3 && (dx * Math.sin(w.yaw) + dz * Math.cos(w.yaw)) / d < -0.2) continue
      bd = d
      best = f.id
    }
    return best
  }

  /** sasaran lemparan dari koki `actor`: rekan bertangan kosong atau stasiun yang mau menerima, di depan */
  private aimFor(actor: number): { x: number; z: number; y: number } | null {
    const k = this.kits[this.teamOf(actor)]
    const p = this.posOf(actor)
    const food = k.items[k.hands[actor] ?? -1]
    if (!isFood(food)) return null
    const fx = Math.sin(p.yaw)
    const fz = Math.cos(p.yaw)
    let best: { x: number; z: number; y: number } | null = null
    let score = Infinity
    const consider = (x: number, z: number, y: number, maxD: number, maxAng: number) => {
      const dx = x - p.x
      const dz = z - p.z
      const d = Math.hypot(dx, dz)
      if (d < 0.9 || d > maxD) return
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)))
      if (ang > maxAng) return
      const sc = ang + d * 0.06
      if (sc < score) {
        score = sc
        best = { x, z, y }
      }
    }
    this.s.actors.forEach((a, i) => {
      if (i === actor || a.team !== this.teamOf(actor) || k.hands[i] !== null) return
      const q = this.posOf(i)
      consider(q.x, q.z, HAND_Y, 7, 0.6)
    })
    const step = nextStep(food.ing, food.s)
    this.L.stations.forEach((st, si) => {
      if (k.fire[si] > 0) return
      const on = k.items[k.hold[si] ?? -1]
      const ok = (isPot(on) && potTakes(on, food)) || (isPlate(on) && fitsMenu(k, on.f, code(food.ing, food.s))) || (!on && st.kind === 'board' && step === 'cut')
      if (ok) consider(st.x, st.z, COUNTER_TOP + 0.05, 6, 0.5)
    })
    return best
  }

  /** tombol Iseng: pakai satu jatah iseng ke dapur lawan */
  iseng() {
    if (this.me < 0 || this.locked() || this.kits.length < 2 || this.kit.jahil <= 0) return
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
    if (this.me < 0 || this.locked()) return
    // sekali tekan: koki terus bekerja selama berdiri di depan stasiun; berjalan menghentikannya (progres tersimpan)
    if (on && this.target !== null) this.request('chop', this.target)
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
    if (op === 'throw') changed = throwItem(k, actor, this.poseOf(actor), this.aimFor(actor))
    else if (op === 'pick') changed = pickFloor(k, actor, si, this.poseOf(actor))
    else if (op === 'unchop') changed = chop(k, actor, si, false)
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

  /** sisa waktu pembuka ronde (detik); 0 = sudah main */
  private intro = CARD_SECS + COUNT_SECS
  private sinceGo = 99
  private overFor = 0

  /** host melewati kartu resep: langsung hitung mundur */
  skipIntro() {
    if (this.intro > COUNT_SECS) this.intro = COUNT_SECS
  }

  /** kendali terkunci: belum mulai atau waktu habis */
  private locked() {
    return this.intro > 0 || this.over()
  }

  private over() {
    return this.kits[0].t >= this.s.opts.secs * 1000
  }

  private poseOf(i: number): CookPose {
    const p = this.posOf(i)
    return { x: p.x, z: p.z, yaw: p.yaw }
  }

  /** host: lemparan di tiap dapur ditangkap / mendarat / jatuh, dengan posisi koki tim itu */
  private resolveThrows() {
    this.kits.forEach((k, t) => {
      if (!k.flying.length) return
      const cooks = this.s.actors.map((a, i) => (a.team === t ? this.poseOf(i) : null))
      if (resolveFlying(k, cooks)) this.kitDirty[t] = true
    })
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
    let mx = chopping || this.locked() ? 0 : this.input.x
    let mz = chopping || this.locked() ? 0 : -this.input.y
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
    moveCook(this.kit, w, this.vel, mx, mz, speed, dt, GRIP)
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
      if (this.locked()) return step(w, 0, 0, 0, dt, this.L)
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
      const c = this.kokis[i]
      if (!c) return
      this.animate(i, c, p.moving)
      c.update(dt)
      root.updateMatrixWorld(true)
      c.handsCenter(this.handPts[i])
      this.handPts[i].y -= CARRY_DROP * KOKI_SCALE
    })
  }

  /** pilih klip badan & tangan menurut keadaan koki */
  private animate(i: number, c: Koki, moving: boolean) {
    const k = this.kits[this.teamOf(i)]
    const mine = i === this.me
    if (mine && this.slipT > 0) return c.playFull('slip')
    if (this.over()) return c.playFull(this.cheer(this.teamOf(i)))
    c.playFull(null)
    const dashing = mine && this.dashT > 0
    c.play(dashing ? 'dash' : moving ? 'walk' : 'idle', moving && !dashing ? 1.15 : 1)
    const si = k.chop[i]
    const held = k.items[k.hands[i] ?? -1]
    const kind = si !== null ? this.L.stations[si].kind : null
    if (this.time - (this.threwAt[i] ?? -9) < 0.32) return c.playHands('h_throw')
    c.playHands(
      held?.k === 'ext' && si !== null ? 'h_spray' : kind === 'board' ? 'h_chop' : kind === 'sink' ? 'h_wash' : held ? 'h_carry' : moving ? 'h_walk' : 'h_idle',
    )
  }

  /** akhir ronde: koki bersorak kalau dapat bintang / menang, sedih kalau tidak */
  private cheer(team: number): 'cheer' | 'sad' {
    const k = this.kits[team]
    const foe = this.kits[1 - team]
    return (foe ? k.score >= foe.score : k.served > k.missed) ? 'cheer' : 'sad'
  }

  private timers(dt: number) {
    if (!this.over()) return
    this.overFor += dt
    if (!this.host || this.fired || this.overFor < OVER_SECS) return
    this.fired = true
    const ks = this.kits
    this.o.act({ type: 'finish', result: { score: ks.map((k) => k.score), served: ks.map((k) => k.served), missed: ks.map((k) => k.missed) } })
  }

  private frame = (now: number) => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.frame)
    // batas fps: layar 90–144 Hz tidak dirender penuh (sumber utama HP panas); simulasi tetap memakai dt nyata
    if (now < this.nextAt - 2) return
    this.nextAt = Math.max(this.nextAt + this.gap, now)
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    this.time += dt
    this.push.forEach((p) => (p.t = Math.max(0, p.t - dt)))
    this.stepIntro(dt)
    if (this.intro <= 0 && !this.over()) this.kits.forEach((k, t) => advance(k, dt * 1000, this.host, this.s.actors.filter((a) => a.team === t).length))
    this.stepMe(dt)
    if (this.host) this.stepBots(dt)
    if (this.host) this.resolveThrows()
    this.timers(dt)
    this.send(dt)
    this.applyBodies(dt)
    this.readFx()
    this.scene.sync(this.kits, this.handPts, this.off)
    this.scene.effects(this.kits, dt, this.handPts, this.off)
    this.scene.setTarget(this.target, this.team * this.off)
    this.scene.animate(this.kits, dt)
    this.world?.update(this.kit, dt)
    this.loopSounds(dt)
    this.scene.render()
    this.watchFps(now)
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.15
      this.pushHud()
    }
  }

  /** kejadian baru dari isi dapur: suara, efek, animasi (sebelum barang disinkronkan supaya piring tersaji bisa meluncur) */
  private readFx() {
    this.kits.forEach((k, t) => {
      for (const f of k.fx) {
        if (f.n <= this.seenFx[t]) continue
        this.seenFx[t] = f.n
        // lemparan iseng terlihat melayang dari dapur pelempar ke dapur lawan
        if (f.kind === 'iseng') this.scene.toss(t * this.off, (1 - t) * this.off)
        if (f.kind === 'lempar' && f.pts !== undefined) this.threwAt[f.pts] = this.time
        if (f.kind === 'served' && f.st >= 0) this.scene.serveAt(t, f.st)
        if (f.kind === 'belok') {
          this.push[t] = { t: PUSH_SECS, dir: f.pts ?? 1 }
          if (t === this.team) this.scene.bump(f.pts ?? 1)
        }
        if (t === this.team) this.o.onFx(f)
      }
    })
  }

  private knockIn = 0
  private sizzleIn = 0

  /** suara yang berulang selama keadaannya berlangsung: ketuk pisau, semprot, cuci, desis wajan */
  private risk = 0
  /** detik ronde saat tiap koki terakhir melempar (animasi) */
  private threwAt: number[] = []
  private time = 0
  private bipIn = 0

  private loopSounds(dt: number) {
    const k = this.kit
    this.bipIn -= dt
    if (this.risk && this.bipIn <= 0) {
      this.bipIn = this.risk > 0.75 ? 0.28 : 0.55
      this.o.onSound('bip', 0.5)
    }
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
      // masakan matang yang dibiarkan: bip makin rapat menjelang gosong
      const risk = this.L.stations.reduce((m, st, si) => {
        const it = contentAt(k, si)
        return (st.kind === 'stove' || st.kind === 'oven') && it && (it.s === 'cooked' || it.s === 'boiled' || it.s === 'baked') && it.p > 0.45 ? Math.max(m, it.p) : m
      }, 0)
      this.risk = risk
      const cooking = this.L.stations.some((st, si) => st.kind === 'stove' && !!contentAt(k, si))
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
    // tiga detik berturut-turut di bawah 85% batas fps: turunkan grafis satu langkah (tidak pernah naik sendiri)
    this.slow = this.fps < this.perf.fps * 0.85 ? this.slow + 1 : 0
    if (this.slow >= 3) {
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

  private stepIntro(dt: number) {
    this.sinceGo += dt
    if (this.intro <= 0) return
    // tamu: dapur host sudah jalan, ikut mulai
    if (!this.host && this.kit.t > 0) {
      this.intro = 0
      this.sinceGo = 0
      return
    }
    const before = Math.ceil(this.intro)
    this.intro = Math.max(0, this.intro - dt)
    const now = Math.ceil(this.intro)
    if (this.intro <= 0) {
      this.sinceGo = 0
      this.o.onSound('mulai', 0.9)
    } else if (now !== before && now <= COUNT_SECS) this.o.onSound('hitung', 0.8)
  }

  private introState(): Hud['intro'] {
    if (this.intro > COUNT_SECS) return 'card'
    if (this.intro > 0) return Math.ceil(this.intro) as 3 | 2 | 1
    return this.sinceGo < 0.9 ? 'go' : null
  }

  /** label tombol Ambil/Taruh: apa yang akan terjadi kalau ditekan */
  private grabLabel(): string {
    const k = this.kit
    if (this.me >= 0 && k.hands[this.me] === null) {
      const f = this.floorAhead(this.walkers[this.me])
      const it = f !== null ? k.items[f] : undefined
      if (isFood(it)) return `Pungut ${ING[it.ing].title}`
    }
    const si = this.target
    const hand = this.me >= 0 ? k.items[k.hands[this.me] ?? -1] : undefined
    if (si === null) return hand ? 'Taruh' : 'Ambil'
    const st = this.L.stations[si]
    const on = k.items[k.hold[si] ?? -1]
    const name = (i: typeof hand) => (isFood(i) ? ING[i.ing].title : isPlate(i) ? 'piring' : isPot(i) ? i.pan : 'pemadam')
    if (!hand) {
      if (st.kind === 'crate' && st.ing) return `Ambil ${ING[st.ing].title}`
      if (st.kind === 'plates') return 'Ambil piring'
      return on ? `Ambil ${name(on)}` : 'Ambil'
    }
    if (st.kind === 'serve') return isPlate(hand) ? 'Sajikan' : 'Taruh'
    if (isPot(hand)) {
      const f = potFood(k, hand)
      if (st.kind === 'trash') return f ? 'Buang isi' : 'Taruh'
      if (isPlate(on)) return 'Tuang ke piring'
      if (isPot(on) && f && potTakes(on, f)) return `Pindah ke ${on.pan}`
      if (st.kind === 'crate' && !f) return `Isi ${hand.pan}`
      if (isFood(on) && !f) return `Masukkan ke ${hand.pan}`
      return on ? 'Taruh' : st.kind === 'stove' ? 'Taruh di kompor' : 'Taruh'
    }
    if (isFood(hand) && isPot(on)) return `Masukkan ke ${on.pan}`
    if (isPlate(hand) && isPot(on)) return 'Ke piring'
    if (st.kind === 'trash') return 'Buang'
    if (st.kind === 'crate') return isFood(hand) && hand.ing === st.ing ? 'Kembalikan' : isPlate(hand) ? 'Ke piring' : 'Taruh'
    if (isPlate(hand) && isFood(on)) return 'Ke piring'
    if (isFood(hand) && isPlate(on)) return 'Ke piring'
    if (on) return 'Taruh'
    if (st.kind === 'board' && isFood(hand)) return 'Taruh di talenan'
    if ((st.kind === 'stove' || st.kind === 'oven') && isFood(hand)) return st.kind === 'oven' ? 'Panggang' : 'Masak'
    return 'Taruh'
  }

  /** layar (piksel) di atas stasiun dapur sendiri, untuk angka poin */
  screenOf(si: number) {
    return this.scene.screenOf(si, this.team * this.off)
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
      streak: k.streak ?? 1,
      canThrow: this.me >= 0 && isFood(k.items[k.hands[this.me] ?? -1]) && !this.locked(),
      grab: this.grabLabel(),
      intro: this.introState(),
      over: this.over(),
      work: this.workLabel(t),
      cooking: this.L.stations.filter((st, si) => st.kind === 'stove' && !!contentAt(k, si) && k.fire[si] <= 0).length,
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
