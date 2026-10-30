import { lazy } from 'react'
import type { GameDef } from '../types'
import { unoBot } from './bot'
import { init, reduce } from './engine'
import type { UnoAction, UnoOptions, UnoState } from './types'

export const uno: GameDef<UnoState, UnoAction, UnoOptions> = {
  id: 'uno',
  title: 'UNO',
  init,
  reduce,
  bot: unoBot,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/UnoTable').then((m) => ({ default: m.UnoTable }))),
}
