import { describe, expect, it } from 'vitest'
import { MOUNTAIN_IDS } from '../mountains'
import { newBot, thinkBot } from './bots'
import { maxStamina, newBody, stepBody, type Body, type BodyEvent, type Env, type Input } from './climb'
import { applyToBody, ITEM_IDS, ITEMS, planRope, rollItem } from './items'
import { checkpoint, lightCamp, newMount, openChest, revive, setDown, tickDown, spendItem } from './mount'
import { buildTerrain, heightAt, type Terrain } from './terrain'

const still: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }
const envOf = (t: Terrain): Env => ({ t, ropes: [...t.vines], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0 })
const run = (b: Body, inp: Input, env: Env, secs: number, until?: BodyEvent['k']) => {
  const ev: BodyEvent[] = []
  for (let i = 0; i < secs * 60; i++) {
    const e = stepBody(b, inp, env, 1 / 60)
    ev.push(...e)
    if (until && e.some((x) => x.k === until)) break
  }
  return ev
}

/** kaki tebing rute pertama: menghadap ke tebing */
function atCliff(t: Terrain) {
  const i = t.route.findIndex((p) => p.climb)
  const foot = t.route[i - 1]
  const top = t.route[i]
  const b = newBody(foot.x, foot.y, foot.z, 0)
  const d = Math.hypot(top.x - foot.x, top.z - foot.z)
  return { b, dir: [(top.x - foot.x) / d, (top.z - foot.z) / d] as const, top }
}

describe('fisika memanjat', () => {
  const t = buildTerrain('karang', 4, 42)

  it('berdiri diam di tanah tidak jatuh menembus medan', () => {
    const c = t.camps[0]
    const b = newBody(c.x, c.y, c.z, 0)
    run(b, still, envOf(t), 3)
    expect(b.mode).toBe('ground')
    expect(Math.abs(b.y - heightAt(t, b.x, b.z))).toBeLessThan(0.05)
  })

  it('tebing menghalangi kalau tidak dipegang, dipanjat kalau dipegang, dan menguras stamina', () => {
    const { b, dir, top } = atCliff(t)
    const env = envOf(t)
    run(b, { ...still, mx: dir[0], mz: dir[1] }, env, 3)
    expect(b.y).toBeLessThan(top.y - 5)
    const ev = run(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 1 }, env, 12, 'top')
    expect(ev.some((e) => e.k === 'grab')).toBe(true)
    expect(ev.some((e) => e.k === 'top')).toBe(true)
    expect(b.mode).toBe('ground')
    expect(b.y).toBeGreaterThan(top.y - 2)
    expect(b.stamina).toBeLessThan(1)
  })

  it('stamina habis saat memanjat = terlepas dan jatuh', () => {
    const { b, dir } = atCliff(t)
    const env = envOf(t)
    run(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 0.01 }, env, 1)
    expect(b.mode).toBe('climb')
    b.stamina = 0.01
    const ev = run(b, { ...still, grip: true }, env, 2)
    expect(ev.some((e) => e.k === 'tired')).toBe(true)
    expect(b.mode).not.toBe('climb')
  })

  it('jatuh dari tinggi melukai, sangat tinggi membuat pingsan', () => {
    const c = t.camps[0]
    const low = newBody(c.x, c.y + 10, c.z, 0)
    low.mode = 'air'
    low.peak = low.y
    run(low, still, envOf(t), 3)
    expect(low.fat.fall).toBeGreaterThan(0)
    expect(maxStamina(low)).toBeLessThan(1)
    const high = newBody(c.x, c.y + 30, c.z, 0)
    high.mode = 'air'
    high.peak = high.y
    const ev = run(high, still, envOf(t), 4)
    expect(ev.some((e) => e.k === 'down')).toBe(true)
    expect(high.mode).toBe('down')
  })

  it('payung membuat turun pelan tanpa luka', () => {
    const c = t.camps[0]
    const b = newBody(c.x, c.y + 30, c.z, 0)
    b.mode = 'air'
    b.peak = b.y
    b.umbrella = true
    run(b, still, envOf(t), 15)
    expect(b.mode).toBe('ground')
    expect(b.fat.fall).toBe(0)
  })

  it('tali dari paku: naik tanpa menguras banyak stamina', () => {
    const { b, dir } = atCliff(t)
    const env = envOf(t)
    b.yaw = Math.atan2(dir[0], dir[1])
    const rope = planRope(t, b, 'tali', 999)
    expect(rope).not.toBeNull()
    env.ropes.push(rope!)
    const ev = run(b, { ...still, grip: true, up: 1, mx: dir[0] * 0.2, mz: dir[1] * 0.2 }, env, 14, 'top')
    expect(ev.some((e) => e.k === 'top')).toBe(true)
    expect(b.stamina).toBeGreaterThan(0.6)
  })
})

describe('item', () => {
  const t = buildTerrain('salju', 4, 3)
  it('ada 24 jenis dan setiap peti bisa mengeluarkannya', () => {
    expect(ITEM_IDS).toHaveLength(24)
    const seen = new Set<string>()
    for (let i = 0; i < 4000; i++) seen.add(rollItem(i / 4000, 'peti'))
    expect(seen.size).toBe(24)
    expect(ITEMS[rollItem(0.5, 'sarang')].kind).toBe('makan')
  })
  it.each(ITEM_IDS)('%s punya efek yang tidak merusak badan', (id) => {
    const c = t.camps[1]
    const b = newBody(c.x, c.y, c.z, 0)
    b.stamina = 0.3
    b.fat.hunger = 0.3
    const out = applyToBody(b, t, id, { warm: true, lucky: true })
    expect(out.text.length).toBeGreaterThan(0)
    expect(Number.isFinite(b.x + b.y + b.z + b.stamina)).toBe(true)
    expect(b.stamina).toBeLessThanOrEqual(1)
  })
  it('makanan mengurangi lapar, syal menahan dingin', () => {
    const c = t.camps[3]
    const b = newBody(c.x, c.y, c.z, 0)
    b.fat.hunger = 0.4
    applyToBody(b, t, 'sate', { warm: false, lucky: true })
    expect(b.fat.hunger).toBe(0)
    const env = { ...envOf(t), coldK: 1 }
    run(b, still, env, 30)
    const cold = b.fat.cold
    expect(cold).toBeGreaterThan(0)
    applyToBody(b, t, 'syal', { warm: false, lucky: true })
    run(b, still, env, 30)
    expect(b.fat.cold).toBeLessThanOrEqual(0.001)
  })
})

describe('isi gunung (host)', () => {
  const t = buildTerrain('rimba', 4, 8)
  it('peti hanya bisa dibuka sekali, isinya masuk tas', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    expect(openChest(m, t, 0, t.chests[0].id, 'normal')).toBe(true)
    expect(openChest(m, t, 1, t.chests[0].id, 'normal')).toBe(false)
    expect(m.inv[0].filter(Boolean).length).toBeGreaterThan(2)
  })
  it('pakai item menghabiskannya, payung tidak', () => {
    const m = newMount(t, 1, 5, 'normal', 1)
    m.inv[0][2] = 'payung'
    expect(spendItem(m, 0, 0, { x: 0, y: 0, z: 0 }, null)).toBe(true)
    expect(m.inv[0][0]).toBeNull()
    expect(spendItem(m, 0, 2, { x: 0, y: 0, z: 0 }, null)).toBe(true)
    expect(m.inv[0][2]).toBe('payung')
    // paku butuh tebing
    m.inv[0][3] = 'paku'
    expect(spendItem(m, 0, 3, { x: 0, y: 0, z: 0 }, null)).toBe(false)
  })
  it('semua pingsan = kembali ke api unggun & nyawa berkurang; dibangunkan = tidak', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    lightCamp(m, 2)
    setDown(m, 0)
    expect(revive(m, 0, 1)).toBe(true)
    expect(m.lives).toBe(5)
    setDown(m, 0)
    setDown(m, 1)
    tickDown(m, t, [false, false])
    expect(m.lives).toBe(4)
    expect(m.down).toEqual([null, null])
    const last = m.fx.at(-1)!
    expect(last.kind).toBe('respawn')
    expect(checkpoint(m, t)).toEqual({ x: t.camps[2].x, y: t.camps[2].y, z: t.camps[2].z })
  })
})

describe('bot sampai puncak', () => {
  it.each(MOUNTAIN_IDS)('%s', (id) => {
    const t = buildTerrain(id, 4, 77)
    const b = newBody(t.start.x, t.start.y, t.start.z, t.start.yaw)
    const bot = newBot()
    const env = envOf(t)
    let teleports = 0
    let secs = 0
    const dt = 1 / 30
    while (secs < 1500) {
      const it = thinkBot(t, bot, b, 3, dt, [])
      if (it.teleport) {
        teleports++
        Object.assign(b, { x: it.teleport.x, y: it.teleport.y, z: it.teleport.z, mode: 'air', vy: 0, peak: it.teleport.y })
      }
      stepBody(b, it.input, env, dt)
      // bot: stamina tidak habis, pingsan bangun lagi
      b.stamina = 1
      b.fat.fall = 0
      if (b.mode === 'down') {
        b.mode = 'ground'
        const p = t.route[bot.wp]
        Object.assign(b, { x: p.x, y: p.y, z: p.z })
      }
      secs += dt
      if (Math.hypot(b.x - t.summit.x, b.z - t.summit.z) < 3 && Math.abs(b.y - t.summit.y) < 3) break
    }
    expect(Math.hypot(b.x - t.summit.x, b.z - t.summit.z)).toBeLessThan(3)
    // rute harus bisa dilalui dengan jalan & panjat biasa, bukan curang
    expect(teleports).toBeLessThan(6)
  })
})
