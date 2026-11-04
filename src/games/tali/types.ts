import type { Seat } from '../types'

export type LevelId = 'sawah' | 'apung' | 'atap' | 'pabrik' | 'gua' | 'candi' | 'bromo' | 'malam'

export type Theme = LevelId

export type TaliOptions = {
  /** level pertama yang dimainkan (indeks 0..7) */
  start: number
  /** true = setelah level selesai lanjut ke level berikutnya; false = satu level saja */
  run: boolean
  /** main sendiri: Klepon dijalankan bot di HP host */
  bot: boolean
  /** jumlah pemain di room (diisi saat game dimulai) */
  players?: number
}

export type Phase = 'play' | 'clear' | 'end'

export type LevelResult = {
  stars: number
  ms: number
  falls: number
  candy: number
  /** jumlah permen di level itu */
  of: number
}

export type TaliState = {
  opts: TaliOptions
  phase: Phase
  /** indeks level di LEVELS */
  level: number
  /** naik tiap level baru / ulang level; tampilan dibuat ulang saat nilai ini berubah */
  levelId: number
  /** checkpoint terjauh yang sudah dicapai; -1 = titik awal */
  checkpoint: number
  /** naik tiap ada yang jatuh: kedua HP memindahkan karakternya ke checkpoint */
  spawnId: number
  /** siapa saja yang sedang berdiri di tiap tombol (bitmask kursi) */
  press: number[]
  levers: boolean[]
  candy: boolean[]
  falls: number
  /** siapa saja yang sudah di gerbang finis (bitmask kursi) */
  goal: number
  /** waktu tempuh terlama yang dilaporkan tiap kursi di gerbang (ms) */
  goalMs: number[]
  /** siapa saja yang siap lanjut di layar hasil (bitmask kursi) */
  ready: number
  /** hasil terbaik per level selama sesi ini */
  results: (LevelResult | null)[]
  lastFall: { id: number; seat: Seat } | null
}

/** `as` = kursi bot; hanya berlaku dari host saat mode bot */
export type TaliAction = TaliActionBody & { as?: Seat }

type TaliActionBody =
  | { type: 'press'; i: number; on: boolean }
  | { type: 'lever'; i: number }
  | { type: 'checkpoint'; i: number }
  | { type: 'collect'; i: number }
  | { type: 'fall' }
  | { type: 'goal'; on: boolean; ms: number }
  /** layar hasil: siap lanjut ke level berikutnya */
  | { type: 'next' }
  /** ulang level ini dari awal */
  | { type: 'retry' }
  /** pilih level dari layar hasil / akhir */
  | { type: 'pick'; level: number }
