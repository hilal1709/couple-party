import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import courtUrl from '@/assets/sport/models/court.glb?url'
import hallUrl from '@/assets/sport/models/hall.glb?url'
import courtLightmap from '@/assets/sport/models/court-lm.webp?url'
import hallLightmap from '@/assets/sport/models/hall-lm.webp?url'
import { dressArena, makeCrowd, type ArenaSpec } from '../../render/arena'
import { Chibi, loadChibi, type Clip } from '../../render/chibi'
import { rowSeats, type Crowd, type Seat } from '../../render/crowd'
import { Particles } from '../../render/fx'
import { makeGrass } from '../../render/grass'
import { DETAIL } from '../../render/lod'
import { makeClock } from '../../render/shaders'
import type { Stage } from '../../render/stage'
import type { Look, RacketShot, RacketSport, ShotKind } from '../../types'

const SIZE: Record<RacketSport, { hw: number; hl: number; net: number }> = {
  tenis: { hw: 4, hl: 8, net: 0.9 },
  badminton: { hw: 2.6, hl: 5, net: 1.15 },
}
const RUN_SPEED = 7

export type Who = 'me' | 'foe'

const STONE = { tex: 'beton', repeat: 1 }
const STEEL = { tex: 'logam', repeat: 1, tint: '#c4cad6' }
const SPEC: Record<RacketSport, ArenaSpec> = {
  tenis: {
    sky: 'senja',
    env: 0.5,
    lightmap: courtLightmap,
    score: 'KACAU OPEN',
    mats: {
      ground: { tex: 'rumput', repeat: 90, tint: '#c7d98f', vary: { scale: 0.05, amount: 0.34 } },
      court_in: { tex: 'lapangan', repeat: 4, tint: '#23835a', normal: 0.35, plain: true, vary: { scale: 0.4, amount: 0.1, wear: { z: 7.6, halfX: 3, halfZ: 1.6 } } },
      court_out: { tex: 'lapangan', repeat: 6, tint: '#325fae', normal: 0.35, plain: true, vary: { scale: 0.4, amount: 0.1 } },
      beton: STONE,
      logam: STEEL,
      papan: { tex: 'papan', repeat: 1 },
    },
  },
  badminton: {
    sky: 'malam',
    env: 0.3,
    skyBackground: false,
    lightmap: hallLightmap,
    score: 'HALL KACAU',
    mats: {
      lantai: { tex: 'kayu', repeat: 9, tint: '#e8c79a', vary: { scale: 0.3, amount: 0.12 } },
      court_in: { tex: 'lapangan', repeat: 3, tint: '#1a7a52', normal: 0.3, plain: true, vary: { scale: 0.5, amount: 0.1, wear: { z: 4.6, halfX: 2, halfZ: 1.2 } } },
      beton: { tex: 'beton', repeat: 1, tint: '#857f92' },
      logam: STEEL,
      papan: { tex: 'papan', repeat: 1 },
    },
  },
}

function shuttle() {
  const g = new THREE.Group()
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: '#ff37a6' }))
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 12, 1, true).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: '#fff4fa', side: THREE.DoubleSide, roughness: 0.6 }))
  skirt.position.y = 0.09
  g.add(cork, skirt)
  return g
}

type Player = { c: Chibi; x: number; to: number; busy: number; z: number }

export class RacketScene {
  private stage: Stage
  private sport: RacketSport
  private flip = false
  private me!: Player
  private foe!: Player
  private ball!: THREE.Object3D
  private shot: RacketShot | null = null
  private t = 0
  private dur = 1
  private from = new THREE.Vector3()
  private to = new THREE.Vector3()
  private camPos = new THREE.Vector3(0, 3, 12)
  private camLook = new THREE.Vector3(0, 0.8, -4)
  private onArrive: (() => void) | null = null
  private bounced = false
  onBounce: (() => void) | null = null
  private clock = makeClock()
  private crowd: Crowd | null = null
  private fx: Particles | null = null
  private dustIn = 0

  constructor(stage: Stage, sport: RacketSport, flip: boolean) {
    this.stage = stage
    this.sport = sport
    this.flip = flip
  }

  async load(me: Look, foe: Look) {
    const [world, gltf] = await Promise.all([new GLTFLoader().loadAsync(this.sport === 'tenis' ? courtUrl : hallUrl), loadChibi()])
    const { scene, sun } = this.stage
    const out = this.sport === 'tenis'
    const detail = DETAIL[this.stage.quality]
    await dressArena(this.stage, world.scene, this.clock, SPEC[this.sport])
    if (out) scene.fog = new THREE.Fog('#f0c8a0', 45, 130)
    else {
      scene.background = new THREE.Color('#0d0a18')
      scene.fog = new THREE.Fog('#0d0a18', 30, 70)
    }
    this.crowd = makeCrowd(this.stage, this.seats(), this.clock)
    if (out && detail.grass) {
      const { hw, hl } = SIZE.tenis
      scene.add(makeGrass(Math.round(9000 * detail.grass), 42, (x, z) => (Math.abs(x) < hw + 7.6 && Math.abs(z) < 16) || (Math.abs(x) < 8 && z > 0) || (Math.abs(z) < hl + 3.8 && Math.abs(x) < hw + 2.6), this.clock, '#7fae4a'))
    }
    this.fx = new Particles(detail.particles)
    scene.add(this.fx.group)
    scene.add(world.scene)
    scene.add(new THREE.HemisphereLight(out ? '#ffe6c8' : '#ffe9f5', out ? '#55703a' : '#2c2350', out ? 0.35 : 0.9))
    sun.position.set(out ? -8 : 1, 14, out ? 6 : 2)
    sun.target.position.set(0, 0, 0)
    sun.intensity = out ? 2.6 : 1.1
    if (out) sun.color.set('#ffdcb4')
    const sc = sun.shadow.camera
    sc.left = sc.bottom = -16
    sc.right = sc.top = 16
    sc.near = 1
    sc.far = 40
    sc.updateProjectionMatrix()

    const { hl } = SIZE[this.sport]
    this.me = this.spawn(gltf, me, hl - 0.4, Math.PI)
    this.foe = this.spawn(gltf, foe, -(hl - 0.4), 0)
    this.ball = out ? new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: '#e7f64a', roughness: 0.55 })) : shuttle()
    this.ball.traverse((o) => (o.castShadow = true))
    scene.add(this.ball)
    this.stage.onFrame = (dt) => this.frame(dt)
  }

  /** Kursi cocok dengan `stand()` di sport_world.py. */
  private seats() {
    const { hw } = SIZE[this.sport]
    const half = this.sport === 'tenis' ? 12.4 : 9.6
    const seats: Seat[] = []
    for (const side of [-1, 1]) {
      for (let r = 0; r < 5; r++) {
        const x = side * (hw + 3.42 + r * 0.85)
        seats.push(...rowSeats([x, (r + 1) * 0.42, -half], [x, (r + 1) * 0.42, half], 0.76, (side * -Math.PI) / 2))
      }
    }
    return seats
  }

  private spawn(gltf: Awaited<ReturnType<typeof loadChibi>>, look: Look, z: number, turn: number): Player {
    const c = new Chibi(gltf, look)
    c.setGear('racket')
    c.root.position.set(0, 0, z)
    c.root.rotation.y = turn
    c.play('rk_ready')
    this.stage.scene.add(c.root)
    return { c, x: 0, to: 0, busy: 0, z }
  }

  setLooks(me: Look, foe: Look) {
    this.me.c.setLook(me)
    this.foe.c.setLook(foe)
  }

  private p(who: Who) {
    return who === 'me' ? this.me : this.foe
  }

  /** x lapangan → x layar: HP kursi 1 melihat dari ujung sebaliknya */
  worldX(x: number) {
    return (this.flip ? -x : x) * SIZE[this.sport].hw * 0.92
  }

  /** arah layar (-1 kiri, 1 kanan) → x lapangan */
  toCourt(screen: number) {
    return this.flip ? -screen : screen
  }

  serveReady(server: Who) {
    this.shot = null
    this.me.to = this.foe.to = 0
    const s = this.p(server)
    this.ball.visible = true
    this.ball.position.set(s.x, 1.1, s.z + (server === 'me' ? -0.3 : 0.3))
  }

  swing(who: Who, kind: ShotKind, screenX: number) {
    const p = this.p(who)
    // bola di sisi kanan badan = pukulan kanan; dari depan, kanan lawan = kiri layar
    const onRight = who === 'me' ? screenX >= p.x : screenX <= p.x
    const clip: Clip = kind === 'smash' ? 'rk_smash' : kind === 'lob' || onRight ? 'swing_F' : 'swing_B'
    p.c.play(clip, { once: true, fade: 0.05, speed: 1.3 })
    p.busy = 26 / 24 / 1.3
  }

  /** Jalankan bola dari pemukul ke sisi lawan selama shot.ms. */
  fly(s: RacketShot, byMe: boolean, onArrive: () => void) {
    this.shot = s
    this.t = 0
    this.dur = s.ms / 1000
    this.onArrive = onArrive
    this.bounced = false
    const hitter = byMe ? this.me : this.foe
    const target = byMe ? this.foe : this.me
    const x = this.worldX(s.out ? s.x * 1.4 : s.x)
    this.from.set(hitter.x, s.kind === 'smash' ? 2.2 : 0.95, hitter.z + (byMe ? -0.4 : 0.4))
    this.fx?.burst('spark', 8, this.from.x, this.from.y, this.from.z, 0, 1, 0, 4, ['#fff2b0', '#ffffff'], 0.5)
    this.to.set(x, 0.95, target.z + (s.out ? (byMe ? -2.5 : 2.5) : 0))
    this.ball.visible = true
    target.to = x
    hitter.to = hitter.x * 0.4
  }

  celebrate(winner: Who | null) {
    this.shot = null
    this.crowd?.cheer(1)
    if (winner) this.fx?.burst('confetti', 26, 0, 3.4, this.p(winner).z, 0, 2, 0, 8, ['#ff37a6', '#5cf64a', '#ffcc1f', '#42c6ff'])
    for (const who of ['me', 'foe'] as const) {
      const p = this.p(who)
      p.to = 0
      p.c.play(who === winner ? 'cheer' : 'sad', { fade: 0.25 })
      p.busy = 1e6
    }
    this.ball.visible = false
  }

  ready() {
    for (const who of ['me', 'foe'] as const) {
      const p = this.p(who)
      p.busy = 0
      p.c.play('rk_ready', { fade: 0.2 })
    }
  }

  private ballAt(k: number) {
    const s = this.shot!
    const { net } = SIZE[this.sport]
    const out = this.ball.position
    out.lerpVectors(this.from, this.to, Math.min(1, k))
    const arc = s.kind === 'lob' ? 4.2 : s.kind === 'smash' ? 0.2 : net + 0.55
    if (this.sport === 'tenis' && !s.serve && s.kind !== 'lob') {
      // satu pantulan di sisi penerima
      const b = 0.78
      if (k < b) {
        const u = k / b
        out.y = this.from.y * (1 - u) + 4 * u * (1 - u) * arc
      } else {
        const u = (k - b) / (1 - b)
        out.y = this.to.y * u + 4 * u * (1 - u) * 0.75
        if (!this.bounced) {
          this.bounced = true
          this.onBounce?.()
          this.fx?.burst('dust', 5, out.x, 0.05, out.z, 0, 0.4, 0, 1, ['#e8ece0'], 0.3)
        }
      }
    } else out.y = this.from.y * (1 - k) + this.to.y * k + 4 * k * (1 - k) * arc
    if (this.sport === 'badminton') this.ball.lookAt(this.to)
  }

  private frame(dt: number) {
    this.clock.value += dt
    this.crowd?.update(dt)
    this.fx?.update(dt)
    this.dustIn -= dt
    for (const p of [this.me, this.foe]) {
      p.c.update(dt)
      const dx = p.to - p.x
      const step = Math.min(Math.abs(dx), RUN_SPEED * dt)
      p.x += Math.sign(dx) * step
      p.c.root.position.x = p.x
      if (step > RUN_SPEED * dt * 0.5 && this.dustIn <= 0) {
        this.dustIn = 0.05
        this.fx?.emit('dust', p.x, 0.06, p.z, 0, 0.5, 0, this.sport === 'tenis' ? '#d8e2d0' : '#c9a878', 0.4)
      }
      if (p.busy > 0 && p.busy < 1e5) {
        p.busy -= dt
        if (p.busy <= 0) p.c.play('rk_ready', { fade: 0.15 })
      }
    }
    if (this.shot) {
      this.t += dt
      const k = this.t / this.dur
      if (k <= 1) this.ballAt(k)
      else if (this.onArrive) {
        const cb = this.onArrive
        this.onArrive = null
        cb()
      } else {
        // terlewat: terus ke belakang pemain
        this.ball.position.z += Math.sign(this.to.z - this.from.z) * dt * 5
        this.ball.position.y = Math.max(0.1, this.ball.position.y - dt * 2)
      }
    }
    const { hl } = SIZE[this.sport]
    const pos = new THREE.Vector3(this.me.x * 0.4, this.sport === 'tenis' ? 3.7 : 3.9, hl + (this.sport === 'tenis' ? 3.5 : 4.4))
    const look = new THREE.Vector3(this.me.x * 0.2, 0, -hl * 0.1)
    const k = 1 - Math.exp(-dt * 5)
    this.camPos.lerp(pos, k)
    this.camLook.lerp(look, k)
    const cam = this.stage.camera
    cam.position.copy(this.camPos)
    cam.lookAt(this.camLook)
  }
}
