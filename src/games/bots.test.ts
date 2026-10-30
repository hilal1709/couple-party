import { describe, expect, it } from 'vitest'
import { lcg } from './domino/dev'
import { gameById } from './registry'
import type { BotLevel } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

type Case = {
  name: string
  id: string
  n: number
  options?: Record<string, unknown>
  over: (s: Any) => boolean
  /** aksi yang di app dikirim View host (jam, lanjut layar) */
  host?: (s: Any, now: number, mem: Record<string, unknown>) => Any
}

const LEVELS: BotLevel[] = [1, 2, 3]
const MAX_STEPS = 60000

/**
 * Meniru useBots dengan jam tiruan: semua kursi bot, tiap kursi paling banyak satu aksi
 * terjadwal yang tidak dibatalkan saat state berubah.
 */
function simulate(c: Case, level: BotLevel, seed: number) {
  const game = gameById(c.id)!
  const rnd = lcg(seed)
  const seats = Array.from({ length: c.n }, (_, i) => i)
  let s = game.init(seed, { ...c.options, players: c.n, botSeats: seats })
  const mems = seats.map(() => ({}))
  const hostMem = {}
  const pending: ({ at: number; action: Any } | null)[] = seats.map(() => null)
  const rejects = seats.map(() => 0)
  let now = 1000

  const plan = () => {
    for (const seat of seats) {
      if (pending[seat] || rejects[seat] >= 3) continue
      const m = game.bot!({ state: s, seat, level, rnd, mem: mems[seat], now })
      if (m) pending[seat] = { at: now + m.delay, action: m.action }
    }
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    if (c.over(s)) return { state: s, steps: step }
    const hosted = c.host?.(s, now, hostMem)
    if (hosted) {
      const next = game.reduce(s, hosted, 0)
      if (next !== s) {
        s = next
        rejects.fill(0)
      }
    }
    plan()
    const live = seats.filter((i) => pending[i])
    if (!live.length) {
      now += 1000
      continue
    }
    const seat = live.reduce((a, b) => (pending[b]!.at < pending[a]!.at ? b : a))
    const { at, action } = pending[seat]!
    pending[seat] = null
    now = Math.max(now, at)
    const next = game.reduce(s, action, seat)
    if (next === s) rejects[seat]++
    else {
      s = next
      rejects.fill(0)
    }
  }
  throw new Error(`${c.name} level ${level} seed ${seed} macet: ${JSON.stringify({ phase: s.phase, turn: s.turn, rejects })}`)
}

const cases: Case[] = [
  { name: 'Ludo 2 pemain', id: 'ludo', n: 2, over: (s) => s.phase === 'end' },
  { name: 'Ludo tim 4 pemain + petak jahil', id: 'ludo', n: 4, options: { teams: true, specials: true }, over: (s) => s.phase === 'end' },
  { name: 'Ludo 8 pemain', id: 'ludo', n: 8, options: { arms: 8, pieces: 2 }, over: (s) => s.phase === 'end' },
  { name: 'Monopoli 2 pemain', id: 'monopoly', n: 2, options: { end: 'rounds', rounds: 15 }, over: (s) => s.phase === 'end' },
  { name: 'Monopoli 6 pemain sampai bangkrut', id: 'monopoly', n: 6, options: { end: 'rounds', rounds: 25, trade: true, auction: true }, over: (s) => s.phase === 'end' },
]

describe('semua kursi bot: game selalu tamat', () => {
  for (const c of cases) {
    for (const level of LEVELS) {
      it(`${c.name}, level ${level}`, () => {
        for (const seed of [11, 222]) expect(simulate(c, level, seed).steps).toBeGreaterThan(0)
      })
    }
  }
})
