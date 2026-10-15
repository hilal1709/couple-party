import type { Mode } from './types'

export type ModeInfo = {
  title: string
  /** satu kalimat aturan, untuk Lobby */
  line: string
  min: number
  max: number
  /** skor berupa chip (bukan poin ronde) */
  chips: boolean
}

export const MODE_INFO: Record<Mode, ModeInfo> = {
  cangkulan: {
    title: 'Cangkulan',
    line: 'Ikuti jenis kartu. Nggak punya? Nyangkul dari dek sampai dapat. Habis duluan menang.',
    min: 2,
    max: 6,
    chips: false,
  },
  bigtwo: {
    title: 'Capsa Banting',
    line: 'Banting kombinasi yang lebih tinggi: satu, pair, triple, atau 5 kartu. Kartu 2 paling sakti.',
    min: 2,
    max: 4,
    chips: false,
  },
  remi41: {
    title: 'Remi 41',
    line: 'Ambil satu, buang satu. Kumpulkan jenis yang sama sampai pas 41 buat tutup.',
    min: 2,
    max: 4,
    chips: false,
  },
  poker: {
    title: "Poker Hold'em",
    line: 'Dua kartu di tangan, lima di meja. Gertak, call, atau all-in pakai chip poin.',
    min: 2,
    max: 8,
    chips: true,
  },
  joker: {
    title: 'Si Joker',
    line: 'Comot kartu lawan, buang pasangan. Yang terakhir pegang Joker kena sial.',
    min: 2,
    max: 8,
    chips: false,
  },
  bohong: {
    title: 'Bohong',
    line: 'Buang kartu tertutup sambil ngaku angkanya. Curiga? Teriak "Bohong!"',
    min: 2,
    max: 8,
    chips: false,
  },
  blackjack: {
    title: 'Blackjack 21',
    line: 'Semua lawan bandar. Dekati 21 tanpa lewat, blackjack dibayar 3:2.',
    min: 2,
    max: 8,
    chips: true,
  },
  seven: {
    title: 'Seven',
    line: 'Susun kartu dari angka 7. Nggak bisa jalan? Tutup satu kartu jadi minus.',
    min: 2,
    max: 8,
    chips: false,
  },
}

export const MODES = Object.keys(MODE_INFO) as Mode[]

export const fitsMode = (mode: Mode, players: number) => players >= MODE_INFO[mode].min && players <= MODE_INFO[mode].max
