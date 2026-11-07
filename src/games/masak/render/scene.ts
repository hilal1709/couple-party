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
import type { Perf } from './perf'
import { addRim } from '@/games/sport/render/shaders'
import { AFTER, CELL, COUNTER_TOP, DISH_OF, KITCHENS, nextStep, toolOf, type Ing, type Layout, type Tool } from '../kitchens'
import type { KitchenId } from '../types'
import { drawTool, INK } from '../ui/tools'
import { bakeIcons, ingKey, type Icons } from './icons'
import { clothShader, lavaShader, leafShader, waterShader, worldTime } from './shaders'
import { contentAt, gapOpen, heatAt, isExt, isFood, isPlate, isPot, lavaOn, lavaSoon, liftUp, potFood, shipTilt, type Item, type Kit, type Pot } from '../sim/kitchen'

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

export function foodMesh(ing: Ing, s: string): THREE.Object3D {
  if (ing === 'daging') return make(`daging_${s}`)
  if (s === 'burnt') return make('arang')
  // rebusan memakai model matangnya; beras rebus = gundukan nasi putih (beras_cooked = nasi goreng)
  if (s === 'boiled') return make(ing === 'beras' ? 'nasi_cooked' : `${ing}_cooked`)
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
export function plateMesh(codes: string[], dirty = false, bowl = false): THREE.Object3D {
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

/** dunia statis: matriks lokal dihitung sekali (benda bergerak & akarnya tetap otomatis) */
function freeze(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o === root || /^(rana_\d+|jembatan|kisi_\d|lewat_|bobot_)/.test(o.name)) return
    let p = o.parent
    while (p && p !== root) {
      if (/^(rana_\d+|jembatan|kisi_\d)$/.test(p.name)) return
      p = p.parent
    }
    o.updateMatrix()
    o.matrixAutoUpdate = false
  })
}

const SKY_TINT: Record<string, string> = {
  burger: '#9ccbe6',
  pizza: '#f3b38a',
  sushi: '#c6e3ef',
  ramen: '#a9d3ee',
  taco: '#f2d3a0',
  es: '#dcecf6',
  kapal: '#5f7fa3',
  lava: '#3b1c16',
}

/** isi gelembung di atas barang: ikon isi piring, lencana alat berikutnya, centang matang, atau tanda bahaya */
type Bubble = { kind: 'icons'; keys: string[] } | { kind: 'tool'; tool: Tool } | { kind: 'done' } | { kind: 'warn' }
const bubbleKey = (b: Bubble) => (b.kind === 'icons' ? `i|${b.keys.join()}` : b.kind === 'tool' ? `t|${b.tool}` : b.kind)
const BUBBLE_H = 0.6

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** tinggi & skala isi di dalam wadah: wajan dangkal (isi terlihat), panci dalam (isi menyembul di mulutnya) */
const POT_FILL = { wajan: { y: 0.015, s: 0.8 }, panci: { y: 0.13, s: 0.7 } } as const

function potMesh(k: Kit, p: Pot): THREE.Object3D {
  const g = new THREE.Group()
  g.add(make(p.pan))
  const f = potFood(k, p)
  if (f) {
    const o = foodMesh(f.ing, f.s)
    o.position.y = POT_FILL[p.pan].y
    o.scale.setScalar(POT_FILL[p.pan].s)
    g.add(o)
  }
  return g
}

const itemKey = (k: Kit, it: Item) => {
  if (isPlate(it)) return `p|${it.f.join()}`
  if (isExt(it)) return 'ext'
  if (isPot(it)) {
    const f = potFood(k, it)
    return `w|${it.pan}|${f ? `${f.ing}|${f.s}` : ''}`
  }
  return `f|${it.ing}|${it.s}`
}

/** dunia 3D satu dapur */
export class KitchenScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 2, 0.5, 80)
  actors = new THREE.Group()
  particles: Particles
  shadows: boolean
  private items = new Map<number, { key: string; obj: THREE.Object3D; where?: string; popAt?: number }>()
  /** piring yang baru tersaji: meluncur keluar loket lalu hilang */
  private slides: { obj: THREE.Object3D; from: THREE.Vector3; dir: THREE.Vector3; t: number }[] = []
  private serving: { team: number; si: number; ox: number }[] = []
  private stacks = new Map<number, THREE.Object3D[]>()
  private bars = new Map<number, { root: THREE.Object3D; fill: THREE.Mesh; mat: THREE.MeshBasicMaterial }>()
  private target: THREE.Mesh
  private L: Layout
  private tier: Tier
  perf: Perf
  private composer: EffectComposer | null = null
  private sun: THREE.DirectionalLight
  private gimmick: string | null = null
  private bowls = false
  private belts: THREE.Texture[] = []
  private lavaMaps: THREE.Texture[] = []
  /** templat benda bergerak dari GLB luar (lewat_* melintas, bobot_* mengapung/berjalan) */
  templates = new Map<string, THREE.Object3D>()
  /** isi dunia luar (NPC, kendaraan); dipasang Round setelah dimuat */
  outdoor = new THREE.Group()
  /** benda bergerak per salinan dapur: nama → objek & posisi asal */
  private movers: Map<string, { o: THREE.Object3D; y: number; z: number }>[] = []
  private roll = 0
  private rollV = 0
  private ox = 0
  private size: [number, number] = [1, 1]
  /** ikon barang (dirender sekali saat dapur dimuat) */
  icons: Icons = new Map()
  private bubbles = new Map<number, { key: string; sprite: THREE.Sprite }>()
  private bubbleTex = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>()
  private liveBubbles = new Set<number>()

  constructor(canvas: HTMLCanvasElement, perf: Perf, L: Layout) {
    const tier = perf.tier
    this.L = L
    this.tier = tier
    this.perf = perf
    // tanpa composer: MSAA bawaan kanvas; dengan composer: MSAA di target + SMAA
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, tier.ratio))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.shadows = tier.shadow > 0
    this.renderer.shadowMap.enabled = this.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // bayangan digambar ulang sendiri (lihat render): tidak tiap frame
    this.renderer.shadowMap.autoUpdate = false
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
    if (perf.post) {
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
    // langit & kabut per tema: ujung dunia luar memudar ke warna langit, tidak terpotong hitam
    const tint = SKY_TINT[kitchen] ?? '#2a1f2b'
    this.scene.background = new THREE.Color(tint)
    this.scene.fog = new THREE.Fog(tint, 26, 48)
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
    this.icons = bakeIcons(this.renderer, env, kitchen as KitchenId)
    // koki & barang: cahaya langit penuh; dunia: lightmap + sedikit pantulan
    this.scene.environmentIntensity = 1.15
    const tints = (MAP_JSON[`/src/assets/masak/maps/${kitchen}.json`] as { tint?: Record<string, number[]> } | undefined)?.tint ?? {}
    const catchers: THREE.Mesh[] = []
    this.prepWorld(gltf.scene, lm, env, tints, catchers)
    freeze(gltf.scene)
    this.scene.add(gltf.scene)
    this.collectMovers(gltf.scene)
    await this.loadOutside(kitchen, env)
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

  /** siapkan bahan dunia ber-lightmap: tint, pantulan, lightmap uv1, neon, lava, air, sabuk, daun */
  private prepWorld(root: THREE.Object3D, lm: THREE.Texture, env: THREE.Texture, tints: Record<string, number[]>, catchers: THREE.Mesh[]) {
    lm.flipY = false
    lm.channel = 1
    lm.colorSpace = THREE.SRGBColorSpace
    root.traverse((o) => {
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
        // UV kedua = amplitudo goyang kain (petak_lib.Map.join)
        g.setAttribute('sway', g.attributes.uv1)
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
        if (mat.emissiveMap) {
          lavaShader(mat)
          if (!this.lavaMaps.includes(mat.emissiveMap)) this.lavaMaps.push(mat.emissiveMap)
        }
      }
      if (mat.name.startsWith('air_')) {
        mat.transparent = true
        mat.opacity = 0.8
        waterShader(mat, mat.name === 'air_laut' ? 0.08 : 0.015)
      }
      if (mat.name.startsWith('daun_')) leafShader(mat)
      if (mat.name.startsWith('sway_') && g.attributes.sway) {
        mat.side = THREE.DoubleSide
        clothShader(mat)
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
  }

  /** lingkungan di luar dinding (<id>-luar.glb): hanya di sekitar dapur tim sendiri, karena dapur lawan bersebelahan */
  private async loadOutside(kitchen: string, env: THREE.Texture) {
    const url = MAPS[`/src/assets/masak/maps/${kitchen}-luar.glb`]
    const lmUrl = MAPS[`/src/assets/masak/maps/${kitchen}-luar-lm.webp`]
    if (!url || !lmUrl) return
    const [g, lm] = await Promise.all([new GLTFLoader().loadAsync(url), new THREE.TextureLoader().loadAsync(lmUrl)])
    const tints = (MAP_JSON[`/src/assets/masak/maps/${kitchen}-luar.json`] as { tint?: Record<string, number[]> } | undefined)?.tint ?? {}
    const catchers: THREE.Mesh[] = []
    this.prepWorld(g.scene, lm, env, tints, catchers)
    for (const o of [...g.scene.children]) {
      if (!/^(lewat|bobot)_/.test(o.name)) continue
      g.scene.remove(o)
      o.position.set(0, 0, 0)
      this.templates.set(o.name, o)
    }
    freeze(g.scene)
    this.outside = g.scene
    // versus: dunia luar mengikuti dapur yang difokus (lihat focus)
    this.scene.add(g.scene, this.outdoor)
    if (this.shadows) this.outsideCatch = this.catchShadows(g.scene, catchers.filter((m) => m.geometry.attributes.uv1))
  }

  private outside: THREE.Object3D | null = null
  private outsideCatch: THREE.Object3D | null = null

  private collectMovers(root: THREE.Object3D) {
    const map = new Map<string, { o: THREE.Object3D; y: number; z: number }>()
    root.traverse((o) => {
      if (/^(rana_\d+|jembatan|kisi_\d)$/.test(o.name)) map.set(o.name, { o, y: o.position.y, z: o.position.z })
    })
    this.movers.push(map)
  }

  /** gimik tiap dapur: rana lift, jembatan gerbong, sabuk & jalan bergeser, goyangan truk */
  animate(kits: Kit[], dt: number) {
    worldTime.value += dt
    for (const t of this.lavaMaps) t.offset.x += dt * 0.05
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
    const n = this.perf.weather
    if (this.gimmick === 'ship') for (let i = 0; i < Math.round(6 * n); i++) P.emit('rain', rx(), 6, rz(), -1.5, -14, 0, '#bcd8f0', 0.5)
    if (this.gimmick === 'ice') for (let i = 0; i < Math.max(1, Math.round(2 * n)); i++) P.emit('snow', rx(), 4, rz(), 0.3, -0.8, 0, '#ffffff', 0.35)
    if (this.gimmick === 'lava') {
      const L = this.L
      const on = lavaOn(kits[0])
      for (const [x, z] of L.lava[on] ?? []) if (Math.random() < 0.25 * n) P.emit('spark', this.ox + x + (Math.random() - 0.5) * 0.8, 0.05, z + (Math.random() - 0.5) * 0.8, 0, 2.2, 0, '#ffb347', 0.3)
    }
  }

  /** kepulan debu di belakang kaki saat dash */
  dust(x: number, z: number, yaw: number) {
    this.particles.burst('dust', 10, x - Math.sin(yaw) * 0.3, 0.08, z - Math.cos(yaw) * 0.3, -Math.sin(yaw) * 1.2, 0.6, -Math.cos(yaw) * 1.2, 1.6, ['#f4efe8', '#d9d2c6'], 0.5)
  }

  /** truk belok ke `dir`: dapur miring sebentar */
  bump(dir: number) {
    this.rollV += dir * 0.9
  }

  private baseRoll = 0

  /** kamera & peta bayangan mengikuti dapur tim sendiri */
  focus(x: number) {
    this.ox = x
    this.outside?.position.setX(x)
    this.outsideCatch?.position.setX(x)
    this.outdoor.position.setX(x)
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
    return o
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
    this.copyOff = off
    kits.forEach((k, t) => this.syncKit(k, t, t * off, hands, seen))
    for (const [id, e] of this.items) {
      if (seen.has(id)) continue
      this.items.delete(id)
      // piring yang hilang tepat saat tersaji: meluncur keluar lewat loket
      const team = Math.floor(id / 1_000_000)
      const sv = e.key.startsWith('p|') ? this.serving.find((x) => x.team === team) : undefined
      if (sv) {
        const st = this.L.stations[sv.si]
        this.slides.push({ obj: e.obj, from: new THREE.Vector3(st.x + sv.ox, COUNTER_TOP + 0.01, st.z), dir: this.outward(sv.si), t: 0 })
        this.serving = this.serving.filter((x) => x !== sv)
        continue
      }
      this.scene.remove(e.obj)
    }
    this.serving = []
    this.syncPeels(kits, off)
  }

  /** pesanan tersaji di loket `si` dapur `team`: piring yang hilang berikutnya dianimasikan keluar */
  serveAt(team: number, si: number) {
    this.serving.push({ team, si, ox: team * this.copyOff })
  }

  /** arah keluar dapur dari sebuah stasiun di tepi denah */
  private outward(si: number) {
    const L = this.L
    const st = L.stations[si]
    const d = new THREE.Vector3(st.c >= L.w - 1 ? 1 : st.c <= 0 ? -1 : 0, 0, st.r >= L.h - 1 ? 1 : st.r <= 0 ? -1 : 0)
    return d.lengthSq() ? d.normalize() : d.set(1, 0, 0)
  }

  private stepSlides(dt: number) {
    this.slides = this.slides.filter((s) => {
      s.t += dt / 0.55
      const t = Math.min(1, s.t)
      s.obj.position.copy(s.from).addScaledVector(s.dir, t * 1.4)
      s.obj.position.y += Math.sin(t * Math.PI) * 0.12
      s.obj.scale.setScalar(1 - Math.max(0, t - 0.6) * 2)
      if (t < 1) return true
      this.scene.remove(s.obj)
      return false
    })
  }

  private copyOff = 0

  private syncKit(k: Kit, team: number, ox: number, hands: THREE.Vector3[], seen: Set<number>) {
    const L = this.L
    const place = (raw: number, x: number, y: number, z: number, glide = false, where = '') => {
      const it = k.items[raw]
      if (!it) return
      const id = team * 1_000_000 + raw
      seen.add(id)
      const key = itemKey(k, it)
      let e = this.items.get(id)
      if (!e || e.key !== key) {
        if (e) this.scene.remove(e.obj)
        const obj = isPlate(it) ? plateMesh(it.f, false, this.bowls) : isExt(it) ? make('pemadam') : isPot(it) ? potMesh(k, it) : foodMesh(it.ing, it.s)
        obj.traverse((o) => (o.castShadow = this.shadows))
        e = { key, obj }
        this.items.set(id, e)
        this.scene.add(obj)
      }
      // di sabuk barang meluncur halus dari petak ke petak, bukan melompat
      if (glide && e.obj.position.distanceToSquared(TMP.set(x, y, z)) < 2.5) e.obj.position.lerp(TMP, 0.18)
      else e.obj.position.set(x, y, z)
      // putaran sisa lemparan dihapus; terbang & lantai mengatur putarannya sendiri setelah ini
      e.obj.rotation.set(0, 0, 0)
      // pindah tempat (diambil, ditaruh, ditangkap): membal sebentar
      if (where && e.where !== where) {
        if (e.where !== undefined) e.popAt = worldTime.value
        e.where = where
      }
      const pt = e.popAt !== undefined ? (worldTime.value - e.popAt) / 0.22 : 1
      e.obj.scale.setScalar(pt < 1 ? 1 + Math.sin(pt * Math.PI) * 0.3 : 1)
    }
    const lift = { board: 0.035, stove: 0.03, oven: 0.02, belt: 0.01 } as Record<string, number>
    k.hold.forEach((id, si) => id !== null && place(id, L.stations[si].x + ox, COUNTER_TOP + (lift[L.stations[si].kind] ?? 0.005), L.stations[si].z, L.stations[si].kind === 'belt' || this.gimmick === 'truck', L.stations[si].kind === 'belt' ? 'sabuk' : `s${si}`))
    k.hands.forEach((id, a) => id !== null && hands[a] && place(id, hands[a].x, hands[a].y, hands[a].z, false, `a${a}`))
    k.hold.forEach((id, si) => id !== null && this.bubbleFor(k, team, id, si))
    k.hands.forEach((id) => id !== null && this.bubbleFor(k, team, id, -1))
    // lemparan berputar di udara; barang jatuh tergeletak di lantai (dengan gelembung alatnya)
    for (const f of k.flying) {
      place(f.id, f.x + ox, f.y, f.z)
      const e = this.items.get(team * 1_000_000 + f.id)
      if (e) e.obj.rotation.set(f.age * 0.012, f.age * 0.008, 0)
    }
    for (const f of k.floor) {
      place(f.id, f.x + ox, 0.02, f.z)
      const e = this.items.get(team * 1_000_000 + f.id)
      if (e) e.obj.rotation.set(0, (f.id * 1.3) % 6.28, 0)
      this.bubbleFor(k, team, f.id, -1)
    }
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

  /** gelembung di atas satu barang; `si` = stasiun tempatnya, -1 = di tangan */
  /** dapur yang sedang digambar (untuk isi wadah di gelembung) */
  private kitNow: Kit | null = null

  private bubbleFor(k: Kit, team: number, raw: number, si: number) {
    this.kitNow = k
    const it = k.items[raw]
    const e = this.items.get(team * 1_000_000 + raw)
    if (!it || !e) return
    const b = this.bubbleOf(it, si)
    if (!b) return
    const id = team * 1_000_000 + raw
    this.liveBubbles.add(id)
    const key = bubbleKey(b)
    let s = this.bubbles.get(id)
    if (!s || s.key !== key) {
      const t = this.bubbleTexture(b)
      if (!t) return
      if (!s) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, depthTest: false, transparent: true }))
        sprite.renderOrder = 20
        this.scene.add(sprite)
        s = { key, sprite }
        this.bubbles.set(id, s)
      }
      s.key = key
      s.sprite.material.map = t.tex
      s.sprite.material.needsUpdate = true
      const h = b.kind === 'icons' ? BUBBLE_H : BUBBLE_H * 0.85
      s.sprite.scale.set(h * t.aspect, h, 1)
    }
    const p = e.obj.position
    s.sprite.position.set(p.x, p.y + (si < 0 ? 0.5 : 0.55), p.z)
    // tanda bahaya berkedip makin cepat menjelang gosong
    if (b.kind === 'warn' && isFood(it)) s.sprite.visible = Math.floor(k.t / Math.max(110, 330 - it.p * 260)) % 2 === 0
    else s.sprite.visible = true
  }

  private bubbleOf(it: Item, si: number): Bubble | null {
    if (isPlate(it)) return it.f.length ? { kind: 'icons', keys: it.f.map((c) => { const [i, st] = c.split(':'); return ingKey(i as Ing, st) }) } : null
    const kind = si >= 0 ? this.L.stations[si].kind : null
    const heat = si >= 0 && this.kitNow ? heatAt(this.kitNow, si) : null
    if (isPot(it)) {
      const f = this.kitNow ? potFood(this.kitNow, it) : undefined
      if (!f || f.s === 'burnt') return null
      if (heat && f.s === AFTER[heat]) return f.p > 0.45 ? { kind: 'warn' } : { kind: 'done' }
      // di luar kompor, atau sedang dimasak: tunjukkan isinya
      return heat && nextStep(f.ing, f.s) === heat ? null : { kind: 'icons', keys: [ingKey(f.ing, f.s)] }
    }
    if (!isFood(it) || it.s === 'burnt') return null
    if (heat) {
      if (it.s === AFTER[heat]) return it.p > 0.45 ? { kind: 'warn' } : { kind: 'done' }
      return null
    }
    const step = nextStep(it.ing, it.s)
    if (!step) return null
    // sedang dipotong: bar progres sudah cukup
    if (kind === 'board' && step === 'cut' && it.p > 0) return null
    return { kind: 'tool', tool: toolOf(it.ing, step) }
  }

  private bubbleTexture(b: Bubble) {
    const key = bubbleKey(b)
    const hit = this.bubbleTex.get(key)
    if (hit) return hit
    const cell = 64
    const pad = 8
    const n = b.kind === 'icons' ? b.keys.length : 1
    const c = document.createElement('canvas')
    c.width = n * cell + pad * 2
    c.height = cell + pad * 2 + 14
    const g = c.getContext('2d')!
    const bodyH = cell + pad * 2
    const fill = b.kind === 'warn' ? '#ff3b30' : b.kind === 'done' ? '#5cf64a' : '#fffdf8'
    // ekor gelembung menunjuk ke barang
    g.fillStyle = fill
    g.strokeStyle = INK
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(c.width / 2 - 10, bodyH - 3)
    g.lineTo(c.width / 2, c.height - 2)
    g.lineTo(c.width / 2 + 10, bodyH - 3)
    g.closePath()
    g.fill()
    g.stroke()
    roundRect(g, 3, 3, c.width - 6, bodyH - 6, 16)
    g.fill()
    g.stroke()
    if (b.kind === 'icons') {
      b.keys.forEach((k0, i) => {
        const ic = this.icons.get(k0)
        if (ic) g.drawImage(ic.canvas, pad + i * cell - 4, pad - 4, cell + 8, cell + 8)
      })
    } else if (b.kind === 'tool') {
      drawTool(g, b.tool, pad + 6, pad + 6, cell - 12)
    } else {
      g.fillStyle = b.kind === 'warn' ? '#ffffff' : INK
      g.font = `900 ${cell - 8}px system-ui, sans-serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(b.kind === 'warn' ? '!' : '✓', c.width / 2, pad + cell / 2 + 3)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const out = { tex, aspect: c.width / c.height }
    this.bubbleTex.set(key, out)
    return out
  }

  private pruneBubbles() {
    for (const [id, b] of this.bubbles) {
      if (this.liveBubbles.has(id)) continue
      this.scene.remove(b.sprite)
      b.sprite.material.dispose()
      this.bubbles.delete(id)
    }
    this.liveBubbles.clear()
  }

  /** titik layar (piksel CSS) untuk posisi dunia di atas stasiun; untuk angka poin yang melayang */
  screenOf(si: number, ox = 0): [number, number] | null {
    const st = this.L.stations[si]
    if (!st) return null
    TMP.set(st.x + ox, COUNTER_TOP + 0.6, st.z).project(this.camera)
    return [((TMP.x + 1) / 2) * this.size[0], ((1 - TMP.y) / 2) * this.size[1]]
  }

  private syncBars(k: Kit, team: number, ox: number) {
    const L = this.L
    k.hold.forEach((_, si) => {
      const it = contentAt(k, si)
      const kind = L.stations[si].kind
      const heat = heatAt(k, si)
      if (!it || (kind !== 'board' && kind !== 'stove' && kind !== 'oven')) return
      const cooking = !!heat && nextStep(it.ing, it.s) === heat
      const burning = !!heat && it.s === AFTER[heat]
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
    this.pruneBubbles()
    this.fxIn -= dt
    const tick = this.fxIn <= 0
    if (tick) {
      this.fxIn = 1 / 30
      kits.forEach((k, t) => this.kitEffects(k, t * off, hands))
    }
    this.flyTosses(dt)
    this.stepSlides(dt)
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
        const it = contentAt(k, si)
        if (st.kind === 'stove' && it && Math.random() < 0.35) {
          const color = it.s === 'burnt' ? '#2a2426' : (it.s === 'cooked' || it.s === 'boiled') && it.p > 0.5 ? '#6a5a55' : '#f4efe8'
          P.emit('smoke', st.x + (Math.random() - 0.5) * 0.3, y + 0.05, st.z + (Math.random() - 0.5) * 0.3, 0, 0.6, 0, color, 0.28)
          if (it.s !== 'burnt' && Math.random() < 0.3) P.emit('spark', st.x, y, st.z, (Math.random() - 0.5) * 1.2, 1.5, (Math.random() - 0.5) * 1.2, '#ffe2a8', 0.2)
        }
      })
      // jejak lemparan: serpih putih kecil di belakang bahan yang terbang
      for (const f of k.flying) P.emit('snow', f.x + ox, f.y, f.z, -f.vx * 0.05, 0.2, -f.vz * 0.05, '#fffdf2', 0.18)
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

  /**
   * HP kewalahan, satu langkah per panggilan: efek layar mati (MSAA kanvas tetap aktif) → bayangan lebih jarang →
   * resolusi turun sampai 1,25 → bayangan mati. false = sudah paling ringan.
   */
  lowerQuality(): boolean {
    if (this.composer) {
      this.composer.dispose()
      this.composer = null
      return true
    }
    if (this.shadows && this.perf.shadowEvery < 3) {
      this.perf = { ...this.perf, shadowEvery: 3 }
      return true
    }
    // resolusi tidak turun di bawah 1,25: tepi dunia luar (gedung, pagar, rel) jadi bergerigi kalau lebih rendah
    const r = this.renderer.getPixelRatio()
    if (r > 1.25) {
      this.renderer.setPixelRatio(Math.max(1.25, r - 0.25))
      this.resize(this.size[0], this.size[1])
      return true
    }
    if (this.shadows) {
      this.shadows = false
      this.renderer.shadowMap.enabled = false
      this.sun.castShadow = false
      this.scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && (m.material as THREE.Material).type === 'ShadowMaterial') m.visible = false
      })
      return true
    }
    return false
  }

  private frameNo = 0

  render() {
    if (this.shadows && this.frameNo++ % this.perf.shadowEvery === 0) this.renderer.shadowMap.needsUpdate = true
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
