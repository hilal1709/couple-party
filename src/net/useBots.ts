import { useEffect, useRef } from 'react'
import { gameById } from '../games/registry'
import type { Session, SessionAction } from './session'

/** penolakan beruntun sebelum bot berhenti menunggu state berikutnya */
const MAX_REJECTS = 3

type Apply = (id: string, action: SessionAction) => boolean

/**
 * Menjalankan kursi bot di HP host. Tiap bot punya paling banyak satu aksi terjadwal; saat
 * state berubah aksi itu tidak dibatalkan, supaya kiriman bot lain tidak mereset jedanya.
 * Aksi yang sudah basi ditolak reducer, lalu bot melihat state terbaru.
 */
export function createBotDriver(get: () => Session | null, apply: Apply) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const mems = new Map<string, Record<string, unknown>>()
  const rejects = new Map<string, number>()
  const stuckAt = new Map<string, number>()

  const clear = () => {
    timers.forEach(clearTimeout)
    timers.clear()
    mems.clear()
    rejects.clear()
    stuckAt.clear()
  }

  const plan = (s: Session, id: string) => {
    if (timers.has(id) || stuckAt.get(id) === s.rev) return
    const seat = s.players.findIndex((p) => p.id === id)
    const mem = mems.get(id) ?? {}
    mems.set(id, mem)
    const move = gameById(s.gameId)?.bot?.({ state: s.game, seat, level: s.botLevel ?? 2, rnd: Math.random, mem, now: Date.now() })
    if (!move) return
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        const ok = apply(id, { kind: 'game', action: move.action })
        const cur = get()
        if (!cur?.gameId) return
        const count = ok ? 0 : (rejects.get(id) ?? 0) + 1
        rejects.set(id, count)
        if (count >= MAX_REJECTS) {
          rejects.set(id, 0)
          stuckAt.set(id, cur.rev)
        }
        plan(cur, id)
      }, move.delay),
    )
  }

  return {
    sync() {
      const s = get()
      if (!s?.gameId) return clear()
      for (const p of s.players) if (p.bot) plan(s, p.id)
    },
    stop: clear,
  }
}

/** Driver bot untuk host; di HP tamu `get` selalu null sehingga tidak ada yang berjalan. */
export function useBots(session: Session | null, get: () => Session | null, apply: Apply) {
  const driver = useRef<ReturnType<typeof createBotDriver> | null>(null)
  useEffect(() => {
    const d = createBotDriver(get, apply)
    driver.current = d
    return () => {
      d.stop()
      driver.current = null
    }
  }, [get, apply])
  useEffect(() => driver.current?.sync(), [session])
}
