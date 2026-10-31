import type { BotLevel, Seat } from '../types'

export type MapId = 'gang' | 'pasar' | 'museum' | 'stasiun' | 'pabrik' | 'dapur' | 'kota' | 'kapal'

export type BodySize = 'kecil' | 'sedang' | 'besar'

export type PetakOptions = {
  players: number
  map: MapId | 'acak'
  /** jumlah pencari per ronde */
  seekers: 1 | 2
  hideSecs: 60 | 90 | 120
  huntSecs: 120 | 180 | 240
  rounds: 1 | 3 | 5
  /** ukuran bunglon, sama untuk semua pemain supaya adil */
  size: BodySize
  /** total peserta termasuk bot; kursi kosong diisi bot */
  total: number
  level: BotLevel
}

export type Phase = 'hide' | 'hunt' | 'reveal' | 'end'

export type Actor = {
  /** kursi pemain; null = bot */
  seat: Seat | null
}

export type PetakState = {
  opts: PetakOptions
  rng: number
  phase: Phase
  /** naik tiap ganti fase; hitung mundur di tiap HP dimulai saat nilai ini berubah */
  phaseId: number
  round: number
  map: MapId
  actors: Actor[]
  /** indeks aktor yang jadi pencari ronde ini */
  seekers: number[]
  /** detik perburuan saat tertangkap per aktor; null = belum */
  caught: (number | null)[]
  /** titik sembunyi bot, sama di semua HP supaya catnya bisa dibuat lokal; -1 = bukan bot hider */
  botSpots: number[]
  points: number[]
  gained: number[]
  /** siapa yang dipilih tiap aktor sebagai Kamuflase Terbaik; null = belum memilih */
  votes: (number | null)[]
  /** urutan giliran pencari, sudah diacak */
  order: number[]
  /** tangkapan terakhir untuk animasi di semua HP */
  lastCatch: { id: number; target: number; seeker: number } | null
}

export type PetakAction =
  /** host: waktu sembunyi habis */
  | { type: 'toHunt' }
  /** host: tangkapan sah; `t` detik perburuan, `nyali` detik tiap aktor di pandangan pencari */
  | { type: 'catch'; target: number; seeker: number; t: number; nyali: number[] }
  /** host: waktu perburuan habis */
  | { type: 'endHunt'; nyali: number[] }
  | { type: 'vote'; target: number }
  /** host: lanjut ronde berikutnya */
  | { type: 'next' }
