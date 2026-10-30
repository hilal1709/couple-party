import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAction, type Session, type SessionAction } from './session'
import { createBotDriver } from './useBots'

const host = { id: 'h', name: 'Host' }
const bots = [
  { id: 'bot:a', name: 'A', bot: true },
  { id: 'bot:b', name: 'B', bot: true },
]

const start = (): Session =>
  applyAction({ players: [host, ...bots], pick: { gameId: 'monopoly', options: {} }, gameId: null, game: null, rev: 0 }, { kind: 'start' }, 'h', 5)

describe('driver bot', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  /** host (kursi 0) yang main duluan; setelah gilirannya selesai, bot menyusul sendiri */
  it('bot bertindak setelah jeda, tanpa menunggu state berubah lagi', () => {
    let s = start()
    const applied: string[] = []
    const apply = (id: string, a: SessionAction) => {
      const next = applyAction(s, a, id)
      if (next === s) return false
      s = next
      applied.push(id)
      return true
    }
    const d = createBotDriver(() => s, apply)
    d.sync()
    vi.advanceTimersByTime(5000)
    expect(applied).toEqual([])

    const game = s.game as { turn: number }
    s = { ...s, game: { ...game, turn: 1 }, rev: s.rev + 1 }
    d.sync()
    vi.advanceTimersByTime(3000)
    expect(applied[0]).toBe('bot:a')
    d.stop()
  })

  it('aksi ditolak terus: berhenti sampai state berubah', () => {
    const s0 = start()
    let s: Session = { ...s0, game: { ...(s0.game as object), turn: 1 } }
    let calls = 0
    const d = createBotDriver(
      () => s,
      () => {
        calls++
        return false
      },
    )
    d.sync()
    vi.advanceTimersByTime(60000)
    expect(calls).toBe(3)

    s = { ...s, rev: s.rev + 1 }
    d.sync()
    vi.advanceTimersByTime(60000)
    expect(calls).toBe(6)
    d.stop()
  })

  it('jadwal bot tidak diulang saat state berubah', () => {
    const s0 = start()
    let s: Session = { ...s0, game: { ...(s0.game as object), turn: 1 } }
    let calls = 0
    const d = createBotDriver(
      () => s,
      () => {
        calls++
        return true
      },
    )
    d.sync()
    for (let i = 0; i < 20; i++) {
      s = { ...s, rev: s.rev + 1 }
      d.sync()
      vi.advanceTimersByTime(50)
    }
    expect(calls).toBeLessThanOrEqual(1)
    d.stop()
  })

  it('keluar dari game membatalkan semua jadwal', () => {
    const s0 = start()
    let s: Session = { ...s0, game: { ...(s0.game as object), turn: 1 } }
    let calls = 0
    const d = createBotDriver(
      () => s,
      () => {
        calls++
        return true
      },
    )
    d.sync()
    s = { ...s, gameId: null, game: null }
    d.sync()
    vi.advanceTimersByTime(60000)
    expect(calls).toBe(0)
  })
})
