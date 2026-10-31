import * as THREE from 'three'
import { Crowd, type Seat } from './crowd'
import { DETAIL } from './lod'
import { addVariation, addWind, type Clock } from './shaders'
import type { Stage } from './stage'
import { applyPbr, applySky, loadLightmap } from './textures'

export type MatSpec = { tex: string; repeat: number; tint?: string; normal?: number; plain?: boolean; vary?: Parameters<typeof addVariation>[1] }

export type ArenaSpec = {
  sky: 'siang' | 'senja' | 'malam'
  /** kuat pantulan langit */
  env: number
  /** false = langit hanya untuk pantulan (arena dalam ruangan) */
  skyBackground?: boolean
  lightmap?: string
  lightmapIntensity?: number
  /** nama material dari Blender → set tekstur */
  mats: Record<string, MatSpec>
  score?: string
  windHeight?: number
}

const ADS = [
  { bg: '#ff37a6', fg: '#fff4fa', text: 'KACAU' },
  { bg: '#ffcc1f', fg: '#121212', text: 'COUPLE PARTY' },
  { bg: '#16a06a', fg: '#fff4fa', text: 'SPORT' },
]

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function glTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  // sumbu V glTF terbalik dari kanvas
  t.flipY = false
  t.anisotropy = 4
  return t
}

/** papan iklan pinggir arena */
export function adTexture(i: number) {
  const [c, g] = canvas(512, 128)
  const a = ADS[i % ADS.length]
  g.fillStyle = a.bg
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = 'rgba(255,255,255,0.14)'
  for (let k = -2; k < 12; k++) g.fillRect(k * 56, 0, 20, 128)
  g.fillStyle = a.fg
  g.font = '900 62px "Dela Gothic One", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(a.text, 256, 66, 480)
  return glTexture(c)
}

export function scoreTexture(text: string) {
  const [c, g] = canvas(512, 160)
  g.fillStyle = '#071018'
  g.fillRect(0, 0, 512, 160)
  g.fillStyle = '#ffcc1f'
  g.font = '900 54px "Dela Gothic One", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 256, 84, 470)
  return glTexture(c)
}

/** kawat jaring: satu kotak diulang, sisanya tembus pandang */
export function wireTexture(rx: number, ry: number) {
  const [c, g] = canvas(128, 128)
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = 6
  g.strokeRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  return t
}

/**
 * Pakaian arena dari nama material di sport_world.py: langit, lightmap, tekstur PBR, angin, iklan,
 * jaring. Material yang tidak dikenal dibiarkan apa adanya, lalu tiap cabang menambah yang khusus.
 */
export async function dressArena(stage: Stage, world: THREE.Object3D, clock: Clock, spec: ArenaSpec) {
  const detail = DETAIL[stage.quality]
  await applySky(stage, spec.sky, { env: spec.env, background: spec.skyBackground !== false })
  const lm = spec.lightmap ? await loadLightmap(spec.lightmap) : null
  const jobs: Promise<void>[] = []
  const done = new Set<THREE.Material>()
  const wind = spec.windHeight ?? 9
  world.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.receiveShadow = true
    const m = mesh.material as THREE.MeshStandardMaterial
    mesh.castShadow = /^(Leaves|Bark|Flowers|beton|logam|kursi|papan|payung|kulit|sofa|kayu_)/.test(m.name)
    if (lm && mesh.geometry.attributes.uv1) {
      m.lightMap = lm
      m.lightMapIntensity = spec.lightmapIntensity ?? 1.5
    }
    if (done.has(m)) return
    done.add(m)
    m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.5)
    // MSAA tidak menyentuh tepi potongan alfa: daun & kawat dihaluskan lewat cakupan sampel
    if (m.alphaTest > 0) m.alphaToCoverage = true
    const s = spec.mats[m.name]
    if (s) {
      jobs.push(applyPbr(m, s.tex, s.repeat, detail, { tint: s.tint, normal: s.normal, plain: s.plain }))
      if (s.vary) addVariation(m, s.vary)
    } else if (m.name.startsWith('iklan')) {
      m.map = adTexture(Number(m.name.slice(5)))
      m.color.set('#ffffff')
    } else if (m.name === 'papan_skor') {
      m.emissiveMap = scoreTexture(spec.score ?? 'KACAU')
      m.emissive.set('#ffffff')
      m.emissiveIntensity = 1.1
    } else if (m.name === 'fence' || m.name === 'net') {
      m.map = m.name === 'fence' ? wireTexture(90, 12) : wireTexture(40, 5)
      m.transparent = true
      m.alphaTest = 0.2
      m.alphaToCoverage = true
      m.side = THREE.DoubleSide
    } else if (m.name.startsWith('flag')) {
      m.side = THREE.DoubleSide
      addWind(m, clock, { strength: 0.24, height: wind - 1 })
    } else if (m.name.startsWith('Leaves') || m.name.startsWith('Flowers')) addWind(m, clock, { strength: 0.16, height: wind })
  })
  await Promise.all(jobs)
}

/** Kursi tribun berjenjang, cocok dengan `crowd()` di sport_world.py. */
export function squareSeats(opts: { d0: number; tiers: number; gap: number; base: number; cy?: number; sides: number[] }): Seat[] {
  const out: Seat[] = []
  const cy = opts.cy ?? 0
  for (let t = 0; t < opts.tiers; t++) {
    const d = opts.d0 + t * 1.05
    const y = opts.base + t * 0.62 - 0.17
    const n = Math.floor((d * 2) / opts.gap)
    for (const side of opts.sides) {
      for (let i = 0; i < n; i++) {
        const u = -d + (i + 0.5) * ((2 * d) / n)
        if (side === 0) out.push({ x: u, y, z: -(cy + d), rot: 0 })
        else if (side === 1) out.push({ x: u, y, z: -(cy - d), rot: Math.PI })
        else if (side === 2) out.push({ x: d, y, z: -(cy + u), rot: -Math.PI / 2 })
        else out.push({ x: -d, y, z: -(cy + u), rot: Math.PI / 2 })
      }
    }
  }
  return out
}

/** Sinar lampu di udara berdebu: kerucut tembus pandang yang memudar ke bawah. */
export function lightShaft(x: number, y: number, z: number, length: number, color = '#fff0d4') {
  const geo = new THREE.ConeGeometry(1.1, length, 16, 1, true).translate(0, -length / 2, 0)
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uLen: { value: length } },
    vertexShader: 'varying float vK; uniform float uLen; void main(){ vK = -position.y / uLen; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vK; uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, (1.0 - vK) * (1.0 - vK) * 0.09); }',
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  return m
}

export function makeCrowd(stage: Stage, seats: Seat[], clock: Clock) {
  const c = new Crowd(seats, clock, DETAIL[stage.quality].crowd)
  stage.scene.add(c.group)
  return c
}
