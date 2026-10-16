import type { Seat } from '../types'

/**
 * kategori = kategori + huruf awal, bebas = kategori saja,
 * suku = kata yang mengandung suku kata, sambung = diawali huruf terakhir kata sebelumnya
 */
export type BomMode = 'kategori' | 'bebas' | 'suku' | 'sambung'
/** rentang waktu ledak acak per ronde */
export type Speed = 'santai' | 'normal' | 'panik'
export type Power = 'balik' | 'lompat' | 'pendek'

export type BomOptions = {
  players: number
  mode: BomMode
  /** nyawa awal tiap pemain */
  lives: 1 | 2 | 3 | 4 | 5
  speed: Speed
  /** power-up: semua mulai dengan satu, kata panjang dapat tambahan */
  powerups: boolean
  /** pemain lain boleh menekan "Ngawur!" untuk membatalkan kata */
  protest: boolean
  /** pemegang bom memilih sendiri mau oper ke siapa */
  aim: boolean
  /** tiap ledakan, sumbu ronde berikutnya makin pendek */
  faster: boolean
}

export type Phase = 'intro' | 'live' | 'boom' | 'end'

/** tantangan untuk pemegang bom sekarang */
export type Prompt = { category?: string; letter?: string; syllable?: string }

/** kata yang baru diterima dan masih boleh diprotes */
export type Review = {
  id: number
  by: Seat
  word: string
  /** bentuk ternormalisasi (untuk daftar kata terpakai) */
  key: string
  /** tantangan & pengoper sebelum kata ini, untuk dikembalikan kalau dibatalkan */
  prompt: Prompt
  from: Seat | null
  /** kursi yang menekan "Ngawur!" */
  votes: Seat[]
}

export type LogEntry = { by: Seat; word: string; round: number; ok: boolean }

/** kejadian terakhir yang perlu suara/efek di semua HP */
export type BomEvent =
  | { id: number; kind: 'power'; by: Seat; power: Power; to: Seat | null }
  | { id: number; kind: 'cancel'; by: Seat; word: string }
  | { id: number; kind: 'gift'; by: Seat; power: Power }

export type BomState = {
  opts: BomOptions
  rng: number
  phase: Phase
  /** ronde = jarak antar ledakan, mulai 1 */
  round: number
  lives: number[]
  alive: boolean[]
  holder: Seat
  /** siapa yang terakhir mengoper bom ke pemegang sekarang */
  from: Seat | null
  prompt: Prompt
  /** kategori ronde ini (mode kategori & bebas) */
  category: string
  /** mode pilih arah: kata sudah diterima, pemegang tinggal memilih target */
  aiming: boolean
  /** sumbu ronde ini (ms) — dijaga host; HP lain tidak menampilkannya */
  fuse: number
  /** naik tiap ronde dimulai; jam host dihitung sejak nilai ini berubah */
  fuseId: number
  /** naik tiap bom pindah tangan */
  turnId: number
  /** kata terpakai (ternormalisasi) sepanjang game */
  used: string[]
  log: LogEntry[]
  review: Review | null
  reviewSeq: number
  powers: Power[][]
  /** jumlah ledakan sejauh ini */
  booms: number
  lastBoom: Seat | null
  /** urutan tersingkir (pertama keluar duluan) */
  outOrder: Seat[]
  words: number[]
  event: BomEvent | null
  phaseId: number
  winner: Seat | null
}

export type BomAction =
  | { type: 'word'; text: string }
  /** mode pilih arah: oper bom ke kursi ini */
  | { type: 'aim'; target: Seat }
  | { type: 'power'; power: Power }
  /** "Ngawur!" untuk kata yang sedang ditinjau */
  | { type: 'protest'; id: number }
  /** hanya dari host: masa protes habis */
  | { type: 'closeReview'; id: number }
  /** hanya dari host: sumbu habis */
  | { type: 'boom'; fuseId: number }
  /** hanya dari host: mulai / ronde berikutnya */
  | { type: 'next' }
  | { type: 'again' }
