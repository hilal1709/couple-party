import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { store } from '@/net/transport'

export type Quality = 'low' | 'med' | 'high'

/** msaa: sampel anti-aliasing jalur bloom; tanpa bloom kanvas memakai MSAA bawaan browser */
type Tier = { ratio: number; shadow: number; bloom: boolean; msaa: number }

const TIERS: Record<Quality, Tier> = {
  low: { ratio: 1, shadow: 0, bloom: false, msaa: 0 },
  med: { ratio: 1.25, shadow: 1024, bloom: true, msaa: 2 },
  high: { ratio: 1.75, shadow: 2048, bloom: true, msaa: 4 },
}

/** Sentuhan akhir: kontras & saturasi sedikit naik, tepi layar menggelap supaya mata ke tengah. */
const GRADE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
      c.rgb = mix(vec3(l), c.rgb, 1.12);
      c.rgb = (c.rgb - 0.5) * 1.06 + 0.5;
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - dot(d, d) * 0.55;
      gl_FragColor = c;
    }`,
}

export const QUALITY_TITLE: Record<Quality, string> = { low: 'Hemat', med: 'Sedang', high: 'Tinggi' }
export const QUALITIES: Quality[] = ['low', 'med', 'high']

const KEY = 'couple-party:sport-quality'

/** tingkat tersimpan; kosong = mulai dari tebakan memori HP */
export function savedQuality(): Quality {
  const v = store.getItem(KEY)
  if (v === 'low' || v === 'med' || v === 'high') return v
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  return mem <= 3 ? 'low' : 'med'
}

export const saveQuality = (q: Quality) => store.setItem(KEY, q)

/** Renderer, kamera, dan putaran gambar yang dipakai bersama semua cabang. */
export class Stage {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80)
  /** lampu utama pembuat bayangan; diatur per arena */
  sun = new THREE.DirectionalLight('#ffffff', 2)
  /** dipanggil tiap gambar dengan selisih waktu (detik) */
  onFrame: (dt: number) => void = () => {}
  /** tingkat grafis diturunkan otomatis karena fps rendah */
  onDowngrade: (q: Quality) => void = () => {}

  private composer: EffectComposer | null = null
  private canvas: HTMLCanvasElement
  private ro: ResizeObserver
  private raf = 0
  private last = 0
  private slow = 0
  private frames = 0
  private since = 0
  quality: Quality

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas
    this.quality = quality
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.sun.shadow.bias = -0.0006
    this.scene.add(this.sun, this.sun.target)
    this.setQuality(quality)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
  }

  setQuality(q: Quality) {
    this.quality = q
    const t = TIERS[q]
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, t.ratio))
    this.renderer.shadowMap.enabled = t.shadow > 0
    this.sun.castShadow = t.shadow > 0
    if (t.shadow) this.sun.shadow.mapSize.set(t.shadow, t.shadow)
    this.sun.shadow.map?.dispose()
    this.sun.shadow.map = null
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true
    })
    this.composer?.dispose()
    this.composer = null
    if (t.bloom) {
      // kanvas tidak ikut menggambar adegan saat ada bloom, jadi target gambarnya harus multisample sendiri
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(t.msaa, this.renderer.capabilities.maxSamples) })
      const c = new EffectComposer(this.renderer, target)
      c.addPass(new RenderPass(this.scene, this.camera))
      c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.4, 1))
      c.addPass(new OutputPass())
      c.addPass(new ShaderPass(GRADE))
      this.composer = c
    }
    this.resize()
  }

  private resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  start() {
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (t - (this.last || t)) / 1000)
      this.last = t
      this.onFrame(dt)
      if (this.composer) this.composer.render()
      else this.renderer.render(this.scene, this.camera)
      this.watchFps(t)
    }
    this.raf = requestAnimationFrame(loop)
  }

  /** dua periode 4 detik berturut di bawah 26 fps → turun satu tingkat */
  private watchFps(t: number) {
    this.frames++
    if (!this.since) this.since = t
    if (t - this.since < 4000) return
    const fps = (this.frames * 1000) / (t - this.since)
    this.frames = 0
    this.since = t
    this.slow = fps < 26 ? this.slow + 1 : 0
    if (this.slow < 2 || this.quality === 'low') return
    this.slow = 0
    const q = this.quality === 'high' ? 'med' : 'low'
    this.setQuality(q)
    this.onDowngrade(q)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.composer?.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const m = mesh.material
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
        ;(mat as THREE.MeshStandardMaterial).map?.dispose()
        mat.dispose()
      }
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }
}
