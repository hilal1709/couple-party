import type { Seat } from '../types'

/** Jumlah lengan papan: 4 = salib klasik, 6 = heksagon, 8 = oktagon. */
export type Arms = 4 | 6 | 8

/** Petak per lengan: 6 keluar + 1 ujung + 6 masuk. */
export const ARM = 13
/** Petak jalur rumah (kolom tengah lengan) sebelum finis. */
export const LANE = 5

export type LudoOptions = {
  players: number
  arms: Arms
  /** bidak per pemain */
  pieces: 2 | 3 | 4
  /** 2 tim, rekan duduk berselang-seling (butuh 4/6/8 pemain) */
  teams: boolean
  /** petak jahil: roket, portal, bom, kulit pisang */
  specials: boolean
  /** mode cepat: keluar kandang pakai angka berapa pun */
  freeOut: boolean
}

export type Special = 'boost' | 'portal' | 'bomb' | 'slip'

/**
 * Posisi bidak dihitung sebagai kemajuan dari start pemiliknya:
 * -1 = kandang, 0..L-1 = jalur keliling, L..L+LANE-1 = jalur rumah, L+LANE = finis.
 */
export type Prog = number

export type Note =
  | { t: 'six' }
  | { t: 'tripleSix' }
  | { t: 'out'; seat: Seat; piece: number }
  | { t: 'move'; seat: Seat; piece: number }
  | { t: 'capture'; seat: Seat; piece: number; victim: Seat; vpiece: number }
  | { t: 'safe' }
  | { t: 'home'; seat: Seat; piece: number }
  | { t: 'allHome'; seat: Seat }
  | { t: 'special'; fx: Special; seat: Seat; piece: number; victim?: Seat }
  | { t: 'noMove' }
  | { t: 'bonus'; why: 'six' | 'capture' | 'home' }
  | { t: 'win'; team: number }

/** Satu bidak yang berpindah dalam satu aksi; `path` berisi nilai Prog berurutan (untuk animasi). */
export type Move = { seat: Seat; piece: number; path: Prog[]; jump?: boolean }

export type LudoEvent = {
  by: Seat
  dice?: number
  moves: Move[]
  log: Note[]
}

export type LudoState = {
  opts: LudoOptions
  rng: number
  /** lengan papan tiap kursi */
  arm: number[]
  /** tim tiap kursi (tanpa mode tim = nomor kursi) */
  team: number[]
  prog: Prog[][]
  turn: Seat
  phase: 'roll' | 'move' | 'end'
  /** angka dadu yang menunggu dijalankan (fase move) */
  die: number | null
  /** jumlah angka 6 beruntun di giliran ini */
  sixes: number
  /** dapat lemparan bonus setelah langkah ini */
  bonus: boolean
  /** tim pemenang */
  winner: number | null
  eventId: number
  event: LudoEvent | null
}

export type LudoAction =
  | { type: 'roll' }
  /** jalankan bidak `piece` milik `owner` (pemilik bisa rekan setim di mode tim) */
  | { type: 'move'; owner: Seat; piece: number }
  | { type: 'again' }
