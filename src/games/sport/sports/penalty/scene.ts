import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import worldUrl from '@/assets/sport/models/pitch.glb?url'
import lightmapUrl from '@/assets/sport/models/pitch-lm.webp?url'
import { dressArena, makeCrowd, squareSeats } from '../../render/arena'
import { Chibi, loadChibi } from '../../render/chibi'
import type { Crowd } from '../../render/crowd'
import { Particles } from '../../render/fx'
import { DETAIL } from '../../render/lod'
import { addStripes, makeClock } from '../../render/shaders'
import type { Stage } from '../../render/stage'
import type { Look, PenaltyResult } from '../../types'

const GOAL_Z = -11
const GOAL_W = 2.5
const GOAL_H = 2
const BALL_R = 0.13
/** frame 16 dari klip kick: kaki mengenai bola */
const IMPACT = 16 / 24
const FLIGHT = 0.62
/** lama satu tendangan, dari mulai ancang-ancang sampai giliran berikutnya */
export const SHOT_MS = 4300

function ballTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#fff4fa'
  g.fillRect(0, 0, S, S)
  g.fillStyle = '#121212'
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 6; x++) {
      g.beginPath()
      g.arc((x + (y % 2) * 0.5) * (S / 5), (y + 0.5) * (S / 3), 20, 0, 6.3)
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

type View = 'taker' | 'keeper'

export class PenaltyScene {
  private stage: Stage
  private taker: Chibi | null = null
  private keeper: Chibi | null = null
  private gltf: Awaited<ReturnType<typeof loadChibi>> | null = null
  private ball!: THREE.Mesh
  private result: PenaltyResult | null = null
  private cb: (() => void) | null = null
  private clock = 0
  private view: View = 'taker'
  private from = new THREE.Vector3()
  private to = new THREE.Vector3()
  private rest = new THREE.Vector3()
  private camPos = new THREE.Vector3(0, 1.6, 3.8)
  private camLook = new THREE.Vector3(0, 0.9, GOAL_Z)
  private spin = 0
  private clock2 = makeClock()
  private crowd: Crowd | null = null
  private fx: Particles | null = null

  constructor(stage: Stage) {
    this.stage = stage
  }

  async load() {
    const [world, gltf] = await Promise.all([new GLTFLoader().loadAsync(worldUrl), loadChibi()])
    const { scene, sun } = this.stage
    this.gltf = gltf
    await dressArena(this.stage, world.scene, this.clock2, {
      sky: 'malam',
      env: 0.35,
      lightmap: lightmapUrl,
      lightmapIntensity: 1.5,
      score: 'KACAU',
      mats: {
        ground: { tex: 'rumput', repeat: 34, tint: '#b4e888', vary: { scale: 0.09, amount: 0.2 } },
        beton: { tex: 'beton', repeat: 1, tint: '#8a8698' },
        logam: { tex: 'logam', repeat: 1, tint: '#c4cad6' },
      },
    })
    scene.fog = new THREE.Fog('#0c1a33', 45, 110)
    world.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m?.name === 'ground') addStripes(m, 2.4)
      if (m?.name === 'kulit_kaca') {
        m.transparent = true
        m.opacity = 0.35
      }
    })
    scene.add(world.scene)
    scene.add(this.lines())

    this.crowd = makeCrowd(this.stage, squareSeats({ d0: 16, tiers: 5, gap: 1, base: 0.8, cy: 2, sides: [0, 2, 3] }), this.clock2)
    this.fx = new Particles(DETAIL[this.stage.quality].particles)
    scene.add(this.fx.group)
    scene.add(new THREE.HemisphereLight('#dfeaff', '#3a5a3a', 1.1))
    sun.position.set(-6, 14, 2)
    sun.target.position.set(0, 0, -6)
    sun.intensity = 3
    const sc = sun.shadow.camera
    sc.left = -9
    sc.right = 9
    sc.top = 9
    sc.bottom = -9
    sc.near = 1
    sc.far = 30
    sc.updateProjectionMatrix()

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45 }))
    this.ball.castShadow = true
    scene.add(this.ball)
    this.stage.onFrame = (dt) => this.frame(dt)
  }

  /** garis kotak penalti & titik putih, digambar di atas rumput */
  private lines() {
    const g = new THREE.Group()
    const m = new THREE.MeshBasicMaterial({ color: '#fff4fa' })
    const bar = (x: number, z: number, w: number, d: number) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m)
      b.position.set(x, 0.01, z)
      g.add(b)
    }
    bar(0, GOAL_Z, 30, 0.1)
    bar(0, GOAL_Z + 5, 12, 0.1)
    for (const s of [-1, 1]) {
      bar(s * 6, GOAL_Z + 2.5, 0.1, 5)
      bar(s * 11, GOAL_Z + 7, 0.1, 14)
    }
    bar(0, 3, 22, 0.1)
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16).rotateX(-Math.PI / 2), m)
    spot.position.y = 0.012
    g.add(spot)
    return g
  }

  private fit(c: Chibi | null, look: Look, rot: number) {
    if (c) {
      c.setLook(look)
      return c
    }
    const n = new Chibi(this.gltf!, look)
    n.root.rotation.y = rot
    this.stage.scene.add(n.root)
    return n
  }

  /** Tendangan baru: `view` adalah sudut pandang pemain HP ini. */
  setup(taker: Look, keeper: Look, view: View) {
    this.taker = this.fit(this.taker, taker, Math.PI)
    this.keeper = this.fit(this.keeper, keeper, 0)
    this.taker.root.position.set(-0.3, 0, 1.25)
    this.keeper.root.position.set(0, 0, GOAL_Z + 0.75)
    this.taker.play('idle', { fade: 0.2 })
    this.keeper.play('keep', { fade: 0.2 })
    this.view = view
    this.result = null
    this.ball.position.set(0, BALL_R, 0)
  }

  play(r: PenaltyResult, onFinish: () => void) {
    this.result = r
    this.cb = onFinish
    this.clock = 0
    this.spin = 0
    this.taker?.play('kick', { once: true, fade: 0.1 })
    this.from.set(0, BALL_R, 0)
    this.to.set(r.kick.x * GOAL_W, Math.max(BALL_R, r.kick.y * GOAL_H), r.why === 'save' ? GOAL_Z + 0.5 : GOAL_Z)
    // gawang ada di -Z, jadi mundur ke jaring / terpental kembali
    this.rest.set(this.to.x * 1.05, BALL_R, r.why === 'save' ? GOAL_Z + 3.4 : GOAL_Z - 1)
    if (r.why === 'wide' || r.why === 'over') this.rest.set(this.to.x * 1.5, BALL_R + 2, GOAL_Z - 5)
  }

  private frame(dt: number) {
    this.clock += dt
    this.clock2.value += dt
    this.crowd?.update(dt)
    this.fx?.update(dt)
    this.taker?.update(dt)
    this.keeper?.update(dt)
    const r = this.result
    if (r) {
      const t = this.clock - IMPACT
      // kiper bergerak sebelum bola sampai; lewat garis dari sudut pandang kiper berarti kiri-kanan terbalik
      if (this.clock >= IMPACT - 0.1 && this.clock - dt < IMPACT - 0.1) {
        this.keeper?.play(r.dive === 'C' ? 'catch' : r.dive === 'L' ? 'dive_R' : 'dive_L', { once: true, fade: 0.05 })
      }
      if (t >= 0) {
        const k = Math.min(1, t / (FLIGHT * (1.25 - r.kick.power * 0.4)))
        if (k < 1) {
          this.ball.position.lerpVectors(this.from, this.to, k)
          this.ball.position.y += Math.sin(k * Math.PI) * 0.5
        } else {
          this.ball.position.lerp(this.rest, 1 - Math.exp(-dt * 6))
          if (this.cb) {
            this.cb()
            this.cb = null
            const p = this.ball.position
            this.fx?.burst('dust', 8, p.x, 0.1, p.z, 0, 0.5, 0, 2, ['#9ccf78'], 0.4)
            if (r.why === 'goal') {
              this.crowd?.cheer(1)
              this.fx?.burst('confetti', 36, p.x, 3, p.z, 0, 2, 2, 9, ['#ff37a6', '#5cf64a', '#ffcc1f', '#42c6ff'])
            } else this.crowd?.cheer(0.45)
          }
        }
        this.spin += dt * 16
        this.ball.rotation.x = -this.spin
      }
    }

    const cam = this.stage.camera
    const watching = r && this.clock > IMPACT
    let pos: THREE.Vector3
    let look: THREE.Vector3
    if (this.view === 'taker') {
      pos = watching ? new THREE.Vector3(1.1 + this.ball.position.x * 0.3, 1.8, 1.6) : new THREE.Vector3(1.15, 2.05, 4.7)
      look = new THREE.Vector3(watching ? this.ball.position.x * 0.5 : 0.05, 0.85, GOAL_Z)
    } else {
      // kiper melihat dari garis gawang, di bawah mistar dan di belakang bahu sendiri
      pos = new THREE.Vector3(-0.62, 1.62, GOAL_Z - 0.4)
      look = new THREE.Vector3(watching ? this.ball.position.x * 0.5 : 0.2, 0.75, 0)
    }
    const k = 1 - Math.exp(-dt * 4)
    this.camPos.lerp(pos, k)
    this.camLook.lerp(look, k)
    cam.position.copy(this.camPos)
    cam.lookAt(this.camLook)
  }
}
