import type { Seat } from '../types'

export type LightColor = 'red' | 'yellow' | 'green' | 'blue'
export type DarkColor = 'pink' | 'teal' | 'orange' | 'purple'
export type Color = LightColor | DarkColor

export const LIGHT: LightColor[] = ['red', 'yellow', 'green', 'blue']
export const DARK: DarkColor[] = ['pink', 'teal', 'orange', 'purple']

export type Kind =
  | 'num'
  | 'skip'
  | 'skipAll' // Skip Everyone
  | 'reverse'
  | 'draw' // kartu draw berwarna (+1, +2, +4, +5)
  | 'flip'
  | 'discardAll'
  | 'wild'
  | 'wildDraw' // Wild +2/+4/+6/+10 (rev = Wild Reverse Draw 4)
  | 'wildDrawColor' // ambil terus sampai dapat warna pilihan pemain
  | 'roulette' // Wild Color Roulette: korban pilih warna lalu ambil sampai dapat

export type Face = {
  kind: Kind
  color: Color | null
  /** angka kartu, atau jumlah ambil untuk kartu draw */
  value: number
  rev?: boolean
}

/** Classic & No Mercy: 1 sisi. Flip: [terang, gelap]. */
export type Card = { id: string; faces: Face[] }

export type Variant = 'classic' | 'flip' | 'noMercy'

export type HouseRules = {
  stacking: boolean
  sevenZero: boolean
  jumpIn: boolean
  drawToMatch: boolean
  forcePlay: boolean
  noChallenge: boolean
}

export type UnoOptions = {
  variant: Variant
  house: HouseRules
  target: number
  /** jumlah pemain (2–8); diisi otomatis oleh room saat game dimulai */
  players?: number
}

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8

export const DEFAULT_HOUSE: HouseRules = {
  stacking: false,
  sevenZero: false,
  jumpIn: false,
  drawToMatch: false,
  forcePlay: false,
  noChallenge: false,
}

export type Pending =
  /** pemain `by` harus memilih warna (kartu pembuka Wild, atau Flip memunculkan Wild) */
  | { kind: 'chooseColor'; by: Seat }
  /** korban boleh terima atau tantang kartu Wild Draw */
  | { kind: 'challenge'; victim: Seat; legal: boolean; amount: number; untilColor: boolean }
  /** tumpukan kartu draw; korban harus menumpuk atau ambil semuanya */
  | { kind: 'stack'; victim: Seat; amount: number }
  /** Color Roulette: korban memilih warna lalu ambil sampai dapat warna itu */
  | { kind: 'roulette'; victim: Seat }

export type Event =
  | { t: 'play'; by: Seat; card: string }
  | { t: 'draw'; by: Seat; n: number }
  | { t: 'uno'; by: Seat }
  | { t: 'caught'; by: Seat; n: number }
  | { t: 'challengeWin'; by: Seat; n: number }
  | { t: 'challengeLose'; by: Seat; n: number }
  | { t: 'swap'; a: Seat; b: Seat }
  | { t: 'rotate' }
  | { t: 'reverse'; dir: 1 | -1 }
  | { t: 'flip'; side: number }
  | { t: 'mercy'; by: Seat }
  | { t: 'pass'; by: Seat }
  | { t: 'round'; winner: Seat; points: number }

export type UnoState = {
  opts: UnoOptions
  seed: number
  side: number // 0 terang, 1 gelap (Flip)
  deck: Card[]
  discard: Card[]
  /** jumlah pemain di meja */
  players: number
  hands: Card[][]
  /** arah putaran: 1 = searah urutan duduk, -1 = berlawanan */
  dir: 1 | -1
  /** No Mercy: pemain yang tereliminasi (tangan ≥ 25 kartu) */
  out: boolean[]
  turn: Seat
  color: Color | null
  pending: Pending | null
  /** kartu yang baru diambil & boleh langsung dimainkan */
  drawn: string | null
  unoArmed: boolean[]
  unoVulnerable: Seat | null
  round: number
  dealer: Seat
  scores: number[]
  roundWinner: Seat | null
  roundPoints: number
  /** No Mercy: poin kartu pemain yang tereliminasi ronde ini (tangannya sudah dikosongkan) */
  mercyPoints: number
  gameWinner: Seat | null
  /** naik setiap ada event baru; UI memakai ini untuk animasi */
  eventId: number
  event: Event | null
}

export type UnoAction =
  | { type: 'play'; cardId: string; color?: Color; /** target tukar tangan untuk kartu 7 */ target?: Seat }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'uno' }
  | { type: 'catch' }
  | { type: 'accept' } // terima tantangan/stack
  | { type: 'challenge' }
  | { type: 'pickColor'; color: Color } // chooseColor & roulette
  | { type: 'nextRound' }
