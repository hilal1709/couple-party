import * as THREE from 'three'
import { initialTier, TIERS, type Quality } from '@/games/kart/render/quality'
import type { LiveChannel, Seat } from '../types'
import { actorOf, BODY_SCALE, freeHiders, hiders, isSeeker } from './engine'
import { MAP_INFO, mapData, type MapData } from './maps'
import { PaintSync } from './net/paintSync'
import { loadBody, solidPaint, type Body } from './render/body'
import { Life, type Mover } from './render/life'
import { decodePaint, projectPaint } from './render/paint'
import { Painter } from './render/painter'
import { POSES, type PoseId } from './render/poses'
import { World } from './render/world'
import { CATCH_RANGE, CATCH_TOLERANCE, hiderBot, newBrain, seekerBot, type Brain, type Sighting } from './sim/bots'
import { canSee, HIDER_SPEED, rayHit, SEEKER_SPEED, spawnWalker, step, type Walker } from './sim/walk'
import type { PetakAction, PetakState } from './types'

/** jeda salah tangkap (detik) */
export const MISS_PENALTY = 3
const SEND_EVERY = 0.1
/** detik per penyamaran di layar pembukaan */
export const REVEAL_EACH = 4.5
const VOTE_SECS = 7
const REPUBLISH = 12
const SIGHT_RANGE = 14
const SIGHT_COS = Math.cos((60 * Math.PI) / 180)
const BOT_SHARP = { 1: 0.3, 2: 0.7, 3: 1 } as const
/** jarak kamera yang bisa dipilih pemain lewat tombol Zoom */
export const ZOOMS = [3.6, 5, 7]

export type Sound = 'hunt' | 'catch' | 'miss' | 'pipet' | 'merpati' | 'meong' | 'langkah' | 'reveal' | 'cat' | 'kereta'

export type Hud = {
  phase: PetakState['phase']
  /** sisa detik fase */
  secs: number
  role: 'hider' | 'seeker' | 'out'
  free: number
  total: number
  painting: boolean
  pose: PoseId
  /** sisa jeda salah tangkap */
  penalty: number
  /** aktor yang sedang dibuka di fase reveal */
  showing: number | null
  fps: number
}

type Remote = { x: number; y: number; z: number; yaw: number; moving: boolean; pose: PoseId }
/** [aktor, x, y, z, yaw, indeks pose, bergerak] */
type Pose = [number, number, number, number, number, number, number]
type Wire = { k: 'pose'; a: Pose[] } | { k: 'grab'; target: number; seeker: number }

const r2 = (v: number) => Math.round(v * 100) / 100

let blobTex: THREE.CanvasTexture | null = null

/** bayangan bulat lembut untuk tingkat grafis tanpa peta bayangan */
function blobShadow() {
  if (!blobTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(32, 32, 4, 32, 32, 32)
    r.addColorStop(0, 'rgba(8,10,20,0.6)')
    r.addColorStop(1, 'rgba(8,10,20,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
    blobTex = new THREE.CanvasTexture(c)
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false }))
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.05
  return m
}

export type RoundOptions = {
  canvas: HTMLCanvasElement
  state: PetakState
  seat: Seat
  act: (a: PetakAction) => void
  live?: LiveChannel
  onHud: (h: Hud) => void
  onSound: (s: Sound, volume: number) => void
  onPainter: () => void
}

/** satu ronde dari sudut satu HP: dunia, badan semua pemain, kendali, jaringan, dan bot (kalau HP ini host) */
export class Round {
  private o: RoundOptions
  private s: PetakState
  private map: MapData
  private world: World
  private life: Life
  private bodies: Body[] = []
  private walkers: Walker[] = []
  private remotes = new Map<number, Remote>()
  private brains: Brain[] = []
  private poses: PoseId[] = []
  private camo: number[] = []
  private nyali: number[] = []
  private me: number
  private host: boolean
  private sync: PaintSync | null = null
  painter: Painter | null = null
  private stopLive: (() => void) | undefined
  private raf = 0
  private alive = true
  private ro: ResizeObserver | null = null
  private phaseAt = performance.now()
  private phaseId = -1
  private fired = false
  private sendIn = 0
  private publishIn = REPUBLISH
  private lastT = 0
  private time = 0
  private input = { x: 0, y: 0 }
  private camYaw = Math.PI
  private camPitch = 0.28
  private orbitDist = 3
  private zoomIdx = 0
  private scale: number
  private painting = false
  private penalty = 0
  private showing = 0
  private hudIn = 0
  private frames = 0
  private fpsAt = 0
  private fps = 60
  private slow = 0
  private stepIn = 0
  private dirty = false
  private seenCatch = 0
  private paintOwned: THREE.WebGLRenderTarget[] = []
  private white = solidPaint(0.9, 0.9, 0.9)
  private rose = solidPaint(1.3, 0.1, 0.42)

  constructor(o: RoundOptions) {
    this.o = o
    this.s = o.state
    this.map = mapData(o.state.map)
    this.me = actorOf(o.state, o.seat)
    this.host = o.seat === 0
    this.scale = BODY_SCALE[o.state.opts.size] ?? 1
    const url = import.meta.env.DEV ? (new URLSearchParams(location.search).get('q') as Quality | null) : null
    const tier = url && TIERS[url] ? TIERS[url] : initialTier()
    this.world = new World(o.canvas, tier, o.state.map)
    this.life = new Life(this.world.scene, this.map, MAP_INFO[o.state.map], tier.detail)
    o.canvas.addEventListener('webglcontextlost', this.onContextLost)
  }

  private onContextLost = (e: Event) => e.preventDefault()

  async start() {
    const s = this.s
    await Promise.all([this.world.load(), this.life.load()])
    const hide = this.map.spawn.hider
    const seek = this.map.spawn.seeker
    let hi = 0
    let si = 0
    for (let i = 0; i < s.actors.length; i++) {
      const body = await loadBody()
      if (!this.alive) return
      const [x, z] = isSeeker(s, i) ? seek[si++ % seek.length] : hide[hi++ % hide.length]
      const w = spawnWalker(x, z, isSeeker(s, i) ? -Math.PI / 2 : 0)
      body.root.position.set(x, 0, z)
      body.root.scale.setScalar(this.scale)
      if (this.world.shadows) body.skin.castShadow = true
      else body.root.add(blobShadow())
      body.setPaint(isSeeker(s, i) ? this.rose : this.white)
      body.setPose('tegak')
      this.world.actors.add(body.root)
      this.bodies.push(body)
      this.walkers.push(w)
      this.brains.push(newBrain())
      this.poses.push('tegak')
      this.camo.push(0)
      this.nyali.push(0)
      this.remotes.set(i, { x, y: 0, z, yaw: w.yaw, moving: false, pose: 'tegak' })
    }
    if (!this.alive) return
    if (this.world.shadows) this.life.group.traverse((o) => (o.castShadow = (o as THREE.Mesh).isMesh && !(o as THREE.Points).isPoints))
    if (this.me >= 0) {
      this.camYaw = this.walkers[this.me].yaw + Math.PI
      if (!isSeeker(s, this.me)) this.painter = new Painter(this.world, this.bodies[this.me], this.o.onPainter)
    }
    this.paintBots()
    if (this.o.live) {
      this.sync = new PaintSync(this.o.live, this.o.seat, (from, bytes) => this.onPaint(from, bytes))
      this.stopLive = this.o.live.on((d, from) => this.onLive(d, from))
    }
    const el = this.o.canvas
    const size = () => {
      this.world.resize(el.clientWidth || 1, el.clientHeight || 1)
      this.life.resize(el.clientHeight || 1)
    }
    this.ro = new ResizeObserver(size)
    this.ro.observe(el)
    size()
    this.lastT = performance.now()
    this.fpsAt = this.lastT
    this.raf = requestAnimationFrame(this.frame)
  }

  /** bot hider dicat lokal dari titik sembunyinya: hasilnya sama di semua HP */
  private paintBots() {
    const s = this.s
    this.world.renderer.compile(this.world.scene, this.world.camera)
    s.botSpots.forEach((spot, i) => {
      if (spot < 0) return
      const p = this.map.spots[spot]
      const shot = this.world.capture(p.x, 0, p.z, p.yaw)
      const model = new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw), new THREE.Vector3(this.scale, this.scale, this.scale))
      const rt = projectPaint(this.world.renderer, this.bodies[i].skin.geometry, shot, model, BOT_SHARP[s.opts.level])
      this.paintOwned.push(rt)
      this.bodies[i].setPaint(rt.texture)
    })
  }

  private onPaint(from: Seat, bytes: Uint8Array) {
    const actor = actorOf(this.s, from)
    if (actor < 0 || isSeeker(this.s, actor) || !this.bodies[actor]) return
    void decodePaint(bytes).then((tex) => {
      if (this.alive) this.bodies[actor].setPaint(tex)
    })
  }

  private onLive(d: unknown, from: Seat) {
    const m = d as Wire
    if (m?.k === 'pose') {
      for (const [a, x, y, z, yaw, pose, moving] of m.a) {
        if (a === this.me || !this.remotes.has(a)) continue
        // bot hanya digerakkan host; pemain lain hanya boleh menggerakkan dirinya
        if (this.s.actors[a].seat === null ? from !== 0 : this.s.actors[a].seat !== from) continue
        const r = this.remotes.get(a)!
        Object.assign(r, { x, y, z, yaw, pose: POSES[pose] ?? 'tegak', moving: !!moving })
      }
    } else if (m?.k === 'grab' && this.host) {
      this.settleGrab(m.seeker, m.target, from)
    }
  }

  /** host: sah kalau keduanya memang dekat menurut pose terakhir yang diketahui host */
  private settleGrab(seeker: number, target: number, from: Seat | null) {
    const s = this.s
    if (from !== null && s.actors[seeker]?.seat !== from) return
    if (s.phase !== 'hunt' || !isSeeker(s, seeker) || s.caught[target] !== null) return
    const a = this.posOf(seeker)
    const b = this.posOf(target)
    if (Math.hypot(a.x - b.x, a.z - b.z) > CATCH_RANGE + CATCH_TOLERANCE) return
    this.o.act({ type: 'catch', target, seeker, t: Math.floor(this.elapsed()), nyali: this.nyali })
  }

  private posOf(i: number) {
    return i === this.me || (this.host && this.s.actors[i].seat === null) ? this.walkers[i] : this.remotes.get(i)!
  }

  setState(s: PetakState) {
    const prevCatch = this.seenCatch
    this.s = s
    if (s.lastCatch && s.lastCatch.id !== prevCatch) {
      this.seenCatch = s.lastCatch.id
      this.o.onSound('catch', 1)
      const body = this.bodies[s.lastCatch.target]
      if (body) body.root.visible = false
      if (s.lastCatch.target === this.me) this.setPainting(false)
    }
  }

  private elapsed() {
    return (performance.now() - this.phaseAt) / 1000
  }

  private phaseSecs() {
    const s = this.s
    if (s.phase === 'hide') return s.opts.hideSecs
    if (s.phase === 'hunt') return s.opts.huntSecs
    return hiders(s).length * REVEAL_EACH + VOTE_SECS
  }

  private enterPhase() {
    const s = this.s
    this.phaseId = s.phaseId
    this.phaseAt = performance.now()
    this.fired = false
    if (s.phase === 'hunt') {
      this.setPainting(false)
      this.o.onSound('hunt', 1)
      this.publishPaint()
      if (this.host) this.measureCamo()
    }
    if (s.phase === 'reveal') {
      this.setPainting(false)
      this.showing = 0
      this.o.onSound('reveal', 1)
      for (let i = 0; i < this.bodies.length; i++) this.bodies[i].root.visible = true
    }
  }

  /** host: nilai samaran semua hider, sumber keputusan bot pencari */
  private measureCamo() {
    for (const i of hiders(this.s)) {
      const p = this.posOf(i)
      this.camo[i] = this.world.camoScore(this.bodies[i].root, p.x, p.y, p.z, this.bodyYaw(i))
    }
  }

  private bodyYaw(i: number) {
    return i === this.me || (this.host && this.s.actors[i].seat === null) ? this.walkers[i].yaw : this.remotes.get(i)!.yaw
  }

  // ---------- kendali dari layar ----------
  setMove(x: number, y: number) {
    this.input.x = x
    this.input.y = y
  }

  look(dx: number, dy: number) {
    this.camYaw -= dx * 0.006
    this.camPitch = Math.max(-0.2, Math.min(1.15, this.camPitch + dy * 0.005))
  }

  /** mode cat: kamera mengorbit badan sendiri dengan dunia tetap terlihat */
  setPainting(on: boolean) {
    if (on && (!this.painter || this.s.phase === 'reveal' || this.s.phase === 'end')) return
    if (this.painting === on) return
    this.painting = on
    if (on) {
      this.orbitDist = 2.6
      this.setPose(this.poses[this.me])
    } else if (this.dirty) {
      this.publishPaint()
    }
  }

  setPose(p: PoseId) {
    if (this.me < 0) return
    this.poses[this.me] = p
    this.bodies[this.me].setPose(p)
  }

  zoom(d: number) {
    this.orbitDist = d
  }

  /** tombol Zoom: pindah ke jarak kamera berikutnya, berlaku untuk HP ini saja */
  cycleZoom() {
    this.zoomIdx = (this.zoomIdx + 1) % ZOOMS.length
  }

  paintChanged() {
    this.dirty = true
    this.o.onSound('cat', 0.5)
    this.publishIn = 1.2
  }

  private publishPaint() {
    if (!this.painter || !this.sync) return
    this.dirty = false
    this.publishIn = REPUBLISH
    void this.painter.surface.encode().then((b) => this.sync?.publish(b))
  }

  /** pipet menyentuh dunia lewat Painter; suara dibunyikan di sini */
  pipetSound() {
    this.o.onSound('pipet', 0.7)
  }

  /** pemain pencari menekan Tangkap */
  grab() {
    if (this.penalty > 0 || this.s.phase !== 'hunt' || !isSeeker(this.s, this.me)) return
    const target = this.aim()
    if (target === null) {
      this.penalty = MISS_PENALTY
      this.o.onSound('miss', 1)
      return
    }
    if (this.host) this.settleGrab(this.me, target, null)
    else this.o.live?.send({ k: 'grab', target, seeker: this.me } satisfies Wire)
  }

  /** hider terdekat di tengah pandangan, dalam jangkauan dan tidak terhalang */
  private aim(): number | null {
    const w = this.walkers[this.me]
    const fx = -Math.sin(this.camYaw)
    const fz = -Math.cos(this.camYaw)
    let best: number | null = null
    let bestD = CATCH_RANGE
    for (const i of freeHiders(this.s)) {
      const p = this.posOf(i)
      const dx = p.x - w.x
      const dz = p.z - w.z
      const d = Math.hypot(dx, dz)
      if (d > bestD || d < 0.01) continue
      if ((dx * fx + dz * fz) / d < Math.cos((30 * Math.PI) / 180)) continue
      if (!canSee(this.map.boxes, w.x, w.z, p.x, p.z, 0.6)) continue
      best = i
      bestD = d
    }
    return best
  }

  // ---------- langkah per frame ----------
  private stepLocal(dt: number) {
    const s = this.s
    if (this.me < 0) return
    const w = this.walkers[this.me]
    const seeker = isSeeker(s, this.me)
    const caught = s.caught[this.me] !== null
    const locked = (seeker && s.phase === 'hide') || caught || s.phase === 'reveal' || s.phase === 'end' || this.painting
    let mx = 0
    let mz = 0
    if (!locked) {
      // stik ke atas = maju menurut arah kamera
      const f = this.input.y
      const r = this.input.x
      const sin = Math.sin(this.camYaw)
      const cos = Math.cos(this.camYaw)
      mx = -sin * f + cos * r
      mz = -cos * f - sin * r
    }
    step(w, mx, mz, seeker ? SEEKER_SPEED : HIDER_SPEED, dt, this.map)
    if (w.moving && this.poses[this.me] !== 'tegak') this.poses[this.me] = 'tegak'
  }

  private stepBots(dt: number) {
    const s = this.s
    s.actors.forEach((a, i) => {
      if (a.seat !== null) return
      const w = this.walkers[i]
      if (isSeeker(s, i)) {
        if (s.phase !== 'hunt') return step(w, 0, 0, 0, dt, this.map)
        const list: Sighting[] = freeHiders(s).map((h) => {
          const p = this.posOf(h)
          const moving = h === this.me ? this.walkers[h].moving : s.actors[h].seat === null ? this.walkers[h].moving : this.remotes.get(h)!.moving
          return { actor: h, x: p.x, z: p.z, moving, camo: this.camo[h] }
        })
        const r = seekerBot(this.brains[i], w, list, this.map, s.opts.level, dt, Math.random)
        step(w, r.move[0], r.move[1], SEEKER_SPEED * (0.8 + s.opts.level * 0.08), dt, this.map)
        if (r.grab !== null) this.settleGrab(i, r.grab, null)
        return
      }
      if (s.phase === 'hide' || s.phase === 'hunt') {
        if (s.caught[i] !== null) return
        const spot = this.map.spots[s.botSpots[i]]
        const r = hiderBot(this.brains[i], w, spot, this.map)
        step(w, r.move[0], r.move[1], HIDER_SPEED, dt, this.map)
        if (r.settled) this.poses[i] = spot.pose
      }
    })
  }

  /** host: detik tiap hider berada di pandangan pencari */
  private countNyali(dt: number) {
    const s = this.s
    if (s.phase !== 'hunt') return
    for (const h of freeHiders(s)) {
      const p = this.posOf(h)
      const seen = s.seekers.some((k) => {
        const q = this.posOf(k)
        const dx = p.x - q.x
        const dz = p.z - q.z
        const d = Math.hypot(dx, dz)
        if (d > SIGHT_RANGE || d < 0.01) return false
        const yaw = this.bodyYaw(k)
        return (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d > SIGHT_COS && canSee(this.map.boxes, q.x, q.z, p.x, p.z)
      })
      if (seen) this.nyali[h] += dt
    }
  }

  private send(dt: number) {
    this.sendIn -= dt
    if (this.sendIn > 0 || !this.o.live) return
    this.sendIn = SEND_EVERY
    const a: Pose[] = []
    const add = (i: number) => {
      const w = this.walkers[i]
      a.push([i, r2(w.x), r2(w.y), r2(w.z), r2(w.yaw), POSES.indexOf(this.poses[i]), w.moving ? 1 : 0])
    }
    if (this.me >= 0) add(this.me)
    if (this.host) this.s.actors.forEach((x, i) => x.seat === null && add(i))
    if (a.length) this.o.live.send({ k: 'pose', a } satisfies Wire)
  }

  /** gerakkan badan semua aktor ke posenya */
  private applyBodies(dt: number) {
    const k = 1 - Math.exp(-dt * 12)
    this.bodies.forEach((b, i) => {
      const local = i === this.me || (this.host && this.s.actors[i].seat === null)
      let moving: boolean
      let pose: PoseId
      if (local) {
        const w = this.walkers[i]
        b.root.position.set(w.x, w.y, w.z)
        const turn = Math.atan2(Math.sin(w.yaw - b.root.rotation.y), Math.cos(w.yaw - b.root.rotation.y))
        b.root.rotation.y += turn * k
        moving = w.moving
        pose = this.poses[i]
      } else {
        const r = this.remotes.get(i)!
        b.root.position.x += (r.x - b.root.position.x) * k
        b.root.position.y += (r.y - b.root.position.y) * k
        b.root.position.z += (r.z - b.root.position.z) * k
        const turn = Math.atan2(Math.sin(r.yaw - b.root.rotation.y), Math.cos(r.yaw - b.root.rotation.y))
        b.root.rotation.y += turn * k
        moving = r.moving
        pose = r.pose
      }
      if (moving) b.walk()
      else b.setPose(pose)
      b.update(dt)
    })
  }

  private camera(dt: number) {
    const s = this.s
    const cam = this.world.camera
    if (s.phase === 'reveal') {
      const list = hiders(s)
      const i = Math.min(list.length - 1, Math.floor(this.elapsed() / REVEAL_EACH))
      this.showing = list[i]
      const p = this.bodies[this.showing].root.position
      const yaw = this.bodyYaw(this.showing) + this.elapsed() * 0.25
      // jangan menembus tembok saat mengitari penyamaran
      const hit = rayHit(this.map.boxes, p.x, p.z, p.x + Math.sin(yaw) * 2.8, p.z + Math.cos(yaw) * 2.8, p.y + 1.25)
      const d = Math.max(1.1, 2.8 * hit - 0.2)
      cam.position.set(p.x + Math.sin(yaw) * d, p.y + 1.25, p.z + Math.cos(yaw) * d)
      cam.lookAt(p.x, p.y + 0.6, p.z)
      return
    }
    // tertangkap: ikut melihat pencari pertama
    const out = this.me < 0 || s.caught[this.me] !== null
    const focus = this.bodies[out ? s.seekers[0] : this.me]
    const p = focus.root.position
    const ty = p.y + (this.painting ? 0.62 : 1.0) * Math.max(this.scale, 0.85)
    let dist = this.painting ? this.orbitDist * Math.max(this.scale, 0.75) : ZOOMS[this.zoomIdx]
    const fx = Math.sin(this.camYaw) * Math.cos(this.camPitch)
    const fz = Math.cos(this.camYaw) * Math.cos(this.camPitch)
    const fy = Math.sin(this.camPitch)
    // juga saat mengecat: pemain justru sering menempel dinding
    const hit = rayHit(this.map.boxes, p.x, p.z, p.x + fx * dist, p.z + fz * dist, ty + fy * dist)
    dist = Math.max(1.0, dist * hit - 0.25)
    const x = p.x + fx * dist
    const y = Math.max(0.25, ty + fy * dist)
    const z = p.z + fz * dist
    this.world.follow(p.x, p.z)
    const k = 1 - Math.exp(-dt * 14)
    cam.position.lerp(new THREE.Vector3(x, y, z), this.painting ? 1 : k)
    cam.lookAt(p.x, ty, p.z)
  }

  private sounds(dt: number, movers: Mover[]) {
    const me = this.world.camera.position
    const fade = (x: number, z: number, range: number) => Math.max(0, 1 - Math.hypot(x - me.x, z - me.z) / range)
    for (const e of this.life.update(dt, this.time, movers, this.world.camera.position)) {
      const v = fade(e.x, e.z, 26)
      if (v > 0) this.o.onSound(e.kind, v)
    }
    // langkah orang lain terdengar kalau dekat: petunjuk utama pencari
    this.stepIn -= dt
    if (this.stepIn <= 0) {
      this.stepIn = 0.34
      let loud = 0
      movers.forEach((m, i) => {
        if (m.moving && !(this.me >= 0 && i === this.me)) loud = Math.max(loud, fade(m.x, m.z, 11))
      })
      const mine = this.me >= 0 && this.walkers[this.me].moving ? 0.25 : 0
      if (Math.max(loud, mine) > 0.02) this.o.onSound('langkah', Math.max(loud, mine))
    }
  }

  private timers() {
    const s = this.s
    if (this.fired || !this.host) return
    const left = this.phaseSecs() - this.elapsed()
    if (left > 0) return
    this.fired = true
    if (s.phase === 'hide') this.o.act({ type: 'toHunt' })
    else if (s.phase === 'hunt') this.o.act({ type: 'endHunt', nyali: this.nyali })
    else if (s.phase === 'reveal') this.o.act({ type: 'next' })
  }

  private frame = (now: number) => {
    if (!this.alive) return
    this.raf = requestAnimationFrame(this.frame)
    const real = (now - this.lastT) / 1000
    const dt = Math.min(0.05, real)
    this.lastT = now
    this.time += dt
    const s = this.s
    if (s.phaseId !== this.phaseId) this.enterPhase()
    // jeda memakai waktu nyata: di HP lambat dt dibatasi, jadi tiga detik tidak boleh ikut memanjang
    this.penalty = Math.max(0, this.penalty - real)
    this.stepLocal(dt)
    if (this.host) {
      this.stepBots(dt)
      this.countNyali(dt)
    }
    this.timers()
    this.send(dt)
    this.applyBodies(dt)
    this.camera(dt)
    if (this.world.update(this.time) && this.time > 1) this.o.onSound('kereta', 0.9)
    const movers = this.bodies.map((b, i) => ({
      x: b.root.position.x,
      z: b.root.position.z,
      moving: s.caught[i] === null && (i === this.me || (this.host && s.actors[i].seat === null) ? this.walkers[i].moving : this.remotes.get(i)!.moving),
    }))
    this.sounds(dt, movers)
    this.world.render()
    if (this.painter && this.sync && this.dirty) {
      this.publishIn -= dt
      if (this.publishIn <= 0) this.publishPaint()
    } else if (this.painter && this.sync) {
      // ulang berkala: HP yang telat masuk atau kehilangan semua potongan tetap kebagian cat
      this.publishIn -= dt
      if (this.publishIn <= 0) {
        this.publishIn = REPUBLISH
        this.sync.resend()
      }
    }
    this.watchFps(now)
    this.hudIn -= dt
    if (this.hudIn <= 0) {
      this.hudIn = 0.15
      this.pushHud()
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
      this.world.lowerQuality()
    }
  }

  private pushHud() {
    const s = this.s
    const free = freeHiders(s).length
    this.o.onHud({
      phase: s.phase,
      secs: Math.max(0, Math.ceil(this.phaseSecs() - this.elapsed())),
      role: this.me < 0 || s.caught[this.me] !== null ? 'out' : isSeeker(s, this.me) ? 'seeker' : 'hider',
      free,
      total: hiders(s).length,
      painting: this.painting,
      pose: this.me >= 0 ? this.poses[this.me] : 'tegak',
      penalty: this.penalty,
      showing: s.phase === 'reveal' ? this.showing : null,
      fps: this.fps,
    })
  }

  /** dev: letakkan pemain untuk memotret sudut map */
  debugPlace(x: number, z: number, yaw: number, pitch = 0.2) {
    if (this.me < 0) return
    Object.assign(this.walkers[this.me], { x, z, y: 0 })
    this.bodies[this.me].root.position.set(x, 0, z)
    this.camYaw = yaw
    this.camPitch = pitch
  }

  dispose() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.stopLive?.()
    this.sync?.dispose()
    this.painter?.dispose()
    for (const b of this.bodies) b.dispose()
    for (const rt of this.paintOwned) rt.dispose()
    this.white.dispose()
    this.rose.dispose()
    this.life.dispose()
    this.o.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.world.dispose()
  }
}
