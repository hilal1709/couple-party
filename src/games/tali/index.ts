import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { TaliAction, TaliOptions, TaliState } from './types'

export const tali: GameDef<TaliState, TaliAction, TaliOptions> = {
  id: 'tali',
  title: 'Tali Jodoh',
  init,
  reduce,
  // three.js, model, dan tekstur: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/TaliBoard').then((m) => ({ default: m.TaliBoard }))),
  emoteLow: true,
}
