import type { Box } from '../../petak/maps'
import { isClear, rayHit } from '../../petak/sim/walk'
import { HALF } from '../map'

/** grid jalan Penunggu seluas map; A* 8 arah */
export const CELL = 0.5
const MIN = -HALF
export const SIZE = Math.ceil((2 * HALF) / CELL)
const R = 0.38

export type Nav = { free: Uint8Array; boxes: Box[] }

const idx = (cx: number, cz: number) => cz * SIZE + cx
export const cellOf = (v: number) => Math.max(0, Math.min(SIZE - 1, Math.floor((v - MIN) / CELL)))
const center = (c: number) => MIN + (c + 0.5) * CELL

const cache = new WeakMap<Box[], Nav>()

export function buildNav(boxes: Box[]): Nav {
  const hit = cache.get(boxes)
  if (hit) return hit
  const free = new Uint8Array(SIZE * SIZE)
  // kotak dikelompokkan per baris supaya tiap sel cuma menguji kotak di dekatnya
  const rows: Box[][] = Array.from({ length: SIZE }, () => [])
  for (const b of boxes) {
    const ext = Math.hypot(b.hx, b.hz) + R
    for (let cz = cellOf(b.z - ext); cz <= cellOf(b.z + ext); cz++) rows[cz].push(b)
  }
  for (let cz = 0; cz < SIZE; cz++) {
    const near = rows[cz]
    for (let cx = 0; cx < SIZE; cx++) {
      const x = center(cx)
      const list = near.filter((b) => Math.abs(b.x - x) < Math.hypot(b.hx, b.hz) + R + 0.1)
      if (isClear(list, x, center(cz), 0, R)) free[idx(cx, cz)] = 1
    }
  }
  const nav = { free, boxes }
  cache.set(boxes, nav)
  return nav
}

/** sel bebas terdekat (cari melingkar), untuk titik yang menempel dinding */
function nearestFree(nav: Nav, c: number): number {
  if (nav.free[c]) return c
  const cx = c % SIZE
  const cz = Math.floor(c / SIZE)
  for (let r = 1; r < 12; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        const x = cx + dx
        const z = cz + dz
        if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) continue
        if (nav.free[idx(x, z)]) return idx(x, z)
      }
    }
  }
  return -1
}

/** heap biner kecil di atas array angka */
class Heap {
  private k: number[] = []
  private v: number[] = []
  get size() {
    return this.k.length
  }
  push(key: number, val: number) {
    const k = this.k
    const v = this.v
    let i = k.length
    k.push(key)
    v.push(val)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= k[i]) break
      ;[k[p], k[i]] = [k[i], k[p]]
      ;[v[p], v[i]] = [v[i], v[p]]
      i = p
    }
  }
  pop(): number {
    const k = this.k
    const v = this.v
    const top = v[0]
    const lk = k.pop()!
    const lv = v.pop()!
    if (k.length) {
      k[0] = lk
      v[0] = lv
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < k.length && k[l] < k[m]) m = l
        if (r < k.length && k[r] < k[m]) m = r
        if (m === i) break
        ;[k[m], k[i]] = [k[i], k[m]]
        ;[v[m], v[i]] = [v[i], v[m]]
        i = m
      }
    }
    return top
  }
}

const g = new Float32Array(SIZE * SIZE)
const from = new Int32Array(SIZE * SIZE)
const seen = new Uint32Array(SIZE * SIZE)
let stamp = 0
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
] as const

/** jalur dari a ke b (titik dunia), sudah dirapikan; null = tidak tersambung */
export function findPath(nav: Nav, ax: number, az: number, bx: number, bz: number, budget = 160000): [number, number][] | null {
  const s = nearestFree(nav, idx(cellOf(ax), cellOf(az)))
  const t = nearestFree(nav, idx(cellOf(bx), cellOf(bz)))
  if (s < 0 || t < 0) return null
  stamp++
  const tx = t % SIZE
  const tz = Math.floor(t / SIZE)
  const h = (c: number) => {
    const dx = Math.abs((c % SIZE) - tx)
    const dz = Math.abs(Math.floor(c / SIZE) - tz)
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
  }
  const open = new Heap()
  g[s] = 0
  from[s] = -1
  seen[s] = stamp
  open.push(h(s), s)
  let n = 0
  while (open.size) {
    const c = open.pop()
    if (c === t) break
    if (++n > budget) return null
    const cx = c % SIZE
    const cz = Math.floor(c / SIZE)
    for (const [dx, dz, cost] of DIRS) {
      const x = cx + dx
      const z = cz + dz
      if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) continue
      const nc = idx(x, z)
      if (!nav.free[nc]) continue
      // jangan memotong sudut dinding
      if (dx && dz && (!nav.free[idx(cx + dx, cz)] || !nav.free[idx(cx, cz + dz)])) continue
      const ng = g[c] + cost
      if (seen[nc] === stamp && ng >= g[nc]) continue
      seen[nc] = stamp
      g[nc] = ng
      from[nc] = c
      open.push(ng + h(nc), nc)
    }
  }
  if (seen[t] !== stamp) return null
  const cells: number[] = []
  for (let c = t; c !== -1; c = from[c]) cells.push(c)
  cells.reverse()
  const pts = cells.map((c) => [center(c % SIZE), center(Math.floor(c / SIZE))] as [number, number])
  pts[pts.length - 1] = [bx, bz]
  return smooth(nav, [[ax, az], ...pts.slice(1)])
}

/** buang titik antara yang bisa dilewati langsung (garis pandang di ketinggian badan) */
function smooth(nav: Nav, pts: [number, number][]): [number, number][] {
  if (pts.length <= 2) return pts.slice(1)
  const out: [number, number][] = []
  let a = pts[0]
  let i = 1
  while (i < pts.length) {
    let j = i
    while (j + 1 < pts.length && clearLine(nav, a, pts[j + 1])) j++
    out.push(pts[j])
    a = pts[j]
    i = j + 1
  }
  return out
}

function clearLine(nav: Nav, a: [number, number], b: [number, number]): boolean {
  // garis tengah dan dua garis sejajar selebar badan
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = Math.hypot(dx, dz) || 1
  const ox = (-dz / len) * R
  const oz = (dx / len) * R
  return [0, 1, -1].every((k) => rayHit(nav.boxes, a[0] + ox * k, a[1] + oz * k, b[0] + ox * k, b[1] + oz * k, 0.5) >= 1)
}

export const isFree = (nav: Nav, x: number, z: number) => !!nav.free[idx(cellOf(x), cellOf(z))]
