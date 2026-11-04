/**
 * Enam modul bom Jinak Bom: pembuat soal, kunci jawaban, dan teks aturan buku panduan.
 * Teks aturan ditulis di sebelah kodenya supaya panduan dan mesin tidak pernah beda.
 */
import { nextRand } from '../rng'
import type {
  BombInfo,
  BombModule,
  ButtonColor,
  ButtonLabel,
  ButtonModule,
  Dir,
  LockLamp,
  LockModule,
  LockShape,
  MazeModule,
  ModuleKind,
  PasswordModule,
  Sticker,
  SymbolsModule,
  WireColor,
  WiresModule,
} from './types'

/** RNG kecil yang menyimpan seed-nya sendiri */
export type Rng = { seed: number; next: () => number }
export function makeRng(seed: number): Rng {
  const r: Rng = {
    seed,
    next: () => {
      const [v, s] = nextRand(r.seed)
      r.seed = s
      return v
    },
  }
  return r
}
const int = (r: Rng, n: number) => Math.floor(r.next() * n)
const pick = <T>(r: Rng, arr: readonly T[]): T => arr[int(r, arr.length)]
function shuffled<T>(r: Rng, arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(r, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ---------- casing ---------- */

export const STICKERS: Sticker[] = ['KOPI', 'BATIK', 'SATE', 'BEMO', 'JAMU']
const SERIAL_CHARS = 'ABCDEFGHJKLMNPRSTUVWXZ0123456789'
const VOWELS = 'AIUEO'

export function makeInfo(r: Rng): BombInfo {
  let serial = ''
  for (let i = 0; i < 5; i++) serial += pick(r, [...SERIAL_CHARS])
  serial += String(int(r, 10))
  const batteries = int(r, 5)
  const stickers = shuffled(r, STICKERS).slice(0, int(r, 3))
  return { serial, batteries, stickers }
}

export const lastDigit = (i: BombInfo) => Number(i.serial.at(-1))
export const serialOdd = (i: BombInfo) => lastDigit(i) % 2 === 1
export const serialVowel = (i: BombInfo) => [...i.serial].some((c) => VOWELS.includes(c))
export const hasSticker = (i: BombInfo, s: Sticker) => i.stickers.includes(s)

/* ---------- 1. Kabel Warna-warni ---------- */

export const WIRE_COLORS: WireColor[] = ['merah', 'biru', 'kuning', 'hijau', 'putih', 'hitam']

const count = (w: WireColor[], c: WireColor) => w.filter((x) => x === c).length
const firstOf = (w: WireColor[], c: WireColor) => w.indexOf(c)
const lastOf = (w: WireColor[], c: WireColor) => w.lastIndexOf(c)

/** kabel ke berapa (indeks 0) yang harus dipotong */
export function wireAnswer(w: WireColor[], info: BombInfo): number {
  const n = w.length
  if (n === 3) {
    if (!w.includes('hijau')) return 0
    if (w[2] === 'hitam') return 1
    if (info.batteries >= 2) return 2
    return firstOf(w, 'hijau')
  }
  if (n === 4) {
    if (count(w, 'merah') === 1 && !serialOdd(info)) return firstOf(w, 'merah')
    if (w[0] === 'putih') return 2
    if (!w.includes('kuning')) return 0
    return lastOf(w, 'kuning')
  }
  if (n === 5) {
    if (count(w, 'biru') >= 2) return firstOf(w, 'biru')
    if (hasSticker(info, 'SATE')) return 3
    if (w[4] === 'hitam') return 0
    return 2
  }
  if (!w.includes('merah') && !w.includes('kuning')) return 4
  if (serialVowel(info) && w.includes('merah')) return firstOf(w, 'merah')
  if (count(w, 'putih') === 1) return firstOf(w, 'putih')
  return 1
}

export const WIRE_RULES: { title: string; rules: string[] }[] = [
  {
    title: '3 kabel',
    rules: ['Tidak ada kabel hijau → potong kabel pertama.', 'Kabel terakhir hitam → potong kabel kedua.', 'Baterai 2 atau lebih → potong kabel terakhir.', 'Selain itu → potong kabel hijau yang pertama.'],
  },
  {
    title: '4 kabel',
    rules: ['Merah cuma satu dan digit terakhir nomor seri genap → potong yang merah.', 'Kabel pertama putih → potong kabel ketiga.', 'Tidak ada kabel kuning → potong kabel pertama.', 'Selain itu → potong kabel kuning yang terakhir.'],
  },
  {
    title: '5 kabel',
    rules: ['Biru ada 2 atau lebih → potong kabel biru yang pertama.', 'Ada stiker SATE → potong kabel keempat.', 'Kabel terakhir hitam → potong kabel pertama.', 'Selain itu → potong kabel ketiga.'],
  },
  {
    title: '6 kabel',
    rules: ['Tidak ada merah dan tidak ada kuning → potong kabel kelima.', 'Nomor seri ada huruf vokal dan ada kabel merah → potong merah yang pertama.', 'Putih cuma satu → potong yang putih.', 'Selain itu → potong kabel kedua.'],
  },
]

function makeWires(r: Rng): WiresModule {
  const n = 3 + int(r, 4)
  return { kind: 'kabel', wires: Array.from({ length: n }, () => pick(r, WIRE_COLORS)), cut: [] }
}

/* ---------- 2. Tombol Kerupuk ---------- */

export const BUTTON_COLORS: ButtonColor[] = ['merah', 'biru', 'kuning', 'putih', 'hijau']
export const BUTTON_LABELS: ButtonLabel[] = ['GAS', 'REM', 'TAHAN', 'LEPAS']

/** true = harus ditahan, false = cukup ditekan sekali */
export function buttonHold(m: Pick<ButtonModule, 'color' | 'label'>, info: BombInfo): boolean {
  if (m.label === 'REM' && info.batteries >= 2) return false
  if (m.color === 'merah') return true
  if (m.label === 'GAS' && hasSticker(info, 'BEMO')) return false
  if (m.color === 'kuning' || m.color === 'hijau') return true
  if (info.batteries >= 3) return false
  return true
}

/** saat ditahan: lepaskan ketika ada digit ini di mana saja pada timer */
export const RELEASE_DIGIT: Record<ButtonColor, number> = { biru: 4, putih: 1, kuning: 5, merah: 2, hijau: 2 }

export const BUTTON_RULES = [
  'Tulisan REM dan baterai 2 atau lebih → tekan sekali lalu lepas.',
  'Tombol merah → tahan.',
  'Tulisan GAS dan ada stiker BEMO → tekan sekali lalu lepas.',
  'Tombol kuning atau hijau → tahan.',
  'Baterai 3 atau lebih → tekan sekali lalu lepas.',
  'Selain itu → tahan.',
]

export function makeButton(r: Rng): ButtonModule {
  return { kind: 'tombol', color: pick(r, BUTTON_COLORS), label: pick(r, BUTTON_LABELS), strip: pick(r, BUTTON_COLORS) }
}

/** benar tidaknya satu tekanan tombol; `shown` = teks timer saat dilepas, mis. "3:42" */
export function buttonOk(m: ButtonModule, info: BombInfo, hold: boolean, shown: string): boolean {
  const need = buttonHold(m, info)
  if (need !== hold) return false
  if (!hold) return true
  return shown.includes(String(RELEASE_DIGIT[m.strip]))
}

/* ---------- 3. Simbol Wayang ---------- */

export const SYMBOLS = [
  'gunungan', 'keris', 'blangkon', 'kawung', 'mega', 'bintang', 'bulan', 'ombak',
  'daun', 'mata', 'payung', 'kendang', 'wajan', 'ketupat', 'kipas', 'cangkir',
] as const
export type SymbolId = (typeof SYMBOLS)[number]

export const SYMBOL_COLUMNS: SymbolId[][] = [
  ['gunungan', 'keris', 'kawung', 'bulan', 'ombak', 'payung', 'kipas'],
  ['blangkon', 'gunungan', 'mega', 'daun', 'keris', 'wajan', 'cangkir'],
  ['kawung', 'bintang', 'mata', 'gunungan', 'ketupat', 'kendang', 'daun'],
  ['ombak', 'mega', 'bintang', 'blangkon', 'kipas', 'mata', 'wajan'],
  ['kendang', 'payung', 'cangkir', 'bulan', 'bintang', 'keris', 'ketupat'],
  ['daun', 'wajan', 'ombak', 'ketupat', 'mata', 'kawung', 'blangkon'],
]

/** urutan tekan yang benar: urutan simbol di satu-satunya kolom yang memuat keempatnya */
export function symbolOrder(symbols: string[]): string[] {
  const col = SYMBOL_COLUMNS.find((c) => symbols.every((s) => c.includes(s as SymbolId)))
  return col ? col.filter((s) => symbols.includes(s)) : []
}

function makeSymbols(r: Rng): SymbolsModule {
  for (;;) {
    const col = pick(r, SYMBOL_COLUMNS)
    const four = shuffled(r, col).slice(0, 4)
    const owners = SYMBOL_COLUMNS.filter((c) => four.every((s) => c.includes(s)))
    if (owners.length === 1) return { kind: 'simbol', symbols: four, pressed: [] }
  }
}

/* ---------- 4. Labirin Gang ---------- */

export const MAZE_SIZE = 6
/** dinding terbuka per sel: bit u=1 r=2 d=4 l=8 */
const BIT: Record<Dir, number> = { u: 1, r: 2, d: 4, l: 8 }
const STEP: Record<Dir, [number, number]> = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] }
const OPP: Record<Dir, Dir> = { u: 'd', d: 'u', l: 'r', r: 'l' }

/** dua penanda lingkaran tiap labirin, untuk mengenali labirin yang mana */
export const MAZE_MARKERS: [number, number][][] = [
  [[0, 1], [5, 2]],
  [[4, 1], [1, 3]],
  [[3, 3], [5, 5]],
  [[0, 0], [0, 3]],
  [[4, 2], [3, 5]],
  [[2, 4], [4, 0]],
]

const mazeCache = new Map<number, number[][]>()

/** sel[y][x] = bit arah yang terbuka; tetap sama untuk nomor yang sama (backtracker dengan seed tetap) */
export function mazeCells(index: number): number[][] {
  const hit = mazeCache.get(index)
  if (hit) return hit
  const N = MAZE_SIZE
  const cells = Array.from({ length: N }, () => Array(N).fill(0) as number[])
  const r = makeRng(7919 * (index + 3))
  const seen = new Set<string>(['0,0'])
  const stack: [number, number][] = [[0, 0]]
  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const opts = (Object.keys(STEP) as Dir[]).filter((d) => {
      const nx = x + STEP[d][0]
      const ny = y + STEP[d][1]
      return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(`${nx},${ny}`)
    })
    if (!opts.length) {
      stack.pop()
      continue
    }
    const d = pick(r, opts)
    const nx = x + STEP[d][0]
    const ny = y + STEP[d][1]
    cells[y][x] |= BIT[d]
    cells[ny][nx] |= BIT[OPP[d]]
    seen.add(`${nx},${ny}`)
    stack.push([nx, ny])
  }
  // sedikit jalan pintas supaya tidak cuma satu lorong panjang
  for (let k = 0; k < 4; k++) {
    const x = int(r, N - 1)
    const y = int(r, N)
    cells[y][x] |= BIT.r
    cells[y][x + 1] |= BIT.l
  }
  mazeCache.set(index, cells)
  return cells
}

export const mazeOpen = (index: number, [x, y]: [number, number], d: Dir) => (mazeCells(index)[y][x] & BIT[d]) !== 0
export const stepTo = ([x, y]: [number, number], d: Dir): [number, number] => [x + STEP[d][0], y + STEP[d][1]]

function mazeDistance(index: number, a: [number, number], b: [number, number]): number {
  const q: [number, number, number][] = [[a[0], a[1], 0]]
  const seen = new Set([`${a[0]},${a[1]}`])
  while (q.length) {
    const [x, y, d] = q.shift()!
    if (x === b[0] && y === b[1]) return d
    for (const dir of Object.keys(STEP) as Dir[]) {
      if (!mazeOpen(index, [x, y], dir)) continue
      const [nx, ny] = stepTo([x, y], dir)
      const k = `${nx},${ny}`
      if (!seen.has(k)) {
        seen.add(k)
        q.push([nx, ny, d + 1])
      }
    }
  }
  return -1
}

function makeMaze(r: Rng): MazeModule {
  const maze = int(r, MAZE_MARKERS.length)
  for (;;) {
    const pos: [number, number] = [int(r, MAZE_SIZE), int(r, MAZE_SIZE)]
    const goal: [number, number] = [int(r, MAZE_SIZE), int(r, MAZE_SIZE)]
    if (mazeDistance(maze, pos, goal) >= 5) return { kind: 'labirin', maze, pos, goal }
  }
}

/* ---------- 5. Kata Sandi Pasar ---------- */

export const WORDS = [
  'BAKSO', 'BATIK', 'CABAI', 'KERIS', 'GULAI', 'RUJAK', 'TEMPE', 'SALAK', 'JAMUR', 'KECAP',
  'SENJA', 'OMBAK', 'PASAR', 'ANGIN', 'BULAN', 'LAMPU', 'KABEL', 'KUNCI', 'PINTU', 'MERAH',
  'HIJAU', 'PUTIH', 'HITAM', 'SAWAH', 'BECAK', 'ROTAN', 'SUMUR', 'ONDEL', 'GELAS', 'DANAU',
].filter((w) => w.length === 5)

const ALPHA = 'ABCDEFGHIJKLMNOPRSTUWY'
export const COLUMN_LETTERS = 6

/** kata dari daftar yang bisa dibentuk dari kolom huruf ini (seharusnya tepat satu) */
export const passwordMatches = (columns: string[][]) => WORDS.filter((w) => [...w].every((c, i) => columns[i].includes(c)))

function makePassword(r: Rng): PasswordModule {
  for (;;) {
    const word = pick(r, WORDS)
    const columns = [...word].map((c) => shuffled(r, [c, ...shuffled(r, [...ALPHA].filter((x) => x !== c)).slice(0, COLUMN_LETTERS - 1)]))
    if (passwordMatches(columns).length === 1) return { kind: 'sandi', columns }
  }
}

/* ---------- 6. Gembok Angka ---------- */

export const LOCK_LAMPS: LockLamp[] = ['merah', 'hijau', 'biru', 'kuning']
export const LOCK_SHAPES: LockShape[] = ['bulan', 'bintang', 'ketupat', 'hati']
/** baris = warna lampu, kolom = bentuk */
export const LOCK_TABLE: string[][] = [
  ['482', '157', '930', '615'],
  ['209', '764', '381', '846'],
  ['573', '028', '692', '317'],
  ['136', '905', '248', '751'],
]

export function lockCode(m: Pick<LockModule, 'lamp' | 'shape'>, info: BombInfo): string {
  let code = LOCK_TABLE[LOCK_LAMPS.indexOf(m.lamp)][LOCK_SHAPES.indexOf(m.shape)]
  if (serialOdd(info)) code = [...code].reverse().join('')
  return [...code].map((d) => (Number(d) + info.batteries) % 10).join('')
}

export const LOCK_RULES = [
  'Cari kode dasar di tabel: baris = warna lampu, kolom = bentuk di layar kecil.',
  'Digit terakhir nomor seri ganjil → balik urutan kodenya.',
  'Tambahkan jumlah baterai ke tiap digit. Lewat 9? Ambil satuannya saja (9 + 2 = 1).',
  'Putar ketiga roda ke kode itu, lalu tekan BUKA.',
]

function makeLock(r: Rng): LockModule {
  return { kind: 'gembok', lamp: pick(r, LOCK_LAMPS), shape: pick(r, LOCK_SHAPES) }
}

/* ---------- bom ---------- */

export const MODULE_KINDS: ModuleKind[] = ['kabel', 'tombol', 'simbol', 'labirin', 'sandi', 'gembok']

const MAKERS: Record<ModuleKind, (r: Rng) => BombModule> = {
  kabel: makeWires,
  tombol: makeButton,
  simbol: makeSymbols,
  labirin: makeMaze,
  sandi: makePassword,
  gembok: makeLock,
}

/** `n` modul, jenisnya tidak kembar kecuali lebih dari enam */
export function makeModules(r: Rng, n: number): BombModule[] {
  const kinds = shuffled(r, MODULE_KINDS)
  while (kinds.length < n) kinds.push(pick(r, MODULE_KINDS))
  return kinds.slice(0, n).map((k) => MAKERS[k](r))
}
