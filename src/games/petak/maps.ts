import dapur from '@/assets/petak/maps/dapur.json'
import gang from '@/assets/petak/maps/gang.json'
import kapal from '@/assets/petak/maps/kapal.json'
import kota from '@/assets/petak/maps/kota.json'
import museum from '@/assets/petak/maps/museum.json'
import pabrik from '@/assets/petak/maps/pabrik.json'
import pasar from '@/assets/petak/maps/pasar.json'
import stasiun from '@/assets/petak/maps/stasiun.json'
import type { PoseId } from './render/poses'
import type { MapId } from './types'

/** kotak tabrakan (sudah dalam sumbu three): pusat, setengah ukuran, putaran Y, tinggi puncak */
export type Box = { x: number; z: number; hx: number; hz: number; yaw: number; top: number }
export type Spot = { x: number; z: number; yaw: number; pose: PoseId }

export type MapData = {
  boxes: Box[]
  spots: Spot[]
  spawn: { hider: number[][]; seeker: number[][] }
  life: {
    /** kawanan: x, y, z */
    merpati: number[][]
    /** rute: daftar [x, y] Blender */
    kucing: number[][][]
    warga: number[][][]
    ayam?: number[][][]
    /** kawanan burung gereja: x, y, z */
    burung?: number[][]
    asap: number[][]
    /** atap penahan hujan: x0, z0, x1, z1 */
    atap: number[][]
  }
  /** warna pengali per nama material (linear) */
  tint: Record<string, number[]>
  /** arah ke matahari, sumbu Blender */
  sun?: number[]
}

export const MAP_IDS: MapId[] = ['gang', 'pasar', 'museum', 'stasiun', 'pabrik', 'dapur', 'kota', 'kapal']

/** benda yang berputar di tempat */
export type Spinner = { name: string; axis: 'x' | 'y' | 'z'; speed: number }

export type MapInfo = {
  title: string
  line: string
  sky: string
  ambient: string
  /** kekuatan cahaya lingkungan dan langit */
  env: number
  bg: number
  /** terang makhluk dan benda tanpa lightmap, 0..1 */
  fill: number
  /** terang daun */
  leaf: number
  /** pengali lightmap, untuk menyetel terang tanpa bake ulang */
  lm?: number
  rain?: boolean
  /** bayangan awan berjalan */
  clouds?: boolean
  spinners?: Spinner[]
  /** kereta melintas berkala */
  train?: boolean
}

export const MAP_INFO: Record<MapId, MapInfo> = {
  gang: { title: 'Gang Kampung', line: 'Sore di gang: jemuran, warung, dan kucing yang sok tahu', sky: 'senja', ambient: 'gang', env: 0.3, bg: 0.75, fill: 0.6, leaf: 0.5, clouds: true },
  pasar: {
    title: 'Pasar Malam',
    line: 'Lampu neon, komidi putar, dan lapak yang pura-pura sepi',
    sky: 'malam',
    ambient: 'pasar',
    env: 0.2,
    bg: 0.28,
    fill: 0.4,
    leaf: 0.2,
    lm: 3.8,
    spinners: [
      { name: 'putar_komidi', axis: 'y', speed: 0.55 },
      { name: 'putar_bianglala', axis: 'x', speed: 0.14 },
    ],
  },
  museum: { title: 'Museum Seni', line: 'Jadi lukisan atau patung, asal jangan bersin', sky: 'siang', ambient: 'museum', env: 0.18, bg: 0.5, fill: 0.6, leaf: 0.5 },
  stasiun: { title: 'Stasiun Tua', line: 'Senja, hujan, dan kereta yang tak pernah tepat waktu', sky: 'senja', ambient: 'stasiun', env: 0.16, bg: 0.2, fill: 0.45, leaf: 0.3, rain: true, train: true },
  pabrik: {
    title: 'Pabrik Permen',
    line: 'Sungai sirup, ban berjalan, dan gigi mesin yang tak mau berhenti',
    sky: 'siang',
    ambient: 'pabrik',
    env: 0.25,
    bg: 0.7,
    fill: 0.6,
    leaf: 0.5,
    spinners: [
      { name: 'putar_gigi1', axis: 'z', speed: 0.5 },
      { name: 'putar_gigi2', axis: 'z', speed: -0.8 },
      { name: 'putar_gigi3', axis: 'x', speed: 0.6 },
      { name: 'putar_aduk1', axis: 'y', speed: 0.9 },
      { name: 'putar_aduk2', axis: 'y', speed: -0.7 },
    ],
  },
  dapur: { title: 'Dapur Raksasa', line: 'Kamu sekecil sendok. Awas tutup panci', sky: 'siang', ambient: 'dapur', env: 0.25, bg: 0.8, fill: 0.6, leaf: 0.5 },
  kota: { title: 'Kota Terbalik', line: 'Rumah menggantung, mobil di langit, gravitasi lagi cuti', sky: 'siang', ambient: 'kota', env: 0.85, bg: 1, fill: 0.7, leaf: 0.55, clouds: true },
  kapal: { title: 'Kapal Bajak Laut', line: 'Badai, meriam, dan kru yang tinggal tulang', sky: 'senja', ambient: 'kapal', env: 0.16, bg: 0.22, fill: 0.5, leaf: 0.3, rain: true },
}

const DATA = {
  gang: gang as unknown as MapData,
  pasar: pasar as unknown as MapData,
  museum: museum as unknown as MapData,
  stasiun: stasiun as unknown as MapData,
  pabrik: pabrik as unknown as MapData,
  dapur: dapur as unknown as MapData,
  kota: kota as unknown as MapData,
  kapal: kapal as unknown as MapData,
} satisfies Record<MapId, MapData>

export const mapData = (id: MapId): MapData => DATA[id]
