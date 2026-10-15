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
  gaple: {
    title: 'Gaple',
    line: 'Sambung angka di ujung meja. Nggak bisa jalan? Pass. Habis duluan menang, dapat poin dari mata kartu lawan.',
    min: 2,
    max: 4,
    chips: false,
  },
  cangkul: {
    title: 'Cangkul',
    line: 'Kayak Gaple, tapi nggak ada pass: nyangkul dari tumpukan sampai dapat kartu yang nyambung.',
    min: 2,
    max: 4,
    chips: false,
  },
  lima: {
    title: 'Domino Lima',
    line: 'Jumlah dua ujung meja kelipatan 5? Langsung dapat poin segitu. Kumpulkan poin paling banyak.',
    min: 2,
    max: 4,
    chips: false,
  },
  qiuqiu: {
    title: 'Qiu Qiu',
    line: 'Empat kartu jadi dua pasang, nilainya angka belakang. 9-9 = Qiu Qiu! Gertak pakai chip.',
    min: 2,
    max: 6,
    chips: true,
  },
}

export const MODES = Object.keys(MODE_INFO) as Mode[]

export const fitsMode = (mode: Mode, players: number) => players >= MODE_INFO[mode].min && players <= MODE_INFO[mode].max
