import { lazy } from 'react'
import type { GameDef } from '../types'
import { ludoBot } from './bot'
import { init, reduce } from './engine'
import type { LudoAction, LudoOptions, LudoState } from './types'

export const ludo: GameDef<LudoState, LudoAction, LudoOptions> = {
  id: 'ludo',
  title: 'Ludo',
  init,
  reduce,
  bot: ludoBot,
  // kiri tengah menutupi lengan kiri papan; pojok kiri atas selalu kosong di papan 4, 6, dan 8
  emoteSpot: 'corner',
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/LudoBoard').then((m) => ({ default: m.LudoBoard }))),
}
