import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { store } from '@/net/transport'

export type Quality = 'low' | 'med' | 'high'

/**
 * Anti-aliasing tiap tingkat:
 * - low: MSAA bawaan kanvas (antialias: true), tanpa post-processing
 * - med: target MSAA 4 sampel untuk jalur bloom
 * - high: MSAA 4 sampel + SMAA di akhir (menghaluskan juga tepi tekstur & garis shader)
 */
type Tier = { ratio: number; shadow: number; post: boolean; msaa: number; smaa: boolean }

const TIERS: Record<Quality, Tier> = {
  low: { ratio: 1.25, shadow: 0, post: false, msaa: 0, smaa: false },
  med: { ratio: 1.5, shadow: 1024, post: true, msaa: 4, smaa: false },
  high: { ratio: 2, shadow: 2048, post: true, msaa: 4, smaa: true },
}

export const QUALITY_TITLE: Record<Quality, string> = { low: 'Hemat', med: 'Sedang', high: 'Tinggi' }
export const QUALITIES: Quality[] = ['low', 'med', 'high']

/** Grading akhir: kontras, vignette, butiran film halus, dan denyut merah saat waktu hampir habis. */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHeat: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHeat; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
      c.rgb = mix(vec3(l), c.rgb, 1.08);
      c.rgb = (c.rgb - 0.5) * 1.05 + 0.5;
      vec2 d = vUv - 0.5;
      float vig = dot(d, d);
      c.rgb *= 1.0 - vig * 0.7;
      float pulse = 0.5 + 0.5 * sin(uTime * 6.2831 * 1.2);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.25, 0.72, 0.68), uHeat * (0.35 + 0.35 * pulse) * smoothstep(0.02, 0.3, vig));
      c.rgb += (hash(vUv * 731.0 + fract(uTime)) - 0.5) * 0.035;
      gl_FragColor = c;
    }`,
}

const KEY = 'couple-party:jinak-quality'
/** khusus development: ?aa=0 mematikan semua anti-aliasing untuk tangkapan layar pembanding */
const NO_AA = import.meta.env.DEV && new URLSearchParams(location.search).get('aa') === '0'

export function savedQuality(): Quality {
  const v = store.getItem(KEY)
  if (v === 'low' || v === 'med' || v === 'high') return v
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  return mem <= 3 ? 'low' : 'med'
}
export const saveQuality = (q: Quality) => store.setItem(KEY, q)

export class Stage {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60)
  onFrame: (dt: number, t: number) => void = () => {}
  onDowngrade: (q: Quality) => void = () => {}
  /** 0..1: seberapa gawat (waktu tipis) */
  heat = 0
  quality: Quality

  private composer: EffectComposer | null = null
  private grade: ShaderPass | null = null
  private canvas: HTMLCanvasElement
  private ro: ResizeObserver
  private raf = 0
  private last = 0
  private clock = 0
  private frames = 0
  private since = 0
  private slow = 0
  lights: THREE.Light[] = []

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.canvas = canvas
    this.quality = quality
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !NO_AA, powerPreference: 'high-performance' })
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.setQuality(quality)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
  }

  /** anisotropi maksimum yang didukung GPU (tekstur miring tetap tajam, tidak berkedip) */
  get anisotropy() {
    return Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
  }

  setQuality(q: Quality) {
    this.quality = q
    const t = NO_AA ? { ...TIERS[q], msaa: 0, smaa: false } : TIERS[q]
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, t.ratio))
    this.renderer.shadowMap.enabled = t.shadow > 0
    for (const l of this.lights) {
      const sl = l as THREE.SpotLight
      if (!sl.shadow) continue
      sl.castShadow = t.shadow > 0
      if (t.shadow) sl.shadow.mapSize.set(t.shadow, t.shadow)
      sl.shadow.map?.dispose()
      sl.shadow.map = null
    }
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true
    })
    this.composer?.dispose()
    this.composer = null
    this.grade = null
    if (t.post) {
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(t.msaa, this.renderer.capabilities.maxSamples) })
      const c = new EffectComposer(this.renderer, target)
      c.addPass(new RenderPass(this.scene, this.camera))
      c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.35, 0.82))
      c.addPass(new OutputPass())
      this.grade = new ShaderPass(GRADE)
      c.addPass(this.grade)
      if (t.smaa) c.addPass(new SMAAPass())
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
      this.clock += dt
      this.onFrame(dt, this.clock)
      if (this.grade) {
        this.grade.uniforms.uTime.value = this.clock
        this.grade.uniforms.uHeat.value = this.heat
      }
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
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }
}
