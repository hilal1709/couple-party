import type { Seat } from '../types'
import type { ArrowAim } from './sports/archery/sim'
import type { BowlThrow } from './sports/bowling/sim'

export type SportId = 'bowling' | 'tinju' | 'panahan' | 'penalti' | 'tenis' | 'badminton'
export type RacketSport = 'tenis' | 'badminton'

/** penampilan karakter: tiap angka = indeks pada daftar di look.ts */
export type Look = {
  skin: number
  hair: number
  style: number
  shirt: number
  pants: number
  acc: number
}

export type SportOptions = {
  sport: SportId
  /** jumlah frame bowling */
  frames: 3 | 5 | 10
  /** jumlah ronde tinju */
  rounds: 1 | 3 | 5
  /** jumlah babak panahan, tiap babak 3 anak panah */
  ends: 3 | 5
  /** poin untuk menang tenis & badminton */
  points: 5 | 7 | 11
  players: number
  botSeats: Seat[]
}

export type RollCall = 'strike' | 'spare' | 'gutter' | 'open'

export type BowlRoll = {
  id: number
  by: Seat
  th: BowlThrow
  /** pin berdiri sebelum lemparan */
  before: boolean[]
  knocked: number[]
  ms: number
  gutter: boolean
  call: RollCall
}

export type BowlingMatch = {
  kind: 'bowling'
  phase: 'aim' | 'roll' | 'end'
  frames: number
  /** kursi → frame → jatuhan tiap lemparan */
  rolls: number[][][]
  turn: Seat
  frame: number
  standing: boolean[]
  roll: BowlRoll | null
  /** naik tiap kali ada giliran lempar baru; jam & aksi basi memakai ini */
  rollId: number
  winners: Seat[]
}

export type Stance = 'none' | 'guard' | 'dodgeL' | 'dodgeR'
export type BoxHand = 'L' | 'R'
export type BoxOutcome = 'hit' | 'block' | 'dodge'

export type Attack = {
  id: number
  by: Seat
  hand: BoxHand
  /** 0..1 */
  power: number
  /** pukulan balasan setelah menghindar */
  counter: boolean
}

export type BoxResult = {
  id: number
  by: Seat
  hand: BoxHand
  outcome: BoxOutcome
  dmg: number
  counter: boolean
  ko: boolean
}

export type BoxingMatch = {
  kind: 'boxing'
  phase: 'intro' | 'fight' | 'roundEnd' | 'end'
  /** naik tiap ganti fase; jam host memakai ini */
  phaseId: number
  round: number
  rounds: number
  hp: [number, number]
  wins: [number, number]
  stance: [Stance, Stance]
  /** pukulan yang sedang di udara */
  attacks: Attack[]
  nextId: number
  counter: [boolean, boolean]
  last: BoxResult | null
  winners: Seat[]
}

export type ArrowShot = {
  id: number
  by: Seat
  aim: ArrowAim
  draw: number
  hit: ArrowAim
  score: number
}

export type ArcheryMatch = {
  kind: 'archery'
  phase: 'aim' | 'fly' | 'end'
  ends: number
  end: number
  turn: Seat
  /** kursi → babak → nilai tiap anak panah */
  scores: number[][][]
  /** m/dtk, positif = ke kanan; sama untuk semua pemain dalam satu babak */
  wind: number
  seed: number
  shotId: number
  shot: ArrowShot | null
  winners: Seat[]
}

export type Dive = 'L' | 'C' | 'R'
/** x -1..1 tiang ke tiang, y 0..1 tanah ke mistar, power 0..1 */
export type KickAim = { x: number; y: number; power: number }

export type PenaltyResult = {
  id: number
  taker: Seat
  kick: KickAim
  dive: Dive
  why: 'goal' | 'save' | 'wide' | 'over'
}

export type PenaltyMatch = {
  kind: 'penalty'
  phase: 'set' | 'shot' | 'end'
  shotId: number
  taker: Seat
  /** pilihan rahasia: hanya dibaca reducer, tidak ditampilkan sebelum keduanya memilih */
  kick: KickAim | null
  dive: Dive | null
  goals: [number, number]
  log: [boolean[], boolean[]]
  result: PenaltyResult | null
  winners: Seat[]
}

export type ShotKind = 'drive' | 'lob' | 'smash'

export type RacketShot = {
  id: number
  by: Seat
  /** -1..1 dalam koordinat lapangan, sama di semua HP */
  x: number
  kind: ShotKind
  power: number
  /** lama di udara */
  ms: number
  out: boolean
  serve: boolean
}

export type RacketMatch = {
  kind: 'racket'
  sport: RacketSport
  phase: 'serve' | 'rally' | 'point' | 'end'
  phaseId: number
  server: Seat
  points: [number, number]
  target: number
  ball: RacketShot | null
  /** jumlah pukulan dalam reli ini */
  hits: number
  nextId: number
  last: { winner: Seat; why: 'ace' | 'miss' | 'out' } | null
  winners: Seat[]
}

export type SportMatch = BowlingMatch | BoxingMatch | ArcheryMatch | PenaltyMatch | RacketMatch

export type SportState = {
  opts: SportOptions
  looks: Look[]
  seed: number
  m: SportMatch
}

export type SportAction =
  | { type: 'look'; look: Look }
  | { type: 'throw'; id: number; th: BowlThrow }
  /** host: animasi lemparan selesai */
  | { type: 'next'; id: number }
  /** host: waktu giliran habis atau pemainnya putus */
  | { type: 'auto'; id: number }
  | { type: 'again' }
  | { type: 'stance'; stance: Stance }
  | { type: 'punch'; hand: BoxHand; power: number }
  /** HP yang dipukul melapor hasilnya */
  | { type: 'resolve'; id: number; outcome: BoxOutcome }
  /** host: HP lawan tidak menjawab, pukulan dihitung kena */
  | { type: 'expire'; id: number }
  /** host: waktu ronde habis */
  | { type: 'bell'; id: number }
  | { type: 'shoot'; id: number; aim: ArrowAim; draw: number }
  | { type: 'kick'; id: number; x: number; y: number; power: number }
  | { type: 'dive'; id: number; dir: Dive }
  /** err -1..1: seberapa jauh dari tengah jendela pukul, dinilai di HP pemukul */
  | { type: 'hit'; id: number; x: number; shot: ShotKind; power: number; err: number }
  /** bola jatuh tanpa dibalas */
  | { type: 'land'; id: number }
