import type { BotLevel } from '../../types'
import { buildNav, findPath } from '../../petak/sim/nav'
import { step as walk, type Walker } from '../../petak/sim/walk'
import { AFTER, code, finalCode, KITCHENS, layoutOf, nextStep, PAN_STEP, type Ing, type Step } from '../kitchens'
import { chop, contentAt, pickFloor, fitsMenu, gapOpen, heatAt, isExt, isPot, potFood, shipTilt, wallsOf, isFood, isPlate, matchOrder, recipeCodes, use, type Item, type Kit, type Plate } from './kitchen'

export const COOK_SPEED = 3.6
/** lantai es: seberapa cepat kecepatan mengikuti stik (makin kecil makin licin) */
const ICE_GRIP = 2.2
/** lantai biasa: kecepatan menyusul stik cepat (bukan seketika) supaya mulai & berhenti terasa berbobot */
export const GRIP = 16
/** kapal: kecepatan hanyut menurut kemiringan dek */
const SHIP_DRIFT = 1.1

export type Vel = { x: number; z: number }

/**
 * Satu langkah koki dengan aturan lantai dapur: es meluncur (kecepatan menyusul stik pelan-pelan),
 * dek kapal menghanyutkan ke sisi rendah, dinding mengikuti jembatan/lava saat ini.
 */
/** `grip` = seberapa cepat kecepatan menyusul stik di lantai biasa (Infinity = seketika, dipakai bot) */
export function moveCook(k: Kit, w: Walker, v: Vel, mx: number, mz: number, speed: number, dt: number, grip = Infinity) {
  const g = KITCHENS[k.kitchen].gimmick
  const walls = wallsOf(k)
  const want = Math.hypot(mx, mz) > 0.05
  if (g === 'ice') {
    const a = Math.min(1, dt * ICE_GRIP)
    v.x += (mx * speed - v.x) * a
    v.z += (mz * speed - v.z) * a
  } else {
    const a = Math.min(1, dt * grip)
    v.x += (mx * speed - v.x) * a
    v.z += (mz * speed - v.z) * a
  }
  const tx = v.x + shipTilt(k) * SHIP_DRIFT
  const tz = v.z
  const len = Math.hypot(tx, tz)
  if (len < 0.05) return walk(w, 0, 0, 0, dt, walls)
  const yaw = w.yaw
  const bx = w.x
  const bz = w.z
  walk(w, tx / len, tz / len, len, dt, walls)
  // hanyut tanpa stik: badan tetap menghadap arah semula
  if (!want) {
    w.yaw = yaw
    w.moving = false
  }
  // menabrak dinding di es: luncuran ikut berhenti
  if (g === 'ice' && Math.hypot(w.x - bx, w.z - bz) < len * dt * 0.5) {
    v.x *= 0.4
    v.z *= 0.4
  }
}

const needsCut = (it: Item | undefined) => isFood(it) && nextStep(it.ing, it.s) === 'cut'

/** si = stasiun tujuan; op 'pick' = pungut barang di lantai `floor` (si = -1) */
export type Plan = { si: number; op: 'use' | 'chop' | 'pick'; ing?: Ing; job?: 'fire' | 'wash'; floor?: { id: number; x: number; z: number } }

/** jeda berpikir antar langkah, detik */
const THINK: Record<BotLevel, number> = { 1: 0.9, 2: 0.45, 3: 0.15 }
const PACE: Record<BotLevel, number> = { 1: 0.72, 2: 0.86, 3: 1 }

type Need = { plates: { si: number; plate: Plate; missing: string[] }[]; deficit: Ing[]; platesShort: number }

/** apa yang masih kurang di dapur: piring rakitan per pesanan dan bahan yang belum disiapkan */
function needs(k: Kit, claims: Plan[]): Need {
  const L = layoutOf(k.kitchen)
  const orders = [...k.orders].sort((a, b) => a.born - b.born)
  const plates: Need['plates'] = []
  const used = new Set<number>()
  const spots: { si: number; plate: Plate }[] = []
  k.hold.forEach((id, si) => {
    const it = k.items[id ?? -1]
    if (isPlate(it)) spots.push({ si, plate: it })
  })
  k.hands.forEach((id) => {
    const it = k.items[id ?? -1]
    if (isPlate(it)) spots.push({ si: -1, plate: it })
  })
  let unassigned = 0
  const missingAll: string[] = []
  for (const o of orders) {
    const want = recipeCodes(o.r)
    const p = spots.find((s) => !used.has(s.plate.id) && s.plate.f.every((c) => want.includes(c)))
    if (!p) {
      unassigned++
      missingAll.push(...want)
      continue
    }
    used.add(p.plate.id)
    const left = [...want]
    for (const c of p.plate.f) left.splice(left.indexOf(c), 1)
    plates.push({ ...p, missing: left })
    missingAll.push(...left)
  }
  // bahan yang sudah beredar (di tangan, di meja, di kompor) atau sedang diambil bot lain
  const have = new Map<Ing, number>()
  const bump = (i: Ing) => have.set(i, (have.get(i) ?? 0) + 1)
  // bahan yang masih berputar di sabuk belum dimiliki siapa-siapa
  const riding = new Set(L.belt.map((si) => k.hold[si]))
  for (const it of Object.values(k.items)) if (isFood(it) && it.s !== 'burnt' && !riding.has(it.id)) bump(it.ing)
  for (const c of claims) if (c.ing) bump(c.ing)
  const deficit: Ing[] = []
  for (const c of missingAll) {
    const ing = c.split(':')[0] as Ing
    const n = have.get(ing) ?? 0
    if (n > 0) have.set(ing, n - 1)
    else deficit.push(ing)
  }
  const freePlates = spots.filter((s) => !used.has(s.plate.id)).length
  return { plates, deficit, platesShort: Math.max(0, unassigned - freePlates) }
}

const dist = (k: Kit, si: number, x: number, z: number) => {
  const s = layoutOf(k.kitchen).stations[si]
  return Math.hypot(s.x - x, s.z - z)
}

function nearest(k: Kit, list: number[], x: number, z: number): number | null {
  let best: number | null = null
  let bd = Infinity
  for (const si of list) {
    const d = dist(k, si, x, z)
    if (d < bd) {
      bd = d
      best = si
    }
  }
  return best
}

/** Langkah berikutnya untuk satu bot, dihitung ulang dari isi dapur setiap kali. */
export function planStep(k: Kit, actor: number, x: number, z: number, claims: Plan[]): Plan | null {
  const L = layoutOf(k.kitchen)
  const taken = new Set(claims.map((c) => c.si))
  const free = (kind: string) => L.stations.flatMap((s, si) => (s.kind === kind && k.hold[si] === null && !taken.has(si) && k.fire[si] <= 0 && L.fronts[si].length ? [si] : []))
  const burning = k.fire.some((f) => f > 0)
  // titik semprot: stasiun yang bisa didatangi dan menyala atau bersebelahan dengan api
  const sprayAt = () => L.stations.flatMap((_, si) => (L.fronts[si].length && (k.fire[si] > 0 || L.near[si].some((n) => k.fire[n] > 0)) ? [si] : []))
  const all = (kind: string) => L.stations.flatMap((s, si) => (s.kind === kind ? [si] : []))
  const go = (list: number[], op: Plan['op'] = 'use', ing?: Ing, job?: Plan['job']): Plan | null => {
    const si = nearest(k, list, x, z)
    return si === null ? null : { si, op, ing, job }
  }
  // kompor berwadah kosong yang cocok untuk langkah ini (goreng/rebus)
  const panFor = (step: Step) =>
    L.stations.flatMap((s, si) => {
      const it = k.items[k.hold[si] ?? -1]
      return s.kind === 'stove' && isPot(it) && it.in === null && PAN_STEP[it.pan] === step && !taken.has(si) && k.fire[si] <= 0 && L.fronts[si].length ? [si] : []
    })
  const heatFree = (step: Step) => (step === 'bake' ? free('oven') : panFor(step))
  const need = needs(k, claims)
  const wantsOn = (c: string) => need.plates.filter((p) => p.si >= 0 && p.missing.includes(c) && !taken.has(p.si)).map((p) => p.si)
  const hand = k.items[k.hands[actor] ?? -1]

  if (isExt(hand)) {
    if (burning) return go(sprayAt(), 'chop', undefined, 'fire')
    const home = L.extinguisher
    return home >= 0 && k.hold[home] === null && k.fire[home] <= 0 ? { si: home, op: 'use' } : go(free('counter'))
  }
  if (isFood(hand)) {
    if (hand.s === 'burnt') return go(all('trash'))
    const nxt = nextStep(hand.ing, hand.s)
    if (nxt === 'cut') return go(free('board')) ?? go(free('counter'))
    if (nxt) return go(heatFree(nxt)) ?? go(free('counter'))
    return go(wantsOn(code(hand.ing, hand.s))) ?? go(free('counter'))
  }
  if (isPot(hand)) {
    const f = potFood(k, hand)
    if (f?.s === 'burnt') return go(all('trash'))
    // isi jadi: tuang ke piring yang menunggunya
    if (f && nextStep(f.ing, f.s) === null) {
      const to = go(wantsOn(code(f.ing, f.s)))
      if (to) return to
      // tak ada piring yang butuh, padahal ada kompor tanpa wadah: buang isinya supaya wadah bisa dipakai lagi
      if (free('stove').length) return go(all('trash'))
      return go(free('counter'))
    }
    // isi setengah jadi untuk wadah lain (beras rebus → wajan): tuang ke wadah kosong yang cocok
    const nx = f ? nextStep(f.ing, f.s) : null
    if (f && nx && nx !== PAN_STEP[hand.pan] && nx !== 'cut') {
      const to = go(heatFree(nx))
      if (to) return to
    }
    // kosong atau isi mentah: kembalikan ke kompor kosong supaya kompor tidak menganggur
    return go(free('stove')) ?? go(free('counter'))
  }
  if (isPlate(hand)) {
    // lift turun: tunggu di depan loket sambil memegang piring
    if (matchOrder(k, hand)) return go(all('serve'))
    if (hand.f.length && !k.orders.some((o) => hand.f.every((c) => recipeCodes(o.r).includes(c)))) return go(all('trash'))
    // ambil bahan jadi yang cocok langsung dengan piring di tangan
    const ready = L.stations.flatMap((_, si) => {
      const it = contentAt(k, si)
      return it && !taken.has(si) && it.s !== 'burnt' && nextStep(it.ing, it.s) === null && fitsMenu(k, hand.f, code(it.ing, it.s)) ? [si] : []
    })
    if (ready.length) return go(ready)
    // taruh di meja dekat loket
    const serve = all('serve')[0]
    const spot = nearest(k, free('counter'), serve !== undefined ? L.stations[serve].x : x, serve !== undefined ? L.stations[serve].z : z)
    return spot === null ? null : { si: spot, op: 'use' }
  }

  // tangan kosong
  const pick = (pred: (si: number) => boolean) => L.stations.flatMap((_, si) => (!taken.has(si) && k.hold[si] !== null && k.fire[si] <= 0 && pred(si) ? [si] : []))
  const itemAt = (si: number) => k.items[k.hold[si]!]
  // 0. kebakaran: satu bot mengambil alat pemadam
  if (burning && !claims.some((c) => c.job === 'fire') && !Object.values(k.items).some((it) => isExt(it) && k.hands.includes(it.id))) {
    const ext = pick((si) => isExt(itemAt(si)))
    if (ext.length) return go(ext, 'use', undefined, 'fire')
  }
  // 0b. bahan jatuh di lantai (lemparan meleset): pungut yang terdekat, yang belum diincar bot lain
  const fl = k.floor.filter((f) => isFood(k.items[f.id]) && !claims.some((c) => c.floor?.id === f.id))
  if (fl.length) {
    const f = fl.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b))
    return { si: -1, op: 'pick', floor: { id: f.id, x: f.x, z: f.z } }
  }
  // 1. piring lengkap → sajikan
  const done = pick((si) => isPlate(itemAt(si)) && !!matchOrder(k, itemAt(si) as Plate))
  if (done.length) return go(done)
  // 1b. hampir gosong (paling mendesak setelah menyajikan) di kompor/oven → angkat (wadahnya ikut)
  const rescue = pick((si) => {
    const it = contentAt(k, si)
    const heat = heatAt(k, si)
    return !!heat && !!it && it.s === AFTER[heat] && it.p > 0.35
  })
  if (rescue.length) return go(rescue)
  // 2. potongan menunggu dipotong
  const choppers = new Set(k.chop.filter((c) => c !== null))
  const toCut = pick((si) => L.stations[si].kind === 'board' && !choppers.has(si) && needsCut(itemAt(si)))
  if (toCut.length) return go(toCut, 'chop')
  // 2b. bahan setengah jadi (adonan tergiling dll.) menunggu dimasak/dipanggang di stasiun lain
  const toHeat = pick((si) => {
    const it = itemAt(si)
    if (!isFood(it)) return false
    const nxt = nextStep(it.ing, it.s)
    return !!nxt && nxt !== 'cut' && it.s !== 'raw' && heatAt(k, si) !== nxt && heatFree(nxt).length > 0
  })
  if (toHeat.length) return go(toHeat)
  // 2c. bahan mentah tergeletak di meja (tergeser truk, ditinggal pemain) → angkat untuk diolah
  const loose = pick((si) => {
    const it = itemAt(si)
    if (!isFood(it) || L.stations[si].kind !== 'counter' || it.s === 'burnt') return false
    const nxt = nextStep(it.ing, it.s)
    if (!nxt) return false
    return nxt === 'cut' ? free('board').length > 0 : heatFree(nxt).length > 0
  })
  if (loose.length) return go(loose)
  // 2d. wajan/panci nyasar di meja (kosong, isi mentah, atau gosong) → kembalikan ke kompor yang kosong
  if (free('stove').length) {
    const stray = pick((si) => {
      const it = itemAt(si)
      if (!isPot(it) || L.stations[si].kind === 'stove') return false
      const f = potFood(k, it)
      if (!f || f.s === 'burnt' || nextStep(f.ing, f.s) === PAN_STEP[it.pan]) return true
      // isi jadi yang tidak dibutuhkan piring mana pun: wadahnya lebih berguna di kompor
      return nextStep(f.ing, f.s) === null && !wantsOn(code(f.ing, f.s)).length
    })
    if (stray.length) return go(stray)
  }
  // 3. gosong di kompor (atau di wadahnya) → angkat lalu buang
  const burnt = pick((si) => contentAt(k, si)?.s === 'burnt')
  if (burnt.length) return go(burnt)
  // 4. bahan jadi (di kompor atau meja) yang ditunggu piring → angkat
  const ready = pick((si) => {
    const it = itemAt(si)
    return isFood(it) && it.s !== 'burnt' && nextStep(it.ing, it.s) === null && wantsOn(finalCode(it.ing)).length > 0
  })
  if (ready.length) return go(ready)
  // 4b. isi wajan/panci sudah jadi: bawa piring yang menunggunya ke kompor (wajan tetap di kompor)
  for (const si of pick((si) => isPot(itemAt(si)))) {
    const it = contentAt(k, si)
    if (!it || it.s === 'burnt' || nextStep(it.ing, it.s) !== null) continue
    const plate = go(wantsOn(finalCode(it.ing)))
    if (plate) return plate
  }
  // 5. pesanan belum punya piring: ambil, atau cuci dulu kalau habis
  const clean = k.stack.reduce((a, b) => a + b, 0)
  const sinks = L.stations.flatMap((s, si) => (s.kind === 'sink' && k.dirty[si] > 0 && !taken.has(si) && !k.chop.includes(si) ? [si] : []))
  if (need.platesShort > 0) {
    const plates = L.stations.flatMap((s, si) => (s.kind === 'plates' && k.stack[si] > 0 ? [si] : []))
    if (plates.length && free('counter').length) return go(plates)
    if (sinks.length) return go(sinks, 'chop', undefined, 'wash')
  }
  if (clean < 2 && sinks.length) return go(sinks, 'chop', undefined, 'wash')
  // 6. ambil bahan yang kurang, pesanan tertua dulu
  const crateOf = (ing: Ing) => L.stations.flatMap((s, si) => (s.kind === 'crate' && s.ing === ing ? [si] : []))
  for (const ing of need.deficit) {
    // bahan yang perlu dimasak/dipotong hanya kalau stasiunnya ada yang kosong
    const steps = nextStep(ing, 'raw')
    if ((steps === 'fry' || steps === 'boil') && !panFor(steps).length) continue
    if (steps === 'cut' && !free('board').length) continue
    const crates = crateOf(ing)
    // bahan tanpa peti (datang lewat sabuk): ambil yang masih mentah di mana pun ia lewat
    const list = crates.length ? crates : pick((si) => L.stations[si].kind === 'belt' && isFood(itemAt(si)) && (itemAt(si) as { ing: Ing; s: string }).ing === ing && (itemAt(si) as { s: string }).s === 'raw')
    const c = go(list, 'use', ing)
    if (c) return c
  }
  return null
}

export type Bot = { plan: Plan | null; path: [number, number][]; next: number; wait: number; replan: number; gap: boolean; v: Vel }

export const newBot = (): Bot => ({ plan: null, path: [], next: 0, wait: 0.3, replan: 0, gap: false, v: { x: 0, z: 0 } })

function frontOf(k: Kit, si: number, w: Walker): [number, number] | null {
  const fr = layoutOf(k.kitchen).fronts[si]
  let best: [number, number] | null = null
  let bd = Infinity
  for (const p of fr) {
    const d = Math.hypot(p[0] - w.x, p[1] - w.z)
    if (d < bd) {
      bd = d
      best = p
    }
  }
  return best
}

/**
 * Satu langkah bot (host). `claims` = rencana bot lain, supaya tidak berebut barang yang sama.
 * Mengembalikan true kalau isi dapur berubah.
 */
export function stepBot(k: Kit, actor: number, b: Bot, w: Walker, dt: number, level: BotLevel, claims: Plan[]): boolean {
  const L = layoutOf(k.kitchen)
  const walls = wallsOf(k)
  if (b.wait > 0) {
    b.wait -= dt
    moveCook(k, w, b.v, 0, 0, 0, dt)
    return false
  }
  // sambungan gerbong berubah: jalur lama mungkin lewat jurang
  const shut = gapOpen(k) || wallsOf(k) !== L
  if (b.plan && b.gap !== shut) b.plan = null
  b.gap = shut
  if (!b.plan) {
    b.plan = planStep(k, actor, w.x, w.z, claims)
    if (!b.plan) {
      b.wait = 0.5
      return false
    }
    const f: [number, number] | null = b.plan.floor ? [b.plan.floor.x, b.plan.floor.z] : frontOf(k, b.plan.si, w)
    b.path = f ? findPath(buildNav(walls), w.x, w.z, f[0], f[1]) : []
    b.next = 0
    // tersangkut = jauh lebih lama dari perkiraan jalan kaki menurut panjang jalur
    b.replan = 2.5 + b.path.length * 0.55
    if (!b.path.length && f && Math.hypot(f[0] - w.x, f[1] - w.z) > 0.4) {
      b.plan = null
      b.wait = 0.5
      return false
    }
  }
  // berjalan
  while (b.next < b.path.length) {
    const [px, pz] = b.path[b.next]
    const dx = px - w.x
    const dz = pz - w.z
    const d = Math.hypot(dx, dz)
    if (d < (b.next === b.path.length - 1 ? 0.25 : 0.4)) {
      b.next++
      continue
    }
    // di es bot mengerem lebih awal supaya tidak kebablasan
    const ice = KITCHENS[k.kitchen].gimmick === 'ice' && b.next === b.path.length - 1 ? Math.min(1, d / 1.2) : 1
    moveCook(k, w, b.v, dx / d, dz / d, COOK_SPEED * PACE[level] * Math.max(0.35, ice), dt)
    b.replan -= dt
    // tersangkut (didorong koki lain): cari jalan lagi
    if (b.replan <= 0) b.plan = null
    return false
  }
  // sampai di barang lantai: pungut
  if (b.plan.op === 'pick' && b.plan.floor) {
    const ok = pickFloor(k, actor, b.plan.floor.id, { x: w.x, z: w.z, yaw: w.yaw })
    b.plan = null
    b.wait = THINK[level]
    return ok
  }
  // sampai: hadap stasiun lalu bertindak
  const st = L.stations[b.plan.si]
  w.yaw = Math.atan2(st.x - w.x, st.z - w.z)
  moveCook(k, w, b.v, 0, 0, 0, dt)
  if (b.plan.op === 'chop') {
    if (k.chop[actor] === b.plan.si) return false
    const ok = chop(k, actor, b.plan.si, true)
    if (!ok) {
      b.plan = null
      b.wait = THINK[level]
    }
    return ok
  }
  const changed = use(k, actor, b.plan.si)
  b.plan = null
  b.wait = THINK[level]
  return changed
}
