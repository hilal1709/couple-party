import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { DominoAction, DominoOptions, DominoState } from './types'

export const domino: GameDef<DominoState, DominoAction, DominoOptions> = {
  id: 'domino',
  title: 'Domino',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/DominoTable').then((m) => ({ default: m.DominoTable }))),
}
