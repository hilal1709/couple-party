import type { MapData } from '../maps'
import { isClear, RADIUS } from './walk'

const CELL = 0.6
const MIN = -26
const SIZE = Math.ceil(52 / CELL)

/** grid jalan bot, dihitung dari kotak tabrakan */
export type Nav = { free: Uint8Array; region: Int16Array }

const idx = (cx: number, cz: number) => cz * SIZE + cx
const cell = (v: number) => Math.max(0, Math.min(SIZE - 1, Math.floor((v - MIN) / CELL)))
const center = (c: number) => MIN + (c + 0.5) * CELL

const cache = new WeakMap<MapData, Nav>()

export function buildNav(map: MapData): Nav {
  const hit = cache.get(map)
  if (hit) return hit
  const free = new Uint8Array(SIZE * SIZE)
  for (let cz = 0; cz < SIZE; cz++) {
    for (let cx = 0; cx < SIZE; cx++) {
      if (isClear(map.boxes, center(cx), center(cz), 0, RADIUS + 0.08)) free[idx(cx, cz)] = 1
    }
  }
  // wilayah tersambung, supaya bot tidak memilih tujuan di balik pagar
  const region = new Int16Array(SIZE * SIZE).fill(-1)
  let id = 0
  for (let i = 0; i < free.length; i++) {
    if (!free[i] || region[i] >= 0) continue
    const stack = [i]
    region[i] = id
    while (stack.length) {
      const c = stack.pop()!
      for (const n of neighbors(c)) {
        if (free[n] && region[n] < 0) {
          region[n] = id
          stack.push(n)
        }
      }
    }
    id++
  }
  const nav = { free, region }
  cache.set(map, nav)
  return nav
}

function neighbors(c: number): number[] {
  const cx = c % SIZE
  const cz = Math.floor(c / SIZE)
  const out: number[] = []
  if (cx > 0) out.push(c - 1)
  if (cx < SIZE - 1) out.push(c + 1)
  if (cz > 0) out.push(c - SIZE)
  if (cz < SIZE - 1) out.push(c + SIZE)
  return out
}

/** sel bebas terdekat dari titik, kalau titiknya menempel dinding */
function nearestFree(nav: Nav, x: number, z: number): number {
  const cx = cell(x)
  const cz = cell(z)
  for (let r = 0; r < 6; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        const nx = cx + dx
        const nz = cz + dz
        if (nx < 0 || nz < 0 || nx >= SIZE || nz >= SIZE) continue
        if (nav.free[idx(nx, nz)]) return idx(nx, nz)
      }
    }
  }
  return -1
}

export const reachable = (nav: Nav, ax: number, az: number, bx: number, bz: number) => {
  const a = nearestFree(nav, ax, az)
  const b = nearestFree(nav, bx, bz)
  return a >= 0 && b >= 0 && nav.region[a] === nav.region[b]
}

/** jalur BFS sebagai titik dunia; kosong = tidak terhubung */
export function findPath(nav: Nav, ax: number, az: number, bx: number, bz: number): [number, number][] {
  const start = nearestFree(nav, ax, az)
  const goal = nearestFree(nav, bx, bz)
  if (start < 0 || goal < 0 || nav.region[start] !== nav.region[goal]) return []
  const from = new Int32Array(nav.free.length).fill(-1)
  from[start] = start
  const queue = [start]
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]
    if (c === goal) break
    for (const n of neighbors(c)) {
      if (nav.free[n] && from[n] < 0) {
        from[n] = c
        queue.push(n)
      }
    }
  }
  const cells: number[] = []
  for (let c = goal; c !== start; c = from[c]) cells.push(c)
  cells.reverse()
  // ambil tiap sel ketiga: cukup untuk mengikuti lorong, gerak jadi tidak patah-patah
  const out: [number, number][] = cells.filter((_, i) => i % 3 === 2).map((c) => [center(c % SIZE), center(Math.floor(c / SIZE))])
  out.push([bx, bz])
  return out
}

/** sel acak yang tersambung ke (x, z) */
export function randomCell(nav: Nav, x: number, z: number, rnd: () => number): [number, number] {
  const home = nearestFree(nav, x, z)
  for (let i = 0; i < 80; i++) {
    const c = Math.floor(rnd() * nav.free.length)
    if (nav.free[c] && nav.region[c] === nav.region[home]) return [center(c % SIZE), center(Math.floor(c / SIZE))]
  }
  return [x, z]
}
