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
import { batAt, crabAt, rockAt, ventOn, type WeatherNow } from '../sim/hazards'
import type { Mount } from '../sim/mount'
import { deckY, heightAt, type Terrain } from '../sim/terrain'
import { clouds, heightTexture, lava, water, waterfall } from './fluids'
import { bat, batchStatic, boulder, bridge, campfire, chest, crab, dropMesh, forest, hive, meadow, propMaterials, ropeMesh, summitFlag, vent, type PropMats } from './props'
import { bakeAO, buildTerrainMesh, terrainMaterial, type TerrainMesh } from './terrain'
import { campDecor, decor, loadProps, modelForest, PROP_NAMES, slimTextures } from './models'
import { Life } from './life'
import { backdrop } from './backdrop'
import { mergeTiles } from './tiles'
import { loadTerrainTex } from './textures'
import type { Step } from './perf'
import { ANISO } from './quality'

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
  camera = new THREE.PerspectiveCamera(56, 2, 0.08, 900)
  actors = new THREE.Group()
  particles: Particles
  clock = makeClock()
  shadows: boolean
  private tier: Tier
  /** tingkat grafis (untuk garis tinta karakter dsb.) */
  get quality() {
    return this.tier.q
  }
  private composer: EffectComposer | null = null
  private grade: ShaderPass | null = null
  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private t!: Terrain
  private mats!: PropMats
  private terrainMat: THREE.MeshStandardMaterial | null = null
  private terrain: TerrainMesh | null = null
  private chests = new Map<number, THREE.Object3D>()
  /** benda kecil yang tidak perlu digambar dari jauh (peti, sarang, lubang uap): disembunyikan di luar ±70 m */
  private small: THREE.Object3D[] = []
  /** bagi ulang LOD pohon menurut posisi kamera */
  private forestLod: ((x: number, z: number) => void) | null = null
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
  private grassTiles: ReturnType<typeof mergeTiles> | null = null
  private fx = { weather: 0, embers: 0, steam: 0 }
  private life: Life | null = null
  /** cahaya dasar (cuaca menggelapkan dari sini) */
  private base = { sun: 2.7, hemi: 0.35, env: 0.75, bg: 1, fog: new THREE.Color(), wet: 0 }
  /** nilai dasar asli gunung (sebelum suasana zona) */
  private orig = { sun: 2.7, hemi: 0.35 }
  /** suasana zona sekarang (Punggung Hijau), dihaluskan */
  private moodK = -1
  private fogTo = new THREE.Color()
  private tintC = new THREE.Color()
  private flash = 0
  /** matahari bergeser pelan sepanjang ronde (radian) */
  private sunAz = -2.55
  /** dibaca ronde untuk memutar suara guntur */
  thunder = false
  private target = new THREE.Vector3()
  private disposables: { dispose: () => void }[] = []

  constructor(canvas: HTMLCanvasElement, tier: Tier) {
    this.tier = tier
    // tanpa composer: MSAA bawaan kanvas; dengan composer: MSAA di target + SMAA (tidak pernah tanpa AA)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    // statistik dihitung untuk seluruh frame (composer menggambar beberapa pass), di-reset manual di render()
    this.renderer.info.autoReset = false
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
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      // bloom hanya profil Tinggi; Sedang tetap memakai gradasi warna & SMAA
      if (tier.q === 'high') this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.45, 1.0))
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
    const [hdr, tex, mats, models] = await Promise.all([
      new HDRLoader().loadAsync(SKIES[`/src/assets/sport/tex/langit-${m.sky}.hdr`]),
      loadTerrainTex(texSize(this.tier.q), this.tier.pbr),
      propMaterials(this.clock, this.tier.pbr, m.zones.some((z) => z.snow > 0.5)),
      loadProps(PROP_NAMES).catch(() => new Map()),
    ])
    this.mats = mats
    // anisotropik: tekstur medan dilihat sangat miring di dinding tebing
    const an = Math.min(ANISO[this.tier.q], this.renderer.capabilities.getMaxAnisotropy())
    tex.diff.anisotropy = an
    if (tex.nrm) tex.nrm.anisotropy = an
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
    this.base = { sun: this.sun.intensity, hemi: this.hemi.intensity, env: this.scene.environmentIntensity, bg: this.scene.backgroundIntensity, fog: new THREE.Color(m.fog), wet: 0 }
    this.orig = { sun: this.sun.intensity, hemi: this.hemi.intensity }
    if (this.grade) this.grade.uniforms.uGrade.value.set(...m.grade)

    // medan
    const ao = bakeAO(t, this.tier.q === 'low' ? 4 : 2)
    this.terrainMat = terrainMaterial(t, tex, high, this.clock)
    const tm = buildTerrainMesh(t, ao, this.terrainMat, this.shadows, this.tier.far)
    // detail di sekitar kemah awal dibangun sekarang; sisanya menyusul saat kamera mendekat
    tm.update(t.start.x, t.start.z, 64)
    this.terrain = tm
    this.scene.add(tm.group)

    // laut / lava / awan
    const big = Math.max(t.sx, t.sz) * 3
    const hTex = heightTexture(t)
    const ground = { tex: hTex, half: new THREE.Vector2(t.hx, t.hz), size: new THREE.Vector2(t.sx, t.sz) }
    if (m.sea?.kind === 'air') this.scene.add(await water(t, m.sea.y, hTex, this.clock, big))
    if (m.sea?.kind === 'lava') this.scene.add(await lava(m.sea.y, big, this.clock))
    if (m.sea?.kind === 'awan') {
      this.scene.add(await clouds(m.sea.y, big * 1.5, '#ffe2ef', this.clock, 1, 0.006, ground))
      this.scene.add(await clouds(m.sea.y - 8, big * 1.5, '#f0c6dc', this.clock, 1, 0.004))
    }
    if (t.kinds) {
      // Punggung Hijau: dasar lembah, hutan lembah, dan pegunungan jauh sampai 1,2 km
      this.scene.add(backdrop(t, m.fog, this.tier.detail, t.m.id.length * 97 + 11))
      this.camera.far = 1500
      this.camera.updateProjectionMatrix()
    }
    if (t.lavaY !== null) this.scene.add(await lava(t.lavaY, t.craterR + 2, this.clock, t.center.x, t.center.z, true))
    // kabut lembah: lapisan awan tipis di beberapa ketinggian
    if (m.id === 'teh' || m.id === 'rimba' || m.id === 'salju') {
      for (let k = 1; k < t.zones; k++) this.scene.add(await clouds(t.base[k] - 6, Math.max(t.sx, t.sz) * 1.6, m.fog, this.clock, m.id === 'teh' ? 0.5 : 0.25, 0.01, ground))
    }
    // air terjun di sisi tebing panjat
    for (const f of t.falls) this.scene.add(await waterfall(t, f.x, f.z, f.dx, f.dz, 3.4, this.clock))

    // pohon, batu, rumput
    // pohon & batu: model CC0; yang belum punya model (kristal, karang) tetap prosedural
    // Hemat: model pohon penuh hanya yang sangat dekat
    const fm = modelForest(t, t.solids, models, this.clock, this.shadows, this.tier.q === 'high', this.tier.q === 'low' ? 12 : 38 * this.tier.far, 230 * this.tier.far, this.tier.q === 'low' ? 1 : 9)
    this.forestLod = fm.update
    fm.update(t.start.x, t.start.z)
    this.scene.add(fm.group)
    if (fm.rest.length) this.scene.add(forest(fm.rest, mats, this.shadows, m.zones[0].snow))
    if (t.decor.length) this.scene.add(campDecor(t, models, this.shadows))
    if (this.tier.detail > 0.2) {
      // petak 24 m digabung: satu InstancedMesh per jenis hiasan, diisi petak di sekitar kamera
      this.grassTiles = mergeTiles([...meadow(t, mats, this.tier.detail, 0), ...decor(t, models, this.clock, this.tier.detail, this.shadows)])
      this.grass = this.grassTiles.meshes
      for (const g of this.grass) this.scene.add(g)
      this.grassTiles.update(t.start.x, t.start.z, 46 * this.tier.far)
    }

    // burung, kupu-kupu, kunang-kunang, hujan
    const leafy = m.zones.some((z) => z.trees.some((tr) => tr !== 'kristal' && tr !== 'kering'))
    this.life = new Life({ birds: m.id !== 'kristal', butterflies: leafy && m.id !== 'salju' && this.tier.q !== 'low', dark: night || m.id === 'kristal' || m.id === 'rimba', tier: this.tier.detail })
    this.scene.add(this.life.group)
    this.base.wet = (this.terrainMat.userData.u?.uWet?.value as number) ?? 0

    // peti, api unggun, bendera, sulur, jembatan
    for (const c of t.chests) {
      const o = chest(c.kind, mats.wood)
      o.position.set(c.x, c.y, c.z)
      o.rotation.y = c.yaw
      this.scene.add(o)
      this.chests.set(c.id, o)
      this.small.push(o)
    }
    for (const c of t.camps) {
      const g = campfire(mats.rock, mats.wood)
      g.position.set(c.x, c.y, c.z)
      // api unggun berikutnya tetap terlihat dari agak jauh (penanda tujuan)
      g.userData.cull = 150
      this.small.push(g)
      this.scene.add(g)
      this.camps.push({ g, ember: g.getObjectByName('ember') as THREE.Mesh, lit: false })
    }
    const flag = summitFlag(this.clock)
    flag.position.set(t.summit.x, t.summit.y, t.summit.z)
    this.scene.add(flag)
    for (const v of t.vines) {
      // sulur statis: bagian-bagiannya digabung per bahan
      const o = batchStatic(ropeMesh(v, mats.wood), () => false)
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
      this.small.push(o)
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
    // tekstur kembar dipakai bersama; Hemat: tanpa peta PBR & tekstur prop ≤ 256 px
    slimTextures(this.scene, this.tier.q === 'low')
    // kompilasi shader sekarang, bukan saat pertama terlihat (menghindari patah-patah)
    await this.renderer.compileAsync(this.scene, this.camera)
  }

  /**
   * Suasana per zona Punggung Hijau: warna & tebal kabut, warna & kuat matahari, langit hemisfer, dan
   * gradasi warna berbaur mengikuti posisi di antara api unggun (bukan berganti mendadak).
   */
  private mood(dt: number) {
    const t = this.t
    if (!t.kinds) return
    // posisi zona kontinu dari ketinggian target kamera: 2,4 = 40% jalan dari api unggun 2 ke 3
    const y = this.target.y
    let f = 0
    for (let k = 0; k < t.zones; k++) {
      const lo = t.base[k]
      const hi = t.base[k + 1]
      if (y >= lo) f = k + Math.min(1, Math.max(0, (y - lo) / Math.max(1, hi - lo)))
    }
    this.moodK = this.moodK < 0 ? f : this.moodK + (f - this.moodK) * Math.min(1, dt * 0.8)
    const a = Math.floor(this.moodK)
    const b = Math.min(t.zones - 1, a + 1)
    const k = this.moodK - a
    const A = MOODS[t.kinds[Math.min(a, t.zones - 1)]]
    const B = MOODS[t.kinds[b]]
    // tepi zona: separuh terakhir menuju zona berikutnya
    const e = Math.max(0, (k - 0.5) * 2)
    const mix = (x: number, z: number) => x + (z - x) * e
    this.base.fog.set(A.fog).lerp(this.tintC.set(B.fog), e)
    this.base.sun = this.orig.sun * mix(A.sun, B.sun)
    this.base.hemi = this.orig.hemi * mix(A.hemi, B.hemi)
    this.sun.color.set(A.sunC).lerp(this.tintC.set(B.sunC), e)
    this.hemi.color.set(A.sky).lerp(this.tintC.set(B.sky), e)
    this.fogMul = mix(A.fogK, B.fogK)
    if (this.grade) this.grade.uniforms.uGrade.value.set(mix(A.grade[0], B.grade[0]), mix(A.grade[1], B.grade[1]), mix(A.grade[2], B.grade[2]))
  }
  /** pengali kabut dari suasana zona */
  private fogMul = 1

  /** kamera orang ketiga di belakang target, tidak menembus medan */
  /** rasa kamera: hentakan mendarat (pegas) dan FOV tambahan saat lari */
  private dip = 0
  private dipV = 0
  /** derajat tambahan FOV (Round mengisi: lari = +5) */
  fovAdd = 0
  /** arah & laju gerak pemain untuk kamera melihat sedikit ke depan */
  lead: [number, number] = [0, 0]

  /** hentakan kamera saat mendarat; `m` = kedalaman (meter) */
  bump(m: number) {
    this.dipV -= m * 9
  }

  private spring(dt: number) {
    // pegas teredam: turun cepat, kembali tanpa memantul berlebihan
    this.dipV += (-this.dip * 90 - this.dipV * 14) * dt
    this.dip += this.dipV * dt
    this.dip = Math.max(-0.4, Math.min(0.15, this.dip))
  }

  follow(x: number, y: number, z: number, yaw: number, pitch: number, dist: number, dt: number) {
    this.spring(dt)
    const k = 1 - Math.exp(-dt * 10)
    // kamera sedikit mendahului arah lari: jalur di depan lebih terlihat
    x += this.lead[0] * 0.18
    z += this.lead[1] * 0.18
    this.target.x += (x - this.target.x) * k
    this.target.y += (y + 1.3 + this.dip - this.target.y) * k
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
    this.camera.position.set(cx, cy + this.dip * 0.5, cz)
    this.camera.lookAt(this.target)
    this.setFov(56 + this.fovAdd, dt)
    this.around(this.target.x, this.target.y, this.target.z)
  }

  /** kamera orang pertama di mata pendaki; `pitch` positif = mendongak */
  followFP(x: number, y: number, z: number, yaw: number, pitch: number, dt: number) {
    this.spring(dt)
    y += this.dip
    const cp = Math.cos(pitch)
    const dx = Math.sin(yaw) * cp
    const dz = Math.cos(yaw) * cp
    // sedikit di belakang mata: kedua tangan yang mencengkeram tebing ikut terlihat
    this.camera.position.set(x - dx * 0.22, y + 0.05, z - dz * 0.22)
    this.target.set(x + dx * 10, y + Math.sin(pitch) * 10, z + dz * 10)
    this.camera.lookAt(this.target)
    this.target.set(x, y - 1.2, z)
    this.setFov(72 + this.fovAdd, dt)
    this.around(x, y, z)
  }

  private setFov(f: number, dt: number) {
    if (Math.abs(this.camera.fov - f) < 0.05) return
    this.camera.fov += (f - this.camera.fov) * Math.min(1, dt * 8)
    this.camera.updateProjectionMatrix()
  }

  /** matahari, kotak bayangan, dan rumput dekat mengikuti pemain */
  private around(x: number, y: number, z: number) {
    this.sun.position.set(x + Math.cos(this.sunAz) * 72, y + 110, z + Math.sin(this.sunAz) * 72)
    this.sun.target.position.set(x, y, z)
    this.forestLod?.(this.camera.position.x, this.camera.position.z)
    const far = 46 * this.tier.far
    this.grassTiles?.update(x, z, far)
    // peti 70 m jauhnya hanya beberapa piksel, tapi tiap peti beberapa draw call
    for (const o of this.small) {
      const near = ((o.userData.cull as number | undefined) ?? (this.tier.q === 'low' ? 60 : 70)) * this.tier.far
      o.visible = Math.abs(o.position.x - x) < near && Math.abs(o.position.z - z) < near && Math.hypot(o.position.x - x, o.position.z - z) < near
    }
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
      // barang yang dilempar: melengkung dari tangan pelempar ke titik jatuh
      if (d.fly) {
        const k = Math.min(1, Math.max(0, (mount.t - d.fly.t0) / Math.max(1, d.fly.dur)))
        const arc = 4 * Math.max(0.6, (d.fly.y - d.y) * 0.25 + 1.2) * k * (1 - k)
        o.position.set(d.fly.x + (d.x - d.fly.x) * k, d.fly.y + (d.y - d.fly.y) * k + arc - 0.45 * (1 - k), d.fly.z + (d.z - d.fly.z) * k)
        if (s) s.rotation.x += dt * 9 * (1 - k)
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
      const o = batchStatic(ropeMesh(r, this.mats.wood), () => false)
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
      // batu yang menggelinding jauh di bawah (dilihat dari tebing) tidak perlu digambar
      const c = this.camera.position
      o.visible = !!r && !r.warn && Math.abs(r.x - c.x) + Math.abs(r.z - c.z) < 110 * this.tier.far
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

  /**
   * Cuaca di sekitar kamera: hujan/badai petir, badai pasir, hujan abu, salju, kabut, mendung.
   * Juga menggelapkan cahaya, menebalkan kabut, membasahi tebing, dan menggerakkan matahari.
   */
  weather(storm: number, wind: [number, number], dt: number, w: WeatherNow, secs: number) {
    this.mood(dt)
    const id = this.t.m.id
    const k = w.k
    const sky = w.sky
    // cahaya: makin gelap saat mendung/hujan; kilat menyala sesaat
    const dark = SKY_DARK[sky] * k
    if (sky === 'badai' && k > 0.5 && Math.random() < dt * 0.16) {
      this.flash = 1
      this.thunder = true
    }
    this.flash = Math.max(0, this.flash - dt * 3.5)
    const fl = this.flash > 0.6 || (this.flash > 0.2 && this.flash < 0.35) ? 1 : 0
    this.sunAz = -2.55 + secs * 0.0035
    this.sun.intensity = this.base.sun * (1 - dark) + fl * 3
    this.hemi.intensity = this.base.hemi * (1 - dark * 0.4) + fl * 1.5
    this.scene.environmentIntensity = this.base.env * (1 - dark * 0.55)
    this.scene.backgroundIntensity = this.base.bg * (1 - dark * 0.5) + fl * 0.6
    // kabut: lebih tebal & berganti warna
    const thick = SKY_FOG[sky] * k
    this.fogTo.copy(this.base.fog).lerp(this.tintC.set(SKY_TINT[sky]), sky === 'cerah' ? 0 : Math.min(1, k * 0.85))
    const fog = this.scene.fog as THREE.FogExp2 | null
    if (fog) {
      fog.color.lerp(this.fogTo, Math.min(1, dt * 1.5))
      const want = (this.t.m.fogDensity * this.fogMul * (1 + storm * 3.5 + thick)) / this.tier.far
      fog.density += (want - fog.density) * Math.min(1, dt * 1.5)
    }
    if (this.grade) this.grade.uniforms.uStorm.value = Math.max(storm, sky === 'salju' || sky === 'kabut' ? k * 0.6 : 0)
    // tebing basah: kilap & lebih gelap di shader medan
    const u = this.terrainMat?.userData.u as { uRain: { value: number } } | undefined
    if (u) u.uRain.value = w.wet
    // makhluk & tirai hujan
    const c = this.camera.position
    const rain = sky === 'hujan' || sky === 'badai' ? k : 0
    const calm = 1 - Math.min(1, dark * 1.6 + rain)
    const dusk = Math.min(1, (this.t.m.sky === 'malam' ? 1 : 0) + (sky === 'kabut' ? k : 0) + dark * 0.6 + (id === 'rimba' ? 0.35 : 0))
    this.life?.update(dt, c, this.target, wind, rain, calm, dusk, (x, z) => heightAt(this.t, x, z))

    this.fx.weather -= dt
    if (this.fx.weather > 0) return
    this.fx.weather = 1 / 30
    const rnd = (s: number) => (Math.random() - 0.5) * s
    const P = (this.tier.particles / 210) * this.fxK
    // salju: badai lama + cuaca salju
    const snow = (id === 'salju' ? 3 : 0) + storm * 14 + (sky === 'salju' ? k * 16 : 0)
    for (let i = 0; i < Math.round(snow * P); i++) this.particles.emit('snow', c.x + rnd(30), c.y + 6 + Math.random() * 6, c.z + rnd(30), wind[0] * 0.8, -2.5, wind[1] * 0.8, '#ffffff', 0.35)
    // cipratan hujan di tanah dekat pemain
    if (rain > 0.2) {
      for (let i = 0; i < Math.round(rain * 5 * P); i++) {
        const x = this.target.x + rnd(14)
        const z = this.target.z + rnd(14)
        this.particles.emit('splash', x, heightAt(this.t, x, z) + 0.05, z, 0, 1.2, 0, '#d8ecff', 0.25)
      }
    }
    if (sky === 'pasir' || (id === 'ngarai' && Math.random() < 0.25)) {
      for (let i = 0; i < Math.round((sky === 'pasir' ? k * 9 : 1) * P); i++) this.particles.emit('dust', c.x + rnd(30), c.y - 2 + Math.random() * 4, c.z + rnd(30), wind[0] * 1.4, 0.1, wind[1] * 1.4, '#e0b080', 0.6)
    }
    if (sky === 'abu') for (let i = 0; i < Math.round(k * 10 * P); i++) this.particles.emit('snow', c.x + rnd(30), c.y + 6 + Math.random() * 6, c.z + rnd(30), wind[0] * 0.5, -1.2, wind[1] * 0.5, '#5a504a', 0.3)
    if (id === 'kawah' && Math.random() < 0.7) this.particles.emit('spark', c.x + rnd(26), c.y + Math.random() * 6, c.z + rnd(26), 0, 0.6, 0, '#ff8a3c', 0.25)
    if (id === 'kristal' && Math.random() < 0.6) this.particles.emit('star', c.x + rnd(26), c.y - 2 + Math.random() * 5, c.z + rnd(26), rnd(0.5), 0.3, rnd(0.5), Math.random() < 0.5 ? '#b48cff' : '#7ae8ff', 0.3)
    // daun berguguran (lebih banyak saat angin kencang)
    const leaves = id === 'rimba' || id === 'teh' || id === 'karang' ? 0.15 + Math.min(0.5, Math.hypot(...wind) * 0.05) : 0
    if (Math.random() < leaves) this.particles.emit('confetti', c.x + rnd(20), c.y + 6, c.z + rnd(20), wind[0] * 0.3, -0.5, wind[1] * 0.3, Math.random() < 0.7 ? '#6aa83a' : '#c8a040', 0.5)
  }

  /** debu/cipratan di kaki */
  puff(kind: 'dust' | 'splash' | 'snow', x: number, y: number, z: number, n = 6) {
    const color = kind === 'splash' ? ['#d8f4ff', '#ffffff'] : kind === 'snow' ? ['#ffffff', '#e4f2ff'] : ['#b8a080', '#9a8468']
    this.particles.burst(kind, n, x, y + 0.1, z, 0, 1.2, 0, 2, color, kind === 'splash' ? 0.8 : 0.9)
  }

  private w = 1
  private h = 1
  /** pengali partikel cuaca (diturunkan pengatur adaptif) */
  private fxK = 1
  /** bayangan digambar ulang tiap N frame (1 = tiap frame) */
  private shadowEvery = 1
  private frameNo = 0
  private streamTick = 0

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
  }

  /** pixel ratio render internal (dari profil × skala adaptif) */
  setRatio(r: number) {
    if (Math.abs(this.renderer.getPixelRatio() - r) < 0.01) return
    this.renderer.setPixelRatio(r)
    this.composer?.setPixelRatio(r)
    this.resize(this.w, this.h)
  }

  render(dt: number) {
    this.clock.value += dt
    this.particles.update(dt)
    this.renderer.info.reset()
    if (this.terrain && this.streamTick++ % 3 === 0) this.terrain.update(this.camera.position.x, this.camera.position.z, 2)
    if (this.shadows && this.shadowEvery > 1) this.renderer.shadowMap.needsUpdate = this.frameNo++ % this.shadowEvery === 0
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  /** satu langkah turun kualitas dari pengatur adaptif; medan & pegangan tidak pernah disentuh */
  degrade(step: Step) {
    if (step === 'shadow' && this.shadows) {
      // peta lebih kecil + digambar selang-seling: bayangan tetap ada, biayanya ±seperempat
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
      this.sun.shadow.mapSize.setScalar(Math.min(1024, this.sun.shadow.mapSize.x / 2))
      this.renderer.shadowMap.autoUpdate = false
      this.shadowEvery = 2
    }
    if (step === 'grass') {
      for (const g of this.grass) g.visible = false
      this.grass = []
      this.grassTiles = null
    }
    if (step === 'fx') this.fxK = 0.5
    if (step === 'post' && this.composer) {
      this.composer.dispose()
      this.composer = null
      this.grade = null
    }
  }

  /** angka render untuk overlay & laporan performa */
  stats() {
    const i = this.renderer.info
    return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, chunks: this.terrain?.built() ?? 0, ratio: this.renderer.getPixelRatio(), height: Math.round(this.h * this.renderer.getPixelRatio()) }
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

/** suasana tiap jenis zona Punggung Hijau (pengali dari nilai dasar gunung) */
type Mood = { fog: string; fogK: number; sun: number; sunC: string; hemi: number; sky: string; grade: [number, number, number] }
const MOODS: Record<NonNullable<Terrain['kinds']>[number], Mood> = {
  // pagi hangat di padang kemah
  kemah: { fog: '#d3e2cf', fogK: 1, sun: 1, sunC: '#ffe4bd', hemi: 1, sky: '#d8ecff', grade: [1.04, 1.01, 0.95] },
  // di bawah tajuk: kabut hijau lebih tebal, matahari teredam, bayangan kehijauan
  hutan: { fog: '#a8c6a0', fogK: 1.9, sun: 0.82, sunC: '#fff0cf', hemi: 1.15, sky: '#c4e4bd', grade: [0.96, 1.04, 0.93] },
  // batu terbuka: netral, sedikit hangat
  batu: { fog: '#cad3c9', fogK: 1.15, sun: 1.02, sunC: '#fff1dc', hemi: 1, sky: '#d4e6f6', grade: [1.01, 1.0, 0.98] },
  // tebing tinggi: udara jernih
  tebing: { fog: '#c3d5e0', fogK: 0.85, sun: 1.06, sunC: '#fff6ea', hemi: 0.95, sky: '#cfe4ff', grade: [0.99, 1.0, 1.02] },
  // punggung berangin: dingin kebiruan
  punggung: { fog: '#b9cde0', fogK: 0.8, sun: 1.1, sunC: '#f2f4ff', hemi: 0.9, sky: '#c8dcff', grade: [0.96, 0.99, 1.06] },
  // puncak: terang & dingin, kabut tipis di bawah
  puncak: { fog: '#d6e3ef', fogK: 0.65, sun: 1.16, sunC: '#ffffff', hemi: 0.95, sky: '#d6e6ff', grade: [1.0, 1.0, 1.05] },
}

/** seberapa gelap tiap cuaca (dikali kekuatannya) */
const SKY_DARK: Record<WeatherNow['sky'], number> = { cerah: 0, berawan: 0.38, hujan: 0.55, badai: 0.72, pasir: 0.3, abu: 0.5, salju: 0.4, kabut: 0.3 }
/** tambahan kepadatan kabut */
const SKY_FOG: Record<WeatherNow['sky'], number> = { cerah: 0, berawan: 0.4, hujan: 1.4, badai: 2.2, pasir: 3.2, abu: 2.4, salju: 1.8, kabut: 4 }
const SKY_TINT: Record<WeatherNow['sky'], string> = { cerah: '#ffffff', berawan: '#aab4bf', hujan: '#8f9caa', badai: '#5d6672', pasir: '#d9b98a', abu: '#5c5450', salju: '#e6edf5', kabut: '#e8ecef' }

/** ukuran tekstur medan: 1024 hanya di Tinggi pada HP bermemori besar (texture array 12 lapis) */
function texSize(q: Tier['q']) {
  if (q === 'low') return 256
  if (q === 'med') return 512
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return mem !== undefined && mem < 6 ? 512 : 1024
}
