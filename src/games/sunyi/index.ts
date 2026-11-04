import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { SunyiAction, SunyiOptions, SunyiState } from './types'

export const sunyi: GameDef<SunyiState, SunyiAction, SunyiOptions> = {
  id: 'sunyi',
  title: 'Sunyi',
  init,
  reduce,
  // three.js, tekstur kampung, dan mic: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/SunyiBoard').then((m) => ({ default: m.SunyiBoard }))),
  emoteSpot: 'low',
}
