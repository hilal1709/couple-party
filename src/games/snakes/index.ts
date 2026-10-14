import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { SnakesAction, SnakesOptions, SnakesState } from './types'
import { SnakesBoard } from './ui/SnakesBoard'

export const snakes: GameDef<SnakesState, SnakesAction, SnakesOptions> = {
  id: 'snakes',
  title: 'Ular Tangga',
  init,
  reduce,
  View: SnakesBoard,
}
