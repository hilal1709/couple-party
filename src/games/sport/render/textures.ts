import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import type { Detail } from './lod'
import type { Stage } from './stage'

const URLS = import.meta.glob('/src/assets/sport/tex/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const url = (name: string) => URLS[`/src/assets/sport/tex/${name}`]

const loader = new THREE.TextureLoader()
const cache = new Map<string, Promise<THREE.Texture>>()

function load(file: string, srgb: boolean) {
  let p = cache.get(file)
  if (!p) {
    p = loader.loadAsync(url(file)).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      return t
    })
    cache.set(file, p)
  }
  return p
}

/**
 * Pasang set PBR ke material. Tiap material memegang salinan tekstur supaya pengulangannya bisa
 * berbeda; gambarnya tetap dipakai bersama. Grafis Hemat hanya memakai warna.
 */
export async function applyPbr(m: THREE.MeshStandardMaterial, name: string, repeat: number, detail: Detail, opts: { tint?: string; normal?: number; plain?: boolean } = {}) {
  const fit = (t: THREE.Texture) => {
    const c = t.clone()
    c.repeat.set(repeat, repeat)
    c.needsUpdate = true
    return c
  }
  // plain: warna tetap dari tint, tekstur hanya memberi relief (mis. cat lapangan yang rata)
  if (!opts.plain) m.map = fit(await load(`${name}_diff.webp`, true))
  m.color.set(opts.tint ?? '#ffffff')
  if (detail.pbr) {
    m.normalMap = fit(await load(`${name}_nor.webp`, false))
    m.normalScale.setScalar(opts.normal ?? 1)
    m.roughnessMap = fit(await load(`${name}_rough.webp`, false))
    m.roughness = 1
    m.metalness = 0
  }
  m.needsUpdate = true
}

/** Kain halus untuk baju & celana karakter: warnanya tetap dari pilihan pemain. */
export async function applyCloth(m: THREE.MeshStandardMaterial, repeat = 5) {
  const n = (await load('kain_nor.webp', false)).clone()
  n.repeat.set(repeat, repeat)
  n.needsUpdate = true
  m.normalMap = n
  m.normalScale.setScalar(0.7)
  m.roughness = 0.82
  m.needsUpdate = true
}

/** Lightmap terpanggang dari Blender: cahaya pantul dan sudut gelap, dibaca lewat UV kedua. */
export async function loadLightmap(file: string) {
  const t = await loader.loadAsync(file)
  t.channel = 1
  t.flipY = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Langit asli untuk latar & pantulan. */
export async function applySky(stage: Stage, sky: 'siang' | 'senja' | 'malam', opts: { background?: boolean; env?: number } = {}) {
  const { scene, renderer } = stage
  const hdr = await new HDRLoader().loadAsync(url(`langit-${sky}.hdr`))
  hdr.mapping = THREE.EquirectangularReflectionMapping
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromEquirectangular(hdr).texture
  scene.environmentIntensity = opts.env ?? 0.6
  pmrem.dispose()
  if (opts.background === false) hdr.dispose()
  else scene.background = hdr
}
