import type { PuncakLook } from './look'
import type { BotLevel, Seat } from '../types'

export type MountainId = 'karang' | 'rimba' | 'ngarai' | 'kawah' | 'salju' | 'teh' | 'kristal' | 'langit'
export type Weather = 'cerah' | 'angin' | 'ekstrem'
export type Loot = 'sedikit' | 'normal' | 'banyak'

export type PuncakOptions = {
  players: number
  mountain: MountainId | 'acak'
  /** 2 zona = rute pendek, 4 = penuh */
  zones: 2 | 4
  weather: Weather
  loot: Loot
  /** total pendaki termasuk bot */
  total: number
  level: BotLevel
}

export type Actor = {
  /** kursi pemain; null = bot */
  seat: Seat | null
}

export type Result = {
  /** sampai puncak atau nyawa tim habis */
  win: boolean
  secs: number
  falls: number
  items: number
  /** zona tertinggi yang apinya menyala */
  camp: number
  lives: number
}

export type PuncakState = {
  opts: PuncakOptions
  /** gunung yang benar-benar dipakai (opsi 'acak' sudah diundi) */
  mountain: MountainId
  phase: 'climb' | 'end'
  /** naik tiap ronde baru; gunung dibangun ulang di semua HP saat nilai ini berubah */
  phaseId: number
  seed: number
  actors: Actor[]
  looks: (PuncakLook | null)[]
  result: Result | null
}

export type PuncakAction =
  | { type: 'look'; look: PuncakLook }
  | { type: 'finish'; result: Result }
  | { type: 'again' }
