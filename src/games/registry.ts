import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import snakesArt from '@/assets/snakes/tile-snakes.webp'
import unoArt from '@/assets/snakes/tile-uno.webp'
import type { AnyGame, LobbyProps } from './types'
import { snakes } from './snakes'
import type { SnakesOptions } from './snakes/types'
import { uno } from './uno'
import type { UnoOptions } from './uno/types'
import { VARIANT_INFO } from './uno/ui/copy'

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
  /** ilustrasi Blender untuk tile & kartu game di room */
  art: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Lobby: LazyExoticComponent<ComponentType<LobbyProps<any>>>
  /** ringkasan pengaturan satu baris, untuk kartu game di room */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: (options: any) => string
}

export const GAMES: GameEntry[] = [
  {
    game: uno,
    category: 'kartu',
    blurb: 'Classic, Flip & No Mercy + aturan rumah',
    minPlayers: 2,
    maxPlayers: 8,
    art: unoArt,
    Lobby: lazy(() => import('./uno/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: UnoOptions) => `${VARIANT_INFO[o.variant].title} · target ${o.target} poin`,
  },
  {
    game: snakes,
    category: 'board',
    blurb: 'Ular tangga + Truth/Dare, item & kuis',
    minPlayers: 2,
    maxPlayers: 8,
    art: snakesArt,
    Lobby: lazy(() => import('./snakes/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: SnakesOptions) => {
      const on = [o.challenges && 'Truth/Dare', o.items && 'item', o.quiz && 'kuis', o.effects && 'efek'].filter(Boolean)
      return `${on.length ? on.join(', ') : 'Polos'} · tolak mundur ${o.penalty}`
    },
  },
]

export const entryById = (id: string | null) => GAMES.find((g) => g.game.id === id) ?? null
export const gameById = (id: string | null) => entryById(id)?.game ?? null
