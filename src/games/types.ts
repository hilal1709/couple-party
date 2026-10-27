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
