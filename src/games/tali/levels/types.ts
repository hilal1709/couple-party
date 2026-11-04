import type { Box, Wind } from '../sim/physics'
import type { LevelId } from '../types'

/** jenis permukaan; tampilannya dipilih dari kit tema level */
export type Skin = 'tanah' | 'kayu' | 'batu' | 'logam' | 'genteng' | 'bambu' | 'perahu' | 'kain' | 'peti' | 'es'

export type SolidDef = {
  b: Box
  k?: Skin
  oneway?: boolean
  belt?: number
  crumble?: boolean
  /** pintu: padat selama grup mati, terangkat saat grup hidup */
  door?: number
  /** bergerak bolak-balik terus: geser d, periode detik, fase 0..1 */
  move?: { d: [number, number]; period: number; phase?: number }
  /** berputar mengelilingi titik c (bianglala), jari-jari r */
  orbit?: { c: [number, number]; r: number; period: number; phase?: number }
  /** lift: bergeser ke d saat grup hidup, kembali saat mati */
  lift?: { g: number; d: [number, number]; speed?: number }
}

export type HazardKind = 'air' | 'duri' | 'lava' | 'listrik'

export type Hazard = { b: Box; k: HazardKind }

/** tombol injak: tengah x, permukaan y, lebar w; need = jumlah badan yang harus berdiri */
export type ButtonDef = { x: number; y: number; w?: number; g: number; need?: 1 | 2 }

export type LeverDef = { x: number; y: number; g: number }

/** hiasan dari kit: nama node GLB, x, y, z (kedalaman), skala, putaran Y derajat */
export type Prop = [name: string, x: number, y: number, z?: number, s?: number, rot?: number]

export type LevelDef = {
  id: LevelId
  title: string
  line: string
  /** target detik untuk bintang waktu */
  par: number
  spawn: [number, number]
  solids: SolidDef[]
  hooks: [number, number][]
  hazards: Hazard[]
  buttons: ButtonDef[]
  levers: LeverDef[]
  checkpoints: [number, number][]
  candy: [number, number][]
  goal: [number, number]
  wind: Wind[]
  dark?: boolean
  killY: number
  /** batas kamera kiri-kanan */
  bounds: [number, number]
  /** petunjuk yang muncul saat salah satu pemain lewat x */
  tips: [x: number, text: string][]
  props: Prop[]
}
