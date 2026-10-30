import { lazy } from 'react'
import type { GameDef } from '../types'
import { remiBot } from './bot'
import { init, reduce } from './engine'
import type { RemiAction, RemiOptions, RemiState } from './types'

export const remi: GameDef<RemiState, RemiAction, RemiOptions> = {
  id: 'remi',
  title: 'Kartu Remi',
  init,
  reduce,
  bot: remiBot,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/RemiTable').then((m) => ({ default: m.RemiTable }))),
}
