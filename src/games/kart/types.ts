import type { Seat } from '../types'

export type TrackId = 'pantai' | 'sawah' | 'jamur' | 'candi' | 'neon' | 'permen' | 'salju' | 'lava'
export type CupId = 'daun' | 'bintang'
export type Body = 'bajaj' | 'gerobak' | 'bebek'
export type Level = 'santai' | 'normal' | 'jago'

/** item yang dipegang; varian ×3 dipakai satu per satu */
export type ItemKind = 'roket' | 'pisang' | 'pisang3' | 'perisai' | 'sambal' | 'sambal3' | 'awan' | 'magnet' | 'petasan'

export type KartOptions = {
  players: number
  /** satu piala (4 lintasan) atau satu lintasan saja */
  course: CupId | TrackId
  laps: 1 | 3 | 5
  /** isi kursi kosong dengan bot sampai 8 kart */
  bots: boolean
  level: Level
}

export type Phase = 'pick' | 'race' | 'results' | 'standings' | 'end'

export type Racer = {
  /** kursi pemain; null = bot */
  seat: Seat | null
  /** indeks karakter di CHARACTERS */
  char: number
  body: Body
}

/** benda di lintasan yang disimulasikan sama di semua HP dari data ini */
export type Entity =
  | { id: number; kind: 'pisang'; by: number; x: number; z: number }
  /** roket menyusuri lintasan dari jarak `s` dengan offset samping `lane` */
  | { id: number; kind: 'roket'; by: number; s: number; lane: number }
  /** petasan dilempar ke titik (x, z) lalu meledak */
  | { id: number; kind: 'petasan'; by: number; x: number; z: number }

/** kejadian sekali lewat yang perlu dilihat semua HP (awan hujan, kena item) */
export type RaceEvent =
  | { id: number; kind: 'awan'; by: number }
  | { id: number; kind: 'hit'; racer: number; by: number; item: 'pisang' | 'roket' | 'petasan' }
  | { id: number; kind: 'use'; racer: number; item: ItemKind }

export type KartState = {
  opts: KartOptions
  rng: number
  phase: Phase
  /** naik tiap ganti fase; hitung mundur di tiap HP dimulai saat nilai ini berubah */
  phaseId: number
  racers: Racer[]
  /** pilihan karakter sudah dikunci (fase pick) per kursi pemain */
  ready: boolean[]
  schedule: TrackId[]
  /** lintasan ke berapa di schedule */
  race: number
  /** putaran yang sudah selesai per kart */
  laps: number[]
  /** waktu finish (ms sejak GO) per kart; null = belum */
  times: (number | null)[]
  /** urutan finish (indeks kart) */
  order: number[]
  /** item yang dipegang per kart, dan sisa pakainya */
  items: (ItemKind | null)[]
  uses: number[]
  entities: Entity[]
  events: RaceEvent[]
  seq: number
  /** poin Grand Prix total & yang didapat di balapan terakhir */
  points: number[]
  gained: number[]
}

export type KartAction =
  | { type: 'pick'; char: number; body: Body }
  | { type: 'ready' }
  /** hanya host: mulai balapan meski ada yang belum siap */
  | { type: 'go' }
  /** kart mengambil kotak item; `rank` = posisi saat itu (0 = terdepan) */
  | { type: 'box'; racer: number; rank: number }
  /** pakai item; posisi & arah dipakai untuk memunculkan benda */
  | { type: 'use'; racer: number; x: number; z: number; s: number; lane: number; back: boolean }
  /** kart kena benda (korban yang memutuskan) */
  | { type: 'hit'; racer: number; id: number }
  | { type: 'lap'; racer: number; lap: number }
  | { type: 'finish'; racer: number; time: number }
  /** hanya host: akhiri balapan; kart yang belum finish diurutkan dengan `rest` */
  | { type: 'end'; rest: number[] }
  /** hanya host: lanjut dari layar hasil / klasemen */
  | { type: 'next' }
  | { type: 'again' }
