import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveChannel, Seat } from '@/games/types'
import { CHUNK_BYTES, PaintSync, RETRY_MS } from './paintSync'

/** jaringan palsu: `drop` menentukan pesan mana yang hilang */
function network(drop: (d: { k: string; i?: number }, nth: number) => boolean = () => false) {
  const ears = new Map<Seat, (d: unknown, from: Seat) => void>()
  let nth = 0
  const channel = (seat: Seat): LiveChannel => ({
    send: (d) => {
      if (drop(d as { k: string }, nth++)) return
      const copy = JSON.parse(JSON.stringify(d))
      for (const [s, cb] of ears) if (s !== seat) cb(copy, seat)
    },
    on: (cb) => {
      ears.set(seat, cb)
      return () => ears.delete(seat)
    },
  })
  return channel
}

const paint = (n: number, seed = 1) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + seed) % 251)

describe('PaintSync', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('menyusun kembali cat yang terpecah jadi banyak potongan', async () => {
    const ch = network()
    const got: Uint8Array[] = []
    const a = new PaintSync(ch(0), 0, () => {})
    new PaintSync(ch(1), 1, (_, b) => got.push(b))
    const data = paint(CHUNK_BYTES * 3 + 17)
    a.publish(data)
    await vi.runAllTimersAsync()
    expect(got).toHaveLength(1)
    expect(got[0]).toEqual(data)
  })

  it('meminta ulang potongan yang hilang di jalan', async () => {
    const lost = new Set([1, 2])
    const ch = network((d) => {
      if (d.k !== 'paint' || !lost.has(d.i!)) return false
      lost.delete(d.i!)
      return true
    })
    const got: Uint8Array[] = []
    const a = new PaintSync(ch(0), 0, () => {})
    new PaintSync(ch(1), 1, (_, b) => got.push(b))
    const data = paint(CHUNK_BYTES * 4)
    a.publish(data)
    await vi.advanceTimersByTimeAsync(RETRY_MS * 3)
    expect(got[0]).toEqual(data)
  })

  it('versi baru menggantikan yang sedang terkirim', async () => {
    const ch = network()
    const got: Uint8Array[] = []
    const a = new PaintSync(ch(0), 0, () => {})
    new PaintSync(ch(1), 1, (_, b) => got.push(b))
    a.publish(paint(CHUNK_BYTES * 5, 1))
    const second = paint(CHUNK_BYTES * 2, 9)
    a.publish(second)
    await vi.runAllTimersAsync()
    expect(got[got.length - 1]).toEqual(second)
  })

  it('tidak menyusun ulang versi yang sudah selesai', async () => {
    const ch = network()
    const got: Uint8Array[] = []
    const a = new PaintSync(ch(0), 0, () => {})
    new PaintSync(ch(1), 1, (_, b) => got.push(b))
    a.publish(paint(100))
    await vi.runAllTimersAsync()
    a.resend()
    await vi.runAllTimersAsync()
    expect(got).toHaveLength(1)
  })
})
