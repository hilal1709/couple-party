import type { Seat } from '../types'

export type Difficulty = 'santai' | 'normal' | 'seram'

export type SunyiOptions = {
  players: number
  difficulty: Difficulty
  /** jumlah benda pusaka yang harus dikumpulkan sebelum gerbang terbuka */
  items: 3 | 5 | 7
}

export type ItemKind = 'kunci' | 'teplok' | 'keris' | 'foto' | 'kendi' | 'cermin' | 'kemenyan'

/** calib = cek & kalibrasi mic; play = jelajah; end = kabur atau tertangkap */
export type Phase = 'calib' | 'play' | 'end'

export type Item = { kind: ItemKind; spot: number; by: Seat | null }

export type SunyiEvent =
  | { id: number; kind: 'pickup'; seat: Seat; item: number }
  | { id: number; kind: 'down'; seat: Seat }
  | { id: number; kind: 'revive'; seat: Seat; by: Seat }

export type SunyiState = {
  opts: SunyiOptions
  rng: number
  phase: Phase
  phaseId: number
  /** sudah lolos cek mic */
  ready: boolean[]
  items: Item[]
  /** pemain pingsan setelah disergap Penunggu */
  down: boolean[]
  /** berapa kali tiap pemain disergap */
  downs: number[]
  result: 'kabur' | 'tertangkap' | null
  /** detik malam saat game berakhir */
  endT: number
  last: SunyiEvent | null
}

export type SunyiAction =
  | { type: 'ready' }
  | { type: 'pickup'; item: number }
  /** host: Penunggu menyergap pemain */
  | { type: 'down'; seat: Seat }
  | { type: 'revive'; seat: Seat }
  /** host: semua pemain di gerbang dengan semua pusaka */
  | { type: 'escape'; t: number }
  /** host: semua pemain pingsan */
  | { type: 'lose'; t: number }
  | { type: 'again' }
