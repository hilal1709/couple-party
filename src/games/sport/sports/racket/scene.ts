import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import courtUrl from '@/assets/sport/models/court.glb?url'
import hallUrl from '@/assets/sport/models/hall.glb?url'
import { Chibi, loadChibi, type Clip } from '../../render/chibi'
import type { Stage } from '../../render/stage'
import type { Look, RacketShot, RacketSport, ShotKind } from '../../types'
import { grassTexture } from '../archery/scene'

const SIZE: Record<RacketSport, { hw: number; hl: number; net: number }> = {
  tenis: { hw: 4, hl: 8, net: 0.9 },
  badminton: { hw: 2.6, hl: 5, net: 1.15 },
}
const RUN_SPEED = 7

export type Who = 'me' | 'foe'

function netTexture() {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.lineWidth = 6
  g.strokeRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(40, 5)
  return t
}

function woodTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  for (let i = 0; i < 16; i++) {
    const tone = 170 + (i * 37) % 34
    g.fillStyle = `rgb(${tone + 30},${tone - 30},${tone - 90})`
    g.fillRect((i * S) / 16, 0, S / 16 + 1, S)
    g.fillStyle = 'rgba(60,30,10,0.3)'
    g.fillRect((i * S) / 16, 0, 1.5, S)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4)
  return t
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

  constructor(stage: Stage, sport: RacketSport, flip: boolean) {
    this.stage = stage
    this.sport = sport
    this.flip = flip
  }

  async load(me: Look, foe: Look) {
    const [world, gltf] = await Promise.all([new GLTFLoader().loadAsync(this.sport === 'tenis' ? courtUrl : hallUrl), loadChibi()])
    const { scene, renderer, sun } = this.stage
    const out = this.sport === 'tenis'
    const bg = out ? '#f7c9a0' : '#0d0a18'
    scene.background = new THREE.Color(bg)
    scene.fog = new THREE.Fog(bg, 30, 70)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = out ? 0.3 : 0.25
    pmrem.dispose()
    world.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.receiveShadow = true
      const m = mesh.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.5)
      if (m.name.startsWith('crowd') && this.stage.quality === 'low') mesh.visible = false
      if (m.name === 'grass') {
        m.map = grassTexture('#4f9a3a', false)
        m.map.repeat.set(16, 16)
        m.color.set('#ffffff')
      } else if (m.name === 'wood') {
        m.map = woodTexture()
        m.color.set('#ffffff')
      } else if (m.name === 'net') {
        m.map = netTexture()
        m.transparent = true
        m.alphaTest = 0.2
        m.side = THREE.DoubleSide
      }
    })
    scene.add(world.scene)
    scene.add(new THREE.HemisphereLight(out ? '#ffeeda' : '#ffe9f5', out ? '#5f8a4a' : '#2c2350', out ? 1.25 : 0.9))
    sun.position.set(out ? -8 : 1, 14, out ? 6 : 2)
    sun.target.position.set(0, 0, 0)
    sun.intensity = out ? 2.1 : 1.1
    const sc = sun.shadow.camera
    sc.left = sc.bottom = -11
    sc.right = sc.top = 11
    sc.near = 1
    sc.far = 34
    sc.updateProjectionMatrix()

    const { hl } = SIZE[this.sport]
    this.me = this.spawn(gltf, me, hl - 0.4, Math.PI)
    this.foe = this.spawn(gltf, foe, -(hl - 0.4), 0)
    this.ball = out ? new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: '#e7f64a', roughness: 0.55 })) : shuttle()
    this.ball.traverse((o) => (o.castShadow = true))
    scene.add(this.ball)
    this.stage.onFrame = (dt) => this.frame(dt)
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
    this.to.set(x, 0.95, target.z + (s.out ? (byMe ? -2.5 : 2.5) : 0))
    this.ball.visible = true
    target.to = x
    hitter.to = hitter.x * 0.4
  }

  celebrate(winner: Who | null) {
    this.shot = null
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
        }
      }
    } else out.y = this.from.y * (1 - k) + this.to.y * k + 4 * k * (1 - k) * arc
    if (this.sport === 'badminton') this.ball.lookAt(this.to)
  }

  private frame(dt: number) {
    for (const p of [this.me, this.foe]) {
      p.c.update(dt)
      const dx = p.to - p.x
      const step = Math.min(Math.abs(dx), RUN_SPEED * dt)
      p.x += Math.sign(dx) * step
      p.c.root.position.x = p.x
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
    const pos = new THREE.Vector3(this.me.x * 0.4, this.sport === 'tenis' ? 4.1 : 3.9, hl + (this.sport === 'tenis' ? 4.2 : 4.4))
    const look = new THREE.Vector3(this.me.x * 0.2, 0, -hl * 0.1)
    const k = 1 - Math.exp(-dt * 5)
    this.camPos.lerp(pos, k)
    this.camLook.lerp(look, k)
    const cam = this.stage.camera
    cam.position.copy(this.camPos)
    cam.lookAt(this.camLook)
  }
}
