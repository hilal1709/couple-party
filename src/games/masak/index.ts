import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { MasakAction, MasakOptions, MasakState } from './types'

export const masak: GameDef<MasakState, MasakAction, MasakOptions> = {
  id: 'masak',
  title: 'Dapur Kacau',
  init,
  reduce,
  View: lazy(() => import('./ui/MasakBoard').then((m) => ({ default: m.MasakBoard }))),
  // tombol aksi di kanan bawah, stik di kiri: emote di kiri bawah menabrak stik, jadi tetap kiri tengah
}
