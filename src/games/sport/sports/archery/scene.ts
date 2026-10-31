import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import worldUrl from '@/assets/sport/models/archery.glb?url'
import { Chibi, loadChibi } from '../../render/chibi'
import type { Stage } from '../../render/stage'
import type { ArrowShot, Look } from '../../types'
import { flightTime, TARGET_DIST, type ArrowAim } from './sim'

/** waktu tembak diperlambat supaya panah sempat terlihat */
const SLOW = 2.6
/** lama satu tembakan, dari lepas sampai giliran berikutnya */
export const SHOT_MS = 3400
const TARGET_Y = 1.3

export function grassTexture(base: string, stripes: boolean) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, S, S)
  if (stripes) {
    g.fillStyle = 'rgba(255,255,255,0.09)'
    for (let i = 0; i < 8; i += 2) g.fillRect(0, (i * S) / 8, S, S / 8)
  }
  // bintik tetap, supaya semua HP melihat rumput yang sama
  let v = 11
  const r = () => (v = (v * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,200,0.07)' : 'rgba(0,40,0,0.1)'
    g.fillRect(r() * S, r() * S, 2, 5)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

function arrowMesh() {
  const g = new THREE.Group()
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d9b77e', roughness: 0.6 }))
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#444450', metalness: 0.7, roughness: 0.3 }))
  tip.position.z = -0.43
  const m = new THREE.MeshStandardMaterial({ color: '#ff37a6', side: THREE.DoubleSide })
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), m)
    f.rotation.y = Math.PI / 2
    f.rotation.x = (i * Math.PI) / 2
    f.position.z = 0.34
    g.add(f)
  }
  g.add(shaft, tip)
  return g
}

type View = 'wide' | 'scope' | 'fly' | 'close'

export class ArcheryScene {
  private stage: Stage
  private archer: Chibi | null = null
  private gltf: Awaited<ReturnType<typeof loadChibi>> | null = null
  private reticle!: THREE.Group
  private flying!: THREE.Group
  private stuck: THREE.Group[] = []
  private aim: ArrowAim = { x: 0, y: 0 }
  private held = 0
  private drawing = false
  private view: View = 'wide'
  private clock = 0
  private flight = 1
  private from = new THREE.Vector3()
  private to = new THREE.Vector3()
  private camPos = new THREE.Vector3(2, 1.8, 4)
  private camLook = new THREE.Vector3(0, 1.3, -18)
  private fov = 46
  private onHit: (() => void) | null = null

  constructor(stage: Stage) {
    this.stage = stage
  }

  async load() {
    const [world, gltf] = await Promise.all([new GLTFLoader().loadAsync(worldUrl), loadChibi()])
    const { scene, renderer, sun } = this.stage
    this.gltf = gltf
    scene.background = new THREE.Color('#9bd8f5')
    scene.fog = new THREE.Fog('#bfe6f7', 40, 120)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.3
    pmrem.dispose()

    world.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const m = mesh.material as THREE.MeshStandardMaterial
      if (m.name === 'grass') {
        mesh.castShadow = false
        m.map = grassTexture('#5aae3a', false)
        m.map.repeat.set(30, 30)
        m.color.set('#ffffff')
      }
    })
    scene.add(world.scene)
    scene.add(new THREE.HemisphereLight('#e8f6ff', '#6b8f4a', 1.3))
    sun.position.set(-8, 16, 6)
    sun.target.position.set(0, 0, -10)
    sun.intensity = 2.2
    const sc = sun.shadow.camera
    sc.left = -22
    sc.right = 22
    sc.top = 26
    sc.bottom = -16
    sc.near = 1
    sc.far = 50
    sc.updateProjectionMatrix()

    // bidikan: lingkaran & titik, selalu di atas sasaran
    this.reticle = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true })
    const dot = new THREE.MeshBasicMaterial({ color: '#ff37a6', depthTest: false, transparent: true })
    this.reticle.add(new THREE.Mesh(new THREE.RingGeometry(0.1, 0.125, 32), mat), new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), dot))
    this.reticle.renderOrder = 10
    this.reticle.children.forEach((c) => (c.renderOrder = 10))
    scene.add(this.reticle)

    this.flying = arrowMesh()
    this.flying.visible = false
    scene.add(this.flying)
    this.stage.onFrame = (dt) => this.frame(dt)
  }

  setArcher(look: Look) {
    if (!this.gltf) return
    if (!this.archer) {
      this.archer = new Chibi(this.gltf, look)
      this.archer.setGear('bow')
      this.archer.root.rotation.y = Math.PI
      this.stage.scene.add(this.archer.root)
    } else this.archer.setLook(look)
  }

  /** Giliran baru: kamera lebar kalau bukan giliran sendiri, teropong kalau giliran sendiri. */
  startAim(mine: boolean) {
    this.view = mine ? 'scope' : 'wide'
    this.reticle.visible = mine
    this.aim = { x: 0, y: 0 }
    this.held = 0
    this.drawing = false
    this.flying.visible = false
    this.archer?.play('bow_ready', { fade: 0.25 })
  }

  clearStuck() {
    for (const a of this.stuck) this.stage.scene.remove(a)
    this.stuck = []
  }

  setAim(a: ArrowAim) {
    this.aim = a
  }

  setDrawing(on: boolean) {
    if (on === this.drawing) return
    this.drawing = on
    if (on) this.archer?.play('bow_draw', { once: true, fade: 0.1 })
    else this.held = 0
  }

  /** Bidikan saat ini termasuk goyangan tangan: makin lama menahan, makin goyang. */
  currentAim(): ArrowAim {
    const t = performance.now() / 1000
    const a = 0.025 + Math.max(0, this.held - 2.2) * 0.09
    return { x: this.aim.x + Math.sin(t * 1.7) * a + Math.sin(t * 4.1) * a * 0.4, y: this.aim.y + Math.cos(t * 1.3) * a + Math.sin(t * 3.3) * a * 0.4 }
  }

  /** Tarikan 0..1 menurut lama menahan. */
  draw() {
    return Math.min(1, this.held / 1)
  }

  shoot(s: ArrowShot, onHit: () => void) {
    this.onHit = onHit
    this.reticle.visible = false
    this.drawing = false
    this.archer?.play('bow_loose', { once: true, fade: 0.04 })
    this.from.set(0.24, 1.3, -0.3)
    this.to.set(s.hit.x, TARGET_Y + s.hit.y, s.score ? -TARGET_DIST + 0.04 : -TARGET_DIST - 8)
    this.flight = flightTime(s.draw) * SLOW
    this.flying.position.copy(this.from)
    this.flying.lookAt(this.to)
    // arrowMesh mengarah ke -Z, lookAt mengarahkan +Z objek
    this.flying.rotateY(Math.PI)
    this.flying.visible = true
    this.view = 'fly'
    this.clock = 0
  }

  private frame(dt: number) {
    this.clock += dt
    this.archer?.update(dt)
    if (this.drawing) this.held += dt
    const cam = this.stage.camera

    if (this.reticle.visible) {
      const a = this.currentAim()
      this.reticle.position.set(a.x, TARGET_Y + a.y, -TARGET_DIST + 0.1)
    }

    let pos: THREE.Vector3
    let look: THREE.Vector3
    let fov = 46
    let speed = 4
    if (this.view === 'scope') {
      pos = new THREE.Vector3(0.1, 1.5, -1.2)
      look = new THREE.Vector3(0, TARGET_Y, -TARGET_DIST)
      fov = this.drawing ? 8.5 : 11
    } else if (this.view === 'wide') {
      pos = new THREE.Vector3(1.5, 1.7, 3.1)
      look = new THREE.Vector3(-0.2, 1.1, -6)
    } else if (this.view === 'fly') {
      const k = Math.min(1, this.clock / this.flight)
      this.flying.position.lerpVectors(this.from, this.to, k)
      this.flying.position.y += Math.sin(k * Math.PI) * 0.45
      pos = this.flying.position.clone().add(new THREE.Vector3(0.28, 0.2, 1.5))
      look = this.flying.position.clone().add(new THREE.Vector3(0, 0, -6))
      fov = 34
      speed = 14
      if (k >= 1) {
        this.view = 'close'
        this.clock = 0
        const a = this.flying.clone()
        this.stage.scene.add(a)
        this.stuck.push(a)
        this.flying.visible = false
        this.onHit?.()
      }
    } else {
      pos = new THREE.Vector3(0.5, TARGET_Y + 0.1, -TARGET_DIST + 2.5)
      look = new THREE.Vector3(0, TARGET_Y, -TARGET_DIST)
      fov = 34
    }
    const k = 1 - Math.exp(-dt * speed)
    this.camPos.lerp(pos, k)
    this.camLook.lerp(look, k)
    this.fov += (fov - this.fov) * k
    cam.fov = this.fov
    cam.updateProjectionMatrix()
    cam.position.copy(this.camPos)
    cam.lookAt(this.camLook)
  }
}
