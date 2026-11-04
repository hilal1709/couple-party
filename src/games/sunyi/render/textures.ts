import * as THREE from 'three'
import type { Tier } from '@/games/kart/render/quality'
import type { Mat } from '../map'

/** tekstur PBR CC0 (Poly Haven), disalin dari aset Petak Cat lewat scripts/sunyi/extract-tex.mjs */
const TEX = import.meta.glob('/src/assets/sunyi/tex/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SPORT = import.meta.glob('/src/assets/sport/tex/rumput_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const SKY_URL = (import.meta.glob('/src/assets/sport/tex/langit-malam.hdr', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)['/src/assets/sport/tex/langit-malam.hdr']

const url = (name: string) => TEX[`/src/assets/sunyi/tex/${name}.webp`] ?? SPORT[`/src/assets/sport/tex/${name}.webp`]

/** sumber tekstur, meter per ulangan, dan warna pengali tiap bahan */
const SPEC: Record<Mat, { src: string; tile: number; tint: number; rough?: number; metal?: number }> = {
  dinding: { src: 'dinding', tile: 2.6, tint: 0xb8b0a0 },
  plester: { src: 'plester', tile: 2.2, tint: 0xc9bea8, rough: 0.92 },
  papan: { src: 'papan', tile: 2, tint: 0x9c8a74 },
  lantai: { src: 'lantai', tile: 2.2, tint: 0x8f7b66 },
  genteng: { src: 'genteng', tile: 2, tint: 0x9a6b55 },
  bata: { src: 'bata', tile: 1.6, tint: 0xa58f80 },
  batu: { src: 'batu', tile: 1.4, tint: 0x8d8a84 },
  seng: { src: 'seng', tile: 2, tint: 0x9a8c80, metal: 0.55 },
  pintu: { src: 'pintu', tile: 1.6, tint: 0x8a7a6c },
  kain: { src: 'kain', tile: 1, tint: 0xa89880, rough: 0.95 },
  kayu: { src: 'papan', tile: 1.1, tint: 0x6e5a48 },
}

export class Textures {
  private loader = new THREE.TextureLoader()
  private cache = new Map<string, Promise<THREE.Texture>>()
  private mats = new Map<Mat, THREE.MeshStandardMaterial>()
  private tier: Tier
  private aniso: number

  constructor(tier: Tier, maxAniso: number) {
    this.tier = tier
    this.aniso = Math.min(maxAniso, tier.q === 'high' ? 8 : tier.post ? 4 : 2)
  }

  tex(name: string, color = true): Promise<THREE.Texture> {
    const key = `${name}:${color}`
    let p = this.cache.get(key)
    if (!p) {
      p = this.loader.loadAsync(url(name)).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.anisotropy = this.aniso
        if (color) t.colorSpace = THREE.SRGBColorSpace
        return t
      })
      this.cache.set(key, p)
    }
    return p
  }

  /** set PBR: warna, normal (kalau tingkat grafis mengizinkan), roughness */
  async pbr(src: string, has = { nor: true, rough: true }) {
    const [map, normalMap, roughnessMap] = await Promise.all([
      this.tex(`${src}_diff`),
      this.tier.pbr && has.nor && url(`${src}_nor`) ? this.tex(`${src}_nor`, false) : Promise.resolve(null),
      this.tier.pbr && has.rough && url(`${src}_rough`) ? this.tex(`${src}_rough`, false) : Promise.resolve(null),
    ])
    return { map, normalMap, roughnessMap }
  }

  async load() {
    await Promise.all(
      (Object.keys(SPEC) as Mat[]).map(async (m) => {
        const s = SPEC[m]
        const set = await this.pbr(s.src)
        const mat = new THREE.MeshStandardMaterial({
          ...set,
          color: s.tint,
          roughness: s.rough ?? 1,
          metalness: s.metal ?? 0,
          vertexColors: true,
          name: m,
        })
        if (set.normalMap) mat.normalScale.setScalar(1.1)
        this.mats.set(m, mat)
      }),
    )
  }

  mat(m: Mat): THREE.MeshStandardMaterial {
    return this.mats.get(m)!
  }

  tile(m: Mat) {
    return SPEC[m].tile
  }
}

/* ---------- tekstur buatan tangan (canvas) ---------- */

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function rnd(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** daun pisang: tulang daun, urat menyamping, sobekan di tepi */
export function bananaLeaf() {
  return canvas(256, 1024, (g) => {
    const r = rnd(9)
    g.clearRect(0, 0, 256, 1024)
    const grad = g.createLinearGradient(0, 0, 256, 0)
    grad.addColorStop(0, '#3d5a1e')
    grad.addColorStop(0.5, '#5c7f2a')
    grad.addColorStop(1, '#3a5520')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(128, 0)
    g.bezierCurveTo(250, 120, 252, 860, 128, 1024)
    g.bezierCurveTo(4, 860, 6, 120, 128, 0)
    g.fill()
    // urat
    g.strokeStyle = 'rgba(30,45,12,0.45)'
    g.lineWidth = 1.5
    for (let y = 20; y < 1010; y += 9) {
      g.beginPath()
      g.moveTo(128, y)
      g.quadraticCurveTo(70, y + 18, 8, y + 42)
      g.moveTo(128, y)
      g.quadraticCurveTo(186, y + 18, 248, y + 42)
      g.stroke()
    }
    // sobekan & bagian kering kecokelatan
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 26; i++) {
      const y = 60 + r() * 900
      const left = r() < 0.5
      g.beginPath()
      g.moveTo(left ? 0 : 256, y)
      g.lineTo(128 + (left ? -10 : 10), y + 10 + r() * 30)
      g.lineTo(left ? 0 : 256, y + 6 + r() * 6)
      g.fill()
    }
    g.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(${110 + r() * 40},${80 + r() * 20},30,${0.35 + r() * 0.4})`
      g.beginPath()
      g.ellipse(r() < 0.5 ? 30 : 226, r() * 1024, 40 + r() * 30, 60 + r() * 120, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#8f9a52'
    g.fillRect(124, 0, 8, 1024)
  })
}

/** batang bambu: hijau kekuningan, ruas tiap 0,4 m, garis memanjang */
export function bambooBark() {
  return canvas(128, 512, (g) => {
    const r = rnd(3)
    g.fillStyle = '#6f7a3a'
    g.fillRect(0, 0, 128, 512)
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '40,50,20' : '150,150,80'},${0.08 + r() * 0.12})`
      g.fillRect(r() * 128, 0, 1 + r() * 3, 512)
    }
    for (let y = 0; y < 512; y += 128) {
      g.fillStyle = 'rgba(60,55,25,0.85)'
      g.fillRect(0, y, 128, 5)
      g.fillStyle = 'rgba(200,190,120,0.35)'
      g.fillRect(0, y + 5, 128, 3)
    }
  })
}

/** tikar pandan anyaman */
export function matWeave() {
  return canvas(256, 256, (g) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const on = (x + y) % 2 === 0
        g.fillStyle = on ? '#a98d5c' : '#8c7348'
        g.fillRect(x * 16, y * 16, 16, 16)
        g.fillStyle = 'rgba(40,25,10,0.25)'
        if (on) g.fillRect(x * 16, y * 16 + 14, 16, 2)
        else g.fillRect(x * 16 + 14, y * 16, 2, 16)
      }
    }
    g.strokeStyle = '#5a2f22'
    g.lineWidth = 10
    g.strokeRect(5, 5, 246, 246)
  })
}

/** foto keluarga tua: sepia pudar, tiga sosok buram, wajah tengah tergores */
export function oldPhoto() {
  return canvas(256, 320, (g) => {
    const r = rnd(41)
    const grad = g.createRadialGradient(128, 150, 20, 128, 160, 220)
    grad.addColorStop(0, '#c9ab7f')
    grad.addColorStop(1, '#5e4a33')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 320)
    g.filter = 'blur(3px)'
    for (const [x, s] of [[70, 0.9], [128, 1.05], [186, 0.85]]) {
      g.fillStyle = 'rgba(40,28,18,0.8)'
      g.beginPath()
      g.ellipse(x, 130 - s * 10, 22 * s, 28 * s, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.ellipse(x, 250, 42 * s, 90 * s, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.filter = 'none'
    g.strokeStyle = 'rgba(235,220,190,0.9)'
    g.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      g.beginPath()
      g.moveTo(110 + r() * 36, 95 + r() * 20)
      g.lineTo(110 + r() * 36, 120 + r() * 30)
      g.stroke()
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,240,210,${r() * 0.12})`
      g.fillRect(r() * 256, r() * 320, 1, 1)
    }
  })
}

/** helai rambut panjang beralpha */
export function hairStrands() {
  return canvas(256, 512, (g) => {
    const r = rnd(17)
    g.clearRect(0, 0, 256, 512)
    for (let i = 0; i < 140; i++) {
      const x = r() * 256
      g.strokeStyle = `rgba(${6 + r() * 10},${5 + r() * 8},${5 + r() * 6},${0.55 + r() * 0.45})`
      g.lineWidth = 1 + r() * 2.5
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + (r() - 0.5) * 30, 170, x + (r() - 0.5) * 40, 340, x + (r() - 0.5) * 50, 380 + r() * 132)
      g.stroke()
    }
  })
}

/** cahaya senter: lingkar terang di tengah, cincin pantulan reflektor, tepi bergerigi */
export function flashlightCookie() {
  return canvas(256, 256, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, 256, 256)
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 126)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(255,252,244,0.95)')
    grad.addColorStop(0.42, 'rgba(235,228,210,0.8)')
    grad.addColorStop(0.5, 'rgba(255,248,232,0.78)')
    grad.addColorStop(0.75, 'rgba(160,150,130,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    // goresan kaca senter
    g.strokeStyle = 'rgba(0,0,0,0.08)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(70, 90)
    g.lineTo(150, 60)
    g.moveTo(120, 190)
    g.lineTo(190, 150)
    g.stroke()
  })
}

/** jendela kayu berkisi dengan kaca gelap */
export function windowTex() {
  return canvas(256, 256, (g) => {
    g.fillStyle = '#0a0b0c'
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#4a3a2c'
    g.fillRect(0, 0, 256, 18)
    g.fillRect(0, 238, 256, 18)
    g.fillRect(0, 0, 18, 256)
    g.fillRect(238, 0, 18, 256)
    g.fillRect(119, 0, 18, 256)
    for (let x = 36; x < 230; x += 26) {
      if (Math.abs(x - 128) < 12) continue
      g.fillStyle = '#3b2d22'
      g.fillRect(x, 18, 8, 220)
    }
  })
}

/** asap & kabut tipis untuk partikel */
export function puff() {
  return canvas(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  })
}

/** nyala api kecil teplok */
export function flame() {
  return canvas(64, 128, (g) => {
    const grad = g.createRadialGradient(32, 90, 2, 32, 80, 50)
    grad.addColorStop(0, 'rgba(255,250,220,1)')
    grad.addColorStop(0.3, 'rgba(255,190,80,0.9)')
    grad.addColorStop(0.7, 'rgba(255,90,10,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(32, 4)
    g.bezierCurveTo(60, 60, 58, 120, 32, 124)
    g.bezierCurveTo(6, 120, 4, 60, 32, 4)
    g.fill()
  })
}
