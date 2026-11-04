import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import peopleUrl from '@/assets/petak/models/warga.glb?url'
import type { Tier } from '@/games/kart/render/quality'
import { HALF, ITEM_SPOTS, LAMPS } from '../map'
import type { Item } from '../types'
import { buildWorld } from './build'
import { animateSmoke, ghostModel, itemModel, poseGhost, teplok, type GhostRig } from './models'
import { beamMaterial, groundFogMaterial, HORROR_SHADER, ringMaterial, uFear, uTime } from './shaders'
import { flashlightCookie, SKY_URL, Textures } from './textures'

export const EYE = 1.62
const FOG = 0x06080d

export type Eye = { x: number; y: number; z: number; yaw: number; pitch: number }
export type PartnerView = { x: number; y: number; z: number; yaw: number; pitch: number; moving: boolean; running: boolean; light: boolean; down: boolean }
export type Ring = { x: number; y: number; z: number; radius: number; amp: number; mine: boolean }
export type FrameView = {
  eye: Eye
  light: boolean
  moving: boolean
  running: boolean
  fear: number
  hit: number
  down: boolean
  partner: PartnerView | null
  ghost: { x: number; z: number; yaw: number; mode: string; speed: number }
  rings: Ring[]
}

type Lamp = { obj: THREE.Object3D; x: number; y: number; z: number; warm: number; seed: number }
type Partner = { root: THREE.Object3D; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction; spot: THREE.SpotLight; beam: THREE.Mesh }

export class World {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(68, 1, 0.05, 140)
  private composer: EffectComposer | null = null
  private horror: ShaderPass | null = null
  private tier: Tier
  private tx: Textures
  private ratio: number
  private w = 1
  private h = 1
  private torch: THREE.SpotLight
  private torchAim = new THREE.Vector3()
  private torchOn = 1
  private pool: THREE.PointLight[] = []
  private lamps: Lamp[] = []
  private poolIn = 0
  private items: THREE.Object3D[] = []
  private gate: THREE.Object3D | null = null
  private gateOpen = 0
  private gateWant = 0
  private ghost: GhostRig
  private partner: Partner | null = null
  private rings: THREE.Mesh[] = []
  private bob = 0
  private t = 0

  constructor(canvas: HTMLCanvasElement, tier: Tier) {
    this.tier = tier
    this.ratio = Math.min(tier.ratio, window.devicePixelRatio || 1)
    // tanpa composer: MSAA bawaan kanvas; dengan composer: MSAA di render target + SMAA/FXAA
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.post, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.ratio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    if (tier.shadow) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    this.tx = new Textures(tier, this.renderer.capabilities.getMaxAnisotropy())
    this.scene.fog = new THREE.FogExp2(FOG, 0.042 / tier.far)

    // senter: lampu sorot dengan pola reflektor, berbayang di tingkat Sedang ke atas
    this.torch = new THREE.SpotLight(0xfff0d8, 120, 36 * tier.far, 0.5, 0.5, 1.5)
    this.torch.map = flashlightCookie()
    if (tier.shadow) {
      this.torch.castShadow = true
      this.torch.shadow.mapSize.setScalar(Math.min(1024, tier.shadow))
      this.torch.shadow.bias = -0.0004
      this.torch.shadow.normalBias = 0.02
      this.torch.shadow.camera.near = 0.2
      this.torch.shadow.camera.far = 30
    }
    this.scene.add(this.torch, this.torch.target)

    const moon = new THREE.DirectionalLight(0x8090c0, 0.5)
    moon.position.set(-30, 50, -20)
    this.scene.add(moon, new THREE.HemisphereLight(0x22304e, 0x0c0907, 0.7))

    const n = tier.q === 'high' ? 4 : tier.q === 'med' ? 3 : 2
    for (let i = 0; i < n; i++) {
      const p = new THREE.PointLight(0xff9a48, 0, 9, 1.6)
      this.pool.push(p)
      this.scene.add(p)
    }

    this.ghost = ghostModel()
    this.scene.add(this.ghost.root)

    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ringMaterial(i === 0 ? 0x9ad8ff : 0xffb070))
      r.visible = false
      r.renderOrder = 2
      this.rings.push(r)
      this.scene.add(r)
    }
    if (tier.post) this.buildComposer()
  }

  private buildComposer() {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: this.tier.samples })
    const c = new EffectComposer(this.renderer, rt)
    c.setPixelRatio(this.ratio)
    c.addPass(new RenderPass(this.scene, this.camera))
    c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.85))
    c.addPass(new OutputPass())
    this.horror = new ShaderPass(HORROR_SHADER)
    c.addPass(this.horror)
    c.addPass(this.tier.q === 'high' ? new SMAAPass() : new FXAAPass())
    this.composer = c
  }

  async load(items: Item[]) {
    const [sky] = await Promise.all([new HDRLoader().loadAsync(SKY_URL), this.tx.load()])
    sky.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromEquirectangular(sky).texture
    pmrem.dispose()
    this.scene.background = sky
    this.scene.backgroundIntensity = 0.16
    this.scene.environmentIntensity = 0.1

    const built = await buildWorld(this.tx, this.tier)
    this.scene.add(built.group)
    this.gate = built.gate

    // kabut tanah dua lapis
    for (const [y, layer] of [[0.35, 0], [0.9, 1]]) {
      const m = groundFogMaterial(0x5a6476, 2 * HALF + 16)
      m.uniforms.uLayer.value = layer
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF + 16, 2 * HALF + 16).rotateX(-Math.PI / 2), m)
      f.position.y = y
      f.renderOrder = 1
      this.scene.add(f)
    }

    // lampu teplok di meja & tiang
    LAMPS.forEach((l, i) => {
      const o = teplok(true)
      o.position.set(l.x, l.y - 0.2, l.z)
      this.scene.add(o)
      this.lamps.push({ obj: o, x: l.x, y: l.y, z: l.z, warm: l.warm, seed: i * 3.7 })
    })

    this.placeItems(items)
    await this.loadPartner()
  }

  /** pasang model pusaka di titiknya (dipanggil lagi saat main ulang, karena pusaka diacak ulang) */
  placeItems(items: Item[]) {
    for (const o of this.items) this.scene.remove(o)
    this.items = items.map((it) => {
      const o = itemModel(it.kind)
      const s = ITEM_SPOTS[it.spot]
      o.position.set(s.x, s.y, s.z)
      o.userData.y = s.y
      this.scene.add(o)
      return o
    })
    this.setItems(items)
  }

  private async loadPartner() {
    const gltf = await new GLTFLoader().loadAsync(peopleUrl)
    const root = cloneSkinned(gltf.scene)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.frustumCulled = false
      m.castShadow = true
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      if (mat.name === 'shirt') mat.color.set(0x5a2a3a)
      m.material = mat
    })
    const box = new THREE.Box3().setFromObject(root)
    root.scale.setScalar(1.68 / Math.max(0.1, box.max.y - box.min.y))
    const holder = new THREE.Group()
    holder.add(root)
    holder.visible = false
    this.scene.add(holder)
    const mixer = new THREE.AnimationMixer(root)
    const walk = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'jalan')!)
    walk.play()
    const spot = new THREE.SpotLight(0xfff0d8, 90, 30 * this.tier.far, 0.45, 0.6, 1.5)
    spot.map = this.torch.map
    this.scene.add(spot, spot.target)
    const L = 12
    const beam = new THREE.Mesh(new THREE.ConeGeometry(L * Math.tan(0.45), L, 20, 1, true).translate(0, -L / 2, 0).rotateX(-Math.PI / 2), beamMaterial())
    beam.renderOrder = 3
    this.scene.add(beam)
    this.partner = { root: holder, mixer, walk, spot, beam }
  }

  /** pusaka yang sudah diambil disembunyikan */
  setItems(items: Item[]) {
    items.forEach((it, i) => {
      if (this.items[i]) this.items[i].visible = it.by === null
    })
  }

  setGate(open: boolean) {
    this.gateWant = open ? 1 : 0
  }

  update(dt: number, v: FrameView) {
    this.t += dt
    const t = this.t
    uTime.value = t
    uFear.value += (v.fear - uFear.value) * Math.min(1, dt * 3)
    if (this.horror) {
      this.horror.uniforms.uHit.value = v.hit
      this.horror.uniforms.uDown.value += ((v.down ? 1 : 0) - this.horror.uniforms.uDown.value) * Math.min(1, dt * 2)
      this.horror.uniforms.uRes.value.set(this.w, this.h)
    }

    // kamera mata pemain; badan bergoyang saat berjalan
    const cam = this.camera
    this.bob += dt * (v.moving ? (v.running ? 11 : 7.5) : 0)
    const bobY = v.moving ? Math.sin(this.bob) * (v.running ? 0.05 : 0.028) : 0
    const bobX = v.moving ? Math.cos(this.bob * 0.5) * (v.running ? 0.035 : 0.018) : 0
    const eyeY = v.down ? 0.35 : v.eye.y + EYE + bobY
    cam.position.set(v.eye.x + Math.cos(v.eye.yaw) * bobX, eyeY, v.eye.z - Math.sin(v.eye.yaw) * bobX)
    cam.rotation.order = 'YXZ'
    cam.rotation.set(v.down ? 0.2 : v.eye.pitch, v.eye.yaw + Math.PI, v.down ? 1.1 : 0)

    // senter sedikit tertinggal dari pandangan, berkedip saat Penunggu dekat
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(cam.rotation)
    const right = new THREE.Vector3(1, 0, 0).applyEuler(cam.rotation)
    const want = cam.position.clone().addScaledVector(dir, 10).add(new THREE.Vector3(0, -1.1, 0))
    this.torchAim.lerp(want, this.torchAim.lengthSq() ? Math.min(1, dt * 9) : 1)
    this.torch.position.copy(cam.position).addScaledVector(right, 0.22).add(new THREE.Vector3(0, -0.28, 0))
    this.torch.target.position.copy(this.torchAim)
    const flick = uFear.value > 0.35 && Math.sin(t * 31) * Math.sin(t * 7.3) > 1.15 - uFear.value * 0.6 ? 0.15 : 1
    this.torchOn += ((v.light && !v.down ? 1 : 0) - this.torchOn) * Math.min(1, dt * 14)
    this.torch.intensity = 120 * this.torchOn * flick

    // lampu teplok terdekat mendapat lampu sungguhan
    this.poolIn -= dt
    if (this.poolIn <= 0) {
      this.poolIn = 0.4
      const near = [...this.lamps].sort((a, b) => Math.hypot(a.x - cam.position.x, a.z - cam.position.z) - Math.hypot(b.x - cam.position.x, b.z - cam.position.z))
      this.pool.forEach((p, i) => {
        const l = near[i]
        p.position.set(l.x, l.y + 0.05, l.z)
        p.userData.lamp = l
      })
    }
    for (const p of this.pool) {
      const l = p.userData.lamp as Lamp | undefined
      if (!l) continue
      const f = 0.82 + 0.12 * Math.sin(t * 9 + l.seed) + 0.06 * Math.sin(t * 23.7 + l.seed * 2)
      p.intensity = 5.5 * l.warm * f * (1 - uFear.value * 0.5)
    }
    for (const l of this.lamps) {
      const fl = l.obj.getObjectByName('api')
      if (fl) fl.scale.set(0.05, 0.1 * (0.9 + 0.15 * Math.sin(t * 17 + l.seed)), 1)
    }

    // pusaka melayang pelan
    for (const o of this.items) {
      if (!o.visible) continue
      o.rotation.y += dt * 0.4
      o.position.y = (o.userData.y as number) + 0.03 + Math.sin(t * 1.6 + o.position.x) * 0.02
      animateSmoke(o, t)
    }

    // gerbang
    if (this.gate) {
      this.gateOpen += (this.gateWant - this.gateOpen) * Math.min(1, dt * 0.8)
      const l = this.gate.getObjectByName('kiri')
      const r = this.gate.getObjectByName('kanan')
      if (l) l.rotation.y = -this.gateOpen * 1.6
      if (r) r.rotation.y = this.gateOpen * 1.6
      const lock = this.gate.getObjectByName('gembok')
      if (lock) lock.visible = this.gateOpen < 0.05
    }

    // Penunggu
    const g = v.ghost
    this.ghost.root.position.set(g.x, 0, g.z)
    this.ghost.root.rotation.y = g.yaw
    poseGhost(this.ghost, t, g.mode, g.speed, dt)

    // pasangan
    const p = this.partner
    if (p) {
      const pv = v.partner
      p.root.visible = !!pv
      p.spot.visible = p.beam.visible = !!pv && pv.light && !pv.down
      if (pv) {
        p.root.position.set(pv.x, pv.y, pv.z)
        p.root.rotation.set(pv.down ? -Math.PI / 2 : 0, pv.yaw, 0, 'YXZ')
        if (pv.down) p.root.position.y += 0.15
        p.walk.paused = !pv.moving || pv.down
        p.walk.timeScale = pv.running ? 1.7 : 1
        p.mixer.update(dt)
        const head = new THREE.Vector3(pv.x, pv.y + 1.4, pv.z)
        const aim = new THREE.Vector3(Math.sin(pv.yaw) * Math.cos(pv.pitch), Math.sin(pv.pitch), Math.cos(pv.yaw) * Math.cos(pv.pitch))
        p.spot.position.copy(head)
        p.spot.target.position.copy(head).addScaledVector(aim, 10)
        p.beam.position.copy(head)
        p.beam.lookAt(p.spot.target.position)
      }
    }

    // cincin gelombang suara
    this.rings.forEach((m, i) => {
      const r = v.rings[i]
      m.visible = !!r && r.amp > 0.01
      if (!r) return
      m.position.set(r.x, r.y + 0.04, r.z)
      m.scale.setScalar(Math.max(0.5, r.radius * 2))
      ;(m.material as THREE.ShaderMaterial).uniforms.uAmp.value = r.amp
    })
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** HP kewalahan: turunkan pixel ratio dulu, lalu matikan efek layar */
  lowerQuality() {
    if (this.ratio > 1) {
      this.ratio = Math.max(1, this.ratio - 0.25)
      this.renderer.setPixelRatio(this.ratio)
      this.composer?.setPixelRatio(this.ratio)
      this.resize(this.w, this.h)
      return true
    }
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
      this.horror = null
      return true
    }
    return false
  }

  get hasPost() {
    return !!this.composer
  }

  render() {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    })
    this.composer?.dispose()
    this.renderer.dispose()
  }
}
