import type { Seat } from '../types'

/** kata = Undercover (kata kembar mirip), lokasi = ala Spyfall (mata-mata tak tahu tempatnya) */
export type SpyMode = 'kata' | 'lokasi'
export type Pack = 'umum' | 'lokal' | 'pasangan'
/** warga & penyusup memegang kata; mrwhite tanpa kata; spy = mata-mata mode lokasi */
export type Role = 'warga' | 'penyusup' | 'mrwhite' | 'spy'

export type SpyOptions = {
  players: number
  mode: SpyMode
  rounds: 3 | 5 | 7
  packs: Pack[]
  /** pasangan kata buatan host: [kata warga, kata penyusup] (sisi diacak tiap ronde) */
  custom: [string, string][]
  /** tambah satu Mr. White (mode kata, minimal 5 pemain) */
  mrWhite: boolean
  /** waktu mengetik petunjuk per giliran (detik) */
  seconds: 30 | 45 | 60
}

export type Phase = 'role' | 'clue' | 'vote' | 'out' | 'guess' | 'roundEnd' | 'end'

export type Clue = { by: Seat; text: string; cycle: number }

/** cara ronde berakhir — untuk teks & suara layar akhir ronde */
export type RoundResult =
  /** semua penyusup / Mr. White / mata-mata ketahuan */
  | 'caught'
  /** penyusup bertahan sampai jumlahnya menyamai warga */
  | 'survive'
  /** Mr. White atau mata-mata menebak kata/lokasi dengan benar */
  | 'guessed'
  /** mata-mata nekat menebak lokasi dan salah */
  | 'blunder'

export type SpyState = {
  opts: SpyOptions
  rng: number
  /** ronde sekarang, mulai 1 */
  round: number
  phase: Phase
  roles: Role[]
  /** kata/lokasi rahasia yang dipegang tiap kursi ('' = tidak tahu) */
  secret: string[]
  /** mode lokasi: pekerjaan tiap kursi di lokasi itu ('' untuk mata-mata) */
  jobs: string[]
  /** kata warga (mode kata) atau nama lokasi (mode lokasi) */
  answer: string
  /** kata penyusup (mode kata) */
  decoy: string
  alive: boolean[]
  /** fase role: siapa sudah mengintip kartu & siap */
  ready: boolean[]
  /** pemberi petunjuk pertama tiap putaran petunjuk */
  starter: Seat
  turn: Seat
  /** putaran petunjuk dalam ronde ini, mulai 1 */
  cycle: number
  clues: Clue[]
  /** pilihan tiap kursi di fase vote; -1 = belum memilih */
  votes: Seat[]
  /** kalau voting ulang: hanya kursi ini yang boleh dipilih */
  candidates: Seat[] | null
  /** jumlah suara terakhir per kursi (untuk layar hasil) */
  tally: number[]
  /** yang baru tereliminasi; null = seri / tidak ada yang keluar */
  lastOut: Seat | null
  /** mode lokasi: mata-mata sudah memakai jatah tebak lokasinya */
  spyGuessed: boolean
  /** tebakan terakhir Mr. White / mata-mata */
  guessText: string
  guessOk: boolean | null
  /** pemenang ronde */
  winner: 'warga' | 'penyusup' | null
  result: RoundResult | null
  scores: number[]
  /** poin yang didapat di ronde ini */
  gained: number[]
  /** naik tiap ganti fase/giliran; timer di tiap HP dihitung sejak nilai ini berubah */
  phaseId: number
  /** pasangan kata / lokasi yang belum keluar (indeks ke pool) */
  deck: number[]
  winners: Seat[] | null
}

export type SpyAction =
  | { type: 'ready' }
  | { type: 'clue'; text: string }
  | { type: 'vote'; target: Seat }
  /** Mr. White yang tereliminasi menebak kata warga, atau mata-mata menebak lokasi */
  | { type: 'guess'; text: string }
  /** hanya dari host: waktu habis (petunjuk / voting / tebakan) */
  | { type: 'timeUp' }
  /** hanya dari host: lanjut dari layar peran / hasil / akhir ronde */
  | { type: 'next' }
  | { type: 'again' }
