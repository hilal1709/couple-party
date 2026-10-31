import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import worldUrl from '@/assets/sport/models/boxing.glb?url'
import { Chibi, loadChibi, type Clip } from '../../render/chibi'
import type { Stage } from '../../render/stage'
import type { BoxHand, BoxOutcome, Look, Stance } from '../../types'

/** jarak petinju dari tengah ring */
const GAP = 0.82
/** frame 9 dari klip jab pada 24 fps: saat tangan terentang penuh */
const JAB_REACH = 9 / 24

export type Who = 'me' | 'foe'

const STANCE_CLIP: Record<Stance, Clip> = { none: 'box', guard: 'guard', dodgeL: 'dodge_L', dodgeR: 'dodge_R' }

type Fighter = { c: Chibi; stance: Stance; busy: number }

function canvasTexture() {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#2547a8'
  g.fillRect(0, 0, S, S)
  // sudut merah & biru, serong seperti kanvas ring
  g.strokeStyle = 'rgba(255,255,255,0.12)'
  g.lineWidth = 3
  for (let i = -S; i < S * 2; i += 64) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i + S, S)
    g.stroke()
  }
  g.fillStyle = '#a01f6c'
  g.beginPath()
  g.arc(S / 2, S / 2, 230, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 16
  g.strokeStyle = '#fff4fa'
  g.stroke()
  g.fillStyle = '#fff4fa'
  g.font = '900 96px "Dela Gothic One", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('KACAU', S / 2, S / 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.flipY = false
  return t
}

function sparkTexture() {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S / 2)
  g.fillStyle = '#ffffff'
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 22 : 60
    const a = (i / 16) * Math.PI * 2
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  return new THREE.CanvasTexture(c)
}

export class BoxingScene {
  private stage: Stage
  private me!: Fighter
  private foe!: Fighter
  private sparks: { s: THREE.Sprite; t: number }[] = []
  private shake = 0
  private clock = 0
  private view: 'intro' | 'fight' | 'ko' = 'intro'
  private koAt = new THREE.Vector3()
  private camPos = new THREE.Vector3(3.2, 2.2, 3.6)
  private camLook = new THREE.Vector3(0, 0.9, 0)

  constructor(stage: Stage) {
    this.stage = stage
  }

  async load(me: Look, foe: Look) {
    const [world, gltf] = await Promise.all([new GLTFLoader().loadAsync(worldUrl), loadChibi()])
    const { scene, renderer, sun } = this.stage
    scene.background = new THREE.Color('#090612')
    scene.fog = new THREE.Fog('#090612', 14, 32)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.18
    pmrem.dispose()

    world.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const m = mesh.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.5)
      if (m.name.startsWith('crowd') && this.stage.quality === 'low') mesh.visible = false
      if (m.name === 'canvas') {
        m.map = canvasTexture()
        m.color.set('#ffffff')
        mesh.receiveShadow = true
      }
    })
    scene.add(world.scene)

    scene.add(new THREE.HemisphereLight('#ffe9f5', '#2c2350', 0.6))
    for (const [x, z] of [[-2.4, 2.4], [2.4, 2.4], [-2.4, -2.4], [2.4, -2.4]]) {
      const spot = new THREE.SpotLight('#fff2dc', 13, 11, 0.62, 0.5, 1.2)
      spot.position.set(x, 5.2, z)
      spot.target.position.set(0, 0.4, 0)
      scene.add(spot, spot.target)
    }
    sun.position.set(0.8, 7, 1.5)
    sun.target.position.set(0, 0, 0)
    sun.intensity = 0.65
    const sc = sun.shadow.camera
    sc.left = sc.bottom = -3.6
    sc.right = sc.top = 3.6
    sc.near = 1
    sc.far = 12
    sc.updateProjectionMatrix()

    // sedikit serong supaya badan sendiri tidak menutupi lawan dari kamera belakang bahu
    this.me = this.spawn(gltf, me, -0.3, GAP, Math.PI)
    this.foe = this.spawn(gltf, foe, 0.18, -GAP, 0)

    const tex = sparkTexture()
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffe14a', transparent: true, depthTest: false, blending: THREE.AdditiveBlending }))
      s.visible = false
      scene.add(s)
      this.sparks.push({ s, t: 1 })
    }
    this.stage.onFrame = (dt) => this.frame(dt)
  }

  private spawn(gltf: Awaited<ReturnType<typeof loadChibi>>, look: Look, x: number, z: number, turn: number): Fighter {
    const c = new Chibi(gltf, look)
    c.setGear('gloves')
    c.root.position.set(x, 0, z)
    c.root.rotation.y = turn
    c.play('box')
    this.stage.scene.add(c.root)
    return { c, stance: 'none', busy: 0 }
  }

  setLooks(me: Look, foe: Look) {
    this.me.c.setLook(me)
    this.foe.c.setLook(foe)
  }

  private f(who: Who) {
    return who === 'me' ? this.me : this.foe
  }

  /** Ronde baru: kamera memutar dari samping ring. */
  intro() {
    this.view = 'intro'
    this.clock = 0
    this.camPos.set(2.6, 2.5, 2.6)
    for (const f of [this.me, this.foe]) {
      f.stance = 'none'
      f.busy = 0
      f.c.play('box', { fade: 0.2 })
    }
  }

  fight() {
    this.view = 'fight'
  }

  stance(who: Who, st: Stance) {
    const f = this.f(who)
    if (f.stance === st) return
    f.stance = st
    if (f.busy <= 0) f.c.play(STANCE_CLIP[st], { once: st.startsWith('dodge'), fade: 0.08, speed: st.startsWith('dodge') ? 1.5 : 1 })
  }

  /** Pukulan yang tangannya terentang penuh tepat `ms` dari sekarang. */
  punch(who: Who, hand: BoxHand, ms: number) {
    const f = this.f(who)
    const clip: Clip = `jab_${hand}`
    const speed = (JAB_REACH * 1000) / ms
    f.c.play(clip, { once: true, fade: 0.06, speed })
    f.busy = f.c.duration(clip) / speed
  }

  /** Sasaran bereaksi; `who` adalah yang dipukul. */
  react(who: Who, hand: BoxHand, outcome: BoxOutcome, counter: boolean) {
    const f = this.f(who)
    if (outcome === 'hit') {
      f.c.play('hit', { once: true, fade: 0.04 })
      f.busy = f.c.duration('hit')
      this.spark(f, counter ? '#ff37a6' : '#ffe14a', counter ? 1.5 : 1)
      this.shake = who === 'me' ? 0.14 : 0.05
    } else if (outcome === 'block') {
      if (f.stance !== 'guard') {
        f.c.play('guard', { once: true, fade: 0.05 })
        f.busy = 0.4
      }
      this.spark(f, '#42c6ff', 0.6)
    } else if (who === 'foe' && !f.stance.startsWith('dodge')) {
      // lawan bot tidak mengirim sikap; hindarannya digambar dari hasil
      f.c.play(`dodge_${hand}`, { once: true, fade: 0.05, speed: 1.5 })
      f.busy = 0.4
    }
  }

  private spark(f: Fighter, color: string, size: number) {
    const free = this.sparks.find((x) => x.t >= 1)
    if (!free) return
    const head = f.c.bone('head')
    if (!head) return
    head.updateWorldMatrix(true, false)
    free.s.position.setFromMatrixPosition(head.matrixWorld)
    free.s.position.y += 0.2
    free.s.material.color.set(color)
    free.s.visible = true
    free.s.scale.setScalar(0.1)
    free.s.userData.size = size
    free.t = 0
  }

  ko(who: Who) {
    const f = this.f(who)
    f.c.play('ko', { once: true, fade: 0.05 })
    f.busy = 1e6
    this.koAt.copy(f.c.root.position)
    this.view = 'ko'
    this.clock = 0
    const other = who === 'me' ? this.foe : this.me
    other.busy = 1e6
    other.c.play('cheer', { fade: 0.3 })
  }

  /** Akhir ronde tanpa KO: dua-duanya berhenti. */
  bell(winner: Who | null) {
    for (const who of ['me', 'foe'] as const) {
      const f = this.f(who)
      f.busy = 1e6
      f.c.play(winner === who ? 'cheer' : winner ? 'sad' : 'idle', { fade: 0.3 })
    }
  }

  private frame(dt: number) {
    this.clock += dt
    for (const f of [this.me, this.foe]) {
      f.c.update(dt)
      if (f.busy > 0 && f.busy < 1e5) {
        f.busy -= dt
        if (f.busy <= 0) f.c.play(STANCE_CLIP[f.stance], { fade: 0.14 })
      }
    }
    for (const x of this.sparks) {
      if (x.t >= 1) continue
      x.t = Math.min(1, x.t + dt * 5)
      x.s.scale.setScalar((0.3 + x.t * 0.7) * (x.s.userData.size as number))
      x.s.material.opacity = 1 - x.t
      if (x.t >= 1) x.s.visible = false
    }

    const k = 1 - Math.exp(-dt * 3.5)
    if (this.view === 'intro') {
      const a = 0.75 - this.clock * 0.28
      this.camPos.lerp(new THREE.Vector3(Math.sin(a) * 3.6, 2.4, Math.cos(a) * 3.6), k)
      this.camLook.lerp(new THREE.Vector3(0, 0.95, 0), k)
    } else if (this.view === 'ko') {
      this.camPos.lerp(new THREE.Vector3(this.koAt.x + 2.4, 0.9, this.koAt.z + 0.8), k)
      this.camLook.lerp(new THREE.Vector3(this.koAt.x, 0.4, this.koAt.z), k)
    } else {
      // dari belakang bahu sendiri; kamera ikut sedikit saat menghindar
      const lean = this.me.stance === 'dodgeL' ? -0.34 : this.me.stance === 'dodgeR' ? 0.34 : 0
      this.camPos.lerp(new THREE.Vector3(0.5 + lean, 2.05, 3.5), 1 - Math.exp(-dt * 8))
      this.camLook.lerp(new THREE.Vector3(0.1 + lean * 0.3, 0.72, -GAP), 1 - Math.exp(-dt * 8))
    }

    this.shake = Math.max(0, this.shake - dt * 0.5)
    const cam = this.stage.camera
    cam.position.copy(this.camPos)
    if (this.shake > 0) {
      cam.position.x += Math.sin(this.clock * 61) * this.shake
      cam.position.y += Math.cos(this.clock * 53) * this.shake
    }
    cam.lookAt(this.camLook)
  }
}
