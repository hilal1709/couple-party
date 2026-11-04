import type { KitchenId } from './types'

/** bahan dan urutan olahannya; state terakhir = siap ditaruh di piring */
export type Ing = 'roti' | 'daging' | 'selada' | 'tomat' | 'keju' | 'adonan' | 'jamur' | 'nasi' | 'ikan' | 'nori' | 'timun' | 'mie' | 'telur' | 'bawang' | 'tortilla' | 'pancake' | 'stroberi' | 'madu' | 'pisang' | 'beras' | 'udang' | 'ayam' | 'kacang' | 'lontong'
export type Step = 'cut' | 'cook' | 'bake'
export type FoodState = 'raw' | 'cut' | 'cooked' | 'baked' | 'burnt'

export const ING: Record<Ing, { title: string; steps: Step[] }> = {
  roti: { title: 'Roti', steps: [] },
  daging: { title: 'Daging', steps: ['cook'] },
  selada: { title: 'Selada', steps: ['cut'] },
  tomat: { title: 'Tomat', steps: ['cut'] },
  keju: { title: 'Keju', steps: ['cut'] },
  // digiling di talenan dulu, lalu dipanggang di oven
  adonan: { title: 'Adonan', steps: ['cut', 'bake'] },
  jamur: { title: 'Jamur', steps: ['cut'] },
  nasi: { title: 'Nasi', steps: ['cook'] },
  ikan: { title: 'Ikan', steps: ['cut'] },
  nori: { title: 'Nori', steps: [] },
  timun: { title: 'Timun', steps: ['cut'] },
  mie: { title: 'Mie', steps: ['cook'] },
  telur: { title: 'Telur', steps: ['cook'] },
  bawang: { title: 'Daun bawang', steps: ['cut'] },
  tortilla: { title: 'Tortilla', steps: ['cook'] },
  pancake: { title: 'Adonan pancake', steps: ['cook'] },
  stroberi: { title: 'Stroberi', steps: ['cut'] },
  madu: { title: 'Madu', steps: [] },
  pisang: { title: 'Pisang', steps: ['cut'] },
  beras: { title: 'Nasi', steps: ['cook'] },
  udang: { title: 'Udang', steps: ['cook'] },
  // ditusuk (potong) dulu, lalu dibakar
  ayam: { title: 'Ayam', steps: ['cut', 'cook'] },
  kacang: { title: 'Saus kacang', steps: [] },
  lontong: { title: 'Lontong', steps: ['cut'] },
}

export const AFTER: Record<Step, FoodState> = { cut: 'cut', cook: 'cooked', bake: 'baked' }

/** state hasil tiap langkah olahan bahan */
export const statesOf = (ing: Ing): FoodState[] => ['raw', ...ING[ing].steps.map((s) => AFTER[s])]
/** langkah berikutnya untuk bahan di state ini; null = sudah jadi (atau gosong) */
export function nextStep(ing: Ing, s: FoodState): Step | null {
  const states = statesOf(ing)
  const i = states.indexOf(s)
  return i >= 0 && i < states.length - 1 ? ING[ing].steps[i] : null
}
export const finalState = (ing: Ing): FoodState => statesOf(ing).at(-1)!
export const code = (ing: Ing, s: FoodState) => `${ing}:${s}`
export const finalCode = (ing: Ing) => code(ing, finalState(ing))

export type Recipe = { id: string; title: string; ings: Ing[]; points: number }

export const RECIPES: Record<string, Recipe> = {
  burger: { id: 'burger', title: 'Burger', ings: ['roti', 'daging', 'selada'], points: 30 },
  burgerKeju: { id: 'burgerKeju', title: 'Burger Keju', ings: ['roti', 'daging', 'keju'], points: 32 },
  burgerKomplit: { id: 'burgerKomplit', title: 'Burger Komplit', ings: ['roti', 'daging', 'selada', 'tomat'], points: 42 },
  pizza: { id: 'pizza', title: 'Pizza Margherita', ings: ['adonan', 'tomat', 'keju'], points: 40 },
  pizzaJamur: { id: 'pizzaJamur', title: 'Pizza Jamur', ings: ['adonan', 'jamur', 'keju'], points: 42 },
  makiIkan: { id: 'makiIkan', title: 'Maki Ikan', ings: ['nasi', 'ikan', 'nori'], points: 36 },
  makiTimun: { id: 'makiTimun', title: 'Maki Timun', ings: ['nasi', 'timun', 'nori'], points: 34 },
  nigiri: { id: 'nigiri', title: 'Nigiri', ings: ['nasi', 'ikan'], points: 26 },
  ramen: { id: 'ramen', title: 'Ramen Telur', ings: ['mie', 'telur', 'bawang'], points: 38 },
  ramenDaging: { id: 'ramenDaging', title: 'Ramen Daging', ings: ['mie', 'daging', 'bawang'], points: 40 },
  taco: { id: 'taco', title: 'Taco', ings: ['tortilla', 'daging', 'selada'], points: 34 },
  tacoKeju: { id: 'tacoKeju', title: 'Taco Keju', ings: ['tortilla', 'daging', 'keju', 'tomat'], points: 46 },
  pancakeStroberi: { id: 'pancakeStroberi', title: 'Pancake Stroberi', ings: ['pancake', 'stroberi', 'madu'], points: 36 },
  pancakePisang: { id: 'pancakePisang', title: 'Pancake Pisang', ings: ['pancake', 'pisang', 'madu'], points: 36 },
  nasgor: { id: 'nasgor', title: 'Nasi Goreng', ings: ['beras', 'telur', 'bawang'], points: 38 },
  nasgorUdang: { id: 'nasgorUdang', title: 'Nasi Goreng Udang', ings: ['beras', 'udang', 'bawang'], points: 40 },
  sate: { id: 'sate', title: 'Sate Ayam', ings: ['ayam', 'kacang'], points: 32 },
  sateLontong: { id: 'sateLontong', title: 'Sate Lontong', ings: ['ayam', 'kacang', 'lontong'], points: 42 },
}

/** cara hidangan digambar di piring */
export type Dish = 'burger' | 'pizza' | 'sushi' | 'ramen' | 'taco' | 'pancake' | 'nasgor' | 'sate'
export const DISH_OF: Record<string, Dish> = { roti: 'burger', adonan: 'pizza', nasi: 'sushi', mie: 'ramen', tortilla: 'taco', pancake: 'pancake', beras: 'nasgor', ayam: 'sate' }

/**
 * Denah dapur, satu huruf per petak 1,2 m. Baris atas = jauh dari kamera.
 * `.` lantai · `1`–`8` titik muncul · `#` meja · `B` talenan · `K` kompor · `P` tumpukan piring
 * `S` loket saji · `X` tong sampah · `W` wastafel · `E` meja berisi alat pemadam · `O` oven · `=` sabuk berjalan
 * `|` jembatan antar gerbong (lantai yang kadang terbuka) · `~` / `%` petak lava kelompok A / B · huruf kecil = peti bahan (lihat `crates`)
 */
export type Gimmick = 'lift' | 'belt' | 'gap' | 'truck' | 'ice' | 'ship' | 'lava'

export type Kitchen = {
  id: KitchenId
  title: string
  line: string
  menu: string[]
  layout: string[]
  crates: Record<string, Ing>
  /** ambang bintang co-op untuk 2 koki & 180 detik; diskalakan menurut jumlah koki & durasi */
  stars: [number, number, number]
  gimmick?: Gimmick
  /** sabuk: bahan yang datang lewat sabuk, bukan dari peti */
  belt?: Ing[]
}

export const KITCHENS: Record<KitchenId, Kitchen> = {
  burger: {
    id: 'burger',
    title: 'Kedai Burger',
    line: 'Dapur pertama: roti, daging, selada. Jangan sampai gosong.',
    menu: ['burger', 'burger', 'burgerKeju', 'burgerKomplit'],
    layout: [
      '#r#s#d#k#t##',
      '#..........K',
      'B.1......2.K',
      'B...#..#...S',
      '#...#..#...S',
      'E.3......4.#',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { r: 'roti', s: 'selada', d: 'daging', k: 'keju', t: 'tomat' },
    stars: [80, 170, 260],
  },
  pizza: {
    id: 'pizza',
    title: 'Pizzeria Atap',
    line: 'Oven panas di atap gedung. Loket naik-turun pakai lift, sajikan saat pintunya terbuka.',
    menu: ['pizza', 'pizza', 'pizzaJamur'],
    layout: [
      '#a#t#k#j##O#',
      '#..........O',
      'B.1......2.O',
      'B...##.....S',
      '#.......##.S',
      'E.3......4.#',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { a: 'adonan', t: 'tomat', k: 'keju', j: 'jamur' },
    stars: [70, 150, 230],
    gimmick: 'lift',
  },
  sushi: {
    id: 'sushi',
    title: 'Sushi Sabuk',
    line: 'Ikan dan timun datang lewat sabuk berjalan. Ambil sebelum lewat!',
    menu: ['makiIkan', 'makiTimun', 'nigiri'],
    layout: [
      '#q#n##K#K#X#',
      '#..........S',
      'B.1======2.S',
      'B..=####=..#',
      '#..=####=..#',
      'E.3======4.#',
      '#.5.6..7.8.#',
      '##P#W#####P#',
    ],
    crates: { q: 'nasi', n: 'nori' },
    stars: [80, 170, 260],
    gimmick: 'belt',
    belt: ['ikan', 'timun', 'ikan'],
  },
  ramen: {
    id: 'ramen',
    title: 'Ramen Kereta',
    line: 'Dapur dua gerbong. Sambungannya kadang lepas, oper lewat meja tengah.',
    menu: ['ramen', 'ramenDaging'],
    layout: [
      '#m#e#b##K#K#',
      '#.....#....K',
      'B.1...#..2.S',
      'B.....|....S',
      '#.....|....#',
      'E.3...#..4.#',
      '#.5.6.#.7.8#',
      '##P#W###d#X#',
    ],
    crates: { m: 'mie', e: 'telur', b: 'bawang', d: 'daging' },
    stars: [70, 150, 230],
    gimmick: 'gap',
  },
  taco: {
    id: 'taco',
    title: 'Truk Taco',
    line: 'Dapur di truk yang ngebut. Tiap belok, barang di meja ikut bergeser.',
    menu: ['taco', 'taco', 'tacoKeju'],
    layout: [
      '#o#d#s#k#t##',
      '#..........K',
      'B.1......2.K',
      'B...#..#...S',
      '#...#..#...S',
      'E.3......4.#',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { o: 'tortilla', d: 'daging', s: 'selada', k: 'keju', t: 'tomat' },
    stars: [75, 160, 245],
    gimmick: 'truck',
  },
  es: {
    id: 'es',
    title: 'Kafe Es',
    line: 'Kafe di kutub. Lantainya es licin: rem dari jauh atau meluncur lewat meja.',
    menu: ['pancakeStroberi', 'pancakePisang'],
    layout: [
      '#c#s#m#i##K#',
      '#..........K',
      'B.1......2.K',
      'B....##....S',
      '#..........S',
      'E.3.#..#.4.#',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { c: 'pancake', s: 'stroberi', m: 'madu', i: 'pisang' },
    stars: [70, 150, 230],
    gimmick: 'ice',
  },
  kapal: {
    id: 'kapal',
    title: 'Kapal Badai',
    line: 'Dapur di kapal yang diguncang badai. Dek miring ke kiri dan kanan, barang ikut meluncur.',
    menu: ['nasgor', 'nasgorUdang'],
    layout: [
      '#b#u#e#g##K#',
      '#..........K',
      'B.1......2.S',
      'B...####...S',
      '#..........#',
      'E.3......4.K',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { b: 'beras', u: 'udang', e: 'telur', g: 'bawang' },
    stars: [70, 150, 230],
    gimmick: 'ship',
  },
  lava: {
    id: 'lava',
    title: 'Dapur Gunung Api',
    line: 'Warung sate di kawah. Petak lava naik bergantian, kompor sesekali menyembur.',
    menu: ['sate', 'sate', 'sateLontong'],
    layout: [
      '#y#k#l####K#',
      '#.~...%.~..K',
      'B.1.%..~.2.S',
      'B.~..##..%.S',
      '#.%..##..~.#',
      'E.3.~..%.4.#',
      '#.5.6..7.8.#',
      '##P#W#X##P##',
    ],
    crates: { y: 'ayam', k: 'kacang', l: 'lontong' },
    stars: [65, 140, 215],
    gimmick: 'lava',
  },
}

export const KITCHEN_IDS = Object.keys(KITCHENS) as KitchenId[]

export const CELL = 1.2
export const COUNTER_TOP = 0.92

export type StationKind = 'counter' | 'board' | 'stove' | 'plates' | 'serve' | 'trash' | 'crate' | 'sink' | 'oven' | 'belt'

/** langkah yang dikerjakan stasiun panas */
export const HEAT: Partial<Record<StationKind, Step>> = { stove: 'cook', oven: 'bake' }

export type Station = { kind: StationKind; ing?: Ing; c: number; r: number; x: number; z: number }

export type Layout = {
  w: number
  h: number
  stations: Station[]
  spawns: [number, number][]
  /** kotak tabrakan untuk walk.ts */
  boxes: { x: number; z: number; hx: number; hz: number; yaw: number; top: number }[]
  /** indeks stasiun per petak, -1 = lantai */
  grid: Int16Array
  /** titik berdiri di depan tiap stasiun (pusat petak lantai tetangga) */
  fronts: [number, number][][]
  /** stasiun bersebelahan (jalur api merambat) */
  near: number[][]
  /** stasiun tempat alat pemadam di awal ronde */
  extinguisher: number
  /** sabuk: urutan stasiun sabuk searah putaran */
  belt: number[]
  /** sambungan gerbong: pusat petak `|` */
  gap: [number, number][]
  /** dinding saat sambungan lepas: kotak biasa + petak `|` */
  shut: { boxes: Layout['boxes'] }
  /** petak lava kelompok A (`~`) dan B (`%`), serta dinding saat masing-masing menyala */
  lava: [number, number][][]
  lavaWalls: { boxes: Layout['boxes'] }[]
}

const KIND: Record<string, StationKind> = { '#': 'counter', E: 'counter', B: 'board', K: 'stove', P: 'plates', S: 'serve', X: 'trash', W: 'sink', O: 'oven', '=': 'belt' }

const cache = new Map<KitchenId, Layout>()

export function layoutOf(id: KitchenId): Layout {
  const hit = cache.get(id)
  if (hit) return hit
  const k = KITCHENS[id]
  const h = k.layout.length
  const w = k.layout[0].length
  const pos = (c: number, r: number): [number, number] => [(c - (w - 1) / 2) * CELL, (r - (h - 1) / 2) * CELL]
  const stations: Station[] = []
  const spawns: [number, number][] = []
  const grid = new Int16Array(w * h).fill(-1)
  let extinguisher = -1
  const gap: [number, number][] = []
  const lava: [number, number][][] = [[], []]
  k.layout.forEach((row, r) => {
    ;[...row].forEach((ch, c) => {
      const [x, z] = pos(c, r)
      if (ch === '.') return
      if (ch === '|') {
        gap.push([x, z])
        return
      }
      if (ch === '~' || ch === '%') {
        lava[ch === '~' ? 0 : 1].push([x, z])
        return
      }
      if (/[1-8]/.test(ch)) {
        spawns[Number(ch) - 1] = [x, z]
        return
      }
      const ing = k.crates[ch]
      const kind = ing ? 'crate' : KIND[ch]
      if (!kind) throw new Error(`huruf denah tak dikenal: ${ch}`)
      grid[r * w + c] = stations.length
      if (ch === 'E') extinguisher = stations.length
      stations.push({ kind, ing, c, r, x, z })
    })
  })
  const boxes = stations.map((s) => ({ x: s.x, z: s.z, hx: CELL / 2, hz: CELL / 2, yaw: 0, top: COUNTER_TOP }))
  const at = (c: number, r: number) => (c >= 0 && r >= 0 && c < w && r < h ? grid[r * w + c] : -1)
  const floor = (c: number, r: number) => c >= 0 && r >= 0 && c < w && r < h && grid[r * w + c] < 0
  const fronts = stations.map((s) =>
    [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]
      .filter(([dc, dr]) => floor(s.c + dc, s.r + dr))
      .map(([dc, dr]) => pos(s.c + dc, s.r + dr)),
  )
  const near = stations.map((s) => [at(s.c + 1, s.r), at(s.c - 1, s.r), at(s.c, s.r + 1), at(s.c, s.r - 1)].filter((i) => i >= 0))
  // sabuk: telusuri lingkaran dari sel sabuk pertama, selalu ke tetangga sabuk yang belum dikunjungi
  const belt: number[] = []
  const first = stations.findIndex((s) => s.kind === 'belt')
  if (first >= 0) {
    let cur = first
    const seen = new Set<number>()
    while (cur >= 0 && !seen.has(cur)) {
      seen.add(cur)
      belt.push(cur)
      // searah jarum jam dilihat dari kamera: kanan, bawah, kiri, atas
      const s0 = stations[cur]
      cur = [at(s0.c + 1, s0.r), at(s0.c, s0.r + 1), at(s0.c - 1, s0.r), at(s0.c, s0.r - 1)].find((i) => i >= 0 && stations[i].kind === 'belt' && !seen.has(i)) ?? -1
    }
  }
  // sambungan lepas: petak jembatan jadi jurang setinggi meja (tak bisa dilewati, tapi tak menghalangi oper barang)
  const shut = { boxes: [...boxes, ...gap.map(([x, z]) => ({ x, z, hx: CELL / 2, hz: CELL / 2, yaw: 0, top: 2 }))] }
  const cellBox = ([x, z]: [number, number]) => ({ x, z, hx: CELL / 2 - 0.05, hz: CELL / 2 - 0.05, yaw: 0, top: 2 })
  const lavaWalls = lava.map((g) => ({ boxes: [...boxes, ...g.map(cellBox)] }))
  const out = { w, h, stations, spawns: spawns.filter(Boolean), boxes, grid, fronts, near, extinguisher, belt, gap, shut, lava, lavaWalls }
  cache.set(id, out)
  return out
}

/** ambang bintang untuk ronde ini */
export function starGoals(id: KitchenId, cooks: number, secs: number): [number, number, number] {
  const f = (0.55 + 0.225 * Math.min(cooks, 5)) * (secs / 180)
  return KITCHENS[id].stars.map((v) => Math.round((v * f) / 5) * 5) as [number, number, number]
}
