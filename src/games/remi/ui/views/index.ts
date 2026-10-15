import type { Mode, ModeState } from '../../types'
import { bigtwoView } from './bigtwo'
import { blackjackView } from './blackjack'
import { bohongView } from './bohong'
import { cangkulanView } from './cangkulan'
import { jokerView } from './joker'
import { pokerView } from './poker'
import { remi41View } from './remi41'
import { sevenView } from './seven'
import type { ModeView } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VIEWS: Record<Mode, ModeView<any>> = {
  cangkulan: cangkulanView,
  bigtwo: bigtwoView,
  remi41: remi41View,
  poker: pokerView,
  joker: jokerView,
  bohong: bohongView,
  blackjack: blackjackView,
  seven: sevenView,
}

export const viewFor = (m: ModeState) => VIEWS[m.kind] as ModeView<ModeState>
