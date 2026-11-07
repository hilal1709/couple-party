import type RAPIER_NS from '@dimforge/rapier3d-compat'
import type { Surface } from '../mountains'
import { surfaceAt, type Terrain } from './terrain'

type Rapier = typeof RAPIER_NS

/**
 * Dunia tabrakan untuk memanjat (Rapier). Hanya berisi permukaan yang bisa dipegang:
 * medan (heightfield), bongkahan batu, dan batang pohon. Tidak ada benda dinamis; dunia ini dipakai
 * untuk raycast tangan & kaki, jadi sama persis di host, klien, dan bot.
 *
 * Bentuk tabrakan sengaja sederhana (silinder, heightfield), terpisah dari model visual yang detail.
 */
export type Hit = { x: number; y: number; z: number; nx: number; ny: number; nz: number; toi: number; surface: Surface }

export type ClimbWorld = {
  /** sinar dari (ox,oy,oz) arah (dx,dy,dz) (dinormalkan di dalam) sejauh `len` */
  ray(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, len: number): Hit | null
  /** jumlah sinar sejak dibuat (untuk uji anggaran per tick) */
  rays: number
  dispose(): void
}

let rapier: Rapier | null = null
let loading: Promise<Rapier> | null = null

/** muat WASM Rapier sekali; dipanggil sebelum gunung dibangun */
export function loadRapier(): Promise<Rapier> {
  return (loading ??= import('@dimforge/rapier3d-compat').then(async (m) => {
    const R = (m.default ?? m) as Rapier
    await R.init()
    rapier = R
    return R
  }))
}

const SOLID_SURFACE: Record<string, Surface> = { batu: 'batu', karang: 'batu' }

export function buildWorld(t: Terrain): ClimbWorld {
  if (!rapier) throw new Error('Rapier belum dimuat (panggil loadRapier dulu)')
  const R = rapier
  const world = new R.World({ x: 0, y: -20, z: 0 })
  const { nx, nz } = t
  // heightfield Rapier: baris = z, kolom = x, disimpan per kolom (indeks = baris + kolom·(nrows+1))
  const heights = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) heights[j + i * nz] = t.h[j * nx + i]
  const ground = world.createCollider(R.ColliderDesc.heightfield(nz - 1, nx - 1, heights, { x: t.sx, y: 1, z: t.sz }))
  const kinds = new Map<number, Surface | null>([[ground.handle, null]])
  for (const s of t.solids) {
    const h = Math.max(0.2, s.top - s.y)
    const c = world.createCollider(R.ColliderDesc.cylinder(h / 2, s.r).setTranslation(s.x, s.y + h / 2, s.z))
    // kulit kayu sedikit lebih sulit dipegang daripada batu
    kinds.set(c.handle, SOLID_SURFACE[s.kind] ?? 'tanah')
  }
  // tanpa benda dinamis, satu langkah cukup untuk mengisi struktur pencarian sinar
  world.step()
  const ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
  const out: ClimbWorld = {
    rays: 0,
    ray(ox, oy, oz, dx, dy, dz, len) {
      out.rays++
      const l = Math.hypot(dx, dy, dz) || 1
      ray.origin = { x: ox, y: oy, z: oz }
      ray.dir = { x: dx / l, y: dy / l, z: dz / l }
      const hit = world.castRayAndGetNormal(ray, len, true)
      if (!hit) return null
      const p = ray.pointAt(hit.timeOfImpact)
      const k = kinds.get(hit.collider.handle)
      // sinar yang mulai di dalam benda memberi normal nol: anggap tidak kena
      if (hit.normal.x === 0 && hit.normal.y === 0 && hit.normal.z === 0) return null
      return { x: p.x, y: p.y, z: p.z, nx: hit.normal.x, ny: hit.normal.y, nz: hit.normal.z, toi: hit.timeOfImpact, surface: k ?? surfaceAt(t, p.x, p.z) }
    },
    dispose() {
      world.free()
    },
  }
  return out
}
