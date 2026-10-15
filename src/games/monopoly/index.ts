import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { MonopolyAction, MonopolyOptions, MonopolyState } from './types'

export const monopoly: GameDef<MonopolyState, MonopolyAction, MonopolyOptions> = {
  id: 'monopoly',
  title: 'Monopoli',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/MonopolyBoard').then((m) => ({ default: m.MonopolyBoard }))),
}
