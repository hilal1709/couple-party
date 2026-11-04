// Partikel lembut (bukan kotak piksel): titik bulat bergradasi dengan ukuran sesuai jarak.
// Dua kolam: biasa (debu, cipratan, uap) dan bercahaya aditif (kilau, bara, kembang api).
import * as THREE from 'three'

export type FxKind = 'dust' | 'splash' | 'steam' | 'wind' | 'sparkle' | 'ember' | 'confetti' | 'poof'

type Spec = { glow: boolean; colors: string[]; size: [number, number]; life: [number, number]; speed: [number, number]; up: number; grav: number; drag: number }

const SPECS: Record<FxKind, Spec> = {
  dust: { glow: false, colors: ['#d8c4a2', '#c2ab88', '#e8dcc6'], size: [0.25, 0.5], life: [0.4, 0.8], speed: [0.6, 1.8], up: 0.8, grav: -1.5, drag: 2.5 },
  splash: { glow: false, colors: ['#bfe8ff', '#ffffff', '#7cc8f0'], size: [0.18, 0.35], life: [0.5, 0.9], speed: [2, 5], up: 5, grav: -16, drag: 0.5 },
  steam: { glow: false, colors: ['#ffffff', '#f2ece6'], size: [0.8, 1.6], life: [1.2, 2.2], speed: [0.2, 0.8], up: 4, grav: 1, drag: 0.8 },
  wind: { glow: false, colors: ['#ffffff'], size: [0.1, 0.18], life: [0.6, 1.1], speed: [6, 10], up: 0, grav: 0, drag: 0 },
  sparkle: { glow: true, colors: ['#fff2a8', '#ffcae9', '#ffffff', '#87e752'], size: [0.15, 0.35], life: [0.4, 0.9], speed: [1, 3.5], up: 1.5, grav: -2, drag: 2 },
  ember: { glow: true, colors: ['#ff8a2a', '#ffcc4a', '#ff4a1a'], size: [0.08, 0.18], life: [1, 2], speed: [0.2, 0.8], up: 1.6, grav: 0.6, drag: 0.5 },
  confetti: { glow: true, colors: ['#ff37a6', '#5cf64a', '#ffcc1f', '#43b929', '#ffcae9', '#6ee7ff'], size: [0.14, 0.24], life: [1.2, 2.2], speed: [3, 7], up: 6, grav: -7, drag: 1.2 },
  poof: { glow: false, colors: ['#ffffff', '#ffe0f0'], size: [0.35, 0.7], life: [0.3, 0.6], speed: [1, 2.5], up: 0.5, grav: 0, drag: 3 },
}

let dotTex: THREE.Texture | null = null
function dot() {
  if (dotTex) return dotTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.65)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  dotTex = new THREE.CanvasTexture(c)
  return dotTex
}

class Pool {
  readonly points: THREE.Points
  private pos: Float32Array
  private col: Float32Array
  private size: Float32Array
  private alpha: Float32Array
  private vel: Float32Array
  private life: Float32Array
  private max: Float32Array
  private spec: Spec[] = []
  private next = 0

  readonly n: number

  constructor(n: number, glow: boolean) {
    this.n = n
    this.pos = new Float32Array(n * 3)
    this.col = new Float32Array(n * 3)
    this.size = new Float32Array(n)
    this.alpha = new Float32Array(n)
    this.vel = new Float32Array(n * 3)
    this.life = new Float32Array(n)
    this.max = new Float32Array(n).fill(1)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3))
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1))
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1))
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: dot() }, scale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a * vA < 0.01) discard; gl_FragColor = vec4(vC, t.a * vA); }`,
    })
    this.points = new THREE.Points(g, m)
    this.points.frustumCulled = false
  }

  emit(s: Spec, x: number, y: number, z: number, count: number, dir?: [number, number]) {
    const c = new THREE.Color()
    for (let k = 0; k < count; k++) {
      const i = this.next
      this.next = (this.next + 1) % this.n
      const a = Math.random() * Math.PI * 2
      const sp = s.speed[0] + Math.random() * (s.speed[1] - s.speed[0])
      this.pos.set([x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.2, z + (Math.random() - 0.5) * 0.3], i * 3)
      const dx = dir ? dir[0] : Math.cos(a)
      const dy = dir ? dir[1] : Math.sin(a) * 0.5
      this.vel.set([dx * sp, dy * sp + s.up * (0.5 + Math.random() * 0.5), (Math.random() - 0.5) * sp * 0.6], i * 3)
      c.set(s.colors[Math.floor(Math.random() * s.colors.length)])
      this.col.set([c.r, c.g, c.b], i * 3)
      this.size[i] = s.size[0] + Math.random() * (s.size[1] - s.size[0])
      this.max[i] = s.life[0] + Math.random() * (s.life[1] - s.life[0])
      this.life[i] = this.max[i]
      this.spec[i] = s
    }
  }

  update(dt: number, h: number) {
    ;(this.points.material as THREE.ShaderMaterial).uniforms.scale.value = h * 0.9
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0
        continue
      }
      const s = this.spec[i]
      this.life[i] -= dt
      const f = Math.exp(-s.drag * dt)
      this.vel[i * 3] *= f
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * f + s.grav * dt
      this.vel[i * 3 + 2] *= f
      this.pos[i * 3] += this.vel[i * 3] * dt
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      const t = this.life[i] / this.max[i]
      this.alpha[i] = Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 8 + 0.2)
    }
    const g = this.points.geometry
    g.attributes.position.needsUpdate = true
    g.attributes.alpha.needsUpdate = true
    g.attributes.color.needsUpdate = true
    g.attributes.size.needsUpdate = true
  }
}

export class Fx {
  readonly group = new THREE.Group()
  private soft: Pool
  private glow: Pool

  constructor(max: number) {
    this.soft = new Pool(max, false)
    this.glow = new Pool(Math.round(max * 0.7), true)
    this.group.add(this.soft.points, this.glow.points)
  }

  emit(kind: FxKind, x: number, y: number, z = 0.3, count = 10, dir?: [number, number]) {
    const s = SPECS[kind]
    ;(s.glow ? this.glow : this.soft).emit(s, x, y, z, count, dir)
  }

  update(dt: number, viewH: number) {
    this.soft.update(dt, viewH)
    this.glow.update(dt, viewH)
  }

  dispose() {
    for (const p of [this.soft, this.glow]) {
      p.points.geometry.dispose()
      ;(p.points.material as THREE.Material).dispose()
    }
  }
}
