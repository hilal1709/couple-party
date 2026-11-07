import { nextRand } from '../../rng'
import { AFTER, CELL, code, COUNTER_TOP, finalCode, HEAT, ING, KITCHENS, layoutOf, nextStep, PAN_STEP, pansOf, RECIPES, type FoodState, type Ing, type Layout, type Pan, type Step } from '../kitchens'
import type { KitchenId } from '../types'

/**
 * Isi dapur satu ronde. Murni dan bisa di-JSON: host menjalankannya lalu mengirim salinannya ke HP lain.
 * Waktu dalam ms sejak ronde mulai.
 */
export type Food = { id: number; k: 'food'; ing: Ing; s: FoodState; p: number }
export type Plate = { id: number; k: 'plate'; f: string[] }
/** alat pemadam api */
export type Ext = { id: number; k: 'ext' }
/** wajan / panci: berisi satu bahan (id Food di `items`), memasak hanya saat di atas kompor */
export type Pot = { id: number; k: 'pot'; pan: Pan; in: number | null }
export type Item = Food | Plate | Ext | Pot

export type Order = { id: number; r: string; born: number; life: number }

/** kejadian untuk suara & efek; `n` naik terus supaya HP lain tahu mana yang baru */
export type Fx = {
  n: number
  kind: 'served' | 'wrong' | 'missed' | 'cut' | 'cooked' | 'burnt' | 'trash' | 'order' | 'fire' | 'out' | 'washed' | 'dirty' | 'pisang' | 'tepung' | 'iseng' | 'slip' | 'belok' | 'lift' | 'sembur' | 'lempar' | 'tangkap' | 'jatuh' | 'mendarat'
  st: number
  pts?: number
}

export type Kit = {
  kitchen: KitchenId
  t: number
  items: Record<number, Item>
  nextId: number
  /** isi tiap stasiun (indeks sama dengan layout.stations) */
  hold: (number | null)[]
  /** sisa piring bersih di stasiun piring */
  stack: number[]
  /** piring kotor menumpuk di wastafel */
  dirty: number[]
  /** kemajuan cuci piring teratas di wastafel 0..1 */
  wash: number[]
  /** api tiap stasiun 0..1; 0 = tidak terbakar */
  fire: number[]
  /** kapan api di stasiun ini merambat lagi */
  spread: number[]
  /** barang di tangan tiap aktor */
  hands: (number | null)[]
  /** stasiun yang sedang dikerjakan tiap aktor (potong, cuci, semprot) */
  chop: (number | null)[]
  orders: Order[]
  nextOrder: number
  oid: number
  score: number
  served: number
  missed: number
  /** piring kotor kembali ke wastafel pada waktu ini */
  returns: number[]
  rng: number
  fx: Fx[]
  fxN: number
  /** nomor urut aksi terakhir tiap aktor yang sudah diproses host (untuk ukur jeda) */
  ack: number[]
  /** mode versus: jatah iseng ke dapur lawan, dan kulit pisang di lantai dapur ini (koordinat dapur) */
  versus: boolean
  jahil: number
  peels: { id: number; x: number; z: number }[]
  /** sampai kapan layar dapur ini tertutup tepung (ms) */
  flour: number
  /** sabuk: kapan barang bergeser lagi & kapan bahan baru datang */
  beltAt: number
  spawnAt: number
  /** truk: kapan belok berikutnya dan ke mana (-1 kiri, 1 kanan) */
  turnAt: number
  turnDir: number
  /** bahan yang sedang dilempar: posisi & kecepatan (koordinat dapur), pelempar, umur (ms) */
  flying: Flying[]
  /** pengali tip: naik tiap menyajikan pesanan paling tua berturut-turut (maks TIP_STREAK_MAX), balik 1 kalau salah urut/kabur */
  streak: number
  /** bahan tergeletak di lantai (jatuh dari lemparan) */
  floor: { id: number; x: number; z: number }[]
}

export type Flying = { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; by: number; age: number }

export const BAKE_MS = 8000
export const BELT_MS = 1400
const BELT_SPAWN_MS = 3800
const BELT_MAX = 5
/** lift loket: naik (bisa disajikan) sekian ms, turun sekian ms */
export const LIFT_UP_MS = 12_000
export const LIFT_CYCLE_MS = 18_000
/** sambungan gerbong lepas sekian ms dalam tiap siklus */
export const GAP_CYCLE_MS = 18_000
export const GAP_OPEN_MS = 6000
/** peringatan belok truk muncul sekian ms sebelumnya */
export const TURN_WARN_MS = 1800

const gimmickOf = (k: Kit) => KITCHENS[k.kitchen].gimmick
export const liftUp = (k: Kit) => gimmickOf(k) !== 'lift' || k.t % LIFT_CYCLE_MS < LIFT_UP_MS
export const gapOpen = (k: Kit) => gimmickOf(k) === 'gap' && k.t % GAP_CYCLE_MS >= GAP_CYCLE_MS - GAP_OPEN_MS
/** Gunung Api: siklus lava 20 dtk — A menyala 8 dtk, jeda 2 dtk, B menyala 8 dtk, jeda 2 dtk */
export const LAVA_CYCLE_MS = 20_000
const LAVA_ON_MS = 8000
/** kelompok lava yang sedang menyala (0 = A, 1 = B), -1 = tidak ada */
export function lavaOn(k: Kit): number {
  if (gimmickOf(k) !== 'lava') return -1
  const ph = k.t % LAVA_CYCLE_MS
  return ph < LAVA_ON_MS ? 0 : ph < LAVA_CYCLE_MS / 2 ? -1 : ph < LAVA_CYCLE_MS / 2 + LAVA_ON_MS ? 1 : -1
}
/** kelompok lava yang akan menyala sebentar lagi (peringatan), -1 = tidak ada */
export function lavaSoon(k: Kit): number {
  if (gimmickOf(k) !== 'lava' || lavaOn(k) >= 0) return -1
  return k.t % LAVA_CYCLE_MS < LAVA_CYCLE_MS / 2 ? 1 : 0
}
/** Kapal Badai: kemiringan dek -1..1 dengan periode 16 dtk */
export const SHIP_PERIOD_MS = 16_000
export const shipTilt = (k: Kit) => (gimmickOf(k) === 'ship' ? Math.sin((k.t / SHIP_PERIOD_MS) * Math.PI * 2) : 0)

/** dinding untuk berjalan saat ini (sambungan gerbong yang lepas & lava yang menyala ikut menghalangi) */
export const wallsOf = (k: Kit) => {
  const L = layoutOf(k.kitchen)
  const lava = lavaOn(k)
  return gapOpen(k) ? L.shut : lava >= 0 ? L.lavaWalls[lava] : L
}
/** truk akan belok sebentar lagi: arah, atau 0 */
export const turnSoon = (k: Kit) => ((gimmickOf(k) === 'truck' || gimmickOf(k) === 'ship') && k.turnAt - k.t < TURN_WARN_MS ? k.turnDir : 0)

/** tiap sekian pesanan tersaji, tim dapat satu jatah iseng */
export const JAHIL_EVERY = 2
export const FLOUR_MS = 5000
const PEELS = 3

export const CHOP_MS = 2200
export const COOK_MS = 7000
/** merebus sedikit lebih lama dari menggoreng */
export const BOIL_MS = 7000
/** lama aman setelah matang sebelum gosong */
export const BURN_MS = 9000
/** gosong yang dibiarkan di kompor menyala jadi api */
export const IGNITE_MS = 3500
export const WASH_MS = 2000
/** api penuh padam setelah disemprot selama ini */
export const DOUSE_MS = 1300
const SPREAD_MS = 7000
const PLATE_BACK_MS = 6000
const ORDER_LIFE = 80_000
const ORDER_GAP = 20_000
const MISS_POINTS = 10
const TIP_MAX = 10
export const TIP_STREAK_MAX = 4
const PLATES_EACH = 2

export const isFood = (i: Item | undefined): i is Food => i?.k === 'food'
export const isPlate = (i: Item | undefined): i is Plate => i?.k === 'plate'
export const isExt = (i: Item | undefined): i is Ext => i?.k === 'ext'
export const isPot = (i: Item | undefined): i is Pot => i?.k === 'pot'

/** isi wadah, atau undefined */
export const potFood = (k: Kit, p: Pot) => (p.in !== null ? (k.items[p.in] as Food | undefined) : undefined)

/** bahan di stasiun: langsung, atau di dalam wadah di atasnya */
export function contentAt(k: Kit, si: number): Food | undefined {
  const it = k.items[k.hold[si] ?? -1]
  if (isFood(it)) return it
  if (isPot(it)) return potFood(k, it)
  return undefined
}

/** langkah panas yang dikerjakan stasiun saat ini: oven memanggang, kompor menurut wadahnya */
export function heatAt(k: Kit, si: number): Step | null {
  const kind = layoutOf(k.kitchen).stations[si]?.kind
  if (!kind) return null
  if (kind === 'stove') {
    const it = k.items[k.hold[si] ?? -1]
    return isPot(it) ? PAN_STEP[it.pan] : null
  }
  return HEAT[kind] ?? null
}

/** bahan ini boleh masuk wadah ini (wadah kosong & langkah berikutnya cocok) */
export const potTakes = (p: Pot, f: Food) => p.in === null && nextStep(f.ing, f.s) === PAN_STEP[p.pan]

export function newKit(kitchen: KitchenId, actors: number, seed: number, versus = false): Kit {
  const L = layoutOf(kitchen)
  const k: Kit = {
    kitchen,
    t: 0,
    items: {},
    nextId: 1,
    hold: L.stations.map(() => null),
    stack: L.stations.map((s) => (s.kind === 'plates' ? PLATES_EACH : 0)),
    dirty: L.stations.map(() => 0),
    wash: L.stations.map(() => 0),
    fire: L.stations.map(() => 0),
    spread: L.stations.map(() => 0),
    hands: Array(actors).fill(null),
    chop: Array(actors).fill(null),
    orders: [],
    nextOrder: 1500,
    oid: 1,
    score: 0,
    served: 0,
    missed: 0,
    returns: [],
    rng: seed || 1,
    fx: [],
    fxN: 0,
    ack: Array(actors).fill(0),
    versus,
    jahil: 0,
    peels: [],
    flour: 0,
    beltAt: BELT_MS,
    spawnAt: 1200,
    // kapal: geser pertama di puncak miring pertama (4 dtk); gunung api: semburan pertama 12 dtk
    turnAt: KITCHENS[kitchen].gimmick === 'ship' ? SHIP_PERIOD_MS / 4 : KITCHENS[kitchen].gimmick === 'lava' ? 12_000 : 14_000,
    turnDir: KITCHENS[kitchen].gimmick === 'ship' ? 1 : (seed || 1) % 2 ? 1 : -1,
    flying: [],
    floor: [],
    streak: 1,
  }
  if (L.extinguisher >= 0) k.hold[L.extinguisher] = spawn(k, { k: 'ext' })
  // tiap kompor mulai dengan wajan atau panci
  const pans = pansOf(kitchen)
  let n = 0
  L.stations.forEach((st, si) => {
    if (st.kind === 'stove') k.hold[si] = spawn(k, { k: 'pot', pan: pans[n++] ?? 'wajan', in: null })
  })
  return k
}

const menuOf = (k: Kit) => KITCHENS[k.kitchen].menu
export const recipeCodes = (r: string) => RECIPES[r].ings.map(finalCode).sort()

function fx(k: Kit, kind: Fx['kind'], st: number, pts?: number) {
  k.fxN++
  k.fx.push({ n: k.fxN, kind, st, pts })
  if (k.fx.length > 12) k.fx.shift()
}

function spawn(k: Kit, item: Omit<Food, 'id'> | Omit<Plate, 'id'> | Omit<Ext, 'id'> | Omit<Pot, 'id'>): number {
  const id = k.nextId++
  k.items[id] = { ...item, id } as Item
  return id
}

/** isi piring + bahan ini masih bagian dari salah satu menu dapur */
export function fitsMenu(k: Kit, plate: string[], add: string): boolean {
  const want = [...plate, add]
  return menuOf(k).some((r) => {
    const left = recipeCodes(r)
    for (const c of want) {
      const i = left.indexOf(c)
      if (i < 0) return false
      left.splice(i, 1)
    }
    return true
  })
}

function addTo(k: Kit, plate: Plate, food: Food): boolean {
  const c = code(food.ing, food.s)
  if (!fitsMenu(k, plate.f, c)) return false
  plate.f = [...plate.f, c]
  delete k.items[food.id]
  return true
}

/** pesanan tertua yang isinya sama persis dengan piring ini */
export function matchOrder(k: Kit, plate: Plate): Order | null {
  const got = [...plate.f].sort().join()
  return k.orders.find((o) => recipeCodes(o.r).join() === got) ?? null
}

/** stasiun mana yang menerima barang ini untuk ditaruh */
function accepts(L: Layout, si: number, item: Item): boolean {
  const kind = L.stations[si].kind
  if (kind === 'counter' || kind === 'belt') return true
  if (kind === 'board') return isFood(item)
  // kompor hanya menerima wadah; bahan dimasukkan ke wadahnya
  if (kind === 'stove') return isPot(item)
  const heat = HEAT[kind]
  if (heat) return isFood(item) && (nextStep(item.ing, item.s) === heat || item.s === AFTER[heat])
  return false
}

/** isi wadah yang sudah jadi (siap dituang ke piring) */
const readyIn = (k: Kit, p: Pot) => {
  const f = potFood(k, p)
  return f && f.s !== 'burnt' && nextStep(f.ing, f.s) === null ? f : undefined
}

const platesNear = (L: Layout, si: number) => {
  let best = -1
  let bd = Infinity
  L.stations.forEach((s, i) => {
    if (s.kind !== 'plates') return
    const d = Math.hypot(s.x - L.stations[si].x, s.z - L.stations[si].z)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}

/**
 * Tombol Ambil/Taruh oleh `actor` di stasiun `si`. Mengembalikan true kalau ada yang berubah.
 * Host saja yang memanggil ini; jarak sudah diperiksa pemanggil.
 */
export function use(k: Kit, actor: number, si: number): boolean {
  const L = layoutOf(k.kitchen)
  const st = L.stations[si]
  if (!st) return false
  const hid = k.hands[actor]
  const hand = hid !== null ? k.items[hid] : undefined
  const onId = k.hold[si]
  const on = onId !== null ? k.items[onId] : undefined
  k.chop[actor] = null
  // stasiun terbakar tidak bisa dipakai sampai padam
  if (k.fire[si] > 0) return false
  switch (st.kind) {
    case 'crate': {
      const ing = st.ing!
      if (!hand) {
        k.hands[actor] = spawn(k, { k: 'food', ing, s: 'raw', p: 0 })
        return true
      }
      if (isFood(hand) && hand.ing === ing && hand.s === 'raw') {
        delete k.items[hand.id]
        k.hands[actor] = null
        return true
      }
      // wajan/panci kosong di tangan: bahan mentah langsung masuk
      if (isPot(hand) && hand.in === null && ING[ing].steps[0] === PAN_STEP[hand.pan]) {
        hand.in = spawn(k, { k: 'food', ing, s: 'raw', p: 0 })
        return true
      }
      // bahan tanpa olahan (roti) langsung ke piring di tangan
      if (isPlate(hand) && ING[ing].steps.length === 0) {
        const c = code(ing, 'raw')
        if (!fitsMenu(k, hand.f, c)) return false
        hand.f = [...hand.f, c]
        return true
      }
      return false
    }
    case 'plates': {
      if (!hand && k.stack[si] > 0) {
        k.stack[si]--
        k.hands[actor] = spawn(k, { k: 'plate', f: [] })
        return true
      }
      if (isPlate(hand) && hand.f.length === 0) {
        delete k.items[hand.id]
        k.hands[actor] = null
        k.stack[si]++
        return true
      }
      return false
    }
    case 'sink':
      return false
    case 'trash': {
      if (isFood(hand)) {
        delete k.items[hand.id]
        k.hands[actor] = null
        fx(k, 'trash', si)
        return true
      }
      if (isPlate(hand) && hand.f.length) {
        hand.f = []
        fx(k, 'trash', si)
        return true
      }
      if (isPot(hand) && hand.in !== null) {
        delete k.items[hand.in]
        hand.in = null
        fx(k, 'trash', si)
        return true
      }
      return false
    }
    case 'serve': {
      if (!isPlate(hand) || !hand.f.length || !liftUp(k)) return false
      const o = matchOrder(k, hand)
      if (!o) {
        fx(k, 'wrong', si)
        return true
      }
      const left = Math.max(0, o.born + o.life - k.t) / o.life
      // tip beruntun: pesanan paling tua (paling kiri) disajikan lebih dulu menaikkan pengali
      const oldest = k.orders.reduce((a, b) => (b.born < a.born ? b : a))
      const mult = o.id === oldest.id ? k.streak : 1
      k.streak = o.id === oldest.id ? Math.min(TIP_STREAK_MAX, k.streak + 1) : 1
      const pts = RECIPES[o.r].points + Math.ceil(TIP_MAX * left) * mult
      k.score += pts
      k.served++
      k.orders = k.orders.filter((x) => x.id !== o.id)
      delete k.items[hand.id]
      k.hands[actor] = null
      k.returns.push(k.t + PLATE_BACK_MS)
      fx(k, 'served', si, pts)
      if (k.versus && k.served % JAHIL_EVERY === 0) k.jahil++
      return true
    }
    default: {
      // permukaan: meja, talenan, kompor
      if (!hand && on) {
        k.hands[actor] = on.id
        k.hold[si] = null
        return true
      }
      if (hand && !on) {
        if (!accepts(L, si, hand)) return false
        k.hold[si] = hand.id
        k.hands[actor] = null
        return true
      }
      if (isPlate(hand) && isFood(on) && addTo(k, hand, on)) {
        k.hold[si] = null
        return true
      }
      if (isFood(hand) && isPlate(on) && addTo(k, on, hand)) {
        k.hands[actor] = null
        return true
      }
      // bahan ke wadah di stasiun, atau wadah di tangan menyendok bahan di meja
      if (isFood(hand) && isPot(on) && potTakes(on, hand)) {
        hand.p = 0
        on.in = hand.id
        k.hands[actor] = null
        return true
      }
      if (isPot(hand) && isFood(on) && potTakes(hand, on)) {
        on.p = 0
        hand.in = on.id
        k.hold[si] = null
        return true
      }
      // pindahkan isi antarwadah (beras rebus dari panci ke wajan, dan sebaliknya)
      if (isPot(hand) && isPot(on)) {
        const f = potFood(k, hand)
        if (f && potTakes(on, f)) {
          f.p = 0
          on.in = f.id
          hand.in = null
          return true
        }
        const g = potFood(k, on)
        if (g && potTakes(hand, g)) {
          g.p = 0
          hand.in = g.id
          on.in = null
          return true
        }
      }
      // tuang isi wadah yang sudah jadi ke piring (wadah di tangan ke piring di meja, atau sebaliknya)
      if (isPot(hand) && isPlate(on)) {
        const f = readyIn(k, hand)
        if (f && addTo(k, on, f)) {
          hand.in = null
          return true
        }
      }
      if (isPlate(hand) && isPot(on)) {
        const f = readyIn(k, on)
        if (f && addTo(k, hand, f)) {
          on.in = null
          return true
        }
      }
      return false
    }
  }
}

/** stasiun yang bisa dikerjakan dengan tombol tahan: potong, cuci, atau semprot */
export function canWork(k: Kit, actor: number, si: number): boolean {
  const L = layoutOf(k.kitchen)
  const st = L.stations[si]
  if (!st) return false
  const hand = k.items[k.hands[actor] ?? -1]
  if (isExt(hand)) return k.fire[si] > 0 || L.near[si].some((n) => k.fire[n] > 0)
  if (hand || k.fire[si] > 0) return false
  if (st.kind === 'sink') return k.dirty[si] > 0
  const food = k.items[k.hold[si] ?? -1]
  return st.kind === 'board' && isFood(food) && nextStep(food.ing, food.s) === 'cut'
}

/** mulai/berhenti bekerja di stasiun (tombol tahan) */
export function chop(k: Kit, actor: number, si: number, on: boolean): boolean {
  if (!on) {
    if (k.chop[actor] === null) return false
    k.chop[actor] = null
    return true
  }
  if (!canWork(k, actor, si)) return false
  k.chop[actor] = si
  return true
}

function ignite(k: Kit, si: number) {
  if (k.fire[si] > 0) return
  k.fire[si] = 1
  k.spread[si] = k.t + SPREAD_MS
  // isi meja (atau isi wadahnya) ikut gosong
  const held = k.items[k.hold[si] ?? -1]
  const it = isPot(held) ? potFood(k, held) : held
  if (isFood(it)) {
    it.s = 'burnt'
    it.p = 0
  } else if (isPlate(it) && it.f.length) {
    it.f = []
  }
  fx(k, 'fire', si)
}

/** jalankan waktu. `host` = boleh mengubah keadaan; HP lain hanya memajukan progres untuk tampilan */
export function advance(k: Kit, dt: number, host: boolean, cooks: number) {
  const L = layoutOf(k.kitchen)
  k.t += dt
  flyAdvance(k, dt)
  // kerja tahan: potong, cuci, semprot
  k.chop.forEach((si, a) => {
    if (si === null) return
    const st = L.stations[si]
    const hand = k.items[k.hands[a] ?? -1]
    if (isExt(hand)) {
      let any = false
      for (const t of [si, ...L.near[si]]) {
        if (k.fire[t] <= 0) continue
        any = true
        k.fire[t] = Math.max(0, k.fire[t] - dt / DOUSE_MS)
        if (k.fire[t] === 0 && host) fx(k, 'out', t)
      }
      if (!any && host) k.chop[a] = null
      return
    }
    if (st.kind === 'sink') {
      if (k.dirty[si] <= 0) {
        if (host) k.chop[a] = null
        return
      }
      k.wash[si] += dt / WASH_MS
      if (k.wash[si] >= 1 && host) {
        k.wash[si] = 0
        k.dirty[si]--
        const p = platesNear(L, si)
        if (p >= 0) k.stack[p]++
        fx(k, 'washed', si)
        if (k.dirty[si] <= 0) k.chop[a] = null
      }
      return
    }
    const food = k.items[k.hold[si] ?? -1]
    if (!isFood(food) || nextStep(food.ing, food.s) !== 'cut' || k.fire[si] > 0) {
      if (host) k.chop[a] = null
      return
    }
    food.p += dt / CHOP_MS
    if (food.p >= 1 && host) {
      food.s = 'cut'
      food.p = 0
      k.chop[a] = null
      fx(k, 'cut', si)
    }
  })
  // kompor & oven
  L.stations.forEach((_, si) => {
    const heat = heatAt(k, si)
    if (!heat || k.fire[si] > 0) return
    const food = contentAt(k, si)
    if (!food) return
    if (nextStep(food.ing, food.s) === heat) {
      food.p += dt / (heat === 'bake' ? BAKE_MS : heat === 'boil' ? BOIL_MS : COOK_MS)
      if (food.p >= 1 && host) {
        food.s = AFTER[heat]
        food.p = 0
        fx(k, 'cooked', si)
      }
    } else if (food.s === AFTER[heat]) {
      food.p += dt / BURN_MS
      if (food.p >= 1 && host) {
        food.s = 'burnt'
        food.p = 0
        fx(k, 'burnt', si)
      }
    } else if (food.s === 'burnt') {
      food.p += dt / IGNITE_MS
      if (food.p >= 1 && host) ignite(k, si)
    }
  })
  if (!host) return
  gimmicks(k, L)
  // api merambat ke meja sebelah (peti, loket & wastafel tidak terbakar)
  L.stations.forEach((_, si) => {
    if (k.fire[si] <= 0 || k.t < k.spread[si]) return
    k.spread[si] = k.t + SPREAD_MS
    const [v, r] = nextRand(k.rng)
    k.rng = r
    const opts = L.near[si].filter((n) => k.fire[n] <= 0 && ['counter', 'board', 'stove', 'plates'].includes(L.stations[n].kind))
    if (opts.length) ignite(k, opts[Math.floor(v * opts.length)])
  })
  // piring kotor kembali ke wastafel
  const sink = L.stations.findIndex((s) => s.kind === 'sink')
  while (k.returns.length && k.returns[0] <= k.t) {
    k.returns.shift()
    if (sink >= 0) {
      k.dirty[sink]++
      fx(k, 'dirty', sink)
    } else {
      const p = L.stations.findIndex((s) => s.kind === 'plates')
      if (p >= 0) k.stack[p]++
    }
  }
  // pesanan
  for (const o of k.orders) {
    if (o.born + o.life > k.t) continue
    k.missed++
    k.streak = 1
    k.score = Math.max(0, k.score - MISS_POINTS)
    fx(k, 'missed', -1)
  }
  k.orders = k.orders.filter((o) => o.born + o.life > k.t)
  const cap = Math.min(5, 2 + Math.ceil(cooks / 2))
  if (k.t >= k.nextOrder) {
    if (k.orders.length < cap) {
      const [v, r1] = nextRand(k.rng)
      const menu = menuOf(k)
      k.orders.push({ id: k.oid++, r: menu[Math.floor(v * menu.length)], born: k.t, life: ORDER_LIFE * (KITCHENS[k.kitchen].patience ?? 1) })
      k.rng = r1
      fx(k, 'order', -1)
    }
    const [j, r2] = nextRand(k.rng)
    k.rng = r2
    k.nextOrder = k.t + (ORDER_GAP / (0.6 + 0.3 * Math.min(cooks, 8))) * (0.8 + j * 0.4)
    // pesanan pertama datang beruntun supaya dapur langsung sibuk
    if (k.oid <= 2) k.nextOrder = k.t + 4000
  }
}

/** barang di meja biasa tergeser satu petak ke arah `dir` kalau petak sebelahnya meja kosong */
function shiftCounters(k: Kit, L: Layout, dir: number) {
  const order = L.stations.map((_, si) => si).filter((si) => L.stations[si].kind === 'counter' && k.hold[si] !== null)
  order.sort((a, b) => (L.stations[b].c - L.stations[a].c) * dir)
  for (const si of order) {
    const st = L.stations[si]
    if (st.c + dir < 0 || st.c + dir >= L.w) continue
    const to = L.grid[st.r * L.w + st.c + dir]
    if (to < 0 || L.stations[to].kind !== 'counter' || k.hold[to] !== null || k.fire[to] > 0) continue
    k.hold[to] = k.hold[si]
    k.hold[si] = null
  }
}

/** host: sabuk berjalan, belokan truk, kapal miring, semburan kompor */
function gimmicks(k: Kit, L: Layout) {
  const g = gimmickOf(k)
  if (g === 'belt' && L.belt.length) {
    if (k.t >= k.beltAt) {
      k.beltAt += BELT_MS
      // geser dari ujung belakang supaya barang tidak melompati yang di depannya
      const n = L.belt.length
      const moved = new Set<number>()
      for (let j = n - 1; j >= 0; j--) {
        const from = L.belt[j]
        const to = L.belt[(j + 1) % n]
        const id = k.hold[from]
        if (id === null || moved.has(id) || k.hold[to] !== null || k.fire[to] > 0) continue
        k.hold[to] = id
        k.hold[from] = null
        moved.add(id)
      }
    }
    if (k.t >= k.spawnAt) {
      k.spawnAt = k.t + BELT_SPAWN_MS
      const head = L.belt[0]
      const onBelt = L.belt.filter((si) => isFood(k.items[k.hold[si] ?? -1])).length
      const list = KITCHENS[k.kitchen].belt ?? []
      if (k.hold[head] === null && onBelt < BELT_MAX && list.length) {
        const [v, r] = nextRand(k.rng)
        k.rng = r
        k.hold[head] = spawn(k, { k: 'food', ing: list[Math.floor(v * list.length)], s: 'raw', p: 0 })
      }
    }
  }
  if (g === 'ship' && k.t >= k.turnAt) {
    // puncak miring: barang meluncur ke sisi rendah, puncak berikutnya ke sisi sebaliknya
    shiftCounters(k, L, k.turnDir)
    fx(k, 'belok', -1, k.turnDir)
    k.turnAt += SHIP_PERIOD_MS / 2
    k.turnDir = -k.turnDir
  }
  if (g === 'lava' && k.t >= k.turnAt) {
    // kompor menyembur: masakan yang sudah matang langsung mendekati gosong
    const stoves = L.stations.flatMap((s0, si) => (s0.kind === 'stove' && k.fire[si] <= 0 ? [si] : []))
    const [v, r] = nextRand(k.rng)
    const [w, r2] = nextRand(r)
    k.rng = r2
    const si = stoves[Math.floor(v * stoves.length)]
    if (si !== undefined) {
      const food = contentAt(k, si)
      if (food && (food.s === 'cooked' || food.s === 'boiled')) food.p = Math.min(0.95, food.p + 0.55)
      fx(k, 'sembur', si)
    }
    k.turnAt = k.t + 14_000 + w * 8000
  }
  if (g === 'truck' && k.t >= k.turnAt) {
    const dir = k.turnDir
    shiftCounters(k, L, dir)
    fx(k, 'belok', -1, dir)
    const [v, r] = nextRand(k.rng)
    const [w, r2] = nextRand(r)
    k.rng = r2
    k.turnAt = k.t + 13_000 + v * 6000
    k.turnDir = w < 0.5 ? -1 : 1
  }
}

/**
 * Tim pemilik `from` memakai satu jatah iseng ke dapur `to`: kulit pisang bertebaran, atau bom tepung
 * menutupi layar lawan. Mengembalikan jenis iseng, null kalau jatah habis.
 */
export function prank(from: Kit, to: Kit): 'pisang' | 'tepung' | null {
  if (from.jahil <= 0) return null
  from.jahil--
  const [v, r] = nextRand(to.rng)
  to.rng = r
  const kind = v < 0.5 ? 'pisang' : 'tepung'
  fx(from, 'iseng', -1)
  if (kind === 'tepung') {
    to.flour = to.t + FLOUR_MS
    fx(to, 'tepung', -1)
    return kind
  }
  const L = layoutOf(to.kitchen)
  const floor: [number, number][] = []
  for (let r2 = 0; r2 < L.h; r2++) {
    for (let c = 0; c < L.w; c++) {
      if (L.grid[r2 * L.w + c] >= 0) continue
      floor.push([(c - (L.w - 1) / 2) * CELL, (r2 - (L.h - 1) / 2) * CELL])
    }
  }
  for (let i = 0; i < PEELS && floor.length; i++) {
    const [u, r3] = nextRand(to.rng)
    to.rng = r3
    const [x, z] = floor.splice(Math.floor(u * floor.length), 1)[0]
    to.peels.push({ id: to.nextId++, x, z })
  }
  fx(to, 'pisang', -1)
  return kind
}

/** koki menginjak kulit pisang: kulitnya hilang */
export function slip(k: Kit, peel: number): boolean {
  const n = k.peels.length
  k.peels = k.peels.filter((p) => p.id !== peel)
  if (k.peels.length === n) return false
  fx(k, 'slip', -1)
  return true
}

/** salinan dalam supaya mutasi host tidak menyentuh yang sudah dikirim */
export const cloneKit = (k: Kit): Kit => structuredClone(k)

// ---------- lempar & tangkap ----------
const GRAVITY = 9.8
/** tinggi tangan saat melempar & menangkap */
export const HAND_Y = 1.0
const THROW_SPEED = 7
const THROW_UP = 3
/** jarak tangkap dari badan koki, dan sudut hadap minimal (cos) */
const CATCH_R = 0.7
const CATCH_DOT = 0.2
/** pelempar tidak bisa menangkap lemparannya sendiri sesaat */
const OWN_MS = 350
/** jarak pungut barang di lantai */
export const PICK_R = 0.95

/** posisi & hadap koki untuk perhitungan tangkap */
export type CookPose = { x: number; z: number; yaw: number }

/** waktu terbang sampai ketinggian `ty` dengan kecepatan naik THROW_UP */
const flightTime = (ty: number) => (THROW_UP + Math.sqrt(THROW_UP * THROW_UP + 2 * GRAVITY * (HAND_Y - ty))) / GRAVITY

/**
 * Lempar bahan di tangan `actor` ke arah hadapnya. `aim` = titik sasaran (bidik bantu: rekan bertangan kosong atau
 * stasiun penerima) supaya jatuhnya pas; tanpa sasaran lurus ke depan. Hanya bahan (bukan piring/wadah/pemadam).
 */
export function throwItem(k: Kit, actor: number, from: CookPose, aim: { x: number; z: number; y: number } | null): boolean {
  const it = k.items[k.hands[actor] ?? -1]
  if (!isFood(it)) return false
  let dx = Math.sin(from.yaw)
  let dz = Math.cos(from.yaw)
  let speed = THROW_SPEED
  const x0 = from.x + dx * 0.4
  const z0 = from.z + dz * 0.4
  if (aim) {
    const ax = aim.x - x0
    const az = aim.z - z0
    const d = Math.hypot(ax, az)
    if (d > 0.2) {
      dx = ax / d
      dz = az / d
      speed = Math.min(11, d / flightTime(aim.y))
    }
  }
  k.hands[actor] = null
  k.chop[actor] = null
  k.flying.push({ id: it.id, x: x0, y: HAND_Y, z: z0, vx: dx * speed, vy: THROW_UP, vz: dz * speed, by: actor, age: 0 })
  fx(k, 'lempar', -1, actor)
  return true
}

/** gerak terbang (semua HP, untuk tampilan); host lalu memutuskan tangkap/mendarat lewat resolveFlying */
export function flyAdvance(k: Kit, dt: number) {
  const s = dt / 1000
  for (const f of k.flying) {
    f.age += dt
    f.x += f.vx * s
    f.z += f.vz * s
    f.y += f.vy * s
    f.vy -= GRAVITY * s
  }
}

/** petak lantai terdekat yang bisa diinjak (tempat barang jatuh) */
function floorCell(L: Layout, x: number, z: number): [number, number] {
  const c0 = Math.round(x / CELL + (L.w - 1) / 2)
  const r0 = Math.round(z / CELL + (L.h - 1) / 2)
  let best: [number, number] = [x, z]
  let bd = Infinity
  for (let r = Math.max(0, r0 - 2); r <= Math.min(L.h - 1, r0 + 2); r++) {
    for (let c = Math.max(0, c0 - 2); c <= Math.min(L.w - 1, c0 + 2); c++) {
      if (L.grid[r * L.w + c] >= 0) continue
      const cx = (c - (L.w - 1) / 2) * CELL
      const cz = (r - (L.h - 1) / 2) * CELL
      const d = Math.hypot(cx - x, cz - z)
      if (d < bd) {
        bd = d
        best = [cx, cz]
      }
    }
  }
  // di dalam petak, sedikit acak supaya barang jatuh tidak bertumpuk di tengah
  const [cx, cz] = best
  return [cx + Math.max(-0.4, Math.min(0.4, x - cx)), cz + Math.max(-0.4, Math.min(0.4, z - cz))]
}

/** stasiun di bawah titik ini, -1 = lantai/luar */
function stationUnder(L: Layout, x: number, z: number) {
  const c = Math.round(x / CELL + (L.w - 1) / 2)
  const r = Math.round(z / CELL + (L.h - 1) / 2)
  if (c < 0 || r < 0 || c >= L.w || r >= L.h) return -2
  return L.grid[r * L.w + c]
}

/** bahan mendarat di stasiun: wadah yang cocok, piring yang mau, talenan/meja kosong. false = memantul */
function landOn(k: Kit, si: number, f: Food): boolean {
  const L = layoutOf(k.kitchen)
  const st = L.stations[si]
  if (k.fire[si] > 0) return false
  const onId = k.hold[si]
  const on = onId !== null ? k.items[onId] : undefined
  if (isPot(on) && potTakes(on, f)) {
    f.p = 0
    on.in = f.id
    return true
  }
  if (isPlate(on)) return addTo(k, on, f)
  if (!on && (st.kind === 'counter' || st.kind === 'board' || st.kind === 'belt')) {
    k.hold[si] = f.id
    return true
  }
  // tong sampah menelan lemparan
  if (st.kind === 'trash') {
    delete k.items[f.id]
    fx(k, 'trash', si)
    return true
  }
  return false
}

/**
 * Host: lemparan ditangkap koki bertangan kosong yang menghadapnya, mendarat di stasiun, atau jatuh ke lantai.
 * Mengembalikan true kalau ada yang berubah.
 */
export function resolveFlying(k: Kit, cooks: (CookPose | null)[]): boolean {
  if (!k.flying.length) return false
  const L = layoutOf(k.kitchen)
  let changed = false
  k.flying = k.flying.filter((f) => {
    const food = k.items[f.id]
    if (!isFood(food)) return false
    // tangkap
    for (let a = 0; a < cooks.length; a++) {
      const c = cooks[a]
      if (!c || k.hands[a] !== null || (a === f.by && f.age < OWN_MS) || f.y < 0.4 || f.y > 1.9) continue
      const dx = f.x - c.x
      const dz = f.z - c.z
      const d = Math.hypot(dx, dz)
      if (d > CATCH_R) continue
      if (d > 0.15 && (dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / d < CATCH_DOT) continue
      k.hands[a] = f.id
      k.chop[a] = null
      fx(k, 'tangkap', -1, a)
      changed = true
      return false
    }
    // stasiun: puncak meja tersentuh dari atas
    const si = stationUnder(L, f.x, f.z)
    if (si >= 0 && f.y <= COUNTER_TOP + 0.12) {
      changed = true
      if (landOn(k, si, food)) {
        fx(k, 'mendarat', si)
        return false
      }
      // memantul dari stasiun yang tidak menerima: jatuh di lantai depannya
      const [x, z] = floorCell(L, f.x - f.vx * 0.08, f.z - f.vz * 0.08)
      k.floor.push({ id: f.id, x, z })
      fx(k, 'jatuh', -1)
      return false
    }
    // keluar dapur atau menyentuh lantai
    if (si === -2 || f.y <= 0.05) {
      const [x, z] = floorCell(L, f.x, f.z)
      k.floor.push({ id: f.id, x, z })
      fx(k, 'jatuh', -1)
      changed = true
      return false
    }
    return true
  })
  return changed
}

/** pungut barang di lantai (tangan kosong, cukup dekat) */
export function pickFloor(k: Kit, actor: number, id: number, at: CookPose): boolean {
  if (k.hands[actor] !== null) return false
  const i = k.floor.findIndex((f) => f.id === id)
  if (i < 0) return false
  const f = k.floor[i]
  if (Math.hypot(f.x - at.x, f.z - at.z) > PICK_R + 0.5) return false
  k.floor.splice(i, 1)
  k.hands[actor] = id
  return true
}
