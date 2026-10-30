import type { Seat } from '../types'

/** Ukuran papan: 10x10, kotak 1..100. Posisi 0 = belum masuk papan. */
export const GOAL = 100

export type Effect = 'fwd3' | 'back3' | 'again' | 'skip' | 'swap' | 'teleport'
export type Item = 'shield' | 'double' | 'trap' | 'pass'
export type Deck = 'truth' | 'dare'

export type Tile = { kind: 'challenge' } | { kind: 'quiz' } | { kind: 'item' } | { kind: 'fx'; fx: Effect }

export type Board = {
  /** ular (dari > ke) dan tangga (dari < ke) */
  jumps: Record<number, number>
  tiles: Record<number, Tile>
}

export type SnakesOptions = {
  players: number
  /** kotak Truth/Dare */
  challenges: boolean
  /** kotak efek papan */
  effects: boolean
  /** kotak item & power-up */
  items: boolean
  /** kotak mini-kuis */
  quiz: boolean
  /** harus pas di 100; kelebihan langkah memantul mundur */
  exact: boolean
  /** mundur berapa kotak kalau tolak/gagal tantangan */
  penalty: 3 | 5
  /** kursi bot; diisi otomatis oleh room saat game dimulai */
  botSeats?: Seat[]
}

export type Pending =
  /** di kotak tantangan: pilih Truth atau Dare */
  | { kind: 'pickDeck' }
  /** kartu sudah dibuka: jalanin atau tolak */
  | { kind: 'card'; deck: Deck; i: number }
  /** sedang dijalanin, lawan yang menilai */
  | { kind: 'judge'; deck: Deck; i: number }
  | { kind: 'quiz'; i: number }

export type Note =
  | { t: 'enter' }
  | { t: 'snake'; from: number; to: number }
  | { t: 'ladder'; from: number; to: number }
  | { t: 'shieldBlock'; at: number }
  | { t: 'bounce' }
  | { t: 'trap'; owner: Seat; at: number }
  | { t: 'fx'; fx: Effect; with?: Seat }
  | { t: 'gotItem'; item: Item }
  | { t: 'bagFull' }
  | { t: 'useItem'; item: Item }
  | { t: 'challenge' }
  | { t: 'card'; deck: Deck }
  | { t: 'doIt' }
  | { t: 'judged'; ok: boolean; judge: Seat }
  | { t: 'refuse' }
  | { t: 'quiz' }
  | { t: 'answer'; ok: boolean }
  | { t: 'skipped'; who: Seat }
  | { t: 'win' }

export type SnakesEvent = {
  by: Seat
  dice?: number[]
  /** kotak yang dilewati bidak `by` secara berurutan (untuk animasi) */
  path: number[]
  log: Note[]
}

export type SnakesState = {
  opts: SnakesOptions
  rng: number
  board: Board
  pos: number[]
  items: Item[][]
  shield: boolean[]
  skip: boolean[]
  /** kotak → pemilik jebakan */
  traps: Record<number, Seat>
  turn: Seat
  pending: Pending | null
  /** Dadu Ganda aktif untuk lemparan ini */
  double: boolean
  /** item sudah dipakai di giliran ini */
  usedItem: boolean
  winner: Seat | null
  /** urutan kartu yang belum ditarik (indeks konten) */
  decks: { truth: number[]; dare: number[]; quiz: number[] }
  eventId: number
  event: SnakesEvent | null
}

export type SnakesAction =
  | { type: 'roll' }
  | { type: 'useItem'; item: Item }
  | { type: 'pickDeck'; deck: Deck }
  | { type: 'doIt' }
  | { type: 'refuse' }
  | { type: 'judge'; ok: boolean }
  | { type: 'answer'; choice: number }
  | { type: 'again' }

/** Maksimum item yang bisa dipegang satu pemain. */
export const BAG = 2
