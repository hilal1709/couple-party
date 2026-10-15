import type { ReactNode } from 'react'
import type { Seat } from '../../../types'
import type { Card, ModeState, RemiAction, RemiState } from '../../types'

export type ViewProps<M extends ModeState> = {
  s: RemiState
  m: M
  seat: Seat
  names: string[]
  act: (a: RemiAction) => void
  /** kartu yang sedang dipilih di tangan */
  sel: string[]
  setSel: (ids: string[]) => void
}

export type ModeView<M extends ModeState> = {
  /** kartu di tangan yang menyala (bisa disentuh) */
  playable: (m: M, seat: Seat) => string[]
  /** 'tap' = sentuh langsung jalan; 'select' = pilih dulu lalu tombol di panel */
  pick: 'tap' | 'select' | 'none'
  tap?: (m: M, id: string, act: (a: RemiAction) => void, seat: Seat) => void
  maxSelect?: number
  sort: (cards: Card[]) => Card[]
  status: (m: M, seat: Seat, names: string[]) => string
  Center: (p: ViewProps<M>) => ReactNode
  Actions: (p: ViewProps<M>) => ReactNode
  /** info tambahan di kursi lawan */
  SeatInfo?: (p: ViewProps<M> & { who: Seat }) => ReactNode
  /** teks kecil di bawah namaku */
  me?: (m: M, seat: Seat) => string
}
