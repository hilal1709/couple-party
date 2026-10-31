import * as THREE from 'three'

/** angka acak dengan seed untuk penempatan (sama di semua HP) */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const TEX = import.meta.glob('/src/assets/kart/tex/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const texUrl = (name: string) => TEX[`/src/assets/kart/tex/${name}`]
const texLoader = new THREE.TextureLoader()
const texCache = new Map<string, THREE.Texture>()
let anisotropy = 8

/** disetel renderer sebelum tekstur pertama dimuat; sudut landai jalan butuh filter setinggi mungkin */
export function setMaxAnisotropy(max: number) {
  anisotropy = Math.min(16, max)
}

/** tekstur berulang (diffuse sRGB, normal linear) */
export function tex(name: string, color = true): THREE.Texture | null {
  if (name === 'biskuit_diff.webp') return biscuit()
  const url = texUrl(name)
  if (!url) return null
  let t = texCache.get(name)
  if (!t) {
    t = texLoader.load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = anisotropy
    if (color) t.colorSpace = THREE.SRGBColorSpace
    texCache.set(name, t)
  }
  return t
}

/** jalan Pabrik Permen: lempeng biskuit berlubang dengan lelehan cokelat di sambungannya */
function biscuit() {
  let t = texCache.get('biskuit')
  if (t) return t
  const r = seeded(5)
  t = canvasTex(512, 512, (c) => {
    c.fillStyle = '#c98a4e'
    c.fillRect(0, 0, 512, 512)
    for (let k = 0; k < 2600; k++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '255,214,150' : '120,70,30'},${0.05 + r() * 0.1})`
      c.fillRect(r() * 512, r() * 512, 2 + r() * 8, 2 + r() * 8)
    }
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        for (const [dx, dy] of [[64, 64], [192, 64], [64, 192], [192, 192]]) {
          c.fillStyle = '#8a5526'
          c.beginPath()
          c.arc(x * 256 + dx, y * 256 + dy, 13, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = '#b5773e'
          c.beginPath()
          c.arc(x * 256 + dx + 2, y * 256 + dy + 2, 9, 0, Math.PI * 2)
          c.fill()
        }
      }
    c.fillStyle = '#4a2410'
    for (const p of [0, 256]) {
      c.fillRect(p - 7, 0, 14, 512)
      c.fillRect(0, p - 7, 512, 14)
    }
    c.fillStyle = 'rgba(255,220,190,0.35)'
    for (const p of [0, 256]) {
      c.fillRect(p - 5, 0, 3, 512)
      c.fillRect(0, p - 5, 512, 3)
    }
  })
  texCache.set('biskuit', t)
  return t
}

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = anisotropy
  return t
}
