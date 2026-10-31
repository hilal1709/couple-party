import * as THREE from 'three'

/**
 * Partikel ringan: satu THREE.Points per mode campur (aditif untuk api/percikan, biasa untuk asap/debu).
 * Kolam berukuran tetap; partikel terlama ditimpa saat penuh. Semua dihitung di CPU (ratusan saja).
 */
export type ParticleKind = 'spark' | 'fire' | 'smoke' | 'dust' | 'star' | 'confetti' | 'splash' | 'snow' | 'rain'

type Pool = {
  points: THREE.Points
  pos: Float32Array
  vel: Float32Array
  col: Float32Array
  size: Float32Array
  life: Float32Array
  max: Float32Array
  grow: Float32Array
  grav: Float32Array
  next: number
  n: number
}

const vert = `
  attribute float size; attribute float alpha; attribute vec3 color;
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vColor = color; vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(size * (420.0 / max(-mv.z, 1.0)), 180.0);
    gl_Position = projectionMatrix * mv;
  }`
const frag = `
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.15, r);
    gl_FragColor = vec4(vColor, vAlpha * soft);
    #include <colorspace_fragment>
  }`

function pool(n: number, additive: boolean): Pool {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(n * 3).fill(-9999)
  const col = new Float32Array(n * 3)
  const size = new Float32Array(n)
  const alpha = new Float32Array(n)
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage))
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  const points = new THREE.Points(g, mat)
  points.frustumCulled = false
  points.renderOrder = additive ? 3 : 2
  return { points, pos, vel: new Float32Array(n * 3), col, size, life: new Float32Array(n), max: new Float32Array(n), grow: new Float32Array(n), grav: new Float32Array(n), next: 0, n }
}

const KIND: Record<ParticleKind, { add: boolean; life: number; size: number; grow: number; grav: number }> = {
  spark: { add: true, life: 0.35, size: 0.5, grow: -0.6, grav: 14 },
  fire: { add: true, life: 0.28, size: 1.2, grow: 1.5, grav: -2 },
  smoke: { add: false, life: 1.1, size: 1.2, grow: 2.6, grav: -1.2 },
  dust: { add: false, life: 0.9, size: 1.4, grow: 2.2, grav: 1 },
  star: { add: true, life: 0.9, size: 0.9, grow: -0.4, grav: 0 },
  confetti: { add: false, life: 2.6, size: 0.55, grow: 0, grav: 4 },
  splash: { add: false, life: 0.7, size: 0.8, grow: 0.8, grav: 16 },
  snow: { add: false, life: 0.9, size: 1.1, grow: 1.6, grav: 3 },
  rain: { add: false, life: 0.55, size: 0.3, grow: 0, grav: 0 },
}

export class Particles {
  readonly group = new THREE.Group()
  private add: Pool
  private norm: Pool
  private tmp = new THREE.Color()

  constructor(max: number) {
    this.add = pool(max, true)
    this.norm = pool(max, false)
    this.group.add(this.norm.points, this.add.points)
  }

  /** satu partikel; `color` hex, `spread` acak kecepatan */
  emit(kind: ParticleKind, x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, scale = 1) {
    const k = KIND[kind]
    const p = k.add ? this.add : this.norm
    const i = p.next
    p.next = (p.next + 1) % p.n
    p.pos[i * 3] = x
    p.pos[i * 3 + 1] = y
    p.pos[i * 3 + 2] = z
    p.vel[i * 3] = vx
    p.vel[i * 3 + 1] = vy
    p.vel[i * 3 + 2] = vz
    this.tmp.set(color)
    p.col[i * 3] = this.tmp.r
    p.col[i * 3 + 1] = this.tmp.g
    p.col[i * 3 + 2] = this.tmp.b
    p.size[i] = k.size * scale
    p.life[i] = k.life * (0.75 + Math.random() * 0.5)
    p.max[i] = p.life[i]
    p.grow[i] = k.grow * scale
    p.grav[i] = k.grav
  }

  /** semburan beberapa partikel dengan kecepatan acak di sekitar (vx, vy, vz) */
  burst(kind: ParticleKind, n: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, spread: number, colors: string[], scale = 1) {
    for (let k = 0; k < n; k++) {
      this.emit(kind, x, y, z, vx + (Math.random() - 0.5) * spread, vy + Math.random() * spread * 0.6, vz + (Math.random() - 0.5) * spread, colors[k % colors.length], scale)
    }
  }

  update(dt: number) {
    for (const p of [this.add, this.norm]) {
      const alpha = p.points.geometry.getAttribute('alpha') as THREE.BufferAttribute
      for (let i = 0; i < p.n; i++) {
        if (p.life[i] <= 0) {
          if (alpha.array[i] !== 0) (alpha.array as Float32Array)[i] = 0
          continue
        }
        p.life[i] -= dt
        p.vel[i * 3 + 1] -= p.grav[i] * dt
        const drag = Math.pow(0.35, dt)
        p.vel[i * 3] *= drag
        p.vel[i * 3 + 2] *= drag
        p.pos[i * 3] += p.vel[i * 3] * dt
        p.pos[i * 3 + 1] += p.vel[i * 3 + 1] * dt
        p.pos[i * 3 + 2] += p.vel[i * 3 + 2] * dt
        p.size[i] = Math.max(0.05, p.size[i] + p.grow[i] * dt)
        const f = p.life[i] / p.max[i]
        ;(alpha.array as Float32Array)[i] = Math.max(0, Math.min(1, f * 1.6))
      }
      const g = p.points.geometry
      ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
      ;(g.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true
      alpha.needsUpdate = true
    }
  }

  dispose() {
    for (const p of [this.add, this.norm]) {
      p.points.geometry.dispose()
      ;(p.points.material as THREE.Material).dispose()
    }
  }
}

/** warna debu menurut jenis tanah di luar aspal */
export const DUST: Record<string, { kind: ParticleKind; colors: string[] }> = {
  pasir: { kind: 'dust', colors: ['#f2d79a', '#e6c47e'] },
  rumput: { kind: 'dust', colors: ['#8fcf5a', '#b5d97a', '#7a5a3a'] },
  salju: { kind: 'snow', colors: ['#ffffff', '#e4f2ff'] },
  lava: { kind: 'fire', colors: ['#ff8a1c', '#ffcc1f'] },
  air: { kind: 'splash', colors: ['#bfe9ff', '#ffffff'] },
  permen: { kind: 'dust', colors: ['#ffcae9', '#ff9ad4'] },
  kota: { kind: 'smoke', colors: ['#8a8aa0'] },
}

export const DRIFT_COLORS = ['#ffffff', '#3aa0ff', '#ff8a1c', '#b45cff']
