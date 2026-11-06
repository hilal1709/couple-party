import type { KitchenId } from './types'

/** bahan dan urutan olahannya; state terakhir = siap ditaruh di piring */
export type Ing = 'roti' | 'daging' | 'selada' | 'tomat' | 'keju' | 'adonan' | 'jamur' | 'nasi' | 'ikan' | 'nori' | 'timun' | 'mie' | 'telur' | 'bawang' | 'tortilla' | 'pancake' | 'stroberi' | 'madu' | 'pisang' | 'beras' | 'udang' | 'ayam' | 'kacang' | 'lontong'
/** cut = talenan, fry = wajan di kompor, boil = panci di kompor, bake = oven */
export type Step = 'cut' | 'fry' | 'boil' | 'bake'
export type FoodState = 'raw' | 'cut' | 'boiled' | 'cooked' | 'baked' | 'burnt'

export const ING: Record<Ing, { title: string; steps: Step[] }> = {
  roti: { title: 'Roti', steps: [] },
  daging: { title: 'Daging', steps: ['fry'] },
  selada: { title: 'Selada', steps: ['cut'] },
  tomat: { title: 'Tomat', steps: ['cut'] },
  keju: { title: 'Keju', steps: ['cut'] },
  // digiling di talenan dulu, lalu dipanggang di oven
  adonan: { title: 'Adonan', steps: ['cut', 'bake'] },
  jamur: { title: 'Jamur', steps: ['cut'] },
  nasi: { title: 'Nasi', steps: ['boil'] },
  ikan: { title: 'Ikan', steps: ['cut'] },
  nori: { title: 'Nori', steps: [] },
  timun: { title: 'Timun', steps: ['cut'] },
  mie: { title: 'Mie', steps: ['boil'] },
  telur: { title: 'Telur', steps: ['fry'] },
  bawang: { title: 'Daun bawang', steps: ['cut'] },
  tortilla: { title: 'Tortilla', steps: ['fry'] },
  pancake: { title: 'Adonan pancake', steps: ['fry'] },
  stroberi: { title: 'Stroberi', steps: ['cut'] },
  madu: { title: 'Madu', steps: [] },
  pisang: { title: 'Pisang', steps: ['cut'] },
  beras: { title: 'Nasi', steps: ['fry'] },
  udang: { title: 'Udang', steps: ['fry'] },
  // ditusuk (potong) dulu, lalu dibakar
  ayam: { title: 'Ayam', steps: ['cut', 'fry'] },
  kacang: { title: 'Saus kacang', steps: [] },
  lontong: { title: 'Lontong', steps: ['cut'] },
}

export const AFTER: Record<Step, FoodState> = { cut: 'cut', fry: 'cooked', boil: 'boiled', bake: 'baked' }

/** alat tiap langkah, untuk ikon di tiket & kartu resep */
export type Tool = 'pisau' | 'wajan' | 'panci' | 'oven'
const TOOL: Record<Step, Tool> = { cut: 'pisau', fry: 'wajan', boil: 'panci', bake: 'oven' }
export const toolOf = (_ing: Ing, step: Step): Tool => TOOL[step]
/** wadah di kompor dan langkah yang dikerjakannya */
export type Pan = 'wajan' | 'panci'
export const PAN_STEP: Record<Pan, Step> = { wajan: 'fry', panci: 'boil' }
export const TOOL_TITLE: Record<Tool, string> = { pisau: 'Potong di talenan', wajan: 'Goreng di kompor', panci: 'Rebus di kompor', oven: 'Panggang di oven' }

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
  /** ambang bintang co-op untuk 2 koki & 180 detik (≈35/65/95% skor bot Susah); diskalakan menurut jumlah koki & durasi */
  stars: [number, number, number]
  gimmick?: Gimmick
  /** sabuk: bahan yang datang lewat sabuk, bukan dari peti */
  belt?: Ing[]
  /** kesabaran pelanggan dikali ini (dapur yang jalannya jauh) */
  patience?: number
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
    stars: [110, 210, 305],
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
    stars: [110, 205, 300],
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
    stars: [140, 260, 380],
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
    stars: [95, 175, 255],
    gimmick: 'gap',
    // dua gerbong & sambungan yang sering lepas: jalan dari peti ke kompor jauh
    patience: 1.5,
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
    stars: [105, 195, 285],
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
    stars: [95, 180, 265],
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
    stars: [120, 225, 325],
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
    stars: [115, 215, 310],
    gimmick: 'lava',
  },
}

export const KITCHEN_IDS = Object.keys(KITCHENS) as KitchenId[]

export const CELL = 1.2
export const COUNTER_TOP = 0.92

export type StationKind = 'counter' | 'board' | 'stove' | 'plates' | 'serve' | 'trash' | 'crate' | 'sink' | 'oven' | 'belt'

/** langkah yang dikerjakan oven langsung; kompor mengikuti wadah di atasnya (lihat heatAt di sim) */
export const HEAT: Partial<Record<StationKind, Step>> = { oven: 'bake' }

/**
 * Wadah awal tiap kompor dapur ini: bergiliran antara alat yang dibutuhkan menu (goreng/rebus),
 * yang paling sering dipakai lebih dulu.
 */
export function pansOf(id: KitchenId): Pan[] {
  const L = layoutOf(id)
  const count = new Map<Pan, number>()
  for (const r of KITCHENS[id].menu) for (const ing of RECIPES[r].ings) for (const st of ING[ing].steps) {
    const p = st === 'fry' ? 'wajan' : st === 'boil' ? 'panci' : null
    if (p) count.set(p, (count.get(p) ?? 0) + 1)
  }
  const order = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!)
  const stoves = L.stations.filter((s) => s.kind === 'stove').length
  return Array.from({ length: stoves }, (_, i) => order[i % Math.max(1, order.length)] ?? 'wajan')
}

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
/** skala ambang menurut jumlah koki (2 koki = 1), dari rata-rata skor bot (scripts/masak-calibrate.mts) */
const COOK_SCALE = [0, 0.5, 1, 1.35, 1.65, 1.85, 2, 2.05, 2.1]

export function starGoals(id: KitchenId, cooks: number, secs: number): [number, number, number] {
  const f = COOK_SCALE[Math.max(1, Math.min(8, cooks))] * (secs / 180)
  return KITCHENS[id].stars.map((v) => Math.round((v * f) / 5) * 5) as [number, number, number]
}
