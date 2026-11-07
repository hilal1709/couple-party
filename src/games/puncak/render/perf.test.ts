import { describe, expect, it } from 'vitest'
import { FrameStats, Governor, shouldDraw } from './perf'

const run = (g: Governor, secs: number, interval: number, work = 5) => {
  const out = []
  for (let t = 0; t < secs * 1000; t += interval) {
    const a = g.feed(interval, work)
    if (a) out.push(a)
  }
  return out
}

describe('Governor', () => {
  it('menurunkan resolusi dulu, baru langkah lain, sesuai urutan', () => {
    const g = new Governor({ target: 30, minScale: 0.7, steps: ['shadow', 'grass', 'fx'] })
    const acts = run(g, 30, 50)
    expect(acts.slice(0, 3)).toEqual([
      { kind: 'scale', scale: 0.9 },
      { kind: 'scale', scale: 0.8 },
      { kind: 'scale', scale: 0.7 },
    ])
    expect(acts.slice(3).map((a) => a.kind === 'step' && a.step)).toEqual(['shadow', 'grass', 'fx'])
    expect(g.scale).toBe(0.7)
  })

  it('tidak bereaksi pada satu detik lambat saja', () => {
    const g = new Governor({ target: 30, minScale: 0.7, steps: ['shadow'] })
    expect(run(g, 1.05, 50)).toEqual([])
    expect(run(g, 3, 33.3)).toEqual([])
  })

  it('menaikkan resolusi lagi saat tenang lama', () => {
    const g = new Governor({ target: 30, minScale: 0.6, steps: [] })
    run(g, 3, 50)
    const low = g.scale
    expect(low).toBeLessThan(1)
    const acts = run(g, 10, 33.3, 6)
    expect(acts).toEqual([{ kind: 'scale', scale: Math.round((low + 0.1) * 100) / 100 }])
  })

  it('mengabaikan jeda latar belakang', () => {
    const g = new Governor({ target: 60, minScale: 0.7, steps: [] })
    expect(g.feed(5000, 1)).toBeNull()
  })
})

describe('FrameStats', () => {
  it('menghitung rata-rata dan FPS terendah', () => {
    const s = new FrameStats(100)
    for (let i = 0; i < 99; i++) s.push(16.7)
    s.push(100)
    const r = s.read()
    expect(r.fps).toBeGreaterThan(55)
    expect(r.low1).toBe(10)
  })
})

describe('shouldDraw', () => {
  it('membatasi layar 60 Hz menjadi 30 FPS selang-seling', () => {
    let last = 0
    let drawn = 0
    for (let t = 16.67; t < 1000; t += 16.67) {
      if (shouldDraw(t, last, 30)) {
        last = t
        drawn++
      }
    }
    expect(drawn).toBeGreaterThanOrEqual(29)
    expect(drawn).toBeLessThanOrEqual(31)
  })
})
