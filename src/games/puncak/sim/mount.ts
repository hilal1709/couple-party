import type { Loot } from '../types'
import { BAG, ITEMS, rollItem, SLOTS, throwArc, type ItemId } from './items'
import { rng } from './noise'
import type { Rope, Terrain } from './terrain'

/** detik menunggu dibangunkan sebelum kembali ke api unggun */
export const DOWN_SECS = 30
/** bot bangun sendiri lebih cepat dan tidak memakan nyawa */
export const BOT_DOWN_SECS = 9
export const REACH = 2.6

/** barang di tanah; `fly` = asal lemparan & jam mulai (ms) supaya HP lain menggambar lengkungnya */
export type Drop = { id: number; item: ItemId; x: number; y: number; z: number; fly?: { x: number; y: number; z: number; t0: number; dur: number } }

export type Fx =
  | { n: number; kind: 'open'; actor: number; chest: number; items: ItemId[] }
  | { n: number; kind: 'pick'; actor: number; item: ItemId }
  | { n: number; kind: 'use'; actor: number; item: ItemId; x: number; y: number; z: number; lucky: boolean }
  | { n: number; kind: 'give'; actor: number; to: number; item: ItemId }
  | { n: number; kind: 'down'; actor: number }
  | { n: number; kind: 'revive'; actor: number; by: number; camp?: boolean }
  | { n: number; kind: 'pull'; actor: number; by: number; x: number; y: number; z: number }
  | { n: number; kind: 'respawn'; actors: number[]; x: number; y: number; z: number; life: boolean }
  | { n: number; kind: 'camp'; zone: number }
  | { n: number; kind: 'full'; actor: number }
  | { n: number; kind: 'throw'; actor: number; item: ItemId; to: number | null }
  | { n: number; kind: 'carry'; actor: number; by: number; on: boolean }
  | { n: number; kind: 'stash'; actor: number; item: ItemId; into: boolean }

/** Isi gunung yang dipegang host dan dikirim ke HP lain. Bisa diserialisasi JSON. */
export type Mount = {
  /** jam ronde (ms) */
  t: number
  rand: number
  opened: number[]
  drops: Drop[]
  /** saku tiap aktor (SLOTS) */
  inv: (ItemId | null)[][]
  /** isi ransel tiap aktor (BAG) */
  bag: (ItemId | null)[][]
  /** carry[a] = aktor pingsan yang sedang digendong a */
  carry: (number | null)[]
  /** pingsan karena semua segmen status penuh: tidak bisa dibangunkan di tempat, harus ke api unggun */
  spent: boolean[]
  /** tali & tangga yang dipasang pemain */
  ropes: Rope[]
  /** api unggun tertinggi yang menyala */
  lit: number
  flare: { x: number; y: number; z: number } | null
  /** waktu pingsan (ms) per aktor; null = sadar */
  down: (number | null)[]
  lives: number
  falls: number
  used: number
  fx: Fx[]
  n: number
  ack: number[]
  nextId: number
}

export const LIVES = { cerah: 5, angin: 4, ekstrem: 3 } as const

export function newMount(t: Terrain, actors: number, lives: number, loot: Loot, seed: number): Mount {
  const inv = Array.from({ length: actors }, () => Array<ItemId | null>(SLOTS).fill(null))
  const bag = Array.from({ length: actors }, () => Array<ItemId | null>(BAG).fill(null))
  // bekal awal: pisang & kapur di saku, roti di ransel
  for (const s of inv) {
    s[0] = 'pisang'
    s[1] = 'kapur'
  }
  for (const s of bag) s[0] = 'roti'
  const m: Mount = { t: 0, rand: seed, opened: [], drops: [], inv, bag, carry: Array(actors).fill(null), spent: Array(actors).fill(false), ropes: [], lit: 0, flare: null, down: Array(actors).fill(null), lives, falls: 0, used: 0, fx: [], n: 0, ack: Array(actors).fill(0), nextId: 1000 }
  // peti yang tidak dipakai di mode "sedikit": dianggap sudah kosong
  if (loot === 'sedikit') m.opened = t.chests.filter((_, i) => i % 2 === 1).map((c) => c.id)
  return m
}

type FxIn = Fx extends unknown ? (Fx extends infer F ? (F extends unknown ? Omit<F, 'n'> : never) : never) : never

const push = (m: Mount, f: FxIn) => {
  m.fx.push({ ...f, n: ++m.n } as Fx)
  if (m.fx.length > 24) m.fx.shift()
}

function roll(m: Mount) {
  const r = rng(m.rand)
  const v = r()
  m.rand = (m.rand * 1103515245 + 12345) | 0
  return v
}

const freeSlot = (m: Mount, a: number) => m.inv[a]?.indexOf(null) ?? -1
const freeBag = (m: Mount, a: number) => m.bag[a]?.indexOf(null) ?? -1

/** masukkan barang: saku dulu, lalu ransel; false = penuh semua */
function stow(m: Mount, a: number, item: ItemId) {
  const s = freeSlot(m, a)
  if (s >= 0) {
    m.inv[a][s] = item
    return true
  }
  const g = freeBag(m, a)
  if (g >= 0) {
    m.bag[a][g] = item
    return true
  }
  return false
}

/** host: buka peti; isinya masuk tas, sisanya jatuh di tanah */
export function openChest(m: Mount, t: Terrain, actor: number, chest: number, loot: Loot) {
  const c = t.chests.find((x) => x.id === chest)
  if (!c || m.opened.includes(chest)) return false
  m.opened.push(chest)
  const count = (loot === 'banyak' ? 3 : 2) + (c.kind === 'peti' ? 0 : -1) + (roll(m) < 0.35 ? 1 : 0)
  const items: ItemId[] = []
  for (let i = 0; i < Math.max(1, count); i++) items.push(rollItem(roll(m), c.kind))
  for (const it of items) {
    if (!stow(m, actor, it)) m.drops.push({ id: m.nextId++, item: it, x: c.x + (roll(m) - 0.5) * 1.6, y: c.y, z: c.z + (roll(m) - 0.5) * 1.6 })
  }
  push(m, { kind: 'open', actor, chest, items })
  return true
}

export function pick(m: Mount, actor: number, drop: number) {
  const d = m.drops.find((x) => x.id === drop)
  if (!d) return false
  if (!stow(m, actor, d.item)) {
    push(m, { kind: 'full', actor })
    return true
  }
  m.drops = m.drops.filter((x) => x !== d)
  push(m, { kind: 'pick', actor, item: d.item })
  return true
}

/** host: pakai item; tali/tangga sudah direncanakan oleh pemakai */
export function spendItem(m: Mount, actor: number, slot: number, pos: { x: number; y: number; z: number }, rope: Rope | null) {
  const item = m.inv[actor]?.[slot]
  if (!item) return false
  if ((item === 'paku' || item === 'tangga') && !rope) return false
  if (rope) {
    m.ropes.push({ ...rope, id: m.nextId++, kind: item === 'tangga' ? 'tangga' : 'tali' })
    if (m.ropes.length > 40) m.ropes.shift()
  }
  if (item === 'suar') m.flare = { ...pos }
  if (!ITEMS[item].keep) m.inv[actor][slot] = null
  m.used++
  push(m, { kind: 'use', actor, item, ...pos, lucky: roll(m) < 0.6 })
  return true
}

export function dropItem(m: Mount, actor: number, slot: number, pos: { x: number; y: number; z: number }) {
  const item = m.inv[actor]?.[slot]
  if (!item) return false
  m.inv[actor][slot] = null
  m.drops.push({ id: m.nextId++, item, ...pos })
  return true
}

export function give(m: Mount, actor: number, slot: number, to: number) {
  const item = m.inv[actor]?.[slot]
  if (!item || m.down[to] !== null || (freeSlot(m, to) < 0 && freeBag(m, to) < 0)) return false
  m.inv[actor][slot] = null
  stow(m, to, item)
  push(m, { kind: 'give', actor, to, item })
  return true
}

/** pindah saku → ransel (host sudah memastikan badannya berdiri) */
export function stash(m: Mount, actor: number, slot: number) {
  const item = m.inv[actor]?.[slot]
  const g = freeBag(m, actor)
  if (!item || g < 0) return false
  m.inv[actor][slot] = null
  m.bag[actor][g] = item
  push(m, { kind: 'stash', actor, item, into: true })
  return true
}

/** pindah ransel → saku */
export function unstash(m: Mount, actor: number, bagSlot: number) {
  const item = m.bag[actor]?.[bagSlot]
  const s = freeSlot(m, actor)
  if (!item || s < 0) return false
  m.bag[actor][bagSlot] = null
  m.inv[actor][s] = item
  push(m, { kind: 'stash', actor, item, into: false })
  return true
}

/**
 * Lempar barang dari saku ke depan. Teman yang berdiri dekat titik jatuhnya (< 1,8 m) langsung
 * menangkapnya kalau tasnya masih muat; kalau tidak, barang tergeletak di titik jatuh.
 */
export function throwItem(m: Mount, t: Terrain, actor: number, slot: number, from: { x: number; y: number; z: number; yaw: number }, others: ({ x: number; y: number; z: number } | null)[]) {
  const item = m.inv[actor]?.[slot]
  if (!item) return false
  m.inv[actor][slot] = null
  const land = throwArc(t, from.x, from.y, from.z, from.yaw)
  let to: number | null = null
  let best = 1.8
  others.forEach((p, i) => {
    if (!p || i === actor || m.down[i] !== null) return
    const d = Math.hypot(p.x - land.x, p.z - land.z)
    if (d < best && Math.abs(p.y - land.y) < 2.5 && (freeSlot(m, i) >= 0 || freeBag(m, i) >= 0)) {
      best = d
      to = i
    }
  })
  if (to !== null) stow(m, to, item)
  else m.drops.push({ id: m.nextId++, item, x: land.x, y: land.y, z: land.z, fly: { x: from.x, y: from.y + 1.3, z: from.z, t0: m.t, dur: Math.round(land.time * 1000) } })
  push(m, { kind: 'throw', actor, item, to })
  return true
}

/** gendong teman pingsan; satu penggendong satu teman, satu teman satu penggendong */
export function carry(m: Mount, actor: number, to: number) {
  if (actor === to || m.down[actor] !== null || m.down[to] === null || m.carry[actor] !== null || m.carry.includes(to)) return false
  m.carry[actor] = to
  push(m, { kind: 'carry', actor: to, by: actor, on: true })
  return true
}

export function putDown(m: Mount, actor: number) {
  const to = m.carry[actor]
  if (to === null || to === undefined) return false
  m.carry[actor] = null
  push(m, { kind: 'carry', actor: to, by: actor, on: false })
  return true
}

/** penggendong aktor `to` (null = tidak sedang digendong) */
export const carrierOf = (m: Mount, to: number) => {
  const i = m.carry.indexOf(to)
  return i >= 0 ? i : null
}

export function setDown(m: Mount, actor: number, spent = false) {
  if (m.down[actor] !== null) return false
  m.down[actor] = m.t
  m.spent[actor] = spent
  // yang pingsan menjatuhkan gendongannya
  if (m.carry[actor] !== null) putDown(m, actor)
  m.falls++
  push(m, { kind: 'down', actor })
  return true
}

export function revive(m: Mount, actor: number, by: number, atCamp = false) {
  if (m.down[actor] === null || m.down[by] !== null || (m.spent[actor] && !atCamp)) return false
  m.down[actor] = null
  m.spent[actor] = false
  const c = carrierOf(m, actor)
  if (c !== null) m.carry[c] = null
  push(m, { kind: 'revive', actor, by, camp: atCamp })
  return true
}

export function pull(m: Mount, actor: number, by: number, to: { x: number; y: number; z: number }) {
  if (m.down[actor] !== null || m.down[by] !== null) return false
  push(m, { kind: 'pull', actor, by, ...to })
  return true
}

/** titik kembali: suar, atau api unggun tertinggi yang menyala */
export function checkpoint(m: Mount, t: Terrain) {
  if (m.flare) return m.flare
  const c = t.camps[Math.min(m.lit, t.camps.length - 1)]
  return { x: c.x, y: c.y, z: c.z }
}

export function lightCamp(m: Mount, zone: number) {
  if (zone <= m.lit) return false
  m.lit = zone
  // api unggun baru lebih tinggi dari suar: suar lama tidak dipakai lagi
  m.flare = null
  push(m, { kind: 'camp', zone })
  return true
}

/**
 * host: jalankan waktu pingsan. Semua pingsan = semua kembali ke api unggun & nyawa berkurang;
 * satu pingsan terlalu lama = dia kembali sendiri & nyawa berkurang. Bot bangun sendiri.
 */
export function tickDown(m: Mount, t: Terrain, bots: boolean[], dtMs = 0) {
  // yang sedang digendong: waktu pingsannya berhenti (tidak kembali sendiri ke api unggun)
  m.carry.forEach((to) => {
    const d = to === null ? null : m.down[to]
    if (to !== null && d !== null) m.down[to] = d + dtMs
  })
  // semua (termasuk bot) pingsan = tidak ada yang bisa membangunkan
  const humans = m.down.map((_, i) => i).filter((i) => !bots[i])
  const allDown = humans.length > 0 && m.down.every((d) => d !== null)
  const cp = checkpoint(m, t)
  if (allDown) {
    const actors = m.down.map((d, i) => (d !== null ? i : -1)).filter((i) => i >= 0)
    actors.forEach((i) => (m.down[i] = null))
    m.carry.fill(null)
    m.lives = Math.max(0, m.lives - 1)
    push(m, { kind: 'respawn', actors, ...cp, life: true })
    return true
  }
  let changed = false
  m.down.forEach((d, i) => {
    if (d === null) return
    const limit = (bots[i] ? BOT_DOWN_SECS : DOWN_SECS) * 1000
    if (m.t - d < limit) return
    m.down[i] = null
    const c = carrierOf(m, i)
    if (c !== null) m.carry[c] = null
    if (!bots[i]) m.lives = Math.max(0, m.lives - 1)
    push(m, { kind: 'respawn', actors: [i], ...cp, life: !bots[i] })
    changed = true
  })
  return changed
}

export const cloneMount = (m: Mount): Mount => structuredClone(m)

/** jari-jari api unggun (m) */
export const CAMP_R = 6

type Pos = { x: number; y: number; z: number } | null

const atCamp = (t: Terrain, k: number, p: Pos) => {
  const c = t.camps[k]
  return !!p && Math.hypot(c.x - p.x, c.z - p.z) < CAMP_R && Math.abs(c.y - p.y) < 4
}

/**
 * Api unggun `k` siap dinyalakan: semua pendaki manusia hadir di dekatnya. Yang pingsan dihitung hadir
 * kalau digendong teman yang hadir. Bot tidak ditunggu.
 */
export function campGather(m: Mount, t: Terrain, k: number, pos: Pos[], humans: number[]) {
  let have = 0
  for (const i of humans) {
    const carrier = carrierOf(m, i)
    const here = m.down[i] === null ? atCamp(t, k, pos[i]) : carrier !== null && m.down[carrier] === null && atCamp(t, k, pos[carrier])
    if (here) have++
  }
  return { have, need: humans.length, ready: humans.length > 0 && have === humans.length }
}

/** host: teman pingsan yang digendong sampai ke api unggun yang menyala langsung bangun */
export function campRevive(m: Mount, t: Terrain, pos: Pos[]) {
  let changed = false
  m.carry.forEach((to, carrier) => {
    if (to === null) return
    for (let k = 0; k <= m.lit; k++) {
      if (atCamp(t, k, pos[carrier]) && revive(m, to, carrier, true)) {
        changed = true
        break
      }
    }
  })
  return changed
}
