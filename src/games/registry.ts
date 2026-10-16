import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import dominoArt from '@/assets/domino/tile-domino.webp'
import drawArt from '@/assets/draw/tile-draw.webp'
import ludoArt from '@/assets/ludo/tile-ludo.webp'
import monopolyArt from '@/assets/monopoly/tile-monopoly.webp'
import remiArt from '@/assets/remi/tile-remi.webp'
import snakesArt from '@/assets/snakes/tile-snakes.webp'
import spyArt from '@/assets/spy/tile-spy.webp'
import unoArt from '@/assets/snakes/tile-uno.webp'
import type { AnyGame, LobbyProps } from './types'
import { domino } from './domino'
import { MODE_INFO as DOMINO_MODES } from './domino/modes'
import type { DominoOptions } from './domino/types'
import { summary as dominoSummary } from './domino/ui/copy'
import { draw } from './draw'
import type { DrawOptions } from './draw/types'
import { summary as drawSummary } from './draw/ui/copy'
import { ludo } from './ludo'
import type { LudoOptions } from './ludo/types'
import { summary as ludoSummary } from './ludo/ui/copy'
import { monopoly } from './monopoly'
import type { MonopolyOptions } from './monopoly/types'
import { summary as monopolySummary } from './monopoly/ui/copy'
import { remi } from './remi'
import { MODE_INFO } from './remi/modes'
import type { RemiOptions } from './remi/types'
import { summary as remiSummary } from './remi/ui/copy'
import { snakes } from './snakes'
import type { SnakesOptions } from './snakes/types'
import { spy } from './spy'
import type { SpyOptions } from './spy/types'
import { summary as spySummary } from './spy/ui/copy'
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
  /** batas pemain yang bergantung pada pengaturan (mis. mode Kartu Remi); kosong = min/max di atas */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playersFor?: (options: any) => [number, number]
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
    game: remi,
    category: 'kartu',
    blurb: '8 mode: Cangkulan, Capsa, 41, Poker, Joker, Bohong, 21, Seven',
    minPlayers: 2,
    maxPlayers: 8,
    art: remiArt,
    Lobby: lazy(() => import('./remi/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: RemiOptions) => remiSummary(o),
    playersFor: (o: RemiOptions) => [MODE_INFO[o.mode].min, MODE_INFO[o.mode].max],
  },
  {
    game: domino,
    category: 'kartu',
    blurb: 'Gaple, Cangkul, Domino Lima & Qiu Qiu',
    minPlayers: 2,
    maxPlayers: 6,
    art: dominoArt,
    Lobby: lazy(() => import('./domino/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: DominoOptions) => dominoSummary(o),
    playersFor: (o: DominoOptions) => [DOMINO_MODES[o.mode].min, DOMINO_MODES[o.mode].max],
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
  {
    game: monopoly,
    category: 'board',
    blurb: 'Beli kota dunia, bangun hotel, bikin lawan bangkrut',
    minPlayers: 2,
    maxPlayers: 8,
    art: monopolyArt,
    Lobby: lazy(() => import('./monopoly/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: MonopolyOptions) => monopolySummary(o),
  },
  {
    game: ludo,
    category: 'board',
    blurb: 'Saling makan bidak, mode tim & petak jahil, papan sampai 8 orang',
    minPlayers: 2,
    maxPlayers: 8,
    art: ludoArt,
    Lobby: lazy(() => import('./ludo/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: LudoOptions) => ludoSummary(o),
  },
  {
    game: draw,
    category: 'lainnya',
    blurb: 'Gambar ngasal, tebak sampai ngakak',
    minPlayers: 2,
    maxPlayers: 8,
    art: drawArt,
    Lobby: lazy(() => import('./draw/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: DrawOptions) => drawSummary(o),
  },
  {
    game: spy,
    category: 'lainnya',
    blurb: 'Kata kembar & lokasi rahasia: cari penyusup, tipu semua orang',
    minPlayers: 3,
    maxPlayers: 8,
    art: spyArt,
    Lobby: lazy(() => import('./spy/ui/Lobby').then((m) => ({ default: m.Lobby }))),
    summary: (o: SpyOptions) => spySummary(o),
  },
]

export const entryById = (id: string | null) => GAMES.find((g) => g.game.id === id) ?? null
export const gameById = (id: string | null) => entryById(id)?.game ?? null

/** Batas pemain sebuah game untuk pengaturan tertentu. */
export function playerRange(entry: GameEntry, options?: unknown): [number, number] {
  return options && entry.playersFor ? entry.playersFor(options) : [entry.minPlayers, entry.maxPlayers]
}
