/** Noise 2D bernilai (value noise halus) dengan benih: sama persis di semua HP, dipakai bentuk gunung & sebaran barang. */

function hash(ix: number, iz: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** 0..1 */
export function noise2(x: number, z: number, seed: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = fade(x - ix)
  const fz = fade(z - iz)
  const a = hash(ix, iz, seed)
  const b = hash(ix + 1, iz, seed)
  const c = hash(ix, iz + 1, seed)
  const d = hash(ix + 1, iz + 1, seed)
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz
}

/** fbm -1..1 */
export function fbm(x: number, z: number, seed: number, oct = 4) {
  let s = 0
  let amp = 0.5
  let f = 1
  let norm = 0
  for (let i = 0; i < oct; i++) {
    s += (noise2(x * f, z * f, seed + i * 131) * 2 - 1) * amp
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return s / norm
}

/** punggung bukit tajam -1..1 (garis retakan di tebing) */
export function ridge(x: number, z: number, seed: number, oct = 3) {
  let s = 0
  let amp = 0.5
  let f = 1
  let norm = 0
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(noise2(x * f, z * f, seed + i * 71) * 2 - 1)
    s += n * n * amp
    norm += amp
    amp *= 0.5
    f *= 2.1
  }
  return (s / norm) * 2 - 1
}

/** noise periodik pada sudut 0..2π (pinggiran cincin tidak menyambung patah) */
export function loopNoise(theta: number, freq: number, seed: number) {
  const r = freq / (Math.PI * 2)
  return fbm(Math.cos(theta) * r + 50, Math.sin(theta) * r + 50, seed, 3)
}

/** RNG kecil berbasis mulberry32 untuk generator */
export function rng(seed: number) {
  let s = seed | 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
