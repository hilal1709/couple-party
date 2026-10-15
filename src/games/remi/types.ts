import type { Seat } from '../types'

/** S = Sekop ♠, H = Hati ♥, C = Keriting ♣, D = Wajik ♦, X = Joker */
export type Suit = 'S' | 'H' | 'C' | 'D'
/** r: 1 = As, 11 = J, 12 = Q, 13 = K; Joker r = 0 */
export type Card = { id: string; s: Suit | 'X'; r: number }

export type Mode = 'cangkulan' | 'bigtwo' | 'remi41' | 'poker' | 'joker' | 'bohong' | 'blackjack' | 'seven'

export type RemiOptions = {
  players: number
  mode: Mode
  /** jumlah ronde untuk mode non-chip */
  rounds: 3 | 5 | 7
  /** jumlah tangan untuk Poker & Blackjack */
  hands: 5 | 10 | 15
  /** modal chip awal (Poker & Blackjack) */
  chips: 500 | 1000 | 2000
  /** big blind Poker (small blind = setengahnya) */
  blind: 20 | 50 | 100
  /** jumlah kartu awal Cangkulan */
  cangkulHand: 5 | 7
}

/* ---------- state tiap mode ---------- */

export type TrickPlay = { by: Seat | -1; card: Card }

export type CangkulanState = {
  kind: 'cangkulan'
  hands: Card[][]
  deck: Card[]
  /** kartu di meja untuk trik ini; by = -1 untuk kartu pembuka dari dek */
  trick: TrickPlay[]
  /** kursi yang sudah jalan / pass di trik ini */
  acted: Seat[]
  leadSuit: Suit | null
  turn: Seat
  /** trik terakhir yang selesai, untuk ditampilkan sebentar */
  lastTrick: { plays: TrickPlay[]; winner: Seat } | null
  /** jumlah kartu yang baru dicangkul pemain giliran ini */
  dug: number
}

export type ComboKind = 'single' | 'pair' | 'triple' | 'straight' | 'flush' | 'full' | 'four' | 'sflush'
export type Combo = { kind: ComboKind; /** dibandingkan hanya dengan kombinasi berukuran sama */ size: number; key: number }

export type BigTwoState = {
  kind: 'bigtwo'
  hands: Card[][]
  turn: Seat
  /** kombinasi yang harus dikalahkan; null = bebas */
  table: { by: Seat; cards: Card[]; combo: Combo } | null
  passed: boolean[]
  /** kartu yang wajib ikut di jalan pertama (kartu terendah) */
  mustInclude: string | null
}

export type Remi41State = {
  kind: 'remi41'
  hands: Card[][]
  deck: Card[]
  discard: Card[]
  turn: Seat
  /** 'draw' = harus ambil dulu, 'discard' = harus buang */
  step: 'draw' | 'discard'
  /** kartu yang baru diambil dari buangan (tidak boleh langsung dibuang lagi) */
  took: string | null
  /** kursi yang tutup dengan 41 */
  closer: Seat | null
}

export type PokerState = {
  kind: 'poker'
  hands: Card[][]
  deck: Card[]
  board: Card[]
  stack: number[]
  /** taruhan di putaran ini */
  bet: number[]
  /** total chip yang masuk pot di tangan ini */
  committed: number[]
  folded: boolean[]
  /** sudah bertindak sejak raise terakhir */
  acted: boolean[]
  /** ikut tangan ini (punya chip saat dibagi) */
  inHand: boolean[]
  dealer: Seat
  street: 0 | 1 | 2 | 3
  turn: Seat
  /** taruhan tertinggi di putaran ini */
  high: number
  minRaise: number
  /** hasil showdown; null selama tangan berjalan */
  result: { pots: { amount: number; winners: Seat[] }[]; names: (string | null)[]; shown: boolean } | null
}

export type JokerState = {
  kind: 'joker'
  hands: Card[][]
  turn: Seat
  /** urutan habis kartu */
  finished: Seat[]
  last: { by: Seat; from: Seat; paired: Card[] | null } | null
}

export type BohongState = {
  kind: 'bohong'
  hands: Card[][]
  pile: Card[]
  /** angka yang wajib diaku di jalan berikutnya */
  claim: number
  turn: Seat
  /** jalan terakhir yang masih bisa dituduh */
  last: { by: Seat; cards: Card[]; claim: number } | null
  /** hasil tuduhan terakhir */
  reveal: { caller: Seat; by: Seat; cards: Card[]; claim: number; lied: boolean; taker: Seat } | null
}

export type BlackjackState = {
  kind: 'blackjack'
  shoe: Card[]
  step: 'bet' | 'play' | 'done'
  stack: number[]
  bets: number[]
  hands: Card[][]
  dealer: Card[]
  /** pemain sudah selesai (stand / bust / blackjack / double) */
  done: boolean[]
  doubled: boolean[]
  turn: Seat
  /** hasil tiap kursi setelah bandar jalan */
  results: (BjResult | null)[]
}
export type BjResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'out'

export type SevenState = {
  kind: 'seven'
  hands: Card[][]
  /** baris tiap jenis: rentang angka yang sudah terpasang */
  rows: Record<Suit, { lo: number; hi: number } | null>
  /** kartu yang ditutup (penalti) */
  closed: Card[][]
  turn: Seat
  last: { by: Seat; card: Card | null } | null
}

export type ModeState = CangkulanState | BigTwoState | Remi41State | PokerState | JokerState | BohongState | BlackjackState | SevenState

/* ---------- aksi ---------- */

export type CangkulanAction = { t: 'play'; id: string } | { t: 'dig' } | { t: 'pass' }
export type BigTwoAction = { t: 'play'; ids: string[] } | { t: 'pass' }
export type Remi41Action = { t: 'drawDeck' } | { t: 'drawDiscard' } | { t: 'discard'; id: string }
export type PokerAction = { t: 'fold' } | { t: 'check' } | { t: 'call' } | { t: 'raise'; to: number } | { t: 'allin' }
export type JokerAction = { t: 'pick'; i: number } | { t: 'shuffle' }
export type BohongAction = { t: 'play'; ids: string[] } | { t: 'call' } | { t: 'accept' }
export type BlackjackAction = { t: 'bet'; amount: number } | { t: 'hit' } | { t: 'stand' } | { t: 'double' }
export type SevenAction = { t: 'play'; id: string } | { t: 'close'; id: string }

export type ModeAction = CangkulanAction | BigTwoAction | Remi41Action | PokerAction | JokerAction | BohongAction | BlackjackAction | SevenAction

export type RemiAction =
  | ModeAction
  /** lanjut dari layar akhir ronde */
  | { t: 'next' }
  /** main lagi setelah game selesai */
  | { t: 'again' }

/* ---------- kejadian (untuk suara & animasi) ---------- */

export type RemiEvent =
  | { t: 'deal' }
  | { t: 'play'; by: Seat; n: number }
  | { t: 'dig'; by: Seat; n: number }
  | { t: 'pass'; by: Seat }
  | { t: 'trick'; winner: Seat }
  | { t: 'bomb'; by: Seat }
  | { t: 'draw'; by: Seat; from: 'deck' | 'discard' }
  | { t: 'discard'; by: Seat }
  | { t: 'close41'; by: Seat }
  | { t: 'pick'; by: Seat; from: Seat; paired: boolean }
  | { t: 'shuffle'; by: Seat }
  | { t: 'call'; by: Seat; lied: boolean }
  | { t: 'bet'; by: Seat; amount: number }
  | { t: 'check'; by: Seat }
  | { t: 'fold'; by: Seat }
  | { t: 'allin'; by: Seat }
  | { t: 'street'; street: number }
  | { t: 'hit'; by: Seat; bust: boolean }
  | { t: 'stand'; by: Seat }
  | { t: 'blackjack'; by: Seat }
  | { t: 'dealer' }
  | { t: 'closeCard'; by: Seat }
  | { t: 'round' }

export type Phase = 'play' | 'roundEnd' | 'end'

export type RemiState = {
  opts: RemiOptions
  rng: number
  /** ronde / tangan sekarang, mulai 1 */
  round: number
  /** poin total (mode chip: jumlah chip) */
  scores: number[]
  /** perubahan poin di ronde terakhir */
  deltas: number[]
  phase: Phase
  /** pemenang ronde terakhir */
  roundWinners: Seat[]
  /** juara game (bisa seri) */
  champions: Seat[] | null
  event: RemiEvent | null
  eventId: number
  m: ModeState
}
