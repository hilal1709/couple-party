import type { AnyGame } from './types'
import { uno } from './uno'

export const GAMES: AnyGame[] = [uno]

export const gameById = (id: string | null) => GAMES.find((g) => g.id === id) ?? null
