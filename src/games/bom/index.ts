import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { BomAction, BomOptions, BomState } from './types'

export const bom: GameDef<BomState, BomAction, BomOptions> = {
  id: 'bom',
  title: 'Bom Waktu',
  init,
  reduce,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/BomBoard').then((m) => ({ default: m.BomBoard }))),
}
