import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import SKY from '@/assets/sport/tex/langit-siang.hdr?url'
import { Particles } from '@/games/kart/render/particles'
import type { Tier } from '@/games/kart/render/quality'
import { addRim } from '@/games/sport/render/shaders'
import { CELL, COUNTER_TOP, DISH_OF, KITCHENS, type Ing, type Layout } from '../kitchens'
import { gapOpen, isExt, isFood, isPlate, lavaOn, lavaSoon, liftUp, shipTilt, type Item, type Kit } from '../sim/kitchen'

import PROPS from '@/assets/masak/models/props.glb?url'

/** barang buatan masak_props.py: satu objek bernama per barang, disalin tiap dipakai (geometri & bahan bersama) */
let props: Promise<Map<string, THREE.Object3D>> | null = null
function loadProps() {
  return (props ??= new GLTFLoader().loadAsync(PROPS).then((g) => {
    const out = new Map<string, THREE.Object3D>()
    for (const o of [...g.scene.children]) {
      o.position.set(0, 0, 0)
      o.traverse((c) => {
        const m = c as THREE.Mesh
        if (!m.isMesh) return
        m.castShadow = true
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat.userData.rim) {
          mat.userData.rim = true
          // makanan berkilau sedikit dan bertepi terang supaya terbaca di atas meja dari kamera tinggi
          addRim(mat, '#fff3e0', 0.28)
        }
      })
      out.set(o.name, o)
    }
    return out
  }))
}
let PROP: Map<string, THREE.Object3D> = new Map()
export const make = (name: string) => PROP.get(name)?.clone() ?? new THREE.Object3D()

function foodMesh(ing: Ing, s: string): THREE.Object3D {
  if (ing === 'daging') return make(`daging_${s}`)
  if (s === 'burnt') return make('arang')
  return make(`${ing}_${s}`)
}

/** urutan tumpukan di piring: roti bawah, isi, roti atas */
const LAYER: { ing: Ing; name: string; h: number }[] = [
  { ing: 'daging', name: 'daging_cooked', h: 0.055 },
  { ing: 'keju', name: 'keju_lapis', h: 0.012 },
  { ing: 'tomat', name: 'tomat_lapis', h: 0.02 },
  { ing: 'selada', name: 'selada_lapis', h: 0.02 },
]

/** potongan bahan disebar melingkar di piring, untuk isi yang belum membentuk hidangan */
function spread(g: THREE.Group, ings: [Ing, string][], y: number, r = 0.12, scale = 0.8) {
  ings.forEach(([i, st], n) => {
    const o = foodMesh(i, st)
    const a = (n / Math.max(1, ings.length)) * Math.PI * 2 + 0.4
    o.position.set(ings.length > 1 ? Math.cos(a) * r : 0, y, ings.length > 1 ? Math.sin(a) * r : 0)
    o.scale.setScalar(scale)
    g.add(o)
  })
}

/** Hidangan di piring (atau mangkuk untuk ramen): bahan yang cocok menyatu jadi bentuk hidangannya. */
function plateMesh(codes: string[], dirty = false, bowl = false): THREE.Object3D {
  const g = new THREE.Group()
  g.add(make(bowl ? 'mangkuk' : dirty ? 'piring_kotor' : 'piring'))
  const ings = codes.map((c) => c.split(':') as [Ing, string])
  const has = (i: Ing) => ings.some(([x]) => x === i)
  const rest = (...used: Ing[]) => ings.filter(([x]) => !used.includes(x))
  const put = (name: string, y: number, scale = 1, x = 0, z = 0) => {
    const o = make(name)
    o.position.set(x, y, z)
    o.scale.setScalar(scale)
    g.add(o)
    return o
  }
  const dish = ings.map(([i]) => DISH_OF[i]).find(Boolean)
  if (dish === 'pizza') {
    put('adonan_baked', 0.03)
    if (has('tomat')) put('pizza_saus', 0.058)
    if (has('keju')) put('pizza_keju', 0.064)
    if (has('tomat')) put('pizza_tomat', 0.072, 0.9)
    if (has('jamur')) put('pizza_jamur', 0.075)
    return g
  }
  if (dish === 'sushi' || (has('ikan') && !has('nasi'))) {
    if (has('nasi') && has('nori') && (has('ikan') || has('timun'))) {
      put(has('ikan') ? 'maki_ikan' : 'maki_timun', 0.03)
      return g
    }
    if (has('nasi') && has('ikan') && !has('nori')) {
      put('nigiri', 0.03)
      return g
    }
    spread(g, ings, 0.03)
    return g
  }
  if (bowl || dish === 'ramen') {
    if (has('mie')) {
      put('kuah', 0.11)
      put('mie_cooked', 0.1, 0.95)
    }
    const top = rest('mie')
    top.forEach(([i, st], n) => {
      const o = foodMesh(i, st)
      const a = n * 2.1 + 0.6
      o.position.set(Math.cos(a) * 0.08, 0.14, Math.sin(a) * 0.08)
      o.scale.setScalar(i === 'daging' ? 0.55 : 0.75)
      g.add(o)
    })
    return g
  }
  if (dish === 'pancake') {
    put('pancake_tumpuk', 0.03)
    if (has('stroberi')) put('stroberi_cut', 0.11, 0.9)
    if (has('pisang')) put('pisang_cut', 0.11, 0.9)
    if (has('madu')) put('madu_siram', 0.106)
    return g
  }
  if (dish === 'nasgor') {
    put('beras_cooked', 0.03)
    rest('beras').forEach(([i, st], n) => {
      const o = foodMesh(i, st)
      o.position.set((n - 0.5) * 0.08, 0.12, 0.02)
      o.scale.setScalar(0.6)
      g.add(o)
    })
    return g
  }
  if (dish === 'sate') {
    put('ayam_cooked', 0.03)
    if (has('kacang')) put('kacang_raw', 0.03, 0.8, 0.14, 0.1)
    if (has('lontong')) put('lontong_cut', 0.03, 0.8, -0.12, 0.12)
    return g
  }
  if (dish === 'taco') {
    put('taco_cangkang', 0.03)
    rest('tortilla').forEach(([i, st], n) => {
      const o = foodMesh(i, st)
      o.position.set((n - 1) * 0.07, 0.11 + n * 0.012, 0)
      o.scale.setScalar(i === 'daging' ? 0.45 : 0.55)
      g.add(o)
    })
    return g
  }
  const bun = has('roti')
  let y = 0.03
  if (!bun) {
    spread(g, ings, 0.03)
    return g
  }
  put('roti_bawah', y)
  y += 0.04
  for (const l of LAYER) {
    if (!has(l.ing)) continue
    put(l.name, y)
    y += l.h
  }
  put('roti_atas', y)
  return g
}

const MAPS = import.meta.glob('/src/assets/masak/maps/*.{glb,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const MAP_JSON = import.meta.glob('/src/assets/masak/maps/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
/** harus sama dengan LM_RANGE di scripts/blender/petak_lib.py */
const LM_RANGE = 3

function shrink(tex: THREE.Texture, max: number) {
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined
  if (!img || Math.max(img.width, img.height) <= max || tex.userData.shrunk) return
  const c = document.createElement('canvas')
  c.width = c.height = max
  c.getContext('2d')!.drawImage(img, 0, 0, max, max)
  tex.image = c
  tex.userData.shrunk = true
}

const TMP = new THREE.Vector3()

const itemKey = (it: Item) => (isPlate(it) ? `p|${it.f.join()}` : isExt(it) ? 'ext' : `f|${it.ing}|${it.s}`)

/** dunia 3D satu dapur */
export class KitchenScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 2, 0.5, 80)
  actors = new THREE.Group()
  particles: Particles
  shadows: boolean
  private items = new Map<number, { key: string; obj: THREE.Object3D }>()
  private stacks = new Map<number, THREE.Object3D[]>()
  private bars = new Map<number, { root: THREE.Object3D; fill: THREE.Mesh; mat: THREE.MeshBasicMaterial }>()
  private target: THREE.Mesh
  private L: Layout
  private tier: Tier
  private composer: EffectComposer | null = null
  private sun: THREE.DirectionalLight
  private gimmick: string | null = null
  private bowls = false
  private belts: THREE.Texture[] = []
  /** benda bergerak per salinan dapur: nama → objek & posisi asal */
  private movers: Map<string, { o: THREE.Object3D; y: number; z: number }>[] = []
  private roll = 0
  private rollV = 0
  private ox = 0
  private size: [number, number] = [1, 1]

  constructor(canvas: HTMLCanvasElement, tier: Tier, L: Layout) {
    this.L = L
    this.tier = tier
    // tanpa composer: MSAA bawaan kanvas; dengan composer: MSAA di target + SMAA
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, tier.ratio))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.shadows = tier.shadow > 0
    this.renderer.shadowMap.enabled = this.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.background = new THREE.Color('#2a1f2b')
    // dunia memakai lightmap; lampu ini hanya mengisi peta bayangan (intensitas 0), koki & barang diterangi langit HDR
    this.sun = new THREE.DirectionalLight('#fff1dc', 0)
    this.sun.position.set(-3.5, 12, 5)
    if (this.shadows) {
      this.sun.castShadow = true
      this.sun.shadow.mapSize.setScalar(tier.shadow)
      const c = this.sun.shadow.camera
      c.left = -9
      c.right = 9
      c.top = 7
      c.bottom = -7
      c.near = 1
      c.far = 30
      this.sun.shadow.bias = -0.0006
      this.sun.shadow.normalBias = 0.02
    }
    this.particles = new Particles(tier.particles)
    this.scene.add(this.sun, this.actors, this.particles.group)
    if (tier.post) {
      this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier.samples }))
      this.composer.setPixelRatio(Math.min(devicePixelRatio, tier.ratio))
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.12, 0.4, 1.1))
      this.composer.addPass(new OutputPass())
      this.composer.addPass(new SMAAPass())
    }
    this.target = new THREE.Mesh(new RoundedBoxGeometry(CELL * 0.96, 0.03, CELL * 0.96, 2, 0.012), new THREE.MeshBasicMaterial({ color: '#ff37a6', transparent: true, opacity: 0.45, depthWrite: false }))
    this.target.visible = false
    this.scene.add(this.target)
  }

  /** langit HDR, map GLB ber-lightmap, dan bayangan koki di atas dunia */
  async load(kitchen: string, copies = 1, off = 0) {
    this.gimmick = KITCHENS[kitchen as keyof typeof KITCHENS]?.gimmick ?? null
    this.bowls = kitchen === 'ramen'
    const [sky, gltf, lm, pr] = await Promise.all([
      new HDRLoader().loadAsync(SKY),
      new GLTFLoader().loadAsync(MAPS[`/src/assets/masak/maps/${kitchen}.glb`]),
      new THREE.TextureLoader().loadAsync(MAPS[`/src/assets/masak/maps/${kitchen}-lm.webp`]),
      loadProps(),
    ])
    PROP = pr
    sky.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = pmrem.fromEquirectangular(sky).texture
    pmrem.dispose()
    sky.dispose()
    this.scene.environment = env
    // koki & barang: cahaya langit penuh; dunia: lightmap + sedikit pantulan
    this.scene.environmentIntensity = 1.15
    lm.flipY = false
    lm.channel = 1
    lm.colorSpace = THREE.SRGBColorSpace
    const tints = (MAP_JSON[`/src/assets/masak/maps/${kitchen}.json`] as { tint?: Record<string, number[]> } | undefined)?.tint ?? {}
    const catchers: THREE.Mesh[] = []
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = m.material as THREE.MeshPhysicalMaterial
      mat.transmission = 0
      const c = tints[mat.name]
      if (c) mat.color.setRGB(c[0], c[1], c[2])
      mat.envMap = env
      mat.envMapIntensity = mat.metalness > 0.5 ? 0.9 : 0.25
      if (this.tier.q !== 'high' && mat.map) shrink(mat.map, this.tier.pbr ? 1024 : 768)
      if (!this.tier.pbr && mat.normalMap) {
        mat.normalMap.dispose()
        mat.normalMap = null
      }
      if (mat.map) mat.map.anisotropy = this.tier.q === 'high' ? 8 : 4
      // urutan layer Blender: UVMap, Sway, Lightmap → glTF uv, uv1, uv2
      const g = m.geometry
      if (g.attributes.uv2) {
        g.setAttribute('uv1', g.attributes.uv2)
        g.deleteAttribute('uv2')
        mat.lightMap = lm
        // three membagi irradiance dengan π, Blender tidak
        mat.lightMapIntensity = LM_RANGE * Math.PI
      }
      if (mat.name.startsWith('neon_')) mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 2)
      // kolam lava: menyala penuh dengan teksturnya sendiri, ikut bloom
      if (mat.name.startsWith('neon_lava')) {
        mat.emissive.set('#ff5a14')
        mat.emissiveMap = mat.map
        mat.emissiveIntensity = 5
      }
      if (mat.name.startsWith('air_')) {
        mat.transparent = true
        mat.opacity = 0.75
      }
      if (mat.name.startsWith('belt_') && mat.map && !this.belts.includes(mat.map)) this.belts.push(mat.map)
      // benda bergerak tidak ikut lightmap: terangi sendiri dengan warnanya
      if (!g.attributes.uv1 && !mat.name.startsWith('neon_')) {
        mat.emissive = mat.color.clone()
        mat.emissiveMap = mat.map
        mat.emissiveIntensity = 0.35
      }
      if (this.shadows && !mat.name.startsWith('neon_')) catchers.push(m)
    })
    this.scene.add(gltf.scene)
    this.collectMovers(gltf.scene)
    // versus: dapur lawan = salinan di samping (geometri & bahan bersama). Sedikit lebih rendah supaya
    // lantai luar yang bertumpuk tidak berkedip.
    const copiesList = [gltf.scene]
    for (let i = 1; i < copies; i++) {
      const c = gltf.scene.clone()
      c.position.set(off * i, -0.003 * i, 0)
      this.scene.add(c)
      this.collectMovers(c)
      copiesList.push(c)
    }
    if (this.shadows) {
      for (const c of copiesList) {
        const list: THREE.Mesh[] = []
        c.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.isMesh && !(m.material as THREE.Material).name.startsWith('neon_')) list.push(m)
        })
        this.catchShadows(c, list)
      }
    }
  }

  private collectMovers(root: THREE.Object3D) {
    const map = new Map<string, { o: THREE.Object3D; y: number; z: number }>()
    root.traverse((o) => {
      if (/^(rana_\d+|jembatan|kisi_\d)$/.test(o.name)) map.set(o.name, { o, y: o.position.y, z: o.position.z })
    })
    this.movers.push(map)
  }

  /** gimik tiap dapur: rana lift, jembatan gerbong, sabuk & jalan bergeser, goyangan truk */
  animate(kits: Kit[], dt: number) {
    const speed = this.gimmick === 'truck' ? 1.6 : 0.6
    for (const t of this.belts) t.offset.x -= dt * speed * (this.gimmick === 'truck' ? 0.12 : 0.35)
    kits.forEach((k, t) => {
      const mv = this.movers[t]
      if (!mv) return
      const up = liftUp(k)
      for (const [name, e] of mv) {
        if (name.startsWith('rana_')) {
          // rana turun menutup loket saat lift turun
          const target = e.y - (up ? 0 : 0.62)
          e.o.position.y += (target - e.o.position.y) * Math.min(1, dt * 6)
        } else if (name === 'jembatan') {
          const target = e.y - (gapOpen(k) ? 1.3 : 0)
          e.o.position.y += (target - e.o.position.y) * Math.min(1, dt * 5)
        } else if (name.startsWith('kisi_')) {
          // kisi batu tenggelam saat lava kelompoknya naik; bergetar sebagai peringatan
          const g = Number(name.slice(5))
          const target = e.y - (lavaOn(k) === g ? 0.34 : 0)
          e.o.position.y += (target - e.o.position.y) * Math.min(1, dt * 6)
          e.o.position.x = (e.o.userData.x0 ??= e.o.position.x) + (lavaSoon(k) === g ? Math.sin(k.t * 0.06) * 0.015 : 0)
        }
      }
    })
    // goyangan kamera saat truk belok: pegas teredam
    this.rollV += (-this.roll * 40 - this.rollV * 6) * dt
    this.roll += this.rollV * dt
    if (this.gimmick === 'truck') this.camera.rotation.z = this.baseRoll + this.roll
    // kapal: dek terus miring mengikuti ombak
    if (this.gimmick === 'ship') this.camera.rotation.z = this.baseRoll + shipTilt(kits[0]) * 0.07 + this.roll
    this.weather(kits, dt)
  }

  private weatherIn = 0

  /** hujan di kapal, salju di kafe es, percik bara di gunung api */
  private weather(kits: Kit[], dt: number) {
    this.weatherIn -= dt
    if (this.weatherIn > 0) return
    this.weatherIn = 1 / 30
    const W = this.L.w * CELL
    const H = this.L.h * CELL
    const P = this.particles
    const rx = () => this.ox + (Math.random() - 0.5) * W * 1.3
    const rz = () => (Math.random() - 0.5) * H * 1.2
    if (this.gimmick === 'ship') for (let i = 0; i < 6; i++) P.emit('rain', rx(), 6, rz(), -1.5, -14, 0, '#bcd8f0', 0.5)
    if (this.gimmick === 'ice') for (let i = 0; i < 2; i++) P.emit('snow', rx(), 4, rz(), 0.3, -0.8, 0, '#ffffff', 0.35)
    if (this.gimmick === 'lava') {
      const L = this.L
      const on = lavaOn(kits[0])
      for (const [x, z] of L.lava[on] ?? []) if (Math.random() < 0.25) P.emit('spark', this.ox + x + (Math.random() - 0.5) * 0.8, 0.05, z + (Math.random() - 0.5) * 0.8, 0, 2.2, 0, '#ffb347', 0.3)
    }
  }

  /** truk belok ke `dir`: dapur miring sebentar */
  bump(dir: number) {
    this.rollV += dir * 0.9
  }

  private baseRoll = 0

  /** kamera & peta bayangan mengikuti dapur tim sendiri */
  focus(x: number) {
    this.ox = x
    this.sun.position.set(x - 3.5, 12, 5)
    this.sun.target.position.set(x, 0, 0)
    this.scene.add(this.sun.target)
    this.resize(this.size[0], this.size[1])
  }

  /** salinan bidang dunia yang menghadap atas, ber-ShadowMaterial: bayangan koki & barang di atas lightmap */
  private catchShadows(root: THREE.Object3D, meshes: THREE.Mesh[]) {
    const catcher = new THREE.ShadowMaterial({ color: 0x1a0f18, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    root.updateWorldMatrix(true, true)
    const tris: number[] = []
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const n = new THREE.Vector3()
    const tri = new THREE.Triangle()
    for (const m of meshes) {
      const pos = m.geometry.attributes.position
      const idx = m.geometry.index
      const count = idx ? idx.count : pos.count
      for (let i = 0; i + 2 < count; i += 3) {
        a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld)
        b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld)
        c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld)
        tri.set(a, b, c)
        if (tri.getArea() < 0.01) continue
        tri.getNormal(n)
        if (n.y < 0.6) continue
        tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3))
    geo.computeVertexNormals()
    const o = new THREE.Mesh(geo, catcher)
    o.receiveShadow = true
    this.scene.add(o)
  }

  /** kamera tetap: seluruh dapur muat di layar mendatar */
  resize(w: number, h: number) {
    this.size = [w, h]
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    const W = this.L.w * CELL
    const H = this.L.h * CELL
    // jarak supaya lebar dan tinggi dapur sama-sama muat
    const fov = (this.camera.fov * Math.PI) / 180
    const needH = (H * 0.56 + 1.2) / Math.tan(fov / 2)
    const needW = (W * 0.5 + 0.3) / (Math.tan(fov / 2) * this.camera.aspect)
    const d = Math.max(needH, needW)
    const tilt = 1.02
    // titik bidik digeser ke belakang: baris peti di dinding belakang tidak tertutup kartu pesanan
    const aim = -0.35
    this.camera.position.set(this.ox, Math.sin(tilt) * d, Math.cos(tilt) * d + aim)
    this.camera.lookAt(this.ox, 0, aim)
    this.baseRoll = this.camera.rotation.z
    this.camera.updateProjectionMatrix()
  }

  /** letakkan semua barang sesuai isi tiap dapur; `hands` = titik tangan tiap aktor (koordinat dunia) */
  sync(kits: Kit[], hands: THREE.Vector3[], off: number) {
    const seen = new Set<number>()
    kits.forEach((k, t) => this.syncKit(k, t, t * off, hands, seen))
    for (const [id, e] of this.items) {
      if (seen.has(id)) continue
      this.scene.remove(e.obj)
      this.items.delete(id)
    }
    this.syncPeels(kits, off)
  }

  private syncKit(k: Kit, team: number, ox: number, hands: THREE.Vector3[], seen: Set<number>) {
    const L = this.L
    const place = (raw: number, x: number, y: number, z: number, glide = false) => {
      const it = k.items[raw]
      if (!it) return
      const id = team * 1_000_000 + raw
      seen.add(id)
      const key = itemKey(it)
      let e = this.items.get(id)
      if (!e || e.key !== key) {
        if (e) this.scene.remove(e.obj)
        const obj = isPlate(it) ? plateMesh(it.f, false, this.bowls) : isExt(it) ? make('pemadam') : foodMesh(it.ing, it.s)
        obj.traverse((o) => (o.castShadow = this.shadows))
        e = { key, obj }
        this.items.set(id, e)
        this.scene.add(obj)
      }
      // di sabuk barang meluncur halus dari petak ke petak, bukan melompat
      if (glide && e.obj.position.distanceToSquared(TMP.set(x, y, z)) < 2.5) e.obj.position.lerp(TMP, 0.18)
      else e.obj.position.set(x, y, z)
    }
    const lift = { board: 0.035, stove: 0.04, oven: 0.02, belt: 0.01 } as Record<string, number>
    k.hold.forEach((id, si) => id !== null && place(id, L.stations[si].x + ox, COUNTER_TOP + (lift[L.stations[si].kind] ?? 0.005), L.stations[si].z, L.stations[si].kind === 'belt' || this.gimmick === 'truck'))
    k.hands.forEach((id, a) => id !== null && hands[a] && place(id, hands[a].x, hands[a].y, hands[a].z))
    // tumpukan piring bersih & kotor
    L.stations.forEach((st, si) => {
      if (st.kind !== 'plates' && st.kind !== 'sink') return
      const dirty = st.kind === 'sink'
      const n = dirty ? k.dirty[si] : k.stack[si]
      const key = team * 1000 + si
      const list = this.stacks.get(key) ?? []
      while (list.length < n) {
        const p = plateMesh([], dirty, this.bowls)
        p.position.set(st.x + ox + (dirty ? 0.05 : 0), COUNTER_TOP + (dirty ? -0.1 : 0.01) + list.length * 0.05, st.z)
        p.rotation.y = list.length * 0.7
        this.scene.add(p)
        list.push(p)
      }
      while (list.length > n) this.scene.remove(list.pop()!)
      this.stacks.set(key, list)
    })
    this.syncBars(k, team, ox)
  }

  private peelObjs = new Map<string, THREE.Object3D>()

  /** kulit pisang iseng di lantai */
  private syncPeels(kits: Kit[], off: number) {
    const live = new Set<string>()
    kits.forEach((k, t) => {
      for (const p of k.peels) {
        const key = `${t}:${p.id}`
        live.add(key)
        if (this.peelObjs.has(key)) continue
        const o = make('kulit_pisang')
        o.position.set(p.x + t * off, 0.005, p.z)
        o.rotation.y = (p.id * 1.7) % 6.28
        o.scale.setScalar(1.7)
        this.scene.add(o)
        this.peelObjs.set(key, o)
      }
    })
    for (const [key, o] of this.peelObjs) {
      if (live.has(key)) continue
      this.scene.remove(o)
      this.peelObjs.delete(key)
    }
  }

  private tosses: { obj: THREE.Object3D; from: number; to: number; t: number }[] = []

  /** lemparan iseng melengkung dari loket dapur pelempar ke tengah dapur lawan */
  toss(fromX: number, toX: number) {
    const obj = make('karung_tepung')
    this.scene.add(obj)
    this.tosses.push({ obj, from: fromX, to: toX, t: 0 })
  }

  private flyTosses(dt: number) {
    this.tosses = this.tosses.filter((f) => {
      f.t += dt / 1.1
      const t = Math.min(1, f.t)
      f.obj.position.set(f.from + (f.to - f.from) * t, 1.2 + Math.sin(Math.PI * t) * 5, -1 + t)
      f.obj.rotation.set(t * 9, t * 5, 0)
      if (t < 1) return true
      this.scene.remove(f.obj)
      this.particles.burst('dust', 18, f.to, 1.4, 0, 0, 1.5, 0, 4, ['#ffffff', '#f4efe8'], 0.9)
      return false
    })
  }

  private syncBars(k: Kit, team: number, ox: number) {
    const L = this.L
    k.hold.forEach((id, si) => {
      const it = k.items[id ?? -1]
      const kind = L.stations[si].kind
      if (!isFood(it) || (kind !== 'board' && kind !== 'stove')) return
      const cooking = kind === 'stove' && it.s === 'raw'
      const burning = kind === 'stove' && it.s === 'cooked'
      const chopping = kind === 'board' && it.p > 0 && it.s === 'raw'
      if (!cooking && !burning && !chopping) return
      const key = team * 1000 + si
      this.liveBars.add(key)
      let b = this.bars.get(key)
      if (!b) {
        const root = new THREE.Group()
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.14), new THREE.MeshBasicMaterial({ color: '#121212', depthTest: false }))
        const m = new THREE.MeshBasicMaterial({ color: '#5cf64a', depthTest: false })
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.07), m)
        fill.position.z = 0.001
        bg.renderOrder = 10
        fill.renderOrder = 11
        root.add(bg, fill)
        this.scene.add(root)
        b = { root, fill, mat: m }
        this.bars.set(key, b)
      }
      b.root.position.set(L.stations[si].x + ox, COUNTER_TOP + 0.75, L.stations[si].z)
      b.root.quaternion.copy(this.camera.quaternion)
      const p = Math.min(1, it.p)
      b.fill.scale.x = Math.max(0.001, burning ? 1 - p : p)
      b.fill.position.x = (-0.66 * (1 - b.fill.scale.x)) / 2
      // matang: bar mengecil dan memerah, makin dekat gosong makin cepat berkedip
      const blink = burning && p > 0.5 && Math.floor((k.t / Math.max(90, 260 - p * 200)) % 2) === 0
      b.mat.color.set(burning ? (blink ? '#ffffff' : p > 0.5 ? '#ff3b0f' : '#ffcc1f') : '#5cf64a')
    })
  }

  private liveBars = new Set<number>()

  private pruneBars() {
    for (const [key, b] of this.bars) {
      if (this.liveBars.has(key)) continue
      this.scene.remove(b.root)
      this.bars.delete(key)
    }
    this.liveBars.clear()
  }

  private fxIn = 0

  /** api, asap, uap, serpihan potongan, semprotan pemadam; `spray` = titik semprot koki yang memegang pemadam */
  effects(kits: Kit[], dt: number, hands: THREE.Vector3[], off: number) {
    this.pruneBars()
    this.fxIn -= dt
    const tick = this.fxIn <= 0
    if (tick) {
      this.fxIn = 1 / 30
      kits.forEach((k, t) => this.kitEffects(k, t * off, hands))
    }
    this.flyTosses(dt)
    this.particles.update(dt)
  }

  private kitEffects(k: Kit, ox: number, hands: THREE.Vector3[]) {
    const P = this.particles
    {
      const L = this.L
      L.stations.forEach((s0, si) => {
        const st = { ...s0, x: s0.x + ox }
        const y = COUNTER_TOP + 0.08
        if (k.fire[si] > 0) {
          const f = k.fire[si]
          for (let i = 0; i < 2; i++) P.emit('fire', st.x + (Math.random() - 0.5) * 0.7, y, st.z + (Math.random() - 0.5) * 0.7, 0, 1.6 + Math.random(), 0, i ? '#ff9a2a' : '#ffd23f', 0.45 * (0.6 + f * 0.6))
          if (Math.random() < 0.5) P.emit('smoke', st.x, y + 0.6, st.z, (Math.random() - 0.5) * 0.3, 0.9, (Math.random() - 0.5) * 0.3, '#3a3236', 0.5)
          return
        }
        const it = k.items[k.hold[si] ?? -1]
        if (st.kind === 'stove' && isFood(it) && Math.random() < 0.35) {
          const color = it.s === 'burnt' ? '#2a2426' : it.s === 'cooked' && it.p > 0.5 ? '#6a5a55' : '#f4efe8'
          P.emit('smoke', st.x + (Math.random() - 0.5) * 0.3, y + 0.05, st.z + (Math.random() - 0.5) * 0.3, 0, 0.6, 0, color, 0.28)
          if (it.s !== 'burnt' && Math.random() < 0.3) P.emit('spark', st.x, y, st.z, (Math.random() - 0.5) * 1.2, 1.5, (Math.random() - 0.5) * 1.2, '#ffe2a8', 0.2)
        }
      })
      k.chop.forEach((si, a) => {
        if (si === null || !hands[a]) return
        const st = { ...L.stations[si], x: L.stations[si].x + ox }
        const hand = k.items[k.hands[a] ?? -1]
        if (isExt(hand)) {
          const h = hands[a]
          for (let i = 0; i < 3; i++) P.emit('snow', h.x, h.y + 0.1, h.z, (st.x - h.x) * 2.2 + (Math.random() - 0.5), 0.4, (st.z - h.z) * 2.2 + (Math.random() - 0.5), '#ffffff', 0.4)
        } else if (st.kind === 'sink') {
          if (Math.random() < 0.6) P.emit('splash', st.x + (Math.random() - 0.5) * 0.4, COUNTER_TOP, st.z + (Math.random() - 0.5) * 0.4, 0, 1.4, 0, '#bfe6ff', 0.2)
        } else if (Math.random() < 0.5) {
          const food = k.items[k.hold[si] ?? -1]
          const color = isFood(food) ? ({ selada: '#7fd65a', tomat: '#ff5a3c', keju: '#ffd23f' } as Record<string, string>)[food.ing] ?? '#ffffff' : '#ffffff'
          P.emit('splash', st.x, COUNTER_TOP + 0.08, st.z, (Math.random() - 0.5) * 1.5, 1.6, (Math.random() - 0.5) * 1.5, color, 0.16)
        }
      })
    }
  }

  /** penanda stasiun di depan pemain */
  setTarget(si: number | null, ox = 0) {
    if (si === null) {
      this.target.visible = false
      return
    }
    const st = this.L.stations[si]
    this.target.visible = true
    this.target.position.set(st.x + ox, COUNTER_TOP + 0.03, st.z)
  }

  /** HP kewalahan: matikan efek layar dulu (MSAA kanvas tetap aktif), lalu turunkan resolusi */
  lowerQuality() {
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
      return
    }
    const r = this.renderer.getPixelRatio()
    if (r > 1) {
      this.renderer.setPixelRatio(Math.max(1, r - 0.25))
      this.resize(this.size[0], this.size[1])
    }
  }

  render() {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    // model koki dipakai bersama antar ronde (cache GLTF), jangan ikut dibuang
    this.scene.remove(this.actors)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
    })
    this.composer?.dispose()
    this.renderer.dispose()
  }
}
