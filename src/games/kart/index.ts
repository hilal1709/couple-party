import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { KartAction, KartOptions, KartState } from './types'

export const kart: GameDef<KartState, KartAction, KartOptions> = {
  id: 'kart',
  title: 'Kart Kacau',
  init,
  reduce,
  // three.js cukup besar: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/KartBoard').then((m) => ({ default: m.KartBoard }))),
}
