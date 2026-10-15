import type { Group, Ownable, Square } from './types'

const street = (name: string, group: Group, price: number, house: number, rent: number[]): Square => ({ kind: 'street', name, group, price, house, rent })

/** Papan klasik 40 petak, kota-kota dunia dari yang termurah sampai termahal. */
export const BOARD: Square[] = [
  { kind: 'go' },
  street('Kairo', 'brown', 60, 50, [2, 10, 30, 90, 160, 250]),
  { kind: 'card', deck: 'chest' },
  street('Nairobi', 'brown', 60, 50, [4, 20, 60, 180, 320, 450]),
  { kind: 'tax', name: 'Pajak Penghasilan', amount: 200 },
  { kind: 'airport', name: 'Bandara Changi', price: 200 },
  street('Hanoi', 'sky', 100, 50, [6, 30, 90, 270, 400, 550]),
  { kind: 'card', deck: 'chance' },
  street('Manila', 'sky', 100, 50, [6, 30, 90, 270, 400, 550]),
  street('Bangkok', 'sky', 120, 50, [8, 40, 100, 300, 450, 600]),
  { kind: 'jail' },
  street('Rio de Janeiro', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  { kind: 'utility', name: 'Perusahaan Listrik', price: 150 },
  street('Buenos Aires', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  street('Meksiko City', 'pink', 160, 100, [12, 60, 180, 500, 700, 900]),
  { kind: 'airport', name: 'Bandara Heathrow', price: 200 },
  street('Mumbai', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  { kind: 'card', deck: 'chest' },
  street('Istanbul', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  street('Seoul', 'orange', 200, 100, [16, 80, 220, 600, 800, 1000]),
  { kind: 'parking' },
  street('Sydney', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  { kind: 'card', deck: 'chance' },
  street('Berlin', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  street('Roma', 'red', 240, 150, [20, 100, 300, 750, 925, 1100]),
  { kind: 'airport', name: 'Bandara JFK', price: 200 },
  street('Barcelona', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  street('Amsterdam', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  { kind: 'utility', name: 'Perusahaan Air', price: 150 },
  street('Singapura', 'yellow', 280, 150, [24, 120, 360, 850, 1025, 1200]),
  { kind: 'gotojail' },
  street('Dubai', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  street('Hong Kong', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  { kind: 'card', deck: 'chest' },
  street('Paris', 'green', 320, 200, [28, 150, 450, 1000, 1200, 1400]),
  { kind: 'airport', name: 'Bandara Haneda', price: 200 },
  { kind: 'card', deck: 'chance' },
  street('New York', 'navy', 350, 200, [35, 175, 500, 1100, 1300, 1500]),
  { kind: 'tax', name: 'Pajak Barang Mewah', amount: 100 },
  street('Tokyo', 'navy', 400, 200, [50, 200, 600, 1400, 1700, 2000]),
]

export const ownable = (sq: number): Ownable | null => {
  const b = BOARD[sq]
  return b && 'price' in b ? b : null
}

export const GROUPS: Record<Group, number[]> = (() => {
  const g = {} as Record<Group, number[]>
  BOARD.forEach((b, i) => {
    if (b.kind === 'street') (g[b.group] ??= []).push(i)
  })
  return g
})()

export const AIRPORTS = BOARD.flatMap((b, i) => (b.kind === 'airport' ? [i] : []))
export const UTILITIES = BOARD.flatMap((b, i) => (b.kind === 'utility' ? [i] : []))

/** Petak sekelompok (komplek warna, semua bandara, atau semua utilitas). */
export function groupOf(sq: number): number[] {
  const b = BOARD[sq]
  if (b.kind === 'street') return GROUPS[b.group]
  if (b.kind === 'airport') return AIRPORTS
  if (b.kind === 'utility') return UTILITIES
  return [sq]
}

export function squareName(sq: number): string {
  const b = BOARD[sq]
  switch (b.kind) {
    case 'go':
      return 'START'
    case 'jail':
      return 'Penjara'
    case 'parking':
      return 'Parkir Bebas'
    case 'gotojail':
      return 'Masuk Penjara'
    case 'card':
      return b.deck === 'chance' ? 'Kesempatan' : 'Dana Umum'
    default:
      return b.name
  }
}

/** Petak berikutnya (searah jalan) yang memenuhi syarat. */
export function nextOf(from: number, list: number[]): number {
  for (let k = 1; k <= 40; k++) {
    const sq = (from + k) % 40
    if (list.includes(sq)) return sq
  }
  return from
}

/** Kode tiga huruf ala bandara, supaya tetap terbaca di petak kecil. */
export const CODE: Record<number, string> = {
  1: 'CAI', 3: 'NBO', 5: 'SIN', 6: 'HAN', 8: 'MNL', 9: 'BKK', 11: 'RIO', 12: 'PLN', 13: 'BUE', 14: 'MEX', 15: 'LHR',
  16: 'BOM', 18: 'IST', 19: 'SEL', 21: 'SYD', 23: 'BER', 24: 'ROM', 25: 'JFK', 26: 'BCN', 27: 'AMS', 28: 'PAM',
  29: 'SGP', 31: 'DXB', 32: 'HKG', 34: 'PAR', 35: 'HND', 37: 'NYC', 39: 'TYO',
}

/** Warna komplek (Memphis, kontras satu sama lain). */
export const GROUP_HEX: Record<Group, string> = {
  brown: '#9a5b34',
  sky: '#7fd6ff',
  pink: '#ff37a6',
  orange: '#ff8a1c',
  red: '#ff3b5c',
  yellow: '#ffcc1f',
  green: '#43b929',
  navy: '#2f4bff',
}

export const GROUP_NAME: Record<Group, string> = {
  brown: 'Afrika',
  sky: 'Asia Tenggara',
  pink: 'Amerika Latin',
  orange: 'Jalur Sutra',
  red: 'Klasik',
  yellow: 'Pelabuhan',
  green: 'Gemerlap',
  navy: 'Ibu Kota Dunia',
}
