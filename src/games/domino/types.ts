import type { Seat } from '../types'

/** Satu kartu domino (balak 0–6): a ≤ b; id = `d${a}${b}` */
export type Tile = { id: string; a: number; b: number }

export type Mode = 'gaple' | 'cangkul' | 'lima' | 'qiuqiu'
/** mode yang menyambung kartu jadi rantai di meja */
export type ChainMode = Exclude<Mode, 'qiuqiu'>

export type DominoOptions = {
  players: number
  mode: Mode
  /** jumlah ronde untuk mode rantai */
  rounds: 3 | 5 | 7
  /** jumlah tangan untuk Qiu Qiu */
  hands: 5 | 10 | 15
  /** modal chip awal Qiu Qiu */
  chips: 500 | 1000 | 2000
  /** taruhan wajib tiap tangan Qiu Qiu (juga besar raise minimum) */
  ante: 10 | 20 | 50
}

/* ---------- state tiap mode ---------- */

/** Kartu yang sudah terpasang di rantai: `l` = angka yang menghadap kiri, `r` = kanan. */
export type Placed = { tile: Tile; l: number; r: number; by: Seat }
export type Side = 'L' | 'R'

export type ChainState = {
  kind: 'chain'
  mode: ChainMode
  hands: Tile[][]
  /** tumpukan tertutup (Gaple: kartu "tidur" yang tidak dipakai) */
  bone: Tile[]
  /** rantai dari kiri ke kanan */
  line: Placed[]
  turn: Seat
  /** jumlah pass berturut-turut; = jumlah pemain → buntu */
  passes: number
  /** kartu yang wajib dipasang pertama (balak tertinggi) */
  first: string | null
  /** kartu yang dicangkul pemain giliran ini */
  drew: number
  /** poin Domino Lima selama ronde ini */
  pts: number[]
  /** jalan terakhir, untuk disorot di meja */
  last: { by: Seat; id: string; side: Side } | null
  /** ronde berakhir karena buntu */
  blocked: boolean
}

export type QiuCategory = 'normal' | 'qiuqiu' | 'besar' | 'kecil' | 'dewa'
/** nilai tangan Qiu Qiu: kategori lalu angka pembanding */
export type QiuHand = { cat: QiuCategory; score: number[]; pairs: [Tile[], Tile[]]; values: [number, number] }

export type QiuState = {
  kind: 'qiuqiu'
  hands: Tile[][]
  bone: Tile[]
  stack: number[]
  /** taruhan di putaran ini */
  bet: number[]
  /** total chip yang masuk pot di tangan ini (termasuk ante) */
  committed: number[]
  folded: boolean[]
  acted: boolean[]
  /** ikut tangan ini (punya chip saat dibagi) */
  inHand: boolean[]
  dealer: Seat
  /** 0 = tiga kartu, 1 = kartu keempat sudah dibagi */
  street: 0 | 1
  turn: Seat
  high: number
  minRaise: number
  result: { pots: { amount: number; winners: Seat[] }[]; hands: (QiuHand | null)[]; shown: boolean } | null
}

export type ModeState = ChainState | QiuState

/* ---------- aksi ---------- */

export type ChainAction = { t: 'play'; id: string; side: Side } | { t: 'draw' } | { t: 'pass' }
export type QiuAction = { t: 'fold' } | { t: 'check' } | { t: 'call' } | { t: 'raise'; to: number } | { t: 'allin' }
export type ModeAction = ChainAction | QiuAction

export type DominoAction = ModeAction | { t: 'next' } | { t: 'again' }

/* ---------- kejadian (untuk suara & animasi) ---------- */

export type DominoEvent =
  | { t: 'deal' }
  | { t: 'play'; by: Seat; double: boolean }
  | { t: 'draw'; by: Seat; n: number }
  | { t: 'pass'; by: Seat }
  | { t: 'score'; by: Seat; pts: number }
  | { t: 'blocked' }
  | { t: 'domino'; by: Seat }
  | { t: 'bet'; by: Seat; amount: number }
  | { t: 'check'; by: Seat }
  | { t: 'fold'; by: Seat }
  | { t: 'allin'; by: Seat }
  | { t: 'street' }
  | { t: 'round'; special: QiuCategory | null }

export type Phase = 'play' | 'roundEnd' | 'end'

export type DominoState = {
  opts: DominoOptions
  rng: number
  /** ronde / tangan sekarang, mulai 1 */
  round: number
  /** poin total (Qiu Qiu: jumlah chip) */
  scores: number[]
  deltas: number[]
  phase: Phase
  roundWinners: Seat[]
  champions: Seat[] | null
  event: DominoEvent | null
  eventId: number
  m: ModeState
}
