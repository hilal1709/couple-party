import type { Seat } from '../types'

export type Pack = 'umum' | 'lokal' | 'pasangan'
/** 1 = gampang, 2 = sedang, 3 = susah */
export type Level = 1 | 2 | 3

export type DrawOptions = {
  players: number
  /** berapa kali tiap pemain kebagian menggambar */
  rounds: 2 | 3 | 4
  /** waktu menggambar per giliran (detik) */
  seconds: 60 | 80 | 100
  packs: Pack[]
  /** kata buatan host sendiri */
  custom: string[]
  /** huruf dibuka pelan-pelan setelah setengah waktu */
  hints: boolean
}

/**
 * Potongan coretan. Satu tarikan jari bisa dikirim dalam beberapa potongan (`g` sama)
 * supaya penebak melihat gambar muncul sambil digambar.
 */
export type Stroke = {
  /** nomor tarikan; undo menghapus semua potongan dengan `g` terakhir */
  g: number
  /** indeks warna di INKS; -1 = penghapus */
  c: number
  /** indeks ukuran di WIDTHS */
  w: number
  /** x,y berselang-seling, bilangan bulat 0..1000 (y dalam ruang 0..750, rasio 4:3) */
  pts: number[]
}

export type Phase = 'choose' | 'draw' | 'reveal' | 'end'

export type FeedItem =
  | { id: number; t: 'guess'; by: Seat; text: string }
  /** tebakan nyaris benar: teksnya hanya terlihat oleh yang menebak */
  | { id: number; t: 'close'; by: Seat; text: string }
  | { id: number; t: 'correct'; by: Seat; points: number }
  | { id: number; t: 'turn'; by: Seat }

export type RevealReason = 'all' | 'time' | 'skip'

export type DrawState = {
  opts: DrawOptions
  rng: number
  /** putaran sekarang, mulai 1 */
  round: number
  drawer: Seat
  phase: Phase
  /** 3 pilihan kata untuk drawer (beserta tingkatnya) */
  choices: { word: string; level: Level }[]
  word: string
  level: Level
  strokes: Stroke[]
  /** kursi yang sudah benar, urut siapa duluan */
  guessed: Seat[]
  scores: number[]
  /** poin yang didapat di giliran ini (untuk layar reveal) */
  gained: number[]
  feed: FeedItem[]
  feedId: number
  /** naik tiap ganti fase; timer di tiap HP dihitung sejak nilai ini berubah */
  phaseId: number
  /** urutan huruf yang dibuka sebagai petunjuk */
  hintOrder: number[]
  reason: RevealReason | null
  /** kata yang belum keluar */
  deck: { word: string; level: Level }[]
  /** kursi pemenang (bisa seri) */
  winners: Seat[] | null
}

export type DrawAction =
  | { type: 'pick'; i: number }
  | { type: 'stroke'; s: Stroke }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'guess'; text: string }
  | { type: 'skip' }
  /** hanya dari host: waktu habis (memilih kata / menggambar) */
  | { type: 'timeUp' }
  /** hanya dari host: lanjut dari layar reveal */
  | { type: 'next' }
  | { type: 'again' }
