import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { LudoAction, LudoOptions, LudoState } from './types'

export const ludo: GameDef<LudoState, LudoAction, LudoOptions> = {
  id: 'ludo',
  title: 'Ludo',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/LudoBoard').then((m) => ({ default: m.LudoBoard }))),
}
