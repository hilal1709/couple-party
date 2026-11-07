import { beforeAll, describe, expect, it } from 'vitest'
import { newBody, stepBody, type Body, type BodyEvent, type Env, type Input } from './climb'
import { buildTerrain, heightAt, type Solid, type Terrain } from './terrain'
import { MOUNTAIN_IDS } from '../mountains'
import { newBot, thinkBot } from './bots'
import { MAX_RAYS, SLIP_T } from './wall'
import { buildWorld, loadRapier, type ClimbWorld } from './world'

const still: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }
const t: Terrain = buildTerrain('karang', 4, 42)
let world: ClimbWorld
const envOf = (): Env => ({ t, ropes: [...t.vines], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0, world })
const run = (b: Body, inp: Input, env: Env, secs: number, until?: BodyEvent['k']) => {
  const ev: BodyEvent[] = []
  for (let i = 0; i < secs * 60; i++) {
    const e = stepBody(b, inp, env, 1 / 60)
    ev.push(...e)
    if (until && e.some((x) => x.k === until)) break
  }
  return ev
}

function atCliff() {
  const i = t.route.findIndex((p) => p.climb)
  const foot = t.route[i - 1]
  const top = t.route[i]
  const d = Math.hypot(top.x - foot.x, top.z - foot.z)
  return { b: newBody(foot.x, foot.y, foot.z, 0), dir: [(top.x - foot.x) / d, (top.z - foot.z) / d] as const, top }
}

/** bongkahan batu tinggi yang berdiri di tanah agak datar, dengan ruang di sisi barat */
function tallRock(): Solid {
  const s = t.solids.find((x) => x.kind === 'batu' && x.top - x.y > 2 && Math.abs(heightAt(t, x.x - x.r - 1, x.z) - x.y) < 0.6)
  if (!s) throw new Error('tidak ada bongkahan uji')
  return s
}

beforeAll(async () => {
  await loadRapier()
  world = buildWorld(t)
})

describe('memanjat dengan dunia Rapier', () => {
  it('tebing medan: pegang, naik, naik tepian meluncur (bukan teleport), lalu berdiri di atas', () => {
    const { b, dir, top } = atCliff()
    const env = envOf()
    const ev = run(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 1 }, env, 14, 'top')
    expect(ev.some((e) => e.k === 'grab')).toBe(true)
    expect(ev.some((e) => e.k === 'top')).toBe(true)
    let worst = 0
    for (let i = 0; i < 90 && b.mode !== 'ground'; i++) {
      const x = b.x
      const y = b.y
      const z = b.z
      stepBody(b, still, env, 1 / 60)
      worst = Math.max(worst, Math.hypot(b.x - x, b.y - y, b.z - z))
    }
    expect(b.mode).toBe('ground')
    // naik tepian bergerak paling banyak ±12 cm per frame: tidak ada lompatan posisi
    expect(worst).toBeLessThan(0.15)
    expect(b.y).toBeGreaterThan(top.y - 2)
  })

  it('bongkahan batu bisa dipanjat dari samping dan dinaiki atasnya', () => {
    const s = tallRock()
    const env = envOf()
    const x0 = s.x - s.r - 0.5
    const b = newBody(x0, heightAt(t, x0, s.z), s.z, Math.PI / 2)
    const ev = run(b, { ...still, mx: 1, mz: 0, grip: true, up: 1 }, env, 8, 'top')
    expect(ev.some((e) => e.k === 'grab')).toBe(true)
    expect(b.surface).toBe('batu')
    run(b, { ...still, grip: true, up: 1 }, env, 1.5)
    expect(b.mode).toBe('ground')
    expect(b.y).toBeGreaterThan(s.top - 0.4)
  })

  it('menangkap dinding di udara saat Pegang ditahan', () => {
    const { b, dir } = atCliff()
    const env = envOf()
    // menempel dulu supaya tahu letak dinding, lalu lepas & tangkap lagi
    run(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 1 }, env, 2)
    expect(b.mode).toBe('climb')
    stepBody(b, still, env, 1 / 60)
    expect(b.mode).toBe('air')
    b.yaw = Math.atan2(dir[0], dir[1])
    const ev = run(b, { ...still, grip: true }, env, 0.6, 'grab')
    expect(ev.some((e) => e.k === 'grab')).toBe(true)
    expect(b.mode).toBe('climb')
  })

  it('stamina habis: tangan merosot sebentar dulu, baru lepas', () => {
    const { b, dir } = atCliff()
    const env = envOf()
    run(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 1 }, env, 3)
    expect(b.mode).toBe('climb')
    b.stamina = 0
    const y0 = b.y
    const first = stepBody(b, { ...still, grip: true }, env, 1 / 60)
    expect(first.some((e) => e.k === 'slip')).toBe(true)
    run(b, { ...still, grip: true }, env, SLIP_T * 0.6)
    expect(b.mode).toBe('climb')
    expect(b.y).toBeLessThan(y0)
    const ev = run(b, { ...still, grip: true }, env, SLIP_T)
    expect(ev.some((e) => e.k === 'tired')).toBe(true)
    expect(b.mode).not.toBe('climb')
  })

  it('anggaran sinar: nol saat berjalan biasa, paling banyak MAX_RAYS per tick saat memanjat', () => {
    const env = envOf()
    const c = t.camps[0]
    const walker = newBody(c.x, c.y, c.z, 0)
    const r0 = world.rays
    run(walker, { ...still, mx: 1 }, env, 1)
    expect(world.rays - r0).toBe(0)
    const { b, dir } = atCliff()
    let worst = 0
    let climbed = 0
    for (let i = 0; i < 900; i++) {
      const before = world.rays
      stepBody(b, { ...still, mx: dir[0], mz: dir[1], grip: true, up: 1, side: i % 120 < 60 ? 0.4 : -0.4 }, env, 1 / 60)
      if (b.mode === 'climb') climbed++
      else if (climbed > 0 && b.mode === 'ground') break
      worst = Math.max(worst, world.rays - before)
    }
    expect(climbed).toBeGreaterThan(60)
    expect(worst).toBeGreaterThan(0)
    expect(worst).toBeLessThanOrEqual(MAX_RAYS)
  })

  it('deterministik: dua dunia dari medan yang sama memberi hasil panjat yang sama persis', () => {
    const other = buildWorld(t)
    const a = atCliff().b
    const { b: c, dir } = atCliff()
    const ea = envOf()
    const ec = { ...envOf(), world: other }
    for (let i = 0; i < 400; i++) {
      const inp = { ...still, mx: dir[0], mz: dir[1], grip: true, up: i % 50 < 40 ? 1 : 0, side: Math.sin(i * 0.1) * 0.5, jump: i === 120 }
      stepBody(a, inp, ea, 1 / 60)
      stepBody(c, inp, ec, 1 / 60)
    }
    expect([c.x, c.y, c.z, c.mode, c.stamina]).toEqual([a.x, a.y, a.z, a.mode, a.stamina])
    other.dispose()
  })
})

describe('bot sampai puncak lewat dunia Rapier', () => {
  it.each(MOUNTAIN_IDS)('%s', (id) => {
    const tt = buildTerrain(id, 4, 77)
    const w = buildWorld(tt)
    const b = newBody(tt.start.x, tt.start.y, tt.start.z, tt.start.yaw)
    const bot = newBot()
    const env: Env = { t: tt, ropes: [...tt.vines], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0, world: w }
    let teleports = 0
    let secs = 0
    const dt = 1 / 30
    while (secs < 1500) {
      const it = thinkBot(tt, bot, b, 3, dt, [])
      if (it.teleport) {
        teleports++
        Object.assign(b, { x: it.teleport.x, y: it.teleport.y, z: it.teleport.z, mode: 'air', vy: 0, peak: it.teleport.y })
      }
      stepBody(b, it.input, env, dt)
      b.stamina = 1
      b.fat.fall = 0
      if (b.mode === 'down') {
        b.mode = 'ground'
        const p = tt.route[bot.wp]
        Object.assign(b, { x: p.x, y: p.y, z: p.z })
      }
      secs += dt
      if (Math.hypot(b.x - tt.summit.x, b.z - tt.summit.z) < 3 && Math.abs(b.y - tt.summit.y) < 3) break
    }
    w.dispose()
    expect(Math.hypot(b.x - tt.summit.x, b.z - tt.summit.z)).toBeLessThan(3)
    expect(teleports).toBeLessThan(6)
  }, 60000)
})
