import { lazy } from 'react'
import type { GameDef } from '../types'
import { spyBot } from './bot'
import { init, reduce } from './engine'
import type { SpyAction, SpyOptions, SpyState } from './types'

export const spy: GameDef<SpyState, SpyAction, SpyOptions> = {
  id: 'spy',
  title: 'Siapa Mata-mata',
  init,
  reduce,
  bot: spyBot,
  // dimuat saat game dimulai saja, supaya menu terbuka cepat
  View: lazy(() => import('./ui/SpyBoard').then((m) => ({ default: m.SpyBoard }))),
}
