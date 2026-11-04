import { nextRand } from '../../rng'
import { AFTER, CELL, code, finalCode, HEAT, ING, KITCHENS, layoutOf, nextStep, RECIPES, type FoodState, type Ing, type Layout } from '../kitchens'
import type { KitchenId } from '../types'

/**
 * Isi dapur satu ronde. Murni dan bisa di-JSON: host menjalankannya lalu mengirim salinannya ke HP lain.
 * Waktu dalam ms sejak ronde mulai.
 */
export type Food = { id: number; k: 'food'; ing: Ing; s: FoodState; p: number }
export type Plate = { id: number; k: 'plate'; f: string[] }
/** alat pemadam api */
export type Ext = { id: number; k: 'ext' }
export type Item = Food | Plate | Ext

export type Order = { id: number; r: string; born: number; life: number }

/** kejadian untuk suara & efek; `n` naik terus supaya HP lain tahu mana yang baru */
export type Fx = {
  n: number
  kind: 'served' | 'wrong' | 'missed' | 'cut' | 'cooked' | 'burnt' | 'trash' | 'order' | 'fire' | 'out' | 'washed' | 'dirty' | 'pisang' | 'tepung' | 'iseng' | 'slip' | 'belok' | 'lift' | 'sembur'
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
}

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
const PLATES_EACH = 2

export const isFood = (i: Item | undefined): i is Food => i?.k === 'food'
export const isPlate = (i: Item | undefined): i is Plate => i?.k === 'plate'
export const isExt = (i: Item | undefined): i is Ext => i?.k === 'ext'

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
  }
  if (L.extinguisher >= 0) k.hold[L.extinguisher] = spawn(k, { k: 'ext' })
  return k
}

const menuOf = (k: Kit) => KITCHENS[k.kitchen].menu
export const recipeCodes = (r: string) => RECIPES[r].ings.map(finalCode).sort()

function fx(k: Kit, kind: Fx['kind'], st: number, pts?: number) {
  k.fxN++
  k.fx.push({ n: k.fxN, kind, st, pts })
  if (k.fx.length > 12) k.fx.shift()
}

function spawn(k: Kit, item: Omit<Food, 'id'> | Omit<Plate, 'id'> | Omit<Ext, 'id'>): number {
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
  const heat = HEAT[kind]
  if (heat) return isFood(item) && (nextStep(item.ing, item.s) === heat || item.s === AFTER[heat])
  return false
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
      const pts = RECIPES[o.r].points + Math.ceil(TIP_MAX * left)
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
  // isi meja ikut gosong
  const it = k.items[k.hold[si] ?? -1]
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
  L.stations.forEach((st, si) => {
    const heat = HEAT[st.kind]
    if (!heat || k.fire[si] > 0) return
    const food = k.items[k.hold[si] ?? -1]
    if (!isFood(food)) return
    if (nextStep(food.ing, food.s) === heat) {
      food.p += dt / (heat === 'bake' ? BAKE_MS : COOK_MS)
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
    k.score = Math.max(0, k.score - MISS_POINTS)
    fx(k, 'missed', -1)
  }
  k.orders = k.orders.filter((o) => o.born + o.life > k.t)
  const cap = Math.min(5, 2 + Math.ceil(cooks / 2))
  if (k.t >= k.nextOrder) {
    if (k.orders.length < cap) {
      const [v, r1] = nextRand(k.rng)
      const menu = menuOf(k)
      k.orders.push({ id: k.oid++, r: menu[Math.floor(v * menu.length)], born: k.t, life: ORDER_LIFE })
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
      const food = k.items[k.hold[si] ?? -1]
      if (isFood(food) && food.s === 'cooked') food.p = Math.min(0.95, food.p + 0.55)
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
