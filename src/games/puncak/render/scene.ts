import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Particles } from '@/games/kart/render/particles'
import type { Tier } from '@/games/kart/render/quality'
import { makeClock } from '@/games/sport/render/shaders'
import { batAt, crabAt, rockAt, ventOn } from '../sim/hazards'
import type { Mount } from '../sim/mount'
import { deckY, heightAt, type Terrain } from '../sim/terrain'
import { clouds, heightTexture, lava, water, waterfall } from './fluids'
import { bat, boulder, bridge, campfire, chest, crab, dropMesh, forest, hive, meadow, propMaterials, ropeMesh, summitFlag, vent, type PropMats } from './props'
import { bakeAO, buildTerrainMesh, terrainMaterial } from './terrain'
import { loadTerrainTex } from './textures'

const SKIES = import.meta.glob('/src/assets/sport/tex/langit-*.hdr', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** gradasi warna + vignette tipis, setelah tone mapping */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uGrade: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1.08 }, uVig: { value: 0.22 }, uStorm: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 uGrade; uniform float uSat; uniform float uVig; uniform float uStorm; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 g = c.rgb * uGrade;
      float l = dot(g, vec3(0.299, 0.587, 0.114));
      g = mix(vec3(l), g, uSat);
      g = mix(g, vec3(0.86, 0.9, 0.96), uStorm * 0.45);
      vec2 d = vUv - 0.5;
      g *= 1.0 - dot(d, d) * uVig * 2.0;
      gl_FragColor = vec4(g, c.a);
    }`,
}

export type ActorView = { root: THREE.Group }
type CampView = { g: THREE.Group; ember: THREE.Mesh; lit: boolean }

/** dunia 3D satu gunung */
export class MountainScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(56, 2, 0.2, 900)
  actors = new THREE.Group()
  particles: Particles
  clock = makeClock()
  shadows: boolean
  private tier: Tier
  private composer: EffectComposer | null = null
  private grade: ShaderPass | null = null
  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private t!: Terrain
  private mats!: PropMats
  private terrainMat: THREE.MeshStandardMaterial | null = null
  private chests = new Map<number, THREE.Object3D>()
  private drops = new Map<number, THREE.Object3D>()
  private ropes = new Map<number, THREE.Object3D>()
  private decks = new Map<number, THREE.Object3D>()
  private camps: CampView[] = []
  private fireLight: THREE.PointLight
  private torch: THREE.PointLight
  private crabs: THREE.Object3D[] = []
  private bats: THREE.Object3D[] = []
  private boulders: THREE.Object3D[] = []
  private vents: THREE.Object3D[] = []
  private grass: THREE.InstancedMesh[] = []
  private fx = { weather: 0, embers: 0, steam: 0 }
  private target = new THREE.Vector3()
  private disposables: { dispose: () => void }[] = []

  constructor(canvas: HTMLCanvasElement, tier: Tier) {
    this.tier = tier
    // tanpa composer: MSAA bawaan kanvas; dengan composer: MSAA di target + SMAA (tidak pernah tanpa AA)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, tier.ratio))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.shadows = tier.shadow > 0
    this.renderer.shadowMap.enabled = this.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.6)
    if (this.shadows) {
      this.sun.castShadow = true
      this.sun.shadow.mapSize.setScalar(tier.shadow)
      const c = this.sun.shadow.camera
      c.left = -38
      c.right = 38
      c.top = 38
      c.bottom = -38
      c.near = 1
      c.far = 220
      this.sun.shadow.bias = -0.0004
      this.sun.shadow.normalBias = 0.04
    }
    this.hemi = new THREE.HemisphereLight('#cfe6ff', '#4a3a2a', 0.35)
    this.fireLight = new THREE.PointLight('#ff9a3c', 0, 16, 1.6)
    this.torch = new THREE.PointLight('#ffb35a', 0, 18, 1.4)
    this.particles = new Particles(tier.particles * 2)
    this.scene.add(this.sun, this.sun.target, this.hemi, this.actors, this.particles.group, this.fireLight, this.torch)
    if (tier.post) {
      this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier.samples }))
      this.composer.setPixelRatio(Math.min(devicePixelRatio, tier.ratio))
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.45, 1.0))
      this.composer.addPass(new OutputPass())
      this.grade = new ShaderPass(GradeShader)
      this.composer.addPass(this.grade)
      this.composer.addPass(new SMAAPass())
    }
  }

  async load(t: Terrain) {
    this.t = t
    const m = t.m
    const high = this.tier.q === 'high'
    const [hdr, tex, mats] = await Promise.all([
      new HDRLoader().loadAsync(SKIES[`/src/assets/sport/tex/langit-${m.sky}.hdr`]),
      loadTerrainTex(this.tier.q === 'low' ? 256 : 512, this.tier.pbr),
      propMaterials(this.clock, this.tier.pbr, m.zones.some((z) => z.snow > 0.5)),
    ])
    this.mats = mats
    hdr.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromEquirectangular(hdr).texture
    pmrem.dispose()
    this.scene.background = hdr
    this.scene.backgroundBlurriness = 0.04
    const night = m.sky === 'malam'
    this.scene.environmentIntensity = night ? 0.5 : 0.75
    this.scene.backgroundIntensity = night ? 0.7 : 1
    this.scene.fog = new THREE.FogExp2(m.fog, m.fogDensity / this.tier.far)
    this.sun.color.set(night ? '#9fb4ff' : m.sky === 'senja' ? '#ffc48a' : '#fff1dc')
    this.sun.intensity = night ? 0.7 : m.sky === 'senja' ? 2.2 : 2.7
    this.hemi.color.set(night ? '#5a4f9a' : '#cfe6ff')
    this.hemi.intensity = night ? 0.45 : 0.35
    if (this.grade) this.grade.uniforms.uGrade.value.set(...m.grade)

    // medan
    const ao = bakeAO(t, this.tier.q === 'low' ? 4 : 2)
    this.terrainMat = terrainMaterial(t, tex, high)
    const tm = buildTerrainMesh(t, ao, this.terrainMat, this.shadows, this.tier.far)
    this.scene.add(tm.group)

    // laut / lava / awan
    const big = t.size * 3
    const hTex = heightTexture(t)
    const ground = { tex: hTex, half: t.half, size: t.size }
    if (m.sea?.kind === 'air') this.scene.add(await water(t, m.sea.y, hTex, this.clock, big))
    if (m.sea?.kind === 'lava') this.scene.add(await lava(m.sea.y, big, this.clock))
    if (m.sea?.kind === 'awan') {
      this.scene.add(await clouds(m.sea.y, big * 1.5, '#ffe2ef', this.clock, 1, 0.006, ground))
      this.scene.add(await clouds(m.sea.y - 8, big * 1.5, '#f0c6dc', this.clock, 1, 0.004))
    }
    if (t.lavaY !== null) this.scene.add(await lava(t.lavaY, t.craterR + 2, this.clock, 0, 0, true))
    // kabut lembah: lapisan awan tipis di beberapa ketinggian
    if (m.id === 'teh' || m.id === 'rimba' || m.id === 'salju') {
      for (let k = 1; k < t.zones; k++) this.scene.add(await clouds(t.base[k] - 6, t.size * 1.6, m.fog, this.clock, m.id === 'teh' ? 0.5 : 0.25, 0.01, ground))
    }
    // air terjun dari bibir tebing ke cincin di bawahnya
    if (m.id === 'karang' || m.id === 'rimba') {
      for (let k = 1; k < Math.min(3, t.zones); k++) {
        const th = t.theta[k] + Math.PI * 1.1
        const r = t.radii[k] + 1.2
        const x = Math.cos(th) * r
        const z = Math.sin(th) * r
        this.scene.add(await waterfall(t, x - Math.cos(th) * 2.4, z - Math.sin(th) * 2.4, Math.cos(th), Math.sin(th), 3.4, this.clock))
      }
    }

    // pohon, batu, rumput
    this.scene.add(forest(t.solids, mats, this.shadows, m.zones[0].snow))
    if (this.tier.detail > 0.2) {
      this.grass = meadow(t, mats, this.tier.detail, 0)
      for (const g of this.grass) this.scene.add(g)
    }

    // peti, api unggun, bendera, sulur, jembatan
    for (const c of t.chests) {
      const o = chest(c.kind, mats.wood)
      o.position.set(c.x, c.y, c.z)
      o.rotation.y = c.yaw
      this.scene.add(o)
      this.chests.set(c.id, o)
    }
    for (const c of t.camps) {
      const g = campfire(mats.rock, mats.wood)
      g.position.set(c.x, c.y, c.z)
      this.scene.add(g)
      this.camps.push({ g, ember: g.getObjectByName('ember') as THREE.Mesh, lit: false })
    }
    const flag = summitFlag(this.clock)
    flag.position.set(t.summit.x, t.summit.y, t.summit.z)
    this.scene.add(flag)
    for (const v of t.vines) {
      const o = ropeMesh(v, mats.wood)
      this.scene.add(o)
      this.ropes.set(v.id, o)
    }
    for (const d of t.decks) {
      const o = bridge(d, mats.wood, mats.crystal)
      this.scene.add(o)
      this.decks.set(d.id, o)
    }
    // makhluk & bahaya
    for (const _ of t.crabs) {
      const o = crab()
      this.scene.add(o)
      this.crabs.push(o)
    }
    for (const _ of t.bats) {
      for (let n = 0; n < 3; n++) {
        const o = bat()
        this.scene.add(o)
        this.bats.push(o)
      }
    }
    for (const h of t.hives) {
      const o = hive()
      o.position.set(h.x, h.y, h.z)
      this.scene.add(o)
    }
    for (const _ of t.rocks) {
      const o = boulder(mats.rock)
      o.visible = false
      this.scene.add(o)
      this.boulders.push(o)
    }
    for (const v of t.vents) {
      const o = vent(mats.rock)
      o.position.set(v.x, v.y, v.z)
      this.scene.add(o)
      this.vents.push(o)
    }
    // kompilasi shader sekarang, bukan saat pertama terlihat (menghindari patah-patah)
    await this.renderer.compileAsync(this.scene, this.camera)
  }

  /** kamera orang ketiga di belakang target, tidak menembus medan */
  follow(x: number, y: number, z: number, yaw: number, pitch: number, dist: number, dt: number) {
    const k = 1 - Math.exp(-dt * 10)
    this.target.x += (x - this.target.x) * k
    this.target.y += (y + 1.3 - this.target.y) * k
    this.target.z += (z - this.target.z) * k
    if (this.target.distanceTo(new THREE.Vector3(x, y + 1.3, z)) > 8) this.target.set(x, y + 1.3, z)
    const cp = Math.cos(pitch)
    let d = dist
    // dekatkan kamera kalau medan menghalangi
    for (let s = 0.25; s <= 1; s += 0.125) {
      const px = this.target.x - Math.sin(yaw) * cp * dist * s
      const pz = this.target.z - Math.cos(yaw) * cp * dist * s
      const py = this.target.y + Math.sin(pitch) * dist * s
      if (heightAt(this.t, px, pz) + 0.6 > py) {
        d = Math.max(1.6, dist * (s - 0.12))
        break
      }
    }
    const cx = this.target.x - Math.sin(yaw) * cp * d
    const cz = this.target.z - Math.cos(yaw) * cp * d
    let cy = this.target.y + Math.sin(pitch) * d
    cy = Math.max(cy, heightAt(this.t, cx, cz) + 0.7)
    this.camera.position.set(cx, cy, cz)
    this.camera.lookAt(this.target)
    // matahari & kotak bayangan ikut pemain
    this.sun.position.set(this.target.x - 60, this.target.y + 110, this.target.z + 40)
    this.sun.target.position.copy(this.target)
    // rumput: hanya potongan dekat
    const far = 46 * this.tier.far
    for (const g of this.grass) g.visible = Math.hypot(g.userData.cx - x, g.userData.cz - z) < far
  }

  /** samakan benda dinamis dengan isi gunung & jam ronde */
  sync(mount: Mount, secs: number, broken: Set<number>, dt: number, me: { x: number; y: number; z: number; torch: boolean } | null) {
    const t = this.t
    for (const [id, o] of this.chests) {
      const open = mount.opened.includes(id)
      const lid = o.getObjectByName('lid')
      if (lid) lid.rotation.x += ((open ? -1.9 : 0) - lid.rotation.x) * Math.min(1, dt * 6)
      if (!lid && open) o.traverse((c) => c.name === 'egg' && (c.visible = false))
      o.userData.open = open
    }
    // barang di tanah
    const seen = new Set<number>()
    for (const d of mount.drops) {
      seen.add(d.id)
      let o = this.drops.get(d.id)
      if (!o) {
        o = dropMesh(d.item)
        o.position.set(d.x, d.y, d.z)
        this.scene.add(o)
        this.drops.set(d.id, o)
      }
      const s = o.getObjectByName('spin')
      if (s) {
        s.rotation.y += dt * 1.6
        s.position.y = 0.45 + Math.sin(secs * 2 + d.id) * 0.08
      }
    }
    for (const [id, o] of this.drops) {
      if (seen.has(id)) continue
      this.scene.remove(o)
      this.drops.delete(id)
    }
    // tali & tangga pasangan
    for (const r of mount.ropes) {
      if (this.ropes.has(r.id)) continue
      const o = ropeMesh(r, this.mats.wood)
      this.scene.add(o)
      this.ropes.set(r.id, o)
    }
    // api unggun
    this.fx.embers -= dt
    const emit = this.fx.embers <= 0
    if (emit) this.fx.embers = 1 / 30
    let nearest: { c: CampView; d: number } | null = null
    this.camps.forEach((c, i) => {
      const lit = i <= mount.lit
      c.lit = lit
      const mat = c.ember.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = lit ? 3 + Math.sin(secs * 9 + i) * 0.6 : 0
      if (!lit) return
      const p = c.g.position
      const d = me ? Math.hypot(p.x - me.x, p.z - me.z) : 0
      if (!nearest || d < nearest.d) nearest = { c, d }
      if (emit && d < 70) {
        this.particles.emit('fire', p.x + (Math.random() - 0.5) * 0.5, p.y + 0.3, p.z + (Math.random() - 0.5) * 0.5, 0, 1.6, 0, Math.random() < 0.5 ? '#ffb347' : '#ff6a1c', 0.9)
        if (Math.random() < 0.25) this.particles.emit('smoke', p.x, p.y + 1.2, p.z, 0, 0.8, 0, '#9a8f88', 0.7)
        if (Math.random() < 0.2) this.particles.emit('spark', p.x, p.y + 0.5, p.z, (Math.random() - 0.5) * 1.5, 3.5, (Math.random() - 0.5) * 1.5, '#ffd27a', 0.5)
      }
    })
    const n = nearest as { c: CampView; d: number } | null
    if (n && n.d < 40) {
      this.fireLight.position.copy(n.c.g.position).add(new THREE.Vector3(0, 1, 0))
      this.fireLight.intensity = 18 + Math.sin(secs * 13) * 3
    } else this.fireLight.intensity = 0
    if (me) {
      this.torch.position.set(me.x, me.y + 2, me.z)
      this.torch.intensity += ((me.torch ? 22 : 0) - this.torch.intensity) * Math.min(1, dt * 5)
    }
    // jembatan kristal
    for (const d of t.decks) {
      const o = this.decks.get(d.id)
      if (o) o.visible = !broken.has(d.id)
    }
    // makhluk
    t.crabs.forEach((c, i) => {
      const p = crabAt(c, secs)
      const o = this.crabs[i]
      o.position.set(p.x, heightAt(t, p.x, p.z), p.z)
      o.rotation.y = p.yaw
    })
    t.bats.forEach((s, i) => {
      for (let k = 0; k < 3; k++) {
        const p = batAt(t, s, secs, k)
        const o = this.bats[i * 3 + k]
        o.position.set(p.x, p.y, p.z)
        o.rotation.y = p.yaw
        const flap = Math.sin(secs * 18 + k) * 0.7
        const wl = o.getObjectByName('wingL')
        const wr = o.getObjectByName('wingR')
        if (wl) wl.rotation.z = flap
        if (wr) wr.rotation.z = -flap
      }
    })
    t.rocks.forEach((_, i) => {
      const r = rockAt(t, i, secs)
      const o = this.boulders[i]
      o.visible = !!r && !r.warn
      if (r && !r.warn) {
        o.position.set(r.x, r.y, r.z)
        o.rotation.x += dt * 8 * r.dz
        o.rotation.z -= dt * 8 * r.dx
        if (emit && Math.random() < 0.4) this.particles.emit('dust', r.x, r.y - 0.6, r.z, 0, 0.5, 0, '#a08a70', 1.2)
      } else if (r?.warn && emit && Math.random() < 0.3) this.particles.emit('dust', r.x, r.y + 0.4, r.z, r.dx, -1, r.dz, '#8a7a68', 0.6)
    })
    // uap kawah
    t.vents.forEach((v) => {
      if (!emit || !ventOn(v, secs) || (me && Math.hypot(v.x - me.x, v.z - me.z) > 80)) return
      this.particles.emit('smoke', v.x + (Math.random() - 0.5), v.y + 0.3, v.z + (Math.random() - 0.5), 0, 7 + Math.random() * 3, 0, '#f0ece4', 1.6)
    })
    // angin naik
    for (const u of t.updrafts) {
      if (emit && Math.random() < 0.3 && (!me || Math.hypot(u.x - me.x, u.z - me.z) < 70)) this.particles.emit('star', u.x + (Math.random() - 0.5) * u.r * 2, u.y, u.z + (Math.random() - 0.5) * u.r * 2, 0, 9, 0, '#ffffff', 0.4)
    }
    for (const d of t.decks) {
      if (!d.fragile || broken.has(d.id)) continue
      const o = this.decks.get(d.id)
      if (o) o.position.y = (d.y0 + d.y1) / 2 + Math.sin(secs * 2 + d.id) * 0.005
      void deckY
    }
  }

  /** cuaca di sekitar kamera: salju/badai, debu angin, abu kawah, kunang-kunang kristal */
  weather(storm: number, wind: [number, number], dt: number) {
    this.fx.weather -= dt
    if (this.fx.weather > 0) return
    this.fx.weather = 1 / 30
    const c = this.camera.position
    const id = this.t.m.id
    const rnd = (s: number) => (Math.random() - 0.5) * s
    const count = id === 'salju' ? 3 + Math.round(storm * 14) : storm > 0 ? Math.round(storm * 8) : 0
    for (let i = 0; i < count; i++) this.particles.emit('snow', c.x + rnd(30), c.y + 6 + Math.random() * 6, c.z + rnd(30), wind[0] * 0.8, -2.5, wind[1] * 0.8, '#ffffff', 0.35)
    if (id === 'ngarai' && Math.random() < 0.25) this.particles.emit('dust', c.x + rnd(30), c.y - 2 + Math.random() * 2, c.z + rnd(30), wind[0], 0.1, wind[1], '#e0b080', 0.45)
    if (id === 'kawah' && Math.random() < 0.7) this.particles.emit('spark', c.x + rnd(26), c.y + Math.random() * 6, c.z + rnd(26), 0, 0.6, 0, '#ff8a3c', 0.25)
    if (id === 'kristal' && Math.random() < 0.6) this.particles.emit('star', c.x + rnd(26), c.y - 2 + Math.random() * 5, c.z + rnd(26), rnd(0.5), 0.3, rnd(0.5), Math.random() < 0.5 ? '#b48cff' : '#7ae8ff', 0.3)
    if ((id === 'rimba' || id === 'teh') && Math.random() < 0.15) this.particles.emit('confetti', c.x + rnd(20), c.y + 6, c.z + rnd(20), wind[0] * 0.3, -0.5, wind[1] * 0.3, '#6aa83a', 0.5)
    if (this.grade) this.grade.uniforms.uStorm.value = storm
    const fog = this.scene.fog as THREE.FogExp2 | null
    if (fog) fog.density = (this.t.m.fogDensity * (1 + storm * 3.5)) / this.tier.far
  }

  /** debu/cipratan di kaki */
  puff(kind: 'dust' | 'splash' | 'snow', x: number, y: number, z: number, n = 6) {
    const color = kind === 'splash' ? ['#d8f4ff', '#ffffff'] : kind === 'snow' ? ['#ffffff', '#e4f2ff'] : ['#b8a080', '#9a8468']
    this.particles.burst(kind, n, x, y + 0.1, z, 0, 1.2, 0, 2, color, kind === 'splash' ? 0.8 : 0.9)
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
  }

  render(dt: number) {
    this.clock.value += dt
    this.particles.update(dt)
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  /** fps rendah: buang post-processing dulu (MSAA kanvas tetap), lalu turunkan resolusi */
  lowerQuality() {
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
      this.grade = null
      return
    }
    const r = this.renderer.getPixelRatio()
    if (r > 1) this.renderer.setPixelRatio(Math.max(1, r - 0.25))
    for (const g of this.grass) g.visible = false
    this.grass = []
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    for (const d of this.disposables) d.dispose()
    this.particles.dispose()
    this.composer?.dispose()
    this.renderer.dispose()
  }
}
