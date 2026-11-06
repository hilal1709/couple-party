import type { BotLevel, Seat } from '../types'

export type KitchenId = 'burger' | 'pizza' | 'sushi' | 'ramen' | 'taco' | 'es' | 'kapal' | 'lava'
export type Mode = 'coop' | 'versus'

/** koki hewan; urutan sama dengan objek `hewan_<nama>` di koki.glb */
export const ANIMALS = ['kucing', 'beruang', 'bebek', 'kodok', 'panda', 'rubah', 'kelinci', 'ayam'] as const
export type Animal = (typeof ANIMALS)[number]

export type MasakOptions = {
  players: number
  mode: Mode
  kitchen: KitchenId
  secs: 120 | 180 | 240
  /** total koki termasuk bot; kursi kosong diisi bot */
  total: number
  level: BotLevel
}

export type Actor = {
  /** kursi pemain; null = bot */
  seat: Seat | null
  team: number
}

export type Result = { score: number[]; served: number[]; missed: number[] }

export type MasakState = {
  opts: MasakOptions
  /** pick = tiap pemain memilih koki hewan sebelum ronde pertama */
  phase: 'pick' | 'play' | 'end'
  /** naik tiap ronde baru; dapur dibuat ulang di semua HP saat nilai ini berubah */
  phaseId: number
  /** benih dapur ronde ini, sama di semua HP */
  seed: number
  actors: Actor[]
  /** hewan tiap koki; null = belum memilih (bot diisi saat mulai) */
  koki: (Animal | null)[]
  result: Result | null
}

export type MasakAction =
  | { type: 'koki'; animal: Animal }
  /** host: semua siap, mulai masak (yang belum memilih dapat hewan sisa) */
  | { type: 'go' }
  /** host: waktu ronde habis, skor akhir dari dapur host */
  | { type: 'finish'; result: Result }
  /** host: main lagi di dapur yang sama */
  | { type: 'again' }
