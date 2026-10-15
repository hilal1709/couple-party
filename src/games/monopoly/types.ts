import type { Seat } from '../types'

/** Jumlah petak papan: 0 = START, berputar berlawanan arah jarum jam sampai 39. */
export const SQUARES = 40
export const JAIL = 10
export const GO_SALARY = 200
export const JAIL_FINE = 50
/** Rumah ke-5 = hotel. */
export const HOTEL = 5

export type Group = 'brown' | 'sky' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'navy'
export type Deck = 'chance' | 'chest'

export type Square =
  | { kind: 'go' }
  | { kind: 'jail' }
  | { kind: 'parking' }
  | { kind: 'gotojail' }
  | { kind: 'tax'; name: string; amount: number }
  | { kind: 'card'; deck: Deck }
  | { kind: 'street'; name: string; group: Group; price: number; house: number; rent: number[] }
  | { kind: 'airport'; name: string; price: number }
  | { kind: 'utility'; name: string; price: number }

export type Ownable = Extract<Square, { price: number }>

export type MonopolyOptions = {
  players: number
  /** bangkrut = main sampai tersisa satu; rounds = setelah N putaran, kekayaan terbanyak menang */
  end: 'bankrupt' | 'rounds'
  rounds: 15 | 25 | 40
  startCash: 1500 | 2000
  /** petak yang tidak dibeli dilelang */
  auction: boolean
  /** boleh tukar-menukar properti & uang */
  trade: boolean
  /** boleh gadai properti ke bank */
  mortgage: boolean
  /** pajak & denda dikumpulkan di Parkir Bebas */
  freeParking: boolean
  /** berhenti tepat di START dapat gaji dobel */
  doubleGo: boolean
}

export type Phase = 'roll' | 'buy' | 'auction' | 'debt' | 'done' | 'end'

/** Ke mana uang dibayar: kursi pemain, bank, atau pot Parkir Bebas. */
export type Payee = Seat | 'bank' | 'pot'

export type Debt = { who: Seat; amount: number; to: Payee }

export type Auction = {
  sq: number
  bid: number
  bidder: Seat | null
  /** masih ikut menawar */
  active: boolean[]
  turn: Seat
}

export type Trade = {
  from: Seat
  to: Seat
  /** petak dari `from` ke `to` */
  give: number[]
  /** petak dari `to` ke `from` */
  get: number[]
  giveCash: number
  getCash: number
}

export type Note =
  | { t: 'go'; amount: number }
  | { t: 'doubles' }
  | { t: 'speeding' }
  | { t: 'buy'; sq: number; price: number }
  | { t: 'rent'; sq: number; amount: number; to: Seat }
  | { t: 'tax'; sq: number; amount: number }
  | { t: 'card'; deck: Deck; i: number }
  | { t: 'money'; who: Seat; amount: number }
  | { t: 'jail' }
  | { t: 'jailOut'; how: 'pay' | 'card' | 'double' | 'forced' }
  | { t: 'jailStay'; tries: number }
  | { t: 'jailCard' }
  | { t: 'pot'; amount: number }
  | { t: 'auction'; sq: number }
  | { t: 'bid'; amount: number }
  | { t: 'passBid' }
  | { t: 'sold'; sq: number; to: Seat; amount: number }
  | { t: 'unsold'; sq: number }
  | { t: 'build'; sq: number }
  | { t: 'sell'; sq: number }
  | { t: 'mortgage'; sq: number }
  | { t: 'unmortgage'; sq: number }
  | { t: 'tradeOffer'; to: Seat }
  | { t: 'tradeDone'; with: Seat }
  | { t: 'tradeNo'; with: Seat }
  | { t: 'tradeCancel' }
  | { t: 'debt'; amount: number; to: Payee }
  | { t: 'paid'; who: Seat; amount: number; to: Payee }
  | { t: 'bankrupt'; who: Seat; to: Payee }
  | { t: 'turn' }
  | { t: 'win'; who: Seat }
  | { t: 'timeUp'; who: Seat }

export type MonopolyEvent = {
  by: Seat
  dice?: [number, number]
  /** petak yang dilewati bidak `by` berurutan, termasuk asal (untuk animasi) */
  path: number[]
  log: Note[]
}

export type MonopolyState = {
  opts: MonopolyOptions
  rng: number
  pos: number[]
  cash: number[]
  bankrupt: boolean[]
  /** pemilik tiap petak (null = bank / bukan properti) */
  owner: (Seat | null)[]
  /** 0–4 rumah, 5 = hotel */
  houses: number[]
  mortgaged: boolean[]
  /** -1 = bebas; 0..2 = sudah berapa kali gagal lempar dobel di penjara */
  jail: number[]
  jailCards: Deck[][]
  turn: Seat
  round: number
  /** dobel beruntun giliran ini */
  doubles: number
  phase: Phase
  /** fase lanjutan setelah utang lunas / beli selesai */
  resume: 'roll' | 'buy' | 'done'
  pot: number
  decks: Record<Deck, number[]>
  auction: Auction | null
  trade: Trade | null
  debts: Debt[]
  winner: Seat | null
  eventId: number
  event: MonopolyEvent | null
}

export type MonopolyAction =
  | { type: 'roll' }
  | { type: 'buy' }
  | { type: 'decline' }
  | { type: 'bid'; amount: number }
  | { type: 'passBid' }
  | { type: 'build'; sq: number }
  | { type: 'sell'; sq: number }
  | { type: 'mortgage'; sq: number }
  | { type: 'unmortgage'; sq: number }
  | { type: 'propose'; trade: Omit<Trade, 'from'> }
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'cancel' }
  | { type: 'payJail' }
  | { type: 'jailCard' }
  | { type: 'endTurn' }
  | { type: 'bankrupt' }
  | { type: 'again' }
