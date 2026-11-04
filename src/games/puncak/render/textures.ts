import * as THREE from 'three'
import { TEX } from '../mountains'

const URLS = import.meta.glob('/src/assets/puncak/tex/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const texUrl = (file: string) => URLS[`/src/assets/puncak/tex/${file}`]

async function pixels(url: string, size: number): Promise<Uint8ClampedArray> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0, size, size)
  return g.getImageData(0, 0, size, size).data
}

export type TerrainTex = { diff: THREE.DataArrayTexture; nrm: THREE.DataArrayTexture | null; size: number }

let cache: Promise<TerrainTex> | null = null
let cacheKey = ''

/**
 * Semua bahan medan jadi dua texture array (warna & normal+kasar): shader cukup memakai dua sampler
 * untuk 12 bahan. `size` 512 di grafis tinggi, 256 di hemat.
 */
export function loadTerrainTex(size: number, normals: boolean): Promise<TerrainTex> {
  const key = `${size}${normals}`
  if (cache && cacheKey === key) return cache
  cacheKey = key
  cache = (async () => {
    const layer = size * size * 4
    const d = new Uint8Array(new ArrayBuffer(layer * TEX.length))
    const n = normals ? new Uint8Array(new ArrayBuffer(layer * TEX.length)) : null
    await Promise.all(
      TEX.map(async (name, i) => {
        const [a, b] = await Promise.all([pixels(texUrl(`${name}_d.webp`), size), n ? pixels(texUrl(`${name}_n.webp`), size) : null])
        d.set(a, i * layer)
        if (n && b) n.set(b, i * layer)
      }),
    )
    const mk = (data: Uint8Array<ArrayBuffer>, srgb: boolean) => {
      const t = new THREE.DataArrayTexture(data, size, size, TEX.length)
      t.format = THREE.RGBAFormat
      t.type = THREE.UnsignedByteType
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      t.anisotropy = 4
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
      return t
    }
    return { diff: mk(d, true), nrm: n ? mk(n, false) : null, size }
  })()
  return cache
}

const loader = new THREE.TextureLoader()
const single = new Map<string, Promise<THREE.Texture>>()

/** tekstur tunggal (props): diulang, sRGB untuk warna */
export function loadTex(file: string, srgb: boolean, repeat = 1) {
  const key = `${file}|${srgb}`
  let p = single.get(key)
  if (!p) {
    p = loader.loadAsync(texUrl(file)).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 4
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      return t
    })
    single.set(key, p)
  }
  return p.then((t) => {
    if (repeat === 1) return t
    const c = t.clone()
    c.repeat.set(repeat, repeat)
    c.needsUpdate = true
    return c
  })
}

/**
 * Bahan PBR props dari pasangan _d/_n: normal di RG (Z dihitung ulang), kekasaran di B.
 */
export async function packedPbr(m: THREE.MeshStandardMaterial, name: string, repeat: number, normals: boolean) {
  m.map = await loadTex(`${name}_d.webp`, true, repeat)
  if (normals) {
    const n = await loadTex(`${name}_n.webp`, false, repeat)
    m.normalMap = n
    m.roughnessMap = n
    m.roughness = 1
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 pk = texture2D( normalMap, vNormalMapUv ).xyz;
           vec3 mapN = vec3(pk.xy * 2.0 - 1.0, 0.0);
           mapN.z = sqrt(max(0.0, 1.0 - dot(mapN.xy, mapN.xy)));
           mapN.xy *= normalScale;
           normal = normalize( tbn * mapN );`,
        )
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * texture2D( roughnessMap, vRoughnessMapUv ).b;')
    }
    m.customProgramCacheKey = () => 'packed'
  }
  m.needsUpdate = true
  return m
}
