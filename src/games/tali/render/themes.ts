import type { HazardKind, Skin } from '../levels/types'
import type { LevelId } from '../types'

/** nama tekstur: kart/<nama> (diff+nor), sport/<nama> (diff+nor+rough), tali/<nama> (bake Blender) */
export type TexRef = `${'kart' | 'sport' | 'tali'}/${string}`

/** `gain` mencerahkan tekstur foto yang gelap (pengali warna > 1) */
export type SkinLook = { tex: TexRef; scale: number; tint: string; gain?: number; cap?: { tex: TexRef; scale: number; tint: string; depth: number; gain?: number }; deep?: number; glow?: string }

/** hiasan latar: nama objek kit, jumlah per 10 m, rentang kedalaman z, skala */
export type Scatter = { name: string; per10: number; z: [number, number]; s: [number, number]; y?: number; sway?: boolean }

export type Theme = {
  sky: 'siang' | 'senja' | 'malam' | null
  /** warna langit gradasi kalau tanpa HDR */
  grad?: [string, string]
  fog: string
  fogNear: number
  fogFar: number
  sun: { color: string; intensity: number; dir: [number, number, number] }
  ambient: number
  /** kekuatan HDR sebagai cahaya lingkungan */
  env: number
  hook: 'kait' | 'lampion' | 'jepit' | 'lampu'
  /** tali kait menggantung ke atas, atau dibentang mendatar (jemuran) */
  hookLine: 'atas' | 'bentang'
  skins: Partial<Record<Skin, SkinLook>>
  hazard: Partial<Record<HazardKind, string>>
  /** dekorasi di tepi depan pijakan (rumput, padi) */
  lip: Scatter[]
  /** dekorasi latar */
  back: Scatter[]
  /** benda jauh: nama, x relatif tengah level (0..1), z, skala */
  far: [string, number, number, number][]
  /** tanah latar di belakang level */
  floor: SkinLook & { y: number }
  /** dinding latar dekat (gua, pabrik): tampilan, z, bawah, atas */
  wall?: { look: SkinLook; z: number; y0: number; y1: number; ceil?: number }
  bloom: [number, number, number]
  exposure: number
}

const tanah: SkinLook = { tex: 'kart/tanah', scale: 3, tint: '#d8bc9a', gain: 1.5, cap: { tex: 'sport/rumput', scale: 2.2, tint: '#a8e070', depth: 0.32, gain: 1.25 }, deep: 0.12 }
const kayu: SkinLook = { tex: 'sport/papan', scale: 2.2, tint: '#d9b892', deep: 0.05 }
const papanTua: SkinLook = { tex: 'kart/papan-tua', scale: 2.4, tint: '#d4c2a8', gain: 1.5, deep: 0.05 }
const peti: SkinLook = { tex: 'sport/kayu', scale: 1.6, tint: '#e0bf90', deep: 0.04 }
const logam: SkinLook = { tex: 'sport/logam', scale: 2, tint: '#c8d0dc', gain: 1.8, deep: 0.05 }
const kain: SkinLook = { tex: 'tali/batik', scale: 1.4, tint: '#ffffff' }
const bambu: SkinLook = { tex: 'tali/bambu', scale: 1.2, tint: '#ffffff' }
const genteng: SkinLook = { tex: 'kart/beton', scale: 3, tint: '#b8a898', cap: { tex: 'tali/genteng', scale: 1.6, tint: '#ffffff', depth: 0.6 }, deep: 0.04 }
const batu: SkinLook = { tex: 'kart/batu', scale: 3, tint: '#bdb6aa', cap: { tex: 'kart/batu-lumut', scale: 2.5, tint: '#cfe0b0', depth: 0.25 }, deep: 0.08 }

export const THEMES: Record<LevelId, Theme> = {
  sawah: {
    sky: 'siang', fog: '#cfe6f5', fogNear: 30, fogFar: 140,
    sun: { color: '#fff1d8', intensity: 2.6, dir: [0.5, 1, 0.6] }, ambient: 0.5, env: 0.9,
    hook: 'kait', hookLine: 'atas',
    skins: { tanah, kayu, batu, bambu },
    hazard: { air: '#5da9c9' },
    lip: [{ name: 'rumput', per10: 26, z: [0.4, 1.3], s: [0.8, 1.4], sway: true }, { name: 'bunga', per10: 3, z: [0.5, 1.2], s: [0.8, 1.2], sway: true }, { name: 'padi', per10: 10, z: [-2.2, -0.8], s: [0.9, 1.3], sway: true }],
    back: [{ name: 'padi', per10: 40, z: [-12, -3], s: [0.9, 1.4], y: -0.3, sway: true }, { name: 'sway_kelapa', per10: 1.2, z: [-22, -9], s: [0.9, 1.4], y: -0.3, sway: true }, { name: 'gubuk', per10: 0.25, z: [-16, -10], s: [1, 1.2], y: -0.3 }, { name: 'orang_sawah', per10: 0.5, z: [-9, -5], s: [1, 1.2], y: -0.3 }, { name: 'sway_pohon', per10: 0.6, z: [-30, -18], s: [1.2, 2], y: -0.3, sway: true }],
    far: [['gunung', 0.25, -90, 2.4], ['gunung_jauh', 0.7, -140, 2.6], ['gunung', 0.95, -110, 1.8]],
    floor: { tex: 'sport/rumput', scale: 4, tint: '#a8d878', y: -0.35, gain: 1.1 },
    bloom: [0.18, 0.4, 1.35], exposure: 1.0,
  },
  apung: {
    sky: 'siang', fog: '#d8eaf0', fogNear: 30, fogFar: 130,
    sun: { color: '#fff4e0', intensity: 2.4, dir: [0.4, 1, 0.5] }, ambient: 0.5, env: 0.95,
    hook: 'lampion', hookLine: 'atas',
    skins: { kayu: papanTua, perahu: { tex: 'kart/papan', scale: 1.5, tint: '#8fb8e8' }, peti, tanah },
    hazard: { air: '#3f9bb0' },
    lip: [{ name: 'keranjang', per10: 1.2, z: [-1.6, -0.9], s: [0.8, 1] }],
    back: [{ name: 'perahu', per10: 0.8, z: [-14, -5], s: [0.8, 1.1], y: 0.05 }, { name: 'payung', per10: 1, z: [-16, -8], s: [0.9, 1.2], y: 0 }, { name: 'tenda', per10: 0.6, z: [-20, -12], s: [1, 1.3], y: 0 }, { name: 'sway_kelapa', per10: 0.8, z: [-28, -16], s: [1, 1.5], y: 0, sway: true }],
    far: [['gunung_jauh', 0.4, -150, 2.4], ['gunung', 0.85, -110, 2]],
    floor: { tex: 'kart/pasir-basah', scale: 4, tint: '#9ad0e0', gain: 1.3, y: 0.15 },
    bloom: [0.2, 0.4, 1.35], exposure: 1.0,
  },
  atap: {
    sky: 'senja', fog: '#f2c9a8', fogNear: 30, fogFar: 150,
    sun: { color: '#ffd2a0', intensity: 2.2, dir: [-0.6, 0.7, 0.5] }, ambient: 0.45, env: 0.9,
    hook: 'jepit', hookLine: 'bentang',
    skins: { genteng, logam, kain, peti, kayu },
    hazard: {},
    lip: [{ name: 'cerobong', per10: 0.8, z: [-1.6, -1], s: [0.8, 1.1] }, { name: 'antena', per10: 0.6, z: [-1.8, -1.2], s: [0.8, 1.2] }],
    back: [{ name: 'gedung0', per10: 0.6, z: [-24, -12], s: [1, 1.4], y: -8 }, { name: 'gedung1', per10: 0.5, z: [-30, -16], s: [1, 1.5], y: -8 }, { name: 'gedung2', per10: 0.5, z: [-22, -10], s: [1, 1.3], y: -8 }, { name: 'gedung3', per10: 0.5, z: [-34, -20], s: [1, 1.6], y: -8 }, { name: 'menara_air', per10: 0.25, z: [-14, -8], s: [1, 1.2], y: 2 }],
    far: [['gunung_jauh', 0.5, -160, 2.6]],
    floor: { tex: 'kart/aspal-kota', scale: 4, tint: '#8a8090', y: -8 },
    bloom: [0.25, 0.45, 1.3], exposure: 0.92,
  },
  pabrik: {
    sky: 'senja', fog: '#9a8f86', fogNear: 18, fogFar: 70,
    sun: { color: '#ffe2c0', intensity: 1.6, dir: [0.3, 1, 0.4] }, ambient: 0.55, env: 0.6,
    hook: 'kait', hookLine: 'atas',
    skins: { logam, peti, kayu },
    hazard: { listrik: '#202a34' },
    lip: [{ name: 'tong', per10: 1, z: [-1.6, -1], s: [0.8, 1] }],
    back: [{ name: 'rak_kerupuk', per10: 1.4, z: [-6, -2.5], s: [1, 1.2], y: 0 }, { name: 'pipa', per10: 0.7, z: [-8, -4], s: [1, 1.4], y: 0 }, { name: 'tong', per10: 1.2, z: [-6, -3], s: [0.9, 1.1], y: 0 }],
    far: [],
    floor: { tex: 'kart/beton', scale: 3, tint: '#c8c0b8', gain: 1.4, y: -0.05 },
    wall: { look: { tex: 'tali/genteng', scale: 2.2, tint: '#d8b8a0', deep: 0 }, z: -9, y0: -2, y1: 14 },
    bloom: [0.35, 0.45, 1.1], exposure: 1.1,
  },
  gua: {
    sky: null, grad: ['#0a0d18', '#1b1a2a'], fog: '#0d1018', fogNear: 6, fogFar: 34,
    sun: { color: '#8fa8ff', intensity: 0.25, dir: [0.2, 1, 0.5] }, ambient: 0.12, env: 0.08,
    hook: 'kait', hookLine: 'atas',
    skins: { batu: { ...batu, tint: '#9a96a8', cap: { tex: 'kart/batu-lumut', scale: 2, tint: '#7aa070', depth: 0.22 }, deep: 0.1 } },
    hazard: { air: '#1d4a66', duri: '#5a5870' },
    lip: [{ name: 'kristal', per10: 1.5, z: [-1.4, -0.6], s: [0.6, 1.2] }, { name: 'jamur', per10: 2.5, z: [0.3, 1], s: [0.7, 1.3] }],
    back: [{ name: 'stalaktit', per10: 2.5, z: [-6, -1], s: [0.8, 1.6], y: 9.5 }, { name: 'batu_besar', per10: 1.2, z: [-8, -3], s: [1, 2], y: -0.2 }, { name: 'kristal', per10: 1.2, z: [-9, -4], s: [1, 2], y: 0 }, { name: 'kelelawar', per10: 0.6, z: [-5, -2], s: [1, 1.2], y: 6 }],
    far: [],
    floor: { tex: 'kart/batu', scale: 4, tint: '#4a4858', y: -0.3 },
    wall: { look: { tex: 'kart/batu', scale: 4, tint: '#5a5868', deep: 0 }, z: -7, y0: -6, y1: 18, ceil: 10.5 },
    bloom: [0.45, 0.5, 0.9], exposure: 1.1,
  },
  candi: {
    sky: 'siang', fog: '#dfe6d8', fogNear: 30, fogFar: 140,
    sun: { color: '#fff0d0', intensity: 2.5, dir: [-0.4, 1, 0.6] }, ambient: 0.5, env: 0.9,
    hook: 'kait', hookLine: 'atas',
    skins: { batu: { tex: 'kart/cobble', scale: 2.2, tint: '#b8b0a6', cap: { tex: 'sport/rumput', scale: 2, tint: '#a8e070', depth: 0.22, gain: 1.2 }, deep: 0.06 } },
    hazard: { duri: '#7a746a' },
    lip: [{ name: 'rumput', per10: 14, z: [0.4, 1.2], s: [0.7, 1.2], sway: true }, { name: 'arca', per10: 0.4, z: [-1.8, -1.2], s: [0.8, 1] }],
    back: [{ name: 'stupa', per10: 0.9, z: [-12, -5], s: [1, 1.5], y: -0.3 }, { name: 'sway_kamboja', per10: 0.7, z: [-16, -7], s: [1, 1.5], y: -0.3, sway: true }, { name: 'sway_pohon', per10: 0.6, z: [-28, -16], s: [1.4, 2.2], y: -0.3, sway: true }],
    far: [['candi_jauh', 0.5, -70, 2.4], ['gunung', 0.2, -130, 2.4], ['gunung_jauh', 0.85, -160, 2.6]],
    floor: { tex: 'sport/rumput', scale: 4, tint: '#9cd070', y: -0.35, gain: 1.1 },
    bloom: [0.18, 0.4, 1.35], exposure: 1.0,
  },
  bromo: {
    sky: 'senja', fog: '#d8b9a0', fogNear: 24, fogFar: 110,
    sun: { color: '#ffc890', intensity: 2.3, dir: [0.7, 0.6, 0.5] }, ambient: 0.45, env: 0.85,
    hook: 'kait', hookLine: 'atas',
    skins: { tanah: { tex: 'kart/pasir', scale: 3, tint: '#b8a490', deep: 0.06 }, batu: { tex: 'kart/basal', scale: 2.6, tint: '#b0a8a8', gain: 1.6, deep: 0.07, glow: '#ff6a20' } },
    hazard: { lava: '#ff6a1a' },
    lip: [{ name: 'batu_vulkanik', per10: 1.4, z: [-1.6, 1], s: [0.3, 0.6] }],
    back: [{ name: 'batu_vulkanik', per10: 1.6, z: [-12, -4], s: [0.8, 2], y: -0.3 }, { name: 'pura', per10: 0.12, z: [-16, -12], s: [1, 1.2], y: 7.7 }],
    far: [['bromo', 0.55, -80, 2.2], ['gunung_jauh', 0.15, -150, 2.8], ['gunung_jauh', 0.9, -160, 2.4]],
    floor: { tex: 'kart/pasir', scale: 5, tint: '#a8927e', y: -0.35 },
    bloom: [0.35, 0.45, 1.2], exposure: 1.0,
  },
  malam: {
    sky: 'malam', fog: '#1c1830', fogNear: 25, fogFar: 110,
    sun: { color: '#9fb0ff', intensity: 0.7, dir: [0.3, 1, 0.6] }, ambient: 0.35, env: 0.5,
    hook: 'lampu', hookLine: 'atas',
    skins: { kayu: { ...kayu, tint: '#c8a07a' }, kain, peti },
    hazard: { air: '#2a3a6a', listrik: '#1a1428' },
    lip: [{ name: 'untaian', per10: 0.5, z: [-1.6, -1.2], s: [1, 1], y: 3.2 }],
    back: [{ name: 'tenda', per10: 1, z: [-12, -5], s: [1, 1.3], y: 0 }, { name: 'untaian', per10: 1, z: [-10, -4], s: [1, 1.4], y: 4 }, { name: 'payung', per10: 0.5, z: [-14, -8], s: [1, 1.2], y: 0 }, { name: 'sway_kelapa', per10: 0.4, z: [-26, -14], s: [1, 1.4], y: 0, sway: true }],
    far: [['gedung1', 0.2, -70, 2], ['gedung3', 0.8, -80, 2.2]],
    floor: { tex: 'kart/aspal', scale: 4, tint: '#8a80a8', gain: 2.2, y: -0.3 },
    bloom: [0.6, 0.5, 0.8], exposure: 1.1,
  },
}

/** tampilan cadangan kalau tema tidak mendefinisikan suatu jenis permukaan */
export const DEFAULT_SKINS: Record<Skin, SkinLook> = {
  tanah,
  kayu,
  batu,
  logam,
  genteng,
  bambu,
  perahu: papanTua,
  kain,
  peti,
  es: { tex: 'kart/salju', scale: 3, tint: '#e0f0ff' },
}
