import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { UnoAction, UnoOptions, UnoState } from './types'
import { UnoTable } from './ui/UnoTable'

export const uno: GameDef<UnoState, UnoAction, UnoOptions> = {
  id: 'uno',
  title: 'UNO',
  init,
  reduce,
  View: UnoTable,
}
