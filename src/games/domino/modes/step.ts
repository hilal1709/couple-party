import type { Seat } from '../../types'
import type { DominoEvent, DominoOptions } from '../types'

export type DealCtx = {
  n: number
  rng: number
  opts: DominoOptions
  round: number
  /** poin/chip tiap kursi sebelum ronde ini */
  scores: number[]
}

/** Ronde selesai: perubahan poin tiap kursi dan pemenangnya. */
export type Outcome = { deltas: number[]; winners: Seat[] }

export type Step<M> = { m: M; rng?: number; event?: DominoEvent; done?: Outcome }

export type ModeEngine<M, A> = {
  deal: (ctx: DealCtx) => { m: M; rng: number }
  /** null = aksi tidak sah (state tidak berubah) */
  reduce: (m: M, a: A, by: Seat) => Step<M> | null
  /** dijalankan setelah dibagi: menyelesaikan langkah otomatis */
  settle?: (m: M) => Step<M> | null
}
