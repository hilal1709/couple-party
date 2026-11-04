import { describe, expect, it } from 'vitest'
import { init, reduce } from '../engine'
import { BOXES, GATE_BOX, ITEM_SPOTS, PATROL, SPAWN } from '../map'
import { newGhost, stepGhost, type Listener } from './ghost'
import { buildNav, findPath, isFree } from './nav'

const nav = buildNav([...BOXES, GATE_BOX])
const me = (x: number, z: number, level: Listener['level'] = 'diam', extra: Partial<Listener> = {}): Listener => ({ seat: 0, x, z, down: false, level, moving: false, running: false, ...extra })

function run(g: ReturnType<typeof newGhost>, secs: number, players: Listener[]) {
  let caught: number | null = null
  for (let t = 0; t < secs && caught === null; t += 0.05) caught = stepGhost(g, 0.05, nav, players, 'normal').caught
  return caught
}

describe('map Sunyi', () => {
  it('titik muncul, pusaka, dan keliling bisa dijangkau dari gerbang', () => {
    const [sx, sz] = SPAWN[0]
    expect(isFree(nav, sx, sz)).toBe(true)
    for (const s of ITEM_SPOTS) expect(findPath(nav, sx, sz, s.x, s.z), `pusaka ${s.zone} ${s.x},${s.z}`).not.toBeNull()
    for (const [x, z] of PATROL) expect(findPath(nav, sx, sz, x, z), `keliling ${x},${z}`).not.toBeNull()
  })

  it('jalur masuk rumah lewat pintu, tidak menembus dinding', () => {
    const p = findPath(nav, 0, 20, -8.5, -8)!
    expect(p).not.toBeNull()
    expect(p.length).toBeGreaterThan(2)
  })
})

describe('Penunggu', () => {
  it('bisikan dari 5 m tidak terdengar', () => {
    const g = newGhost(0, 30, 1)
    g.wait = 99
    run(g, 3, [me(0, 35, 'bisik')])
    expect(g.mode).toBe('jalan')
  })

  it('bicara normal dari 12 m: diburu sampai tersergap', () => {
    const g = newGhost(0, 25, 1)
    g.wait = 99
    expect(run(g, 15, [me(12, 25, 'normal')])).toBe(0)
  })

  it('diam tak bergerak = aman walau dekat', () => {
    const g = newGhost(-20, 40, 3)
    g.wait = 99
    run(g, 5, [me(-17, 40)])
    expect(g.mode).toBe('jalan')
  })

  it('lari terdengar lebih jauh daripada jalan', () => {
    const a = newGhost(0, 30, 1)
    const b = newGhost(0, 30, 1)
    a.wait = b.wait = 99
    stepGhost(a, 0.05, nav, [me(7, 30, 'diam', { moving: true })], 'normal')
    stepGhost(b, 0.05, nav, [me(7, 30, 'diam', { moving: true, running: true })], 'normal')
    expect(a.mode).toBe('jalan')
    expect(b.mode).toBe('buru')
  })

  it('dinding meredam: teriakan dari dalam rumah terdengar lebih dekat', () => {
    const g = newGhost(0, 30, 1)
    g.wait = 99
    // 30 m terhalang dinding kamar: 38 × 0,6 = 22,8 m → tidak terdengar
    stepGhost(g, 0.05, nav, [me(8.5, 1, 'teriak')], 'normal')
    expect(Math.hypot(8.5, 29)).toBeLessThan(38)
    expect(g.mode).toBe('jalan')
  })

  it('setelah menyergap, pergi jauh dan tuli sebentar', () => {
    const g = newGhost(0, 25, 1)
    expect(run(g, 10, [me(0.5, 25, 'normal')])).toBe(0)
    run(g, 3, [me(0.5, 25, 'teriak', { down: true })])
    expect(Math.hypot(g.x - 0.5, g.z - 25)).toBeGreaterThan(20)
    expect(g.deaf).toBeGreaterThan(0)
  })
})

describe('engine Sunyi', () => {
  it('main setelah semua cek mic; kabur hanya dengan semua pusaka', () => {
    let s = init(5, { players: 2, items: 3 })
    expect(s.items).toHaveLength(3)
    s = reduce(s, { type: 'ready' }, 0)
    expect(s.phase).toBe('calib')
    s = reduce(s, { type: 'ready' }, 1)
    expect(s.phase).toBe('play')
    expect(reduce(s, { type: 'escape', t: 10 }, 0).phase).toBe('play')
    s = reduce(s, { type: 'pickup', item: 0 }, 1)
    s = reduce(s, { type: 'pickup', item: 0 }, 0)
    expect(s.items[0].by).toBe(1)
    s = reduce(reduce(s, { type: 'pickup', item: 1 }, 0), { type: 'pickup', item: 2 }, 1)
    expect(reduce(s, { type: 'escape', t: 99 }, 1).phase).toBe('play')
    expect(reduce(s, { type: 'escape', t: 99 }, 0).result).toBe('kabur')
  })

  it('pingsan, dibangunkan pasangan, kalah kalau dua-duanya pingsan', () => {
    let s = init(5, { players: 2 })
    s = reduce(reduce(s, { type: 'ready' }, 0), { type: 'ready' }, 1)
    s = reduce(s, { type: 'down', seat: 1 }, 1)
    expect(s.down[1]).toBe(false)
    s = reduce(s, { type: 'down', seat: 1 }, 0)
    expect(s.down[1]).toBe(true)
    expect(reduce(s, { type: 'revive', seat: 1 }, 1).down[1]).toBe(true)
    expect(reduce(s, { type: 'pickup', item: 0 }, 1).items[0].by).toBeNull()
    s = reduce(s, { type: 'revive', seat: 1 }, 0)
    expect(s.down[1]).toBe(false)
    s = reduce(reduce(s, { type: 'down', seat: 0 }, 0), { type: 'down', seat: 1 }, 0)
    s = reduce(s, { type: 'lose', t: 50 }, 0)
    expect(s.result).toBe('tertangkap')
    const again = reduce(s, { type: 'again' }, 0)
    expect(again.phase).toBe('play')
    expect(again.down).toEqual([false, false])
  })
})
