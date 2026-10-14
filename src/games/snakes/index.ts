import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { SnakesAction, SnakesOptions, SnakesState } from './types'

export const snakes: GameDef<SnakesState, SnakesAction, SnakesOptions> = {
  id: 'snakes',
  title: 'Ular Tangga',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/SnakesBoard').then((m) => ({ default: m.SnakesBoard }))),
}
