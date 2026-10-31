import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { Tier } from '@/games/kart/render/quality'
import { MAP_INFO, mapData, type MapInfo } from '../maps'
import type { MapId } from '../types'
import type { Pattern } from './paint'

/** harus sama dengan LM_RANGE di scripts/blender/petak_lib.py */
const LM_RANGE = 3

const ASSETS = import.meta.glob('/src/assets/petak/maps/*.{glb,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SKIES = import.meta.glob('/src/assets/kart/tex/langit-*.hdr', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export type Picked = {
  /** warna linear sebelum tone mapping, rata-rata 8×8 piksel */
  color: THREE.Vector3
  pattern: Pattern | null
}

function textureAverage(tex: THREE.Texture): THREE.Vector3 {
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(tex.image as CanvasImageSource, 0, 0, 8, 8)
  const d = g.getImageData(0, 0, 8, 8).data
  const out = new THREE.Vector3()
  const c1 = new THREE.Color()
  for (let i = 0; i < d.length; i += 4) {
    c1.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace)
    out.x += c1.r
    out.y += c1.g
    out.z += c1.b
  }
  return out.divideScalar(64)
}

/** kereta: dari luar map di barat sampai ekornya lewat di timur */
const TRAIN_START = -36
const TRAIN_END = 96
const TRAIN_SPEED = 16
const TRAIN_EVERY = 38

const edgeA = new THREE.Vector3()
const edgeB = new THREE.Vector3()

/** satuan UV per meter pada segitiga yang tersentuh */
function uvDensity(mesh: THREE.Mesh, face: THREE.Face): number {
  const pos = mesh.geometry.attributes.position
  const uv = mesh.geometry.attributes.uv
  edgeA.fromBufferAttribute(pos, face.a)
  edgeB.fromBufferAttribute(pos, face.b)
  const len = edgeA.distanceTo(edgeB)
  const du = uv.getX(face.a) - uv.getX(face.b)
  const dv = uv.getY(face.a) - uv.getY(face.b)
  return len > 1e-5 ? Math.hypot(du, dv) / len : 0.5
}

/** semua benda yang bergoyang memakai jam yang sama */
const shared = { uTime: { value: 0 } }

/** kain & sachet: amplitudo per titik dari UV ketiga Blender */
function clothShader(m: THREE.Material) {
  extend(m, 'kain', (sh) => {
    sh.uniforms.uTime = shared.uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute vec2 sway;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        float wave = sin(uTime * 2.3 + position.x * 1.4 + position.z * 1.1) + 0.5 * sin(uTime * 5.1 + position.z * 3.0);
        transformed += vec3(0.55, 0.0, 0.8) * wave * sway.x * 0.55;`,
      )
  })
}

/** daun: makin tinggi makin goyang */
function leafShader(m: THREE.Material) {
  extend(m, 'daun', (sh) => {
    sh.uniforms.uTime = shared.uTime
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float amp = smoothstep(0.4, 5.0, wp.y) * 0.1 + 0.015;
      float flut = sin(uTime * 6.0 + wp.x * 3.1 + wp.y * 2.3 + wp.z * 2.7) * 0.012;
      transformed += vec3(1.0, 0.1, 0.6) * sin(uTime * 1.7 + wp.x * 0.7 + wp.z * 0.5) * amp + vec3(flut, flut * 0.6, flut);`,
    )
  })
}

/** luas segitiga terkecil (m²) yang ikut menerima bayangan benda bergerak */
const CATCH_AREA = 0.04
const TRI = new THREE.Triangle()

/** air selokan: riak bergeser menurut posisi dunia */
function waterShader(m: THREE.Material) {
  extend(m, 'air', (sh) => {
    sh.uniforms.uTime = shared.uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWorld;').replace(
      '#include <dithering_fragment>',
      /* glsl */ `float r = sin(vWorld.x * 3.0 - uTime * 2.2) * sin(vWorld.x * 7.3 + vWorld.z * 13.0 - uTime * 3.1);
      gl_FragColor.rgb += vec3(0.12, 0.16, 0.15) * smoothstep(0.3, 1.0, r);
      #include <dithering_fragment>`,
    )
  })
}

/** perkecil gambar tekstur sebelum diunggah, supaya HP lemah tidak kehabisan memori */
function shrink(tex: THREE.Texture, max: number) {
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined
  if (!img || Math.max(img.width, img.height) <= max || tex.userData.shrunk) return
  const c = document.createElement('canvas')
  c.width = c.height = max
  c.getContext('2d')!.drawImage(img, 0, 0, max, max)
  tex.image = c
  tex.userData.shrunk = true
}

/** color grading ringan setelah tone mapping: kontras, saturasi, dan vignette */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.08 }, uCon: { value: 1.06 }, uVig: { value: 0.2 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uSat; uniform float uCon; uniform float uVig;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 o = mix(vec3(l), c.rgb, uSat);
      o = (o - 0.5) * uCon + 0.5;
      vec2 d = vUv - 0.5;
      gl_FragColor = vec4(o * (1.0 - uVig * smoothstep(0.25, 0.75, dot(d, d) * 2.0)), c.a);
    }`,
}

/** tambah kode shader tanpa menimpa yang sudah ada; `tag` membedakan program di cache three */
function extend(m: THREE.Material, tag: string, fn: (sh: THREE.WebGLProgramParametersWithUniforms) => void) {
  const prev = m.onBeforeCompile
  const prevKey = m.customProgramCacheKey.call(m)
  m.onBeforeCompile = function (sh, r) {
    prev.call(this, sh, r)
    fn(sh)
  }
  m.customProgramCacheKey = () => `${prevKey}|${tag}`
}

/** bayangan awan berjalan melintasi map */
function cloudShade(m: THREE.Material) {
  extend(m, 'awan', (sh) => {
    sh.uniforms.uCloudTime = shared.uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCloud;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCloud = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uCloudTime;\nvarying vec3 vCloud;').replace(
      '#include <dithering_fragment>',
      /* glsl */ `float awan = sin(vCloud.x * 0.09 + uCloudTime * 0.16) + sin(vCloud.z * 0.13 - uCloudTime * 0.11) + 0.6 * sin((vCloud.x + vCloud.z) * 0.27 + uCloudTime * 0.2);
      gl_FragColor.rgb *= 1.0 - 0.2 * smoothstep(0.3, 1.5, awan);
      #include <dithering_fragment>`,
    )
  })
}

/** laut: ombak di vertex shader, pucuknya memutih */
function seaShader(m: THREE.Material) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vH;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vH = sin(position.x * 0.5 + uTime * 1.1) * 0.5 + sin(position.z * 0.8 - uTime * 1.5) * 0.35 + sin((position.x + position.z) * 1.7 + uTime * 2.3) * 0.15;
        transformed.y += vH * 0.7;`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <dithering_fragment>', 'gl_FragColor.rgb += vec3(0.5, 0.56, 0.6) * smoothstep(0.45, 0.85, vH);\n#include <dithering_fragment>')
  }
}

/** satu map yang sudah dimuat: renderer, dunia ber-lightmap, langit, shader goyang, pipet */
export class World {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 300)
  /** benda dunia yang bisa disentuh pipet */
  readonly room = new THREE.Group()
  /** badan pemain: disembunyikan saat pipet dan pengambilan latar */
  readonly actors = new THREE.Group()
  private composer: EffectComposer | null = null
  private ray = new THREE.Raycaster()
  private pickTarget = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType, depthBuffer: true })
  private captureTarget = new THREE.WebGLRenderTarget(128, 128, { type: THREE.HalfFloatType, depthBuffer: true })
  private camoA = new THREE.WebGLRenderTarget(48, 48, { type: THREE.HalfFloatType, depthBuffer: true })
  private camoB = new THREE.WebGLRenderTarget(48, 48, { type: THREE.HalfFloatType, depthBuffer: true })
  private captureCam = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
  private averages = new Map<THREE.Texture, THREE.Vector3>()
  private neon: { mat: THREE.MeshStandardMaterial; base: number; seed: number }[] = []
  private spinners: { o: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[] = []
  private belts: THREE.Texture[] = []
  private train: THREE.Object3D | null = null
  private trainLap = -1
  private sun: THREE.DirectionalLight | null = null
  private sunDir = new THREE.Vector3(-0.5, 0.75, -0.45).normalize()
  private info: MapInfo
  private ratio: number
  private canvas: HTMLCanvasElement
  private tier: Tier
  private map: MapId
  private w = 1
  private h = 1

  constructor(canvas: HTMLCanvasElement, tier: Tier, map: MapId) {
    this.canvas = canvas
    this.tier = tier
    this.map = map
    this.info = MAP_INFO[map]
    this.ratio = Math.min(tier.ratio, window.devicePixelRatio || 1)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.post, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.ratio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    if (tier.shadow) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    if (tier.post) this.buildComposer()
    this.scene.add(this.room, this.actors)
  }

  private buildComposer() {
    // MSAA di target composer: tanpa ini `antialias` kanvas tidak berlaku saat ada efek layar
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }))
    this.composer.setPixelRatio(this.ratio)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.1, 0.5, 1.05))
    this.composer.addPass(new OutputPass())
    this.composer.addPass(new ShaderPass(GRADE))
    this.composer.addPass(new SMAAPass())
  }

  async load() {
    const info = this.info
    const [sky, gltf, lm] = await Promise.all([
      new HDRLoader().loadAsync(SKIES[`/src/assets/kart/tex/langit-${info.sky}.hdr`]),
      new GLTFLoader().loadAsync(ASSETS[`/src/assets/petak/maps/${this.map}.glb`]),
      new THREE.TextureLoader().loadAsync(ASSETS[`/src/assets/petak/maps/${this.map}-lm.webp`]),
    ])
    sky.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromEquirectangular(sky).texture
    pmrem.dispose()
    this.scene.background = sky
    this.scene.environmentIntensity = info.env
    this.scene.backgroundIntensity = info.bg

    lm.flipY = false
    lm.channel = 1
    lm.colorSpace = THREE.SRGBColorSpace
    lm.anisotropy = 2
    const tint = mapData(this.map).tint
    gltf.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      const c = mat && tint[mat.name]
      if (c) mat.color.setRGB(c[0], c[1], c[2])
    })
    const moving = new Set<THREE.Object3D>()
    for (const s of info.spinners ?? []) {
      const o = gltf.scene.getObjectByName(s.name)
      if (o) {
        this.spinners.push({ o, axis: s.axis, speed: s.speed })
        moving.add(o)
      }
    }
    if (info.train) {
      this.train = gltf.scene.getObjectByName('kereta') ?? null
      if (this.train) {
        moving.add(this.train)
        this.train.visible = false
      }
    }
    const sea = gltf.scene.getObjectByName('laut_ombak')
    if (sea) moving.add(sea)
    for (const o of moving) o.traverse((c) => (c as THREE.Mesh).isMesh && this.setupMover(c as THREE.Mesh))
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !m.userData.mover) this.setupMesh(m, lm)
    })
    this.room.add(gltf.scene)
    // serakan kecil hanya untuk tingkat Sedang ke atas
    if (!this.tier.pbr) gltf.scene.traverse((o) => o.name.startsWith('detail_') && (o.visible = false))
    if (this.tier.shadow) this.setupShadows(gltf.scene)
  }

  /**
   * Bayangan benda bergerak di dunia ber-lightmap. Lampu berintensitas 0 tidak menambah cahaya apa pun,
   * hanya mengisi peta bayangan; salinan mesh ber-ShadowMaterial menggambar gelapnya di atas dunia.
   */
  private setupShadows(root: THREE.Object3D) {
    const sun = new THREE.DirectionalLight(0xffffff, 0)
    const data = mapData(this.map).sun
    if (data) this.sunDir.set(data[0], data[2], -data[1]).normalize()
    // matahari rendah membuat bayangan terlalu panjang untuk permainan
    this.sunDir.y = Math.max(this.sunDir.y, 0.55)
    this.sunDir.normalize()
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(this.tier.shadow)
    sun.shadow.bias = -0.0008
    sun.shadow.normalBias = 0.03
    const c = sun.shadow.camera
    c.left = c.bottom = -15
    c.right = c.top = 15
    c.near = 1
    c.far = 80
    this.scene.add(sun, sun.target)
    this.sun = sun
    const catcher = new THREE.ShadowMaterial({ color: 0x0b1020, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    const meshes: THREE.Mesh[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.mover) return
      const name = (m.material as THREE.Material).name
      if (!name.startsWith('daun_') && !name.startsWith('sway_') && !name.startsWith('neon_') && !name.startsWith('air_') && !name.startsWith('decal_')) meshes.push(m)
    })
    // cukup bidang besar seperti lantai dan dinding, digabung jadi satu: model scan akan menggandakan beban
    const tris: number[] = []
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c2 = new THREE.Vector3()
    root.updateWorldMatrix(true, true)
    for (const m of meshes) {
      const pos = m.geometry.attributes.position
      const idx = m.geometry.index
      const count = idx ? idx.count : pos.count
      for (let i = 0; i + 2 < count; i += 3) {
        a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld)
        b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld)
        c2.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld)
        if (TRI.set(a, b, c2).getArea() >= CATCH_AREA) tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c2.x, c2.y, c2.z)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3))
    geo.computeVertexNormals()
    const o = new THREE.Mesh(geo, catcher)
    o.receiveShadow = true
    o.raycast = () => {}
    this.scene.add(o)
  }

  get shadows() {
    return !!this.sun
  }

  /** peta bayangan mengikuti titik pandang */
  follow(x: number, z: number) {
    if (!this.sun) return
    this.sun.target.position.set(x, 0, z)
    this.sun.position.set(x + this.sunDir.x * 40, this.sunDir.y * 40, z + this.sunDir.z * 40)
  }

  /** benda bergerak tak punya lightmap: bahannya disalin supaya tak ikut bahan dunia, lalu diberi cahaya sendiri */
  private setupMover(m: THREE.Mesh) {
    m.userData.mover = true
    const mat = (m.material as THREE.MeshStandardMaterial).clone()
    m.material = mat
    if (mat.map) mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping
    if (mat.name.startsWith('air_laut')) seaShader(mat)
    if (mat.emissiveIntensity > 0 && mat.emissive.getHex() !== 0) return
    mat.emissive.copy(mat.color)
    mat.emissiveMap = mat.map
    mat.emissiveIntensity = this.info.fill
  }

  private setupMesh(m: THREE.Mesh, lm: THREE.Texture) {
    const mat = m.material as THREE.MeshPhysicalMaterial
    // kaca model scan: `transmission` membuat three merender seluruh dunia dua kali tiap frame
    mat.transmission = 0
    if (this.info.clouds && !mat.name.startsWith('neon_')) cloudShade(mat)
    if (mat.name.startsWith('decal_')) {
      mat.depthWrite = false
      mat.polygonOffset = true
      mat.polygonOffsetFactor = -1
      mat.polygonOffsetUnits = -1
    }
    // tekstur 2K hanya dipakai utuh di tingkat Tinggi
    if (this.tier.q !== 'high' && mat.map) shrink(mat.map, this.tier.pbr ? 1024 : 768)
    if (this.tier.q !== 'high' && mat.normalMap) shrink(mat.normalMap, 768)
    // tingkat Hemat: peta normal dibuang sebelum diunggah, separuh memori GPU kembali; lightmap sudah membawa bentuk cahaya
    if (!this.tier.pbr && mat.normalMap) {
      mat.normalMap.dispose()
      mat.normalMap = null
    }
    if (mat.map) {
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping
      mat.map.anisotropy = this.tier.q === 'high' ? 8 : this.tier.post ? 4 : 2
    }
    if (mat.name.startsWith('daun_')) {
      // daun tidak ikut lightmap (kartu beralpha memboroskan atlas): cerah sendiri dengan warna tekstur
      mat.alphaTest = 0.45
      mat.alphaToCoverage = true
      mat.transparent = false
      mat.side = THREE.DoubleSide
      mat.emissive.set(0xffe2c4)
      mat.emissiveMap = mat.map
      mat.emissiveIntensity = this.info.leaf
      leafShader(mat)
      return
    }
    // urutan layer di Blender: UVMap, Sway, Lightmap → glTF uv, uv1, uv2
    const g = m.geometry
    if (g.attributes.uv2) {
      g.setAttribute('sway', g.attributes.uv1)
      g.setAttribute('uv1', g.attributes.uv2)
      g.deleteAttribute('uv2')
      mat.lightMap = lm
      // three membagi irradiance dengan π, Blender tidak
      mat.lightMapIntensity = LM_RANGE * Math.PI * (this.info.lm ?? 1)
    }
    if (mat.name.startsWith('sway_') && g.attributes.sway) {
      mat.side = THREE.DoubleSide
      if (mat.map) {
        // motif kain dibesarkan supaya terbaca dari jauh; kain tipis tak dapat cahaya bake di sisi belakang
        mat.map.repeat.set(0.45, 0.45)
        mat.emissive.copy(mat.color)
        mat.emissiveMap = mat.map
        mat.emissiveIntensity = 0.45
      }
      clothShader(mat)
    } else if (mat.name.startsWith('neon_')) {
      this.neon.push({ mat, base: mat.emissiveIntensity || 1, seed: this.neon.length * 7.3 })
    } else if (mat.name.startsWith('air_')) {
      waterShader(mat)
    } else if (mat.name.startsWith('belt_') && mat.map) {
      this.belts.push(mat.map)
    }
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** dipanggil saat HP kewalahan: pixel ratio turun, lalu efek layar dimatikan */
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
      return true
    }
    return false
  }

  /** true = kereta baru mulai melintas */
  update(t: number): boolean {
    shared.uTime.value = t
    for (const s of this.spinners) s.o.rotation[s.axis] = t * s.speed
    for (const b of this.belts) b.offset.x = -t * 0.18
    this.scene.backgroundRotation.y = t * 0.002
    for (const n of this.neon) {
      const a = Math.sin(t * 13 + n.seed) * Math.sin(t * 2.7 + n.seed)
      n.mat.emissiveIntensity = n.base * (a > 0.93 ? 0.35 : 1)
    }
    if (!this.train) return false
    const lap = Math.floor(t / TRAIN_EVERY)
    const x = TRAIN_START + (t - lap * TRAIN_EVERY) * TRAIN_SPEED
    this.train.position.x = x
    this.train.visible = x < TRAIN_END
    const started = lap !== this.trainLap
    this.trainLap = lap
    return started
  }

  render() {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private readHdr(rt: THREE.WebGLRenderTarget): Float32Array {
    const px = new Uint16Array(rt.width * rt.height * 4)
    this.renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px)
    const out = new Float32Array(px.length)
    for (let i = 0; i < px.length; i++) out[i] = THREE.DataUtils.fromHalfFloat(px[i])
    return out
  }

  /** pipet: render ulang 8×8 piksel di sekitar sentuhan ke buffer HDR, tanpa badan yang menghalangi */
  pick(x: number, y: number): Picked | null {
    const rect = this.canvas.getBoundingClientRect()
    const r = this.renderer
    this.actors.visible = false
    const prev = r.getRenderTarget()
    this.camera.setViewOffset(rect.width, rect.height, x - 4, y - 4, 8, 8)
    this.camera.updateMatrixWorld()
    r.setRenderTarget(this.pickTarget)
    r.clear()
    r.render(this.scene, this.camera)
    r.setRenderTarget(prev)
    const px = this.readHdr(this.pickTarget)
    this.camera.clearViewOffset()
    this.camera.updateMatrixWorld()
    this.actors.visible = true

    const color = new THREE.Vector3()
    for (let i = 0; i < px.length; i += 4) {
      color.x += px[i]
      color.y += px[i + 1]
      color.z += px[i + 2]
    }
    color.divideScalar(64)

    this.ray.setFromCamera(new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1), this.camera)
    const hit = this.ray.intersectObject(this.room, true)[0]
    const mesh = hit?.object as THREE.Mesh | undefined
    const map = (mesh?.material as THREE.MeshStandardMaterial | undefined)?.map
    if (!mesh || !map || !hit.face) return { color, pattern: null }
    let avg = this.averages.get(map)
    if (!avg) this.averages.set(map, (avg = textureAverage(map)))
    return { color, pattern: { map, avg, uvPerMeter: uvDensity(mesh, hit.face) } }
  }

  private aimAt(cam: THREE.PerspectiveCamera, x: number, y: number, z: number, yaw: number, back: number) {
    cam.position.set(x + Math.sin(yaw) * back, y + 1.0, z + Math.cos(yaw) * back)
    cam.lookAt(x, y + 0.6, z)
    cam.updateMatrixWorld()
    cam.updateProjectionMatrix()
  }

  /** gambar latar di belakang titik, dilihat dari depan; dipakai bot untuk meniru permukaan */
  capture(x: number, y: number, z: number, yaw: number) {
    const r = this.renderer
    const prev = r.getRenderTarget()
    this.actors.visible = false
    this.aimAt(this.captureCam, x, y, z, yaw, 2.4)
    r.setRenderTarget(this.captureTarget)
    r.clear()
    r.render(this.scene, this.captureCam)
    r.setRenderTarget(prev)
    this.actors.visible = true
    const vp = new THREE.Matrix4().multiplyMatrices(this.captureCam.projectionMatrix, this.captureCam.matrixWorldInverse)
    const px = this.readHdr(this.captureTarget)
    const avg = new THREE.Vector3()
    for (let i = 0; i < px.length; i += 4) {
      avg.x += px[i]
      avg.y += px[i + 1]
      avg.z += px[i + 2]
    }
    return { texture: this.captureTarget.texture, vp, avg: avg.divideScalar(px.length / 4) }
  }

  /**
   * Seberapa menyatu badan ini dengan latarnya, 0..1. Layar kecil dirender dengan dan tanpa badan;
   * yang dibandingkan piksel-pikselnya, jadi nilainya menilai cat sungguhan, bukan posisi pemain.
   */
  camoScore(body: THREE.Object3D, x: number, y: number, z: number, yaw: number): number {
    const r = this.renderer
    const prev = r.getRenderTarget()
    const others = this.actors.children.filter((c) => c !== body)
    for (const o of others) o.visible = false
    this.aimAt(this.captureCam, x, y, z, yaw, 3)
    const snap = (rt: THREE.WebGLRenderTarget) => {
      r.setRenderTarget(rt)
      r.clear()
      r.render(this.scene, this.captureCam)
      return this.readHdr(rt)
    }
    body.visible = true
    const withBody = snap(this.camoA)
    body.visible = false
    const without = snap(this.camoB)
    body.visible = true
    for (const o of others) o.visible = true
    r.setRenderTarget(prev)
    let diff = 0
    let n = 0
    for (let i = 0; i < withBody.length; i += 4) {
      const d = Math.abs(withBody[i] - without[i]) + Math.abs(withBody[i + 1] - without[i + 1]) + Math.abs(withBody[i + 2] - without[i + 2])
      if (d > 0.0005) {
        diff += Math.min(1.5, d / (without[i] + without[i + 1] + without[i + 2] + 0.15))
        n++
      }
    }
    return n ? Math.max(0, Math.min(1, 1 - diff / n / 1.1)) : 1
  }

  dispose() {
    for (const t of [this.pickTarget, this.captureTarget, this.camoA, this.camoB]) t.dispose()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      const mat = m.material as THREE.MeshStandardMaterial
      mat.map?.dispose()
      mat.normalMap?.dispose()
      mat.dispose()
    })
    this.composer?.dispose()
    this.renderer.dispose()
    // tiap ronde memakai kanvas baru dan browser membatasi jumlah context WebGL yang hidup.
    // Ditunda satu tick: StrictMode memasang ulang di kanvas yang sama, dan context itu masih dipakai.
    const { renderer, canvas } = this
    setTimeout(() => {
      if (!canvas.isConnected) renderer.forceContextLoss()
    })
  }
}
