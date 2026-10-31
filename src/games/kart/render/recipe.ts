import type { TrackDef } from '../tracks'
import type { GroundShape } from './ground'
import type { RoadLook, TerrainLook } from './shaders'
import type { SkyLook } from './sky'

/** pembatas di garis dinding fisik */
export type Fence = 'tali' | 'bambu' | 'tiang-permen' | 'akar' | 'balok' | 'tanggul' | 'batu-tajam' | 'jersey'

/** resep dunia satu lintasan: apa saja yang membuatnya tidak terasa seperti lintasan lain */
export type Recipe = {
  fence: Fence
  /** tekstur jalan (tanpa _diff) dan penguat terang warna */
  /** `normal` = kekuatan normal map; jalan mengilap perlu kecil, kalau tidak kilaunya berbintik */
  road: { tex: string; gain: number; roughness: number; normal?: number; lines: 'kota' | 'penuh' | 'tepi' | 'tanpa' } & RoadLook
  /** kerb belang timbul di tepi jalan */
  kerb?: boolean
  /** permukaan jembatan */
  deck?: string
  ground: GroundShape
  /** tambalan tanah; tekstur tambahannya disebut lewat nama di `low` dan `steep` */
  terrain: Omit<TerrainLook, 'low' | 'steep' | 'foamY'>
  /** tekstur pengganti bagian rendah tanah */
  low?: { tex: string; from: number; to: number; roughness: number }
  /** tekstur di lereng curam */
  steep?: string
  foam?: boolean
  sky: SkyLook
  env: number
  /** awan 3D kartun di kejauhan */
  clouds?: boolean
  /** kawanan burung di dekat start */
  birds?: boolean
  /** model yang bergoyang angin: [nama, tinggi model, dorongan] */
  wind: [string, number, number][]
  bloom: [strength: number, radius: number, threshold: number]
  grade: { sat: number; contrast: number; tint: [number, number, number] }
  /** gerbang start: bahan tiang */
  gate: { tex?: string; color: string; round?: boolean; prop?: string }
  /** tribun penonton di start */
  stands?: boolean
  /** pengali jumlah prop tersebar */
  scatter?: number
  /** model tambahan di luar prop tema */
  models?: string[]
}

const RECIPES: Record<TrackDef['id'], Recipe> = {
  pantai: {
    fence: 'tali',
    road: { tex: 'beton', gain: 1.5, roughness: 0.9, lines: 'tepi', wear: 0.14, edge: '#ecd7a4', edgeAmount: 0.9, wet: 0 },
    deck: 'papan-tua',
    ground: 'pesisir',
    terrain: {},
    low: { tex: 'pasir-basah', from: -3.1, to: -1.5, roughness: 0.32 },
    foam: true,
    sky: {
      zenith: '#0f62d0', horizon: '#a9e2ff', below: '#d8f3ff', sun: '#fff0cf', disc: 3.2, halo: 1.3,
      cloud: 0.42, cloudLit: '#ffffff', cloudDark: '#b4cfec', stars: 0,
    },
    env: 0.7,
    birds: true,
    wind: [['kelapa', 9, 0.5]],
    bloom: [0.14, 0.4, 0.95],
    grade: { sat: 1.2, contrast: 1.06, tint: [1.02, 1.0, 0.98] },
    gate: { tex: 'papan-tua', color: '#e6d2ae', round: true, prop: 'selancar' },
    models: ['selancar'],
  },
  sawah: {
    fence: 'bambu',
    road: { tex: 'tanah', gain: 1.5, roughness: 0.95, normal: 0.6, lines: 'tanpa', wear: 0.3, edge: '#6f9a3c', edgeAmount: 0.85, wet: 0.5 },
    ground: 'terasering',
    terrain: { paddy: { step: 3.2, water: '#9fd8ee', rice: '#7fcb45' }, tint: { low: '#c8f08a', high: '#7fae55', from: 8, to: 44 } },
    sky: {
      zenith: '#3f9be8', horizon: '#fbeccb', below: '#dbe8c8', sun: '#ffe6b0', disc: 3.6, halo: 1.5,
      cloud: 0.3, cloudLit: '#fff6e6', cloudDark: '#c8d4dc', stars: 0, ridge: '#7fa6b4',
    },
    env: 0.65,
    birds: true,
    wind: [['padi', 1.4, 0.16], ['pohon', 9, 0.3]],
    bloom: [0.16, 0.45, 0.95],
    grade: { sat: 1.24, contrast: 1.05, tint: [1.04, 1.01, 0.94] },
    gate: { tex: 'papan-tua', color: '#c9b078', round: true },
    scatter: 1.1,
  },
  jamur: {
    fence: 'akar',
    road: { tex: 'batu-lumut', gain: 1.25, roughness: 0.75, normal: 0.6, lines: 'tanpa', wear: 0.12, edge: '#2f6e3c', edgeAmount: 0.95, wet: 0.35 },
    ground: 'hutan',
    terrain: { tint: { low: '#6f9f6a', high: '#3f6a4e', from: 0, to: 30 }, glow: '#3affd0' },
    sky: {
      zenith: '#0a2036', horizon: '#2a8f80', below: '#0f3a34', sun: '#bfffe8', disc: 2.2, halo: 1.1,
      cloud: 0.5, cloudLit: '#2f7470', cloudDark: '#0c2632', stars: 0.7, ridge: '#0f3c3e',
    },
    env: 0.55,
    wind: [['pohon', 9, 0.25]],
    bloom: [0.3, 0.5, 0.88],
    grade: { sat: 1.2, contrast: 1.1, tint: [0.92, 1.03, 1.04] },
    gate: { tex: 'papan-tua', color: '#5e4634', round: true },
    scatter: 1.7,
  },
  candi: {
    fence: 'balok',
    road: { tex: 'batu-merah', gain: 1.4, roughness: 0.85, lines: 'tanpa', wear: 0.1, edge: '#e8b76a', edgeAmount: 1, wet: 0 },
    ground: 'ngarai',
    terrain: { strata: { step: 7, dark: '#a8552e', light: '#f2bd78' } },
    steep: 'batu-merah',
    sky: {
      zenith: '#2f79c4', horizon: '#ffd9a0', below: '#e8b878', sun: '#fff0c4', disc: 4.5, halo: 2,
      cloud: 0.12, cloudLit: '#fff0dc', cloudDark: '#e0b48c', stars: 0, ridge: '#c98a5e',
    },
    env: 0.75,
    wind: [],
    bloom: [0.2, 0.5, 0.9],
    grade: { sat: 1.18, contrast: 1.1, tint: [1.07, 1.0, 0.88] },
    gate: { tex: 'batu-merah', color: '#e0a878' },
  },
  neon: {
    fence: 'jersey',
    road: {
      tex: 'aspal-kota', gain: 1.5, roughness: 0.62, normal: 0.2, soften: 1.4, lines: 'kota', wear: 0.12, edge: '#14121f', edgeAmount: 0.55, wet: 1,
      glow: ['#ff37a6', '#2f7bff', '#5cf64a'],
    },
    ground: 'kota',
    terrain: {},
    sky: {
      zenith: '#0a0720', horizon: '#3b1a6e', below: '#1a0d36', sun: '#d9d2ff', disc: 2.4, halo: 0.5,
      cloud: 0.5, cloudLit: '#5a3a92', cloudDark: '#160d33', stars: 0.5, glow: '#a0307a',
    },
    env: 0.5,
    wind: [],
    bloom: [0.32, 0.45, 0.92],
    grade: { sat: 1.28, contrast: 1.12, tint: [0.96, 0.96, 1.08] },
    gate: { color: '#2a2a34' },
    stands: true,
    scatter: 0.25,
    models: ['lampu', 'gedung', 'gedung-2', 'gedung-3', 'gedung-4'],
  },
  permen: {
    fence: 'tiang-permen',
    road: { tex: 'biskuit', gain: 1, roughness: 0.42, lines: 'tepi', wear: 0.06, edge: '#ffe6f4', edgeAmount: 1, wet: 0 },
    kerb: true,
    ground: 'marshmallow',
    terrain: { tint: { low: '#ffb4e0', high: '#fff0fa', from: -2, to: 16 } },
    sky: {
      zenith: '#ff8fd0', horizon: '#fff0d8', below: '#ffd6ef', sun: '#fff4e0', disc: 4, halo: 1.6,
      cloud: 0.5, cloudLit: '#fffaff', cloudDark: '#ffb8e4', stars: 0,
    },
    env: 0.6,
    clouds: true,
    wind: [],
    bloom: [0.16, 0.5, 0.97],
    grade: { sat: 1.26, contrast: 1.04, tint: [1.03, 0.98, 1.0] },
    gate: { color: '#ff37a6' },
    stands: true,
  },
  salju: {
    fence: 'tanggul',
    road: { tex: 'aspal-salju', gain: 1.45, roughness: 0.55, normal: 0.4, lines: 'tepi', wear: 0.2, edge: '#f4faff', edgeAmount: 1, wet: 0.45 },
    ground: 'gunung',
    terrain: { tint: { low: '#ffffff', high: '#eaf3ff', from: 10, to: 120 } },
    steep: 'batu',
    sky: {
      zenith: '#16204f', horizon: '#ffb9a0', below: '#c8d4ec', sun: '#ffd9b8', disc: 3, halo: 1.6,
      cloud: 0.2, cloudLit: '#ffe4d8', cloudDark: '#7f8ab8', stars: 0.8, ridge: '#6d7cb0', aurora: '#3affa8',
    },
    env: 1.05,
    wind: [],
    bloom: [0.2, 0.5, 0.9],
    grade: { sat: 1.12, contrast: 1.08, tint: [0.97, 0.99, 1.05] },
    gate: { tex: 'papan-tua', color: '#7a5a42' },
  },
  lava: {
    fence: 'batu-tajam',
    road: {
      tex: 'basal', gain: 1.5, roughness: 0.7, lines: 'tanpa', wear: 0.08, edge: '#1a0f10', edgeAmount: 0.8, wet: 0,
      crack: '#ff5a14',
    },
    ground: 'kaldera',
    terrain: { lava: true },
    steep: 'basal',
    sky: {
      zenith: '#160a12', horizon: '#c0401c', below: '#3a0e0a', sun: '#ff8a4a', disc: 5, halo: 1.8,
      cloud: 0.62, cloudLit: '#a03a22', cloudDark: '#1c0f14', stars: 0, glow: '#ff4a14', ridge: '#2a1012',
    },
    env: 0.7,
    wind: [],
    bloom: [0.3, 0.4, 1.1],
    grade: { sat: 1.2, contrast: 1.14, tint: [1.08, 0.96, 0.9] },
    gate: { tex: 'basal', color: '#4a3a3a' },
  },
}

export const recipeOf = (def: TrackDef): Recipe => RECIPES[def.id]
