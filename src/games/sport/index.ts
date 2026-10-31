import { lazy } from 'react'
import type { GameDef } from '../types'
import { sportBot } from './bot'
import { init, reduce } from './engine'
import type { SportAction, SportOptions, SportState } from './types'

export const sport: GameDef<SportState, SportAction, SportOptions> = {
  id: 'sport',
  title: 'Sport Kacau',
  init,
  reduce,
  bot: sportBot,
  // three.js & MediaPipe cukup besar: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/SportBoard').then((m) => ({ default: m.SportBoard }))),
}
