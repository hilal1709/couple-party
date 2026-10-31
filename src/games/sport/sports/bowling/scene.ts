import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import worldUrl from '@/assets/sport/models/bowling.glb?url'
import propsUrl from '@/assets/sport/models/bowling-props.glb?url'
import { Chibi, loadChibi } from '../../render/chibi'
import type { Stage } from '../../render/stage'
import type { BowlRoll, Look } from '../../types'
import { BALL_R, HEAD_Z, PIN_SPOTS, RollSim, startX, type BowlThrow } from './sim'

/** jeda dari mulai animasi sampai bola lepas: frame 40 pada 24 fps */
export const WINDUP_MS = 1667
/** jeda setelah pin diam sebelum giliran pindah: lihat pin + reaksi karakter */
export const AFTER_MS = 2600

const WINDUP = WINDUP_MS / 1000
const STAND_BACK = 1.05
/** sisi kanan bola dari pusat badan */
const HAND_X = 0.27

export type ScenePhase = 'aim' | 'windup' | 'roll' | 'look' | 'react'

type Callbacks = {
  onRelease?: () => void
  onFirstHit?: (speed: number) => void
}

function laneTexture() {
  const W = 256
  const H = 2048
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const boards = 39
  // papan maple memanjang dengan sambungan selang-seling
  for (let i = 0; i < boards; i++) {
    const x = (i / boards) * W
    let y = -((i * 137) % 300)
    while (y < H) {
      const len = 260 + ((i * 53 + y) % 180)
      const tone = 196 + ((i * 7 + Math.abs(y)) % 26)
      g.fillStyle = `rgb(${tone + 22},${tone - 28},${tone - 96})`
      g.fillRect(x, y, W / boards + 1, len)
      g.fillStyle = 'rgba(70,35,10,0.35)'
      g.fillRect(x, y + len - 1, W / boards, 1.5)
      y += len
    }
    g.fillStyle = 'rgba(70,35,10,0.22)'
    g.fillRect(x, 0, 1, H)
  }
  // titik & panah pembidik, koordinat v dihitung dari ujung pin
  const at = (m: number) => H * (1 - m / 19.3)
  g.fillStyle = '#3b1b0c'
  for (const s of [-3, -2, -1, 0, 1, 2, 3]) {
    const px = W / 2 + (s * W) / 7.6
    const py = at(4.6 + Math.abs(s) * 0.32)
    g.beginPath()
    g.moveTo(px, py - 22)
    g.lineTo(px + 7, py + 14)
    g.lineTo(px - 7, py + 14)
    g.closePath()
    g.fill()
    g.beginPath()
    g.arc(px, at(2.1), 4, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  // sumbu V glTF terbalik dari kanvas
  t.flipY = false
  t.center.set(0.5, 0.5)
  t.rotation = Math.PI
  return t
}

function carpetTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#2c2350'
  g.fillRect(0, 0, S, S)
  const colors = ['#ff37a6', '#5cf64a', '#ffcc1f', '#42c6ff', '#8a4fff']
  // pola tetap, supaya semua HP melihat karpet yang sama
  let v = 7
  const r = () => (v = (v * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 90; i++) {
    g.save()
    g.translate(r() * S, r() * S)
    g.rotate(r() * 6.3)
    g.fillStyle = colors[i % 5]
    g.globalAlpha = 0.75
    if (i % 3 === 0) g.fillRect(-10, -3, 20, 6)
    else if (i % 3 === 1) {
      g.beginPath()
      g.moveTo(0, -9)
      g.lineTo(9, 7)
      g.lineTo(-9, 7)
      g.closePath()
      g.fill()
    } else {
      g.beginPath()
      g.arc(0, 0, 6, 0, 6.3)
      g.fill()
    }
    g.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(14, 5)
  return t
}

const toWorld = (x: number, z: number, y = 0) => new THREE.Vector3(x, y, -z)

export class BowlingScene {
  phase: ScenePhase = 'aim'
  private stage: Stage
  private pins: THREE.Object3D[] = []
  private ball!: THREE.Object3D
  private ballMat: THREE.MeshStandardMaterial | null = null
  private chibi: Chibi | null = null
  private gltfChibi: Awaited<ReturnType<typeof loadChibi>> | null = null
  private dots!: THREE.InstancedMesh
  private sim: RollSim | null = null
  private cb: Callbacks = {}
  private clock = 0
  private hit = false
  private step = 0
  private spinAxis = new THREE.Vector3(1, 0, 0)
  private camPos = new THREE.Vector3(0, 2, 4)
  private camLook = new THREE.Vector3(0, 0.4, -10)
  private aim: BowlThrow = { x: 0, dir: 0, speed: 8, spin: 0 }
  private react: 'cheer' | 'sad' = 'sad'
  private rackDrop = 1

  constructor(stage: Stage) {
    this.stage = stage
  }

  async load() {
    const loader = new GLTFLoader()
    const [world, props, gltfChibi] = await Promise.all([loader.loadAsync(worldUrl), loader.loadAsync(propsUrl), loadChibi()])
    const { scene, renderer, sun } = this.stage
    this.gltfChibi = gltfChibi

    scene.background = new THREE.Color('#0d0a18')
    scene.fog = new THREE.Fog('#0d0a18', 26, 60)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.22
    pmrem.dispose()

    world.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const m = mesh.material as THREE.MeshStandardMaterial
      // nilai lampu dari Blender terlalu terang untuk bloom di HP
      m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.5)
      if (m.name === 'lane') {
        m.map = laneTexture()
        m.color.set('#e9d9c4')
        m.envMapIntensity = 3
        mesh.receiveShadow = true
      } else if (m.name === 'carpet') {
        m.map = carpetTexture()
        m.color.set('#ffffff')
        mesh.receiveShadow = true
      }
    })
    scene.add(world.scene)

    scene.add(new THREE.HemisphereLight('#ffe9f5', '#2c2350', 0.55))
    // lampu hangat di area pemain dan sorot di pin
    const front = new THREE.PointLight('#ffe7c8', 16, 14, 1.7)
    front.position.set(0, 3.8, 1)
    const mid = new THREE.PointLight('#ffd9ee', 16, 18, 1.7)
    mid.position.set(0, 3.6, -9)
    const deck = new THREE.SpotLight('#fff4dd', 34, 9, 0.5, 0.6, 1.2)
    deck.position.set(0, 2.6, -17.2)
    deck.target.position.set(0, 0, -18.9)
    scene.add(front, mid, deck, deck.target)
    sun.position.set(1.2, 6, 3)
    sun.target.position.set(0, 0, -3)
    sun.intensity = 0.8
    const sc = sun.shadow.camera
    sc.left = -4
    sc.right = 4
    sc.top = 9
    sc.bottom = -9
    sc.near = 1
    sc.far = 24
    sc.updateProjectionMatrix()

    const pinNode = props.scene.getObjectByName('pin')!
    for (let i = 0; i < 10; i++) {
      const p = pinNode.clone()
      p.traverse((o) => (o.castShadow = true))
      scene.add(p)
      this.pins.push(p)
    }
    const ball = props.scene.getObjectByName('ball')!
    ball.traverse((o) => {
      o.castShadow = true
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m?.name === 'ball') this.ballMat = m
    })
    scene.add(ball)
    this.ball = ball

    // titik pemandu: mengikuti lintasan sungguhan, termasuk belokan putaran
    const dot = new THREE.CircleGeometry(0.035, 12).rotateX(-Math.PI / 2)
    this.dots = new THREE.InstancedMesh(dot, new THREE.MeshBasicMaterial({ color: '#5cf64a', transparent: true, opacity: 0.85, depthWrite: false }), 26)
    this.dots.frustumCulled = false
    scene.add(this.dots)

    this.setRack(Array(10).fill(true))
    this.setAim(this.aim, true)
    this.stage.onFrame = (dt) => this.frame(dt)
  }

  setPlayer(look: Look, ballColor: string) {
    if (!this.gltfChibi) return
    if (!this.chibi) {
      this.chibi = new Chibi(this.gltfChibi, look)
      // model menghadap +Z, lintasan menuju -Z
      this.chibi.root.rotation.y = Math.PI
      this.stage.scene.add(this.chibi.root)
    } else this.chibi.setLook(look)
    this.ballMat?.color.set(ballColor)
    this.chibi.play('ready')
  }

  /** Pin yang berdiri di posisinya; pin jatuh disembunyikan. */
  setRack(standing: boolean[]) {
    this.rackDrop = standing.every(Boolean) ? 0 : 1
    this.pins.forEach((p, i) => {
      const [x, z] = PIN_SPOTS[i]
      p.visible = standing[i]
      p.rotation.set(0, 0, 0)
      p.position.copy(toWorld(x, z))
    })
  }

  private placeThrower() {
    const x = startX(this.aim.x)
    if (this.chibi) this.chibi.root.position.set(x - HAND_X, 0, STAND_BACK)
  }

  private heldBall() {
    const hand = this.chibi?.bone('hand_R')
    if (!hand) return
    hand.updateWorldMatrix(true, false)
    this.ball.position.setFromMatrixPosition(hand.matrixWorld)
    this.ball.position.y -= 0.06
    this.ball.position.z += 0.02
  }

  setAim(th: BowlThrow, show: boolean) {
    this.aim = th
    this.dots.visible = show
    if (!show) return
    this.placeThrower()
    // jalankan fisika tanpa pin untuk menggambar jalur
    const ghost = new RollSim(Array(10).fill(false), th)
    const m = new THREE.Matrix4()
    const n = this.dots.count
    let i = 0
    let guard = 0
    while (i < n && guard++ < 2000) {
      ghost.step()
      if (ghost.gutter) break
      if (ghost.ball.z >= (i + 1) * (HEAD_Z / n)) {
        const p = toWorld(ghost.ball.x, ghost.ball.z, 0.012)
        m.makeTranslation(p.x, p.y, p.z)
        this.dots.setMatrixAt(i++, m)
      }
    }
    this.dots.count = n
    for (let k = i; k < n; k++) {
      m.makeScale(0, 0, 0)
      this.dots.setMatrixAt(k, m)
    }
    this.dots.instanceMatrix.needsUpdate = true
  }

  /** Putar ulang lemparan dari parameternya: hasilnya sama persis dengan hitungan host. */
  playRoll(roll: BowlRoll, cb: Callbacks) {
    this.cb = cb
    this.aim = roll.th
    this.placeThrower()
    this.setRack(roll.before)
    this.rackDrop = 1
    this.sim = new RollSim(roll.before, roll.th)
    this.dots.visible = false
    this.phase = 'windup'
    this.clock = 0
    this.step = 0
    this.hit = false
    this.react = roll.call === 'strike' || roll.call === 'spare' ? 'cheer' : roll.knocked.length >= 7 ? 'cheer' : 'sad'
    this.chibi?.play('bowl', { once: true, fade: 0.15 })
    const b = roll.th.spin
    this.spinAxis.set(1, 0, b * 0.8).normalize()
  }

  backToAim() {
    this.phase = 'aim'
    this.sim = null
    if (this.chibi) {
      this.placeThrower()
      this.chibi.play('ready', { fade: 0.25 })
    }
  }

  private frame(dt: number) {
    this.clock += dt
    this.chibi?.update(dt)
    if (this.rackDrop < 1) {
      this.rackDrop = Math.min(1, this.rackDrop + dt * 2.4)
      const up = (1 - this.rackDrop) ** 2 * 0.8
      this.pins.forEach((p, i) => (p.position.y = i >= 0 ? up : 0))
    }
    switch (this.phase) {
      case 'aim':
        this.heldBall()
        this.ball.visible = true
        this.camTo(toWorld(startX(this.aim.x) * 0.5 - 0.15, -4.4, 2.5), toWorld(startX(this.aim.x) * 0.3 - 0.1, 7, 0.1), dt, 4)
        break
      case 'windup':
        this.heldBall()
        this.camTo(toWorld(startX(this.aim.x) * 0.45 + 0.9, -3.4, 1.7), toWorld(0, 6, 0.3), dt, 3)
        if (this.clock >= WINDUP) {
          this.phase = 'roll'
          this.clock = 0
          this.cb.onRelease?.()
        }
        break
      case 'roll':
        this.advanceSim(dt)
        break
      case 'look':
        this.advanceSim(dt)
        this.camTo(toWorld(0.35, HEAD_Z - 3.1, 1.15), toWorld(0, HEAD_Z + 0.3, 0.25), dt, 3.5)
        if (this.clock > 1.1) {
          this.phase = 'react'
          this.clock = 0
          if (this.chibi) {
            // kamera pindah ke atas lintasan, jadi karakter tetap menghadap -Z ke arah kamera
            this.chibi.root.position.set(0, 0, 0.8)
            this.chibi.play(this.react, { fade: 0.1 })
          }
          this.camPos.copy(toWorld(0.5, 1.75, 1.1))
          this.camLook.copy(toWorld(0, -0.8, 0.85))
        }
        break
      case 'react':
        this.camTo(toWorld(0.25, 1.15, 1), toWorld(0, -0.8, 0.82), dt, 1.5)
        break
    }
    this.stage.camera.position.copy(this.camPos)
    this.stage.camera.lookAt(this.camLook)
  }

  private advanceSim(dt: number) {
    const s = this.sim
    if (!s) return
    // langkah tetap: tampilan mengikuti jam, fisika tetap sama dengan host
    this.step += dt * 120
    while (this.step >= 1 && !s.done) {
      s.step()
      this.step -= 1
    }
    const b = s.ball
    const release = Math.min(1, this.clock / 0.18)
    const groundY = s.gutter ? BALL_R - 0.06 : BALL_R
    const target = toWorld(b.x, b.z, groundY)
    if (release < 1) this.ball.position.lerp(target, release)
    else this.ball.position.copy(target)
    this.ball.rotateOnWorldAxis(this.spinAxis, (-b.vz * dt) / BALL_R)
    this.ball.visible = b.z < 19.3

    for (const p of s.pins) {
      const pin = this.pins[p.i]
      pin.position.copy(toWorld(p.x, p.z))
      if (!p.up) {
        const k = Math.min(1, (s.t - p.at) * 7)
        pin.position.y = 0.06 * k
        pin.rotation.set((p.tz * -k * Math.PI) / 2, 0, (p.tx * -k * Math.PI) / 2)
        if (!this.hit) {
          this.hit = true
          this.cb.onFirstHit?.(Math.sqrt(b.vx * b.vx + b.vz * b.vz))
        }
      }
    }

    if (this.phase === 'roll') {
      const follow = Math.min(HEAD_Z - 3.6, Math.max(0, b.z - 2.6))
      this.camTo(toWorld(b.x * 0.4, follow, 1.0 + 0.25 * (1 - follow / HEAD_Z)), toWorld(b.x * 0.6, Math.min(HEAD_Z, b.z + 4), 0.2), dt, 7)
      if (s.done || b.z >= HEAD_Z + 0.6) {
        this.phase = 'look'
        this.clock = 0
      }
    }
  }

  private camTo(pos: THREE.Vector3, look: THREE.Vector3, dt: number, speed: number) {
    const k = 1 - Math.exp(-dt * speed)
    this.camPos.lerp(pos, k)
    this.camLook.lerp(look, k)
  }
}
