import type { AnyGame } from './types'
import { snakes } from './snakes'
import { uno } from './uno'

export type Category = 'kartu' | 'board' | 'lainnya'

export const CATEGORIES: { id: Category; title: string; blurb: string }[] = [
  { id: 'kartu', title: 'Game Kartu', blurb: 'Lempar kartu, saling jegal.' },
  { id: 'board', title: 'Game Board', blurb: 'Papan, dadu, dan bidak.' },
  { id: 'lainnya', title: 'Game Lainnya', blurb: 'Kuis, gerak, dan iseng-iseng.' },
]

export type GameEntry = {
  game: AnyGame
  category: Category
  blurb: string
  minPlayers: number
  maxPlayers: number
}

export const GAMES: GameEntry[] = [
  { game: uno, category: 'kartu', blurb: 'Classic, Flip & No Mercy + aturan rumah', minPlayers: 2, maxPlayers: 8 },
  { game: snakes, category: 'board', blurb: 'Ular tangga + Truth/Dare, item & kuis', minPlayers: 2, maxPlayers: 8 },
]

export const gameById = (id: string | null) => GAMES.find((g) => g.game.id === id)?.game ?? null
