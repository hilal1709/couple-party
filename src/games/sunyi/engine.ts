import { shuffle } from '../rng'
import type { Seat } from '../types'
import { ITEM_SPOTS } from './map'
import type { ItemKind, SunyiAction, SunyiOptions, SunyiState } from './types'

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 2

export const ITEM_KINDS: ItemKind[] = ['kunci', 'teplok', 'keris', 'foto', 'kendi', 'cermin', 'kemenyan']

export function defaultOptions(players = 2): SunyiOptions {
  return { players, difficulty: 'normal', items: 5 }
}

function deal(s: SunyiState): SunyiState {
  const [spots, r1] = shuffle(ITEM_SPOTS.map((_, i) => i), s.rng)
  const [kinds, r2] = shuffle(ITEM_KINDS, r1)
  const n = s.opts.items
  return { ...s, rng: r2, items: Array.from({ length: n }, (_, i) => ({ kind: kinds[i % kinds.length], spot: spots[i], by: null })) }
}

export function init(seed: number, options?: Partial<SunyiOptions>): SunyiState {
  const base = { ...defaultOptions(), ...options }
  const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, base.players))
  const opts = { ...base, players }
  return deal({
    opts,
    rng: seed >>> 0 || 1,
    phase: 'calib',
    phaseId: 0,
    ready: Array(players).fill(false),
    items: [],
    down: Array(players).fill(false),
    downs: Array(players).fill(0),
    result: null,
    endT: 0,
    last: null,
  })
}

export const collected = (s: SunyiState) => s.items.filter((i) => i.by !== null).length
export const allCollected = (s: SunyiState) => s.items.every((i) => i.by !== null)
const nextId = (s: SunyiState) => (s.last?.id ?? 0) + 1
const valid = (s: SunyiState, seat: Seat) => seat >= 0 && seat < s.opts.players

export function reduce(s: SunyiState, a: SunyiAction, by: Seat): SunyiState {
  const host = by === 0
  switch (a.type) {
    case 'ready': {
      if (s.phase !== 'calib' || !valid(s, by) || s.ready[by]) return s
      const ready = s.ready.map((r, i) => r || i === by)
      return ready.every(Boolean) ? { ...s, ready, phase: 'play', phaseId: s.phaseId + 1 } : { ...s, ready }
    }
    case 'pickup': {
      const it = s.items[a.item]
      if (s.phase !== 'play' || !it || it.by !== null || !valid(s, by) || s.down[by]) return s
      return { ...s, items: s.items.map((x, i) => (i === a.item ? { ...x, by } : x)), last: { id: nextId(s), kind: 'pickup', seat: by, item: a.item } }
    }
    case 'down': {
      if (!host || s.phase !== 'play' || !valid(s, a.seat) || s.down[a.seat]) return s
      return {
        ...s,
        down: s.down.map((d, i) => d || i === a.seat),
        downs: s.downs.map((d, i) => (i === a.seat ? d + 1 : d)),
        last: { id: nextId(s), kind: 'down', seat: a.seat },
      }
    }
    case 'revive': {
      // hanya pasangan yang sadar boleh membangunkan
      if (s.phase !== 'play' || !valid(s, a.seat) || !valid(s, by) || a.seat === by || !s.down[a.seat] || s.down[by]) return s
      return { ...s, down: s.down.map((d, i) => d && i !== a.seat), last: { id: nextId(s), kind: 'revive', seat: a.seat, by } }
    }
    case 'escape':
      if (!host || s.phase !== 'play' || !allCollected(s) || s.down.some(Boolean)) return s
      return { ...s, phase: 'end', phaseId: s.phaseId + 1, result: 'kabur', endT: a.t }
    case 'lose':
      if (!host || s.phase !== 'play' || !s.down.every(Boolean)) return s
      return { ...s, phase: 'end', phaseId: s.phaseId + 1, result: 'tertangkap', endT: a.t }
    case 'again': {
      if (!host || s.phase !== 'end') return s
      const fresh = init(s.rng, s.opts)
      // cek mic tidak perlu diulang
      return { ...fresh, phase: 'play', phaseId: s.phaseId + 1, ready: fresh.ready.map(() => true) }
    }
  }
}
