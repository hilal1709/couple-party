import type { Seat } from '../../types'
import type { RemiEvent, RemiOptions } from '../types'

export type DealCtx = {
  n: number
  rng: number
  opts: RemiOptions
  round: number
  /** poin/chip tiap kursi sebelum ronde ini (mode chip: modal) */
  scores: number[]
}

/** Ronde selesai: perubahan poin tiap kursi dan pemenangnya. */
export type Outcome = { deltas: number[]; winners: Seat[] }

export type Step<M> = { m: M; rng?: number; event?: RemiEvent; done?: Outcome }

export type ModeEngine<M, A> = {
  deal: (ctx: DealCtx) => { m: M; rng: number }
  /** null = aksi tidak sah (state tidak berubah) */
  reduce: (m: M, a: A, by: Seat, rng: number) => Step<M> | null
  /** dijalankan setelah dibagi: menyelesaikan langkah otomatis (mis. semua all-in dari blind) */
  settle?: (m: M) => Step<M> | null
}
