import type { Loot } from '../types'
import { ITEMS, rollItem, SLOTS, type ItemId } from './items'
import { rng } from './noise'
import type { Rope, Terrain } from './terrain'

/** detik menunggu dibangunkan sebelum kembali ke api unggun */
export const DOWN_SECS = 30
/** bot bangun sendiri lebih cepat dan tidak memakan nyawa */
export const BOT_DOWN_SECS = 9
export const REACH = 2.6

export type Drop = { id: number; item: ItemId; x: number; y: number; z: number }

export type Fx =
  | { n: number; kind: 'open'; actor: number; chest: number; items: ItemId[] }
  | { n: number; kind: 'pick'; actor: number; item: ItemId }
  | { n: number; kind: 'use'; actor: number; item: ItemId; x: number; y: number; z: number; lucky: boolean }
  | { n: number; kind: 'give'; actor: number; to: number; item: ItemId }
  | { n: number; kind: 'down'; actor: number }
  | { n: number; kind: 'revive'; actor: number; by: number }
  | { n: number; kind: 'pull'; actor: number; by: number; x: number; y: number; z: number }
  | { n: number; kind: 'respawn'; actors: number[]; x: number; y: number; z: number; life: boolean }
  | { n: number; kind: 'camp'; zone: number }
  | { n: number; kind: 'full'; actor: number }

/** Isi gunung yang dipegang host dan dikirim ke HP lain. Bisa diserialisasi JSON. */
export type Mount = {
  /** jam ronde (ms) */
  t: number
  rand: number
  opened: number[]
  drops: Drop[]
  inv: (ItemId | null)[][]
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
  // bekal awal: tiap pendaki membawa pisang & kapur
  for (const s of inv) {
    s[0] = 'pisang'
    s[1] = 'kapur'
  }
  const m: Mount = { t: 0, rand: seed, opened: [], drops: [], inv, ropes: [], lit: 0, flare: null, down: Array(actors).fill(null), lives, falls: 0, used: 0, fx: [], n: 0, ack: Array(actors).fill(0), nextId: 1000 }
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

/** host: buka peti; isinya masuk tas, sisanya jatuh di tanah */
export function openChest(m: Mount, t: Terrain, actor: number, chest: number, loot: Loot) {
  const c = t.chests.find((x) => x.id === chest)
  if (!c || m.opened.includes(chest)) return false
  m.opened.push(chest)
  const count = (loot === 'banyak' ? 3 : 2) + (c.kind === 'peti' ? 0 : -1) + (roll(m) < 0.35 ? 1 : 0)
  const items: ItemId[] = []
  for (let i = 0; i < Math.max(1, count); i++) items.push(rollItem(roll(m), c.kind))
  for (const it of items) {
    const s = freeSlot(m, actor)
    if (s >= 0) m.inv[actor][s] = it
    else m.drops.push({ id: m.nextId++, item: it, x: c.x + (roll(m) - 0.5) * 1.6, y: c.y, z: c.z + (roll(m) - 0.5) * 1.6 })
  }
  push(m, { kind: 'open', actor, chest, items })
  return true
}

export function pick(m: Mount, actor: number, drop: number) {
  const d = m.drops.find((x) => x.id === drop)
  const s = freeSlot(m, actor)
  if (!d) return false
  if (s < 0) {
    push(m, { kind: 'full', actor })
    return true
  }
  m.inv[actor][s] = d.item
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
  const s = freeSlot(m, to)
  if (!item || s < 0 || m.down[to] !== null) return false
  m.inv[actor][slot] = null
  m.inv[to][s] = item
  push(m, { kind: 'give', actor, to, item })
  return true
}

export function setDown(m: Mount, actor: number) {
  if (m.down[actor] !== null) return false
  m.down[actor] = m.t
  m.falls++
  push(m, { kind: 'down', actor })
  return true
}

export function revive(m: Mount, actor: number, by: number) {
  if (m.down[actor] === null || m.down[by] !== null) return false
  m.down[actor] = null
  push(m, { kind: 'revive', actor, by })
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
export function tickDown(m: Mount, t: Terrain, bots: boolean[]) {
  // semua (termasuk bot) pingsan = tidak ada yang bisa membangunkan
  const humans = m.down.map((_, i) => i).filter((i) => !bots[i])
  const allDown = humans.length > 0 && m.down.every((d) => d !== null)
  const cp = checkpoint(m, t)
  if (allDown) {
    const actors = m.down.map((d, i) => (d !== null ? i : -1)).filter((i) => i >= 0)
    actors.forEach((i) => (m.down[i] = null))
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
    if (!bots[i]) m.lives = Math.max(0, m.lives - 1)
    push(m, { kind: 'respawn', actors: [i], ...cp, life: !bots[i] })
    changed = true
  })
  return changed
}

export const cloneMount = (m: Mount): Mount => structuredClone(m)
