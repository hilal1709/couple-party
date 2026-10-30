import type { ComponentType } from 'react'

/** nomor kursi pemain: 0 = host, lalu urutan bergabung */
export type Seat = number

export type GameProps<S, A> = {
  state: S
  seat: Seat
  names: string[]
  /** status tersambung tiap kursi */
  online: boolean[]
  act: (action: A) => void
  /** kembali ke lobby */
  exit: () => void
  /** saluran real-time tanpa jaminan sampai (hanya dipakai game real-time seperti balap kart) */
  live?: LiveChannel
}

/** Pesan cepat antar HP: tidak disimpan & tidak dikirim ulang. Pengirim tidak menerima pesannya sendiri. */
export type LiveChannel = {
  send: (d: unknown) => void
  /** `from` = kursi pengirim; mengembalikan fungsi untuk berhenti mendengar */
  on: (cb: (d: unknown, from: Seat) => void) => () => void
}

/** Saluran emote: sifatnya sama dengan LiveChannel, isinya id dari katalog emote. */
export type EmoteChannel = {
  send: (id: string) => void
  on: (cb: (id: string, from: Seat) => void) => () => void
}

/** 1 = gampang, 2 = sedang, 3 = susah */
export type BotLevel = 1 | 2 | 3

export type BotContext<S> = {
  state: S
  seat: Seat
  level: BotLevel
  rnd: () => number
  /** catatan bot per kursi selama satu game; tidak ikut disinkronkan */
  mem: Record<string, unknown>
  /** waktu sekarang (ms), supaya simulasi tes bisa memakai jam sendiri */
  now: number
}

/** `delay` = jeda "mikir" sebelum aksi dikirim (ms) */
export type BotMove<A> = { action: A; delay: number }

/** Apa yang dilakukan kursi bot pada state ini; null = tidak ada yang perlu dilakukan. */
export type BotPolicy<S, A> = (ctx: BotContext<S>) => BotMove<A> | null

/**
 * Satu game = reducer murni + tampilan.
 * Reducer hanya dijalankan di HP host; HP lain cuma menerima state.
 */
export type GameDef<S, A, O = unknown> = {
  id: string
  title: string
  init: (seed: number, options?: O) => S
  reduce: (state: S, action: A, by: Seat) => S
  View: ComponentType<GameProps<S, A>>
  /** otak bot; kosong = game ini tidak memakai kursi bot */
  bot?: BotPolicy<S, A>
  /** true = tombol emote di kiri bawah, bukan kiri tengah, kalau di sana ada kontrol game */
  emoteLow?: boolean
}

/** Layar pengaturan game sebelum mulai (dipakai di Home sebelum room ada, dan di room saat ganti game). */
export type LobbyProps<O> = {
  /** jumlah pemain di room; kosong saat room belum dibuat */
  players?: number
  /** label tombol utama, mis. "Buat room" */
  cta: string
  initial?: O
  onSubmit: (options: O) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDef<any, any, any>
