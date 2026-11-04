import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { JinakAction, JinakOptions, JinakState } from './types'

export const jinak: GameDef<JinakState, JinakAction, JinakOptions> = {
  id: 'jinak',
  title: 'Jinak Bom',
  init,
  reduce,
  // three.js & model bom: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/JinakBoard').then((m) => ({ default: m.JinakBoard }))),
}
