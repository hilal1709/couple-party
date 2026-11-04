import type { Seat } from '../types'

/** santai = 3 modul 5 menit, normal = 4 modul 4 menit, panik = 6 modul 3 menit & tiap salah jam makin cepat */
export type Level = 'santai' | 'normal' | 'panik'

export type JinakOptions = {
  players: number
  level: Level
  /** jumlah salah sebelum bom meledak */
  strikes: 1 | 3 | 5
}

export type WireColor = 'merah' | 'biru' | 'kuning' | 'hijau' | 'putih' | 'hitam'
export type Sticker = 'KOPI' | 'BATIK' | 'SATE' | 'BEMO' | 'JAMU'
export type ButtonColor = 'merah' | 'biru' | 'kuning' | 'putih' | 'hijau'
export type ButtonLabel = 'GAS' | 'REM' | 'TAHAN' | 'LEPAS'
export type LockLamp = 'merah' | 'hijau' | 'biru' | 'kuning'
export type LockShape = 'bulan' | 'bintang' | 'ketupat' | 'hati'
export type Dir = 'u' | 'd' | 'l' | 'r'

/** keterangan casing yang dipakai aturan buku panduan */
export type BombInfo = {
  /** 6 karakter, huruf & angka, digit terakhir selalu angka */
  serial: string
  batteries: number
  stickers: Sticker[]
}

export type WiresModule = { kind: 'kabel'; wires: WireColor[]; cut: number[] }
export type ButtonModule = { kind: 'tombol'; color: ButtonColor; label: ButtonLabel; strip: ButtonColor }
export type SymbolsModule = { kind: 'simbol'; symbols: string[]; pressed: string[] }
export type MazeModule = { kind: 'labirin'; maze: number; pos: [number, number]; goal: [number, number] }
export type PasswordModule = { kind: 'sandi'; columns: string[][] }
export type LockModule = { kind: 'gembok'; lamp: LockLamp; shape: LockShape }

export type BombModule = WiresModule | ButtonModule | SymbolsModule | MazeModule | PasswordModule | LockModule
export type ModuleKind = BombModule['kind']

export type Phase = 'intro' | 'live' | 'defused' | 'boom'

export type RoundResult = { round: number; defuser: Seat; ok: boolean; left: number; strikes: number }

/** kejadian terakhir yang perlu suara/efek di semua HP */
export type JinakEvent = { id: number; kind: 'solve' | 'strike' | 'step'; mod: number }

export type JinakState = {
  opts: JinakOptions
  rng: number
  phase: Phase
  round: number
  /** kursi yang memegang bom ronde ini; kursi lain jadi pakar */
  defuser: Seat
  info: BombInfo
  modules: BombModule[]
  solved: boolean[]
  strikes: number
  /** sisa waktu (ms) saat `clockId` terakhir berubah */
  timeLeft: number
  /** kecepatan jam (1 = normal); naik tiap salah di level panik */
  rate: number
  /** naik tiap jam dimulai ulang; tiap HP menghitung sisa waktu sejak nilai ini berubah */
  clockId: number
  /** sisa waktu saat ronde selesai (ms) */
  finalLeft: number
  event: JinakEvent | null
  eventSeq: number
  history: RoundResult[]
}

export type JinakAction =
  | { type: 'start' }
  /** `left` = sisa waktu yang terlihat di HP penjinak saat aksi (ms) */
  | { type: 'cut'; mod: number; wire: number; left: number }
  | { type: 'button'; mod: number; hold: boolean; shown: string; left: number }
  | { type: 'press'; mod: number; symbol: string; left: number }
  | { type: 'move'; mod: number; dir: Dir; left: number }
  | { type: 'submit'; mod: number; word: string; left: number }
  | { type: 'unlock'; mod: number; code: string; left: number }
  /** hanya dari host: waktu habis untuk jam ini */
  | { type: 'timeout'; clockId: number }
  | { type: 'next' }
