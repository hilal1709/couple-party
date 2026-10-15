import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { DrawAction, DrawOptions, DrawState } from './types'

export const draw: GameDef<DrawState, DrawAction, DrawOptions> = {
  id: 'draw',
  title: 'Tebak Gambar',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/DrawBoard').then((m) => ({ default: m.DrawBoard }))),
}
