import * as THREE from 'three'
import { finalCode, KITCHENS, RECIPES, statesOf, type Ing } from '../kitchens'
import type { KitchenId } from '../types'
import { foodMesh, plateMesh } from './scene'

/** ikon kecil satu barang: kanvas (untuk gelembung 3D) dan data URL (untuk tiket React) */
export type Icon = { canvas: HTMLCanvasElement; url: string }
export type Icons = Map<string, Icon>

export const ingKey = (ing: Ing, state: string) => `ing:${ing}:${state}`
export const dishKey = (recipe: string) => `dish:${recipe}`

const SIZE = 128

/**
 * Potret barang dari model 3D yang sama dengan di dapur, dirender sekali saat dapur dimuat:
 * semua tahap olahan bahan di menu dapur ini, dan tiap hidangan jadi di piringnya.
 */
export function bakeIcons(renderer: THREE.WebGLRenderer, env: THREE.Texture | null, kitchen: KitchenId): Icons {
  const out: Icons = new Map()
  const scene = new THREE.Scene()
  scene.environment = env
  scene.environmentIntensity = 0.9
  const key = new THREE.DirectionalLight('#fff4e6', 1.6)
  key.position.set(-1.5, 3, 2)
  scene.add(key, new THREE.AmbientLight('#ffffff', 0.35))
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20)
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 })
  target.texture.colorSpace = THREE.SRGBColorSpace
  const px = new Uint8Array(SIZE * SIZE * 4)
  const box = new THREE.Box3()
  const size = new THREE.Vector3()
  const mid = new THREE.Vector3()
  const prevTarget = renderer.getRenderTarget()
  const prevClear = renderer.getClearAlpha()
  renderer.setClearColor(0x000000, 0)

  const shoot = (name: string, obj: THREE.Object3D) => {
    if (out.has(name)) return
    scene.add(obj)
    obj.updateMatrixWorld(true)
    box.setFromObject(obj)
    if (box.isEmpty()) {
      scene.remove(obj)
      return
    }
    box.getSize(size)
    box.getCenter(mid)
    // kamera miring dari depan-atas seperti kamera dapur, jarak menyesuaikan besar barang
    const r = Math.max(size.x, size.y * 1.2, size.z) * 0.62
    const d = r / Math.tan((cam.fov * Math.PI) / 360)
    cam.position.set(mid.x, mid.y + d * 0.72, mid.z + d * 0.7)
    cam.lookAt(mid)
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, cam)
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, px)
    scene.remove(obj)
    const c = document.createElement('canvas')
    c.width = c.height = SIZE
    const g = c.getContext('2d')!
    const img = g.createImageData(SIZE, SIZE)
    // baris piksel WebGL dari bawah ke atas
    for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4)
    g.putImageData(img, 0, 0)
    out.set(name, { canvas: c, url: c.toDataURL('image/png') })
  }

  const k = KITCHENS[kitchen]
  const ings = new Set<Ing>([...k.menu.flatMap((r) => RECIPES[r].ings), ...(k.belt ?? [])])
  for (const ing of ings) for (const st of [...statesOf(ing), 'burnt']) shoot(ingKey(ing, st), foodMesh(ing, st))
  for (const r of new Set(k.menu)) shoot(dishKey(r), plateMesh(RECIPES[r].ings.map(finalCode), false, kitchen === 'ramen'))
  shoot('plate', plateMesh([], false, kitchen === 'ramen'))

  renderer.setRenderTarget(prevTarget)
  renderer.setClearAlpha(prevClear)
  target.dispose()
  return out
}
