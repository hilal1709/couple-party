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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDef<any, any, any>
