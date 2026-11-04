import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { PuncakAction, PuncakOptions, PuncakState } from './types'

export const puncak: GameDef<PuncakState, PuncakAction, PuncakOptions> = {
  id: 'puncak',
  title: 'Puncak Berdua',
  init,
  reduce,
  View: lazy(() => import('./ui/PuncakBoard').then((m) => ({ default: m.PuncakBoard }))),
}
