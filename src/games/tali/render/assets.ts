// Pemuat aset Tali Jodoh: karakter, kit Blender, tekstur triplanar, dan langit HDR.
// Semua di-cache per sesi; tekstur dipakai ulang dari Kart & Sport (CC0 Poly Haven) dan bake Blender sendiri.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import kitUrl from '@/assets/tali/models/kit.glb?url'
import kleponUrl from '@/assets/tali/models/klepon.glb?url'
import ondeUrl from '@/assets/tali/models/onde.glb?url'
import type { TexRef } from './themes'

const KART = import.meta.glob('/src/assets/kart/tex/*_{diff,nor}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SPORT = import.meta.glob('/src/assets/sport/tex/*_{diff,nor}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const TALI = import.meta.glob('/src/assets/tali/tex/*_{diff,nor}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SKIES = import.meta.glob('/src/assets/sport/tex/langit-*.hdr', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const gltf = new GLTFLoader()
const texLoader = new THREE.TextureLoader()
const cache = new Map<string, Promise<unknown>>()

function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined
  if (!p) {
    p = make()
    cache.set(key, p)
    p.catch(() => cache.delete(key))
  }
  return p
}

export const loadChar = (kind: 'onde' | 'klepon') => once(`char-${kind}`, () => gltf.loadAsync(kind === 'onde' ? ondeUrl : kleponUrl))

export type Kit = Map<string, THREE.Object3D>

export const loadKit = () =>
  once('kit', async () => {
    const g: GLTF = await gltf.loadAsync(kitUrl)
    const kit: Kit = new Map()
    for (const o of [...g.scene.children]) {
      o.position.set(0, 0, 0)
      kit.set(o.name, o)
    }
    return kit
  })

function urlOf(ref: TexRef, kind: 'diff' | 'nor'): string {
  const [src, name] = ref.split('/') as [string, string]
  const table = src === 'kart' ? KART : src === 'sport' ? SPORT : TALI
  const url = table[`/src/assets/${src}/tex/${name}_${kind}.webp`]
  if (!url) throw new Error(`tekstur tidak ada: ${ref}_${kind}`)
  return url
}

export type TexPair = { map: THREE.Texture; normal: THREE.Texture }

let aniso = 4
export const setAnisotropy = (n: number) => {
  aniso = n
}

export const loadTex = (ref: TexRef) =>
  once(`tex-${ref}`, async (): Promise<TexPair> => {
    const [map, normal] = await Promise.all([texLoader.loadAsync(urlOf(ref, 'diff')), texLoader.loadAsync(urlOf(ref, 'nor'))])
    map.colorSpace = THREE.SRGBColorSpace
    for (const t of [map, normal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = aniso
    }
    return { map, normal }
  })

export const loadSky = (name: 'siang' | 'senja' | 'malam') =>
  once(`sky-${name}`, async () => {
    const t = await new HDRLoader().loadAsync(SKIES[`/src/assets/sport/tex/langit-${name}.hdr`])
    t.mapping = THREE.EquirectangularReflectionMapping
    return t
  })

/** salinan objek kit dengan bahan sendiri (boleh diubah tanpa mengganggu salinan lain) */
export function cloneKit(kit: Kit, name: string, own = false): THREE.Object3D {
  const src = kit.get(name)
  if (!src) throw new Error(`kit tidak punya ${name}`)
  const o = src.clone(true)
  if (own) {
    o.traverse((c) => {
      const m = c as THREE.Mesh
      if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone()
    })
  }
  return o
}

/** semua mesh dalam objek (untuk instancing hiasan) */
export function meshesOf(o: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  o.updateMatrixWorld(true)
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) out.push(c as THREE.Mesh)
  })
  return out
}
