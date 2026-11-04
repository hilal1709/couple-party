/**
 * Map "Kampung Sunyi": 120×120 m, sumbu three (x ke timur, z ke selatan, gerbang di selatan).
 * Semua bangunan dibuat dari data di sini, dipakai bersama oleh tabrakan (sim) dan tampilan (render).
 */
import { nextRand } from '../rng'
import type { Box } from '../petak/maps'

export type Mat = 'dinding' | 'plester' | 'papan' | 'lantai' | 'genteng' | 'bata' | 'batu' | 'seng' | 'pintu' | 'kain' | 'kayu'

/** balok bertekstur; `solid` = ikut tabrakan */
export type Block = { x: number; z: number; hx: number; hz: number; y0: number; y1: number; yaw: number; mat: Mat; solid: boolean }
/** atap limasan: alas persegi panjang di ketinggian y, bubungan sepanjang `ridge` di sumbu x */
export type Roof = { x: number; z: number; hx: number; hz: number; y: number; h: number; ridge: number; mat: 'genteng' | 'seng' }
export type TreeKind = 'pohon' | 'pisang' | 'bambu' | 'kamboja'
export type Tree = { kind: TreeKind; x: number; z: number; s: number; yaw: number }
export type PropKind = 'nisan' | 'sumur' | 'bedug' | 'drum' | 'karung' | 'tempayan' | 'tikar' | 'kelambu' | 'gerbang' | 'foto'
export type Prop = { kind: PropKind; x: number; y: number; z: number; yaw: number; s: number }
export type Lamp = { x: number; y: number; z: number; warm: number }
export type Zone = { id: string; title: string; x0: number; z0: number; x1: number; z1: number; indoor: boolean }
export type Spot = { x: number; y: number; z: number; zone: string }

export const HALF = 60
export const WALL_H = 3.2
const T = 0.1
const FLOOR = 0.3

const blocks: Block[] = []
const roofs: Roof[] = []
const props: Prop[] = []
const trees: Tree[] = []
const lamps: Lamp[] = []
const ceilings: { x0: number; z0: number; x1: number; z1: number; y: number }[] = []

function block(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, mat: Mat, solid = true, yaw = 0) {
  blocks.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, y0, y1, yaw, mat, solid })
}

/** dinding lurus sejajar sumbu dengan celah pintu; ambang di atas celah tidak ikut tabrakan */
function wall(x0: number, z0: number, x1: number, z1: number, gaps: [number, number][], mat: Mat, h = WALL_H, y0 = 0, door = 2.2) {
  const alongX = z0 === z1
  const a = alongX ? Math.min(x0, x1) : Math.min(z0, z1)
  const b = alongX ? Math.max(x0, x1) : Math.max(z0, z1)
  const put = (s: number, e: number, ya: number, yb: number, solid: boolean) => {
    if (e - s < 0.01) return
    if (alongX) block(s, z0 - T, e, z0 + T, ya, yb, mat, solid)
    else block(x0 - T, s, x0 + T, e, ya, yb, mat, solid)
  }
  let at = a
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    put(at, g0, y0, h, true)
    put(g0, g1, door, h, false)
    at = g1
  }
  put(at, b, y0, h, true)
}

/* ---------- rumah joglo ---------- */
block(-12.2, -14.2, 12.2, 6.2, 0, FLOOR, 'lantai')
block(-10.4, 6.2, 10.4, 12.4, 0, FLOOR, 'lantai')
wall(-12, -14, 12, -14, [[-0.7, 0.7]], 'dinding')
wall(-12, 6, 12, 6, [[-0.8, 0.8]], 'dinding')
wall(-12, -14, -12, 6, [], 'dinding')
wall(12, -14, 12, 6, [[-9, -7.8]], 'dinding')
wall(-5, -14, -5, 6, [[1, 2.2], [-9.5, -8.3]], 'plester')
wall(5, -14, 5, 6, [[1, 2.2], [-9.5, -8.3]], 'plester')
wall(-12, -4, -5, -4, [], 'plester')
wall(-5, -4, 5, -4, [[-0.7, 0.7]], 'plester')
wall(5, -4, 12, -4, [], 'plester')
ceilings.push({ x0: -12, z0: -14, x1: 12, z1: 6, y: WALL_H })
ceilings.push({ x0: -10.4, z0: 6, x1: 10.4, z1: 12.4, y: 3 })
for (const [x, z] of [[-9.8, 12], [-4.6, 12], [4.6, 12], [9.8, 12], [-9.8, 6.5], [9.8, 6.5], [-3, 9.2], [3, 9.2]]) block(x - 0.15, z - 0.15, x + 0.15, z + 0.15, FLOOR, 3, 'kayu')
roofs.push({ x: 0, z: -4, hx: 13.4, hz: 11.4, y: WALL_H, h: 4.6, ridge: 5, mat: 'genteng' })
roofs.push({ x: 0, z: 9.4, hx: 11.2, hz: 3.8, y: 3, h: 1.6, ridge: 15, mat: 'genteng' })
// kamar A (depan kiri)
block(-10.6, 3, -7.6, 5.6, FLOOR, 0.75, 'kayu')
props.push({ kind: 'kelambu', x: -9.1, y: 0.75, z: 4.3, yaw: 0, s: 1 })
block(-11.8, -3.6, -11.1, -1.4, FLOOR, 2.1, 'pintu')
block(-6.2, -3.6, -5.2, -2.6, FLOOR, 0.8, 'kayu')
// kamar B (belakang kiri)
block(-10.6, -13.6, -7.6, -11, FLOOR, 0.75, 'kayu')
block(-11.7, -6.6, -10.3, -5.4, FLOOR, 0.9, 'papan')
props.push({ kind: 'tikar', x: -8, y: FLOOR + 0.01, z: -7, yaw: 0.2, s: 1 })
// kamar C (depan kanan)
block(7.6, 3, 10.6, 5.6, FLOOR, 0.75, 'kayu')
props.push({ kind: 'kelambu', x: 9.1, y: 0.75, z: 4.3, yaw: 0, s: 1 })
block(11.1, -3.6, 11.8, -1.4, FLOOR, 2.1, 'pintu')
block(9, -2.6, 10.6, -1.2, FLOOR, 0.8, 'kayu')
// dapur (belakang kanan)
block(9.6, -13.8, 11.8, -11.6, FLOOR, 1.0, 'bata')
block(5.3, -13.8, 7.8, -13.2, FLOOR, 1.8, 'papan')
props.push({ kind: 'tempayan', x: 6.4, y: FLOOR, z: -6, yaw: 0, s: 1.1 })
block(5.9, -6.5, 6.9, -5.5, FLOOR, 0.9, 'kayu', true)
// ruang tengah & ruang belakang
block(1.4, 0, 3.6, 2, FLOOR, 0.8, 'kayu')
block(-4.85, -3.6, -4.25, -1.4, FLOOR, 2, 'pintu')
props.push({ kind: 'foto', x: 0, y: 2, z: -3.88, yaw: 0, s: 1 })
block(-2, -11, 2, -9, FLOOR, 0.8, 'kayu')
props.push({ kind: 'tikar', x: -2, y: FLOOR + 0.01, z: 3, yaw: 0, s: 1.4 })
lamps.push({ x: 2.5, y: 1.1, z: 1, warm: 1 }, { x: 0, y: 1.1, z: -10, warm: 0.9 }, { x: 0, y: 2.6, z: 11.6, warm: 1 }, { x: -6.6, y: 1.1, z: -3, warm: 0.8 })

/* ---------- sumur ---------- */
block(-0.95, -21.95, 0.95, -20.05, 0, 0.85, 'bata')
props.push({ kind: 'sumur', x: 0, y: 0, z: -21, yaw: 0, s: 1 })
for (const [x, z] of [[-1.2, -21], [1.2, -21]]) block(x - 0.08, z - 0.08, x + 0.08, z + 0.08, 0, 2.4, 'kayu')
// bilik mandi bata tanpa atap
wall(-8, -24, -4, -24, [], 'bata', 2)
wall(-8, -24, -8, -19, [], 'bata', 2)
wall(-4, -24, -4, -19, [[-21.8, -20.6]], 'bata', 2, 0, 2)
wall(-8, -19, -4, -19, [], 'bata', 2)

/* ---------- langgar ---------- */
block(30.3, -35.7, 37.7, -28.3, 0, FLOOR, 'lantai')
wall(30.5, -35.5, 37.5, -35.5, [], 'dinding')
wall(30.5, -35.5, 30.5, -28.5, [], 'dinding')
wall(37.5, -35.5, 37.5, -28.5, [], 'dinding')
wall(30.5, -28.5, 37.5, -28.5, [[33.2, 34.8]], 'dinding')
ceilings.push({ x0: 30.5, z0: -35.5, x1: 37.5, z1: -28.5, y: WALL_H })
roofs.push({ x: 34, z: -32, hx: 4.6, hz: 4.6, y: WALL_H, h: 3.4, ridge: 0, mat: 'genteng' })
props.push({ kind: 'bedug', x: 36.2, y: FLOOR, z: -34.2, yaw: 0, s: 1 }, { kind: 'tikar', x: 33.4, y: FLOOR + 0.01, z: -32.5, yaw: 0, s: 1.3 })
block(35.6, -34.8, 36.8, -33.6, FLOOR, 1, 'kayu', true)
lamps.push({ x: 34, y: 2.4, z: -28.1, warm: 1 })

/* ---------- gudang ---------- */
block(28, 13, 36, 19, 0, 0.05, 'lantai', false)
wall(28, 13, 36, 13, [], 'seng', 2.8)
wall(28, 19, 36, 19, [], 'seng', 2.8)
wall(36, 13, 36, 19, [], 'seng', 2.8)
wall(28, 13, 28, 19, [[15.3, 16.7]], 'seng', 2.8)
ceilings.push({ x0: 28, z0: 13, x1: 36, z1: 19, y: 2.8 })
roofs.push({ x: 32, z: 16, hx: 4.8, hz: 3.8, y: 2.8, h: 1.2, ridge: 8, mat: 'seng' })
for (const [x, z] of [[34.8, 14.2], [35.2, 15.2], [34.6, 17.8]]) props.push({ kind: 'drum', x, y: 0, z, yaw: x, s: 1 })
block(33.8, 13.4, 35.8, 16, 0, 1, 'kayu')
props.push({ kind: 'karung', x: 30, y: 0, z: 18, yaw: 0.3, s: 1 }, { kind: 'karung', x: 31.2, y: 0, z: 18.2, yaw: -0.4, s: 0.9 })

/* ---------- kuburan ---------- */
const GRAVE = { x0: -42, z0: -38, x1: -26, z1: -22 }
wall(GRAVE.x0, GRAVE.z0, GRAVE.x1, GRAVE.z0, [], 'batu', 0.62)
wall(GRAVE.x0, GRAVE.z1, GRAVE.x1, GRAVE.z1, [[-35, -33]], 'batu', 0.62)
wall(GRAVE.x0, GRAVE.z0, GRAVE.x0, GRAVE.z1, [], 'batu', 0.62)
wall(GRAVE.x1, GRAVE.z0, GRAVE.x1, GRAVE.z1, [[-31, -29]], 'batu', 0.62)
{
  let r = 77
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      let v: number
      ;[v, r] = nextRand(r)
      const x = -39.5 + j * 2.6 + (v - 0.5) * 0.6
      ;[v, r] = nextRand(r)
      const z = -35.5 + i * 3.4 + (v - 0.5) * 0.5
      ;[v, r] = nextRand(r)
      if (v < 0.12) continue
      const yaw = (v - 0.5) * 0.4
      props.push({ kind: 'nisan', x, y: 0, z, yaw, s: 0.8 + v * 0.4 })
      blocks.push({ x, z, hx: 0.3, hz: 0.12, y0: 0, y1: 0.7, yaw, mat: 'batu', solid: true })
    }
  }
}
trees.push({ kind: 'kamboja', x: -38.5, z: -25, s: 1, yaw: 0.4 }, { kind: 'kamboja', x: -28.5, z: -36, s: 1.1, yaw: 2 })

/* ---------- gerbang & pagar depan ---------- */
const GATE_Z = 56.5
wall(-16, GATE_Z, 16, GATE_Z, [[-2, 2]], 'bata', 2.2)
for (const x of [-2.3, 2.3]) block(x - 0.3, GATE_Z - 0.3, x + 0.3, GATE_Z + 0.3, 0, 2.9, 'bata')
props.push({ kind: 'gerbang', x: 0, y: 0, z: GATE_Z, yaw: 0, s: 1 })
lamps.push({ x: -2.3, y: 3.1, z: GATE_Z - 0.4, warm: 0.7 })
// pagar bambu sepanjang batas map
for (const [x0, z0, x1, z1] of [[-HALF, GATE_Z, -16, GATE_Z], [16, GATE_Z, HALF, GATE_Z], [-HALF, -HALF, HALF, -HALF], [-HALF, -HALF, -HALF, GATE_Z], [HALF, -HALF, HALF, GATE_Z]]) {
  wall(x0, z0, x1, z1, [], 'kayu', 1.8)
}
// celah gerbang tertutup pintu kayu sampai semua pusaka terkumpul (tabrakan ditambah di sim)
export const GATE = { x: 0, z: GATE_Z, hx: 2, zone: { x0: -3.2, z0: GATE_Z - 4.5, x1: 3.2, z1: GATE_Z - 0.2 } }
export const GATE_BOX: Box = { x: 0, z: GATE_Z, hx: 2, hz: 0.15, yaw: 0, top: 3 }

/* ---------- jalan setapak ---------- */
export const PATHS: [number, number][][] = [
  [[0, 55], [0.6, 40], [-0.4, 25], [0, 12.6]],
  [[0, 30], [14, 31], [24, 26], [27.5, 16]],
  [[12.2, -8.4], [20, -9], [28, -18], [34, -27.8]],
  [[0, -14.2], [0, -19.6]],
  [[-1, -21.8], [-12, -25], [-26, -30]],
  [[-10.4, 9], [-20, 10], [-30, 14]],
]

export const ITEM_SPOTS: Spot[] = [
  { x: -9.1, y: 0.78, z: 3.6, zone: 'rumah' },
  { x: -11, y: 0.93, z: -6, zone: 'rumah' },
  { x: 9.8, y: 0.83, z: -1.9, zone: 'rumah' },
  { x: 10.7, y: 1.03, z: -12.7, zone: 'rumah' },
  { x: 2.5, y: 0.83, z: 1, zone: 'rumah' },
  { x: 1.2, y: 0.83, z: -10, zone: 'rumah' },
  { x: 36.2, y: 1.03, z: -34.2, zone: 'langgar' },
  { x: 34.8, y: 1.03, z: 14.6, zone: 'gudang' },
  { x: -34.4, y: 0.05, z: -31.2, zone: 'kuburan' },
  { x: 1.4, y: 0.05, z: -22.4, zone: 'sumur' },
  { x: -40, y: 0.05, z: 18, zone: 'kebun' },
  { x: 45.5, y: 0.05, z: -4.5, zone: 'bambu' },
  { x: -7.6, y: 0.33, z: 10.8, zone: 'pendopo' },
  { x: -6, y: 0.05, z: -20.5, zone: 'sumur' },
  { x: 24, y: 0.05, z: 40, zone: 'gerbang' },
]

export const SPAWN: [number, number][] = [
  [-1.2, 51],
  [1.2, 51],
]

/** titik keliling Penunggu */
export const PATROL: [number, number][] = [
  [0, 2], [-8.5, 1], [-8.5, -8], [8.5, 1], [8.5, -9], [0, -9], [0, 9], [0, -21.5], [-14, -25],
  [34, -31.5], [24, -14], [32, 16.5], [20, 30], [-34, -28], [-38, 12], [-30, 26], [46, -6], [48, 4], [-20, 42], [20, 44], [0, 32], [-45, -45], [45, 40], [-50, 40],
]
/* ---------- pepohonan ---------- */
type Rect = { x0: number; z0: number; x1: number; z1: number }
const KEEP_OUT: Rect[] = [
  { x0: -15, z0: -17, x1: 15, z1: 15 },
  { x0: -10, z0: -26, x1: 3, z1: -17 },
  { x0: 27, z0: -38, x1: 41, z1: -25 },
  { x0: 25, z0: 10, x1: 39, z1: 22 },
  { x0: GRAVE.x0 - 1, z0: GRAVE.z0 - 1, x1: GRAVE.x1 + 1, z1: GRAVE.z1 + 1 },
  { x0: -5, z0: 46, x1: 5, z1: 58 },
]
function nearPath(x: number, z: number, d: number) {
  for (const p of PATHS) {
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i]
      const [bx, bz] = p[i + 1]
      const dx = bx - ax
      const dz = bz - az
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
      if (Math.hypot(ax + dx * t - x, az + dz * t - z) < d) return true
    }
  }
  return false
}
const blocked = (x: number, z: number, pad: number) =>
  KEEP_OUT.some((r) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad) || nearPath(x, z, 2.2 + pad) || [...ITEM_SPOTS.map((p) => [p.x, p.z]), ...PATROL].some(([px, pz]) => Math.hypot(px - x, pz - z) < pad + 2.4) || trees.some((t) => Math.hypot(t.x - x, t.z - z) < pad + 1.6)

function scatter(kind: TreeKind, n: number, area: Rect, seed: number, s0: number, s1: number, pad: number) {
  let r = seed
  let placed = 0
  for (let tries = 0; tries < n * 12 && placed < n; tries++) {
    let a: number
    let b: number
    let c: number
    ;[a, r] = nextRand(r)
    ;[b, r] = nextRand(r)
    ;[c, r] = nextRand(r)
    const x = area.x0 + a * (area.x1 - area.x0)
    const z = area.z0 + b * (area.z1 - area.z0)
    if (blocked(x, z, pad)) continue
    trees.push({ kind, x, z, s: s0 + c * (s1 - s0), yaw: c * Math.PI * 2 })
    placed++
  }
}
scatter('pisang', 26, { x0: -54, z0: -2, x1: -22, z1: 34 }, 11, 0.85, 1.25, 0.6)
scatter('bambu', 18, { x0: 40, z0: -22, x1: 56, z1: 10 }, 23, 0.9, 1.3, 1.8)
scatter('pohon', 46, { x0: -HALF + 3, z0: -HALF + 3, x1: HALF - 3, z1: GATE_Z - 3 }, 37, 0.9, 1.5, 1.5)
// cincin hutan rapat di tepi supaya pagar tidak terlihat kosong
{
  let r = 5
  for (let i = 0; i < 64; i++) {
    let v: number
    ;[v, r] = nextRand(r)
    const side = i % 4
    const u = -HALF + ((Math.floor(i / 4) + v) / 16) * (2 * HALF)
    const inset = 3 + v * 3
    const [x, z] = side === 0 ? [u, -HALF + inset] : side === 1 ? [-HALF + inset, u] : side === 2 ? [HALF - inset, u] : [u, GATE_Z + 2.4]
    if (side === 3 && Math.abs(x) < 8) continue
    if (z > GATE_Z - 4 && side !== 3) continue
    trees.push({ kind: side === 2 && z < 12 ? 'bambu' : 'pohon', x, z, s: 1.1 + v * 0.6, yaw: v * 6 })
  }
}

/* ---------- ekspor ---------- */
export const BLOCKS = blocks
export const ROOFS = roofs
export const PROPS = props
export const TREES = trees
export const LAMPS = lamps
export const CEILINGS = ceilings

/** kotak tabrakan untuk sim (format sama dengan Petak Cat) */
export const BOXES: Box[] = [
  ...blocks.filter((b) => b.solid).map((b) => ({ x: b.x, z: b.z, hx: b.hx, hz: b.hz, yaw: b.yaw, top: b.y1 })),
  ...trees.map((t) => {
    const r = t.kind === 'bambu' ? 0.8 * t.s : t.kind === 'pisang' ? 0.2 : 0.3 * t.s
    return { x: t.x, z: t.z, hx: r, hz: r, yaw: 0, top: 6 }
  }),
]

export const ZONES: Zone[] = [
  { id: 'rumah', title: 'Rumah Joglo', x0: -12, z0: -14, x1: 12, z1: 6, indoor: true },
  { id: 'pendopo', title: 'Pendopo', x0: -10.4, z0: 6, x1: 10.4, z1: 12.4, indoor: false },
  { id: 'langgar', title: 'Langgar Tua', x0: 30.5, z0: -35.5, x1: 37.5, z1: -28.5, indoor: true },
  { id: 'gudang', title: 'Gudang', x0: 28, z0: 13, x1: 36, z1: 19, indoor: true },
  { id: 'kuburan', title: 'Kuburan', ...GRAVE, indoor: false },
  { id: 'sumur', title: 'Sumur', x0: -9, z0: -25, x1: 3, z1: -18, indoor: false },
  { id: 'kebun', title: 'Kebun Pisang', x0: -55, z0: -2, x1: -21, z1: 35, indoor: false },
  { id: 'bambu', title: 'Rumpun Bambu', x0: 39, z0: -23, x1: 57, z1: 11, indoor: false },
  { id: 'gerbang', title: 'Gerbang', x0: -16, z0: 46, x1: 16, z1: GATE_Z, indoor: false },
]

export const zoneAt = (x: number, z: number) => ZONES.find((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) ?? null

export const GHOST_SPAWN: [number, number] = [34, -31.5]
