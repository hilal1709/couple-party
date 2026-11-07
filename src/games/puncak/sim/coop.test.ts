import { describe, expect, it } from 'vitest'
import { BONUS_MAX, drain, easeFatigue, fatigueTotal, feed, floorAt, HEIGHT, maxStamina, newBody, stepBody, type Body, type BodyEvent, type Env, type Input } from './climb'
import { applyToBody, BAG, SLOTS, throwArc } from './items'
import { campGather, campRevive, carrierOf, carry, lightCamp, newMount, pick, putDown, revive, setDown, stash, throwItem, tickDown, unstash, DOWN_SECS } from './mount'
import { buildTerrain, heightAt, type Terrain } from './terrain'

const still: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }
const envOf = (t: Terrain, o: Partial<Env> = {}): Env => ({ t, ropes: [...t.vines], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0, ...o })
/** kaki tebing pertama di rute bot, menghadap tebing */
function atCliffFoot(t: Terrain) {
  const i = t.route.findIndex((p) => p.climb)
  const foot = t.route[i - 1]
  const top = t.route[i]
  const yaw = Math.atan2(top.x - foot.x, top.z - foot.z)
  return { b: newBody(foot.x, foot.y, foot.z, yaw), yaw }
}
const run = (b: Body, inp: Input, env: Env, secs: number) => {
  const ev: BodyEvent[] = []
  for (let i = 0; i < secs * 30; i++) ev.push(...stepBody(b, inp, env, 1 / 30))
  return ev
}

describe('stamina: segmen status & bar bonus', () => {
  const t = buildTerrain('hijau', 4, 7)

  it('segmen status memotong stamina maksimal dari kanan', () => {
    const b = newBody(0, 0, 0, 0)
    b.fat.hunger = 0.2
    b.fat.cold = 0.15
    expect(maxStamina(b)).toBeCloseTo(0.65, 5)
  })

  it('makanan yang melebihi bar masuk ke bar bonus, dan bonus terpakai lebih dulu', () => {
    const b = newBody(0, 0, 0, 0)
    b.stamina = 0.9
    feed(b, 0.35)
    expect(b.stamina).toBeCloseTo(1, 5)
    expect(b.bonus).toBeCloseTo(0.25, 5)
    drain(b, 0.1)
    expect(b.stamina).toBeCloseTo(1, 5)
    expect(b.bonus).toBeCloseTo(0.15, 5)
    drain(b, 0.3)
    expect(b.bonus).toBe(0)
    expect(b.stamina).toBeCloseTo(0.85, 5)
    // tidak melebihi panjang bar kedua
    feed(b, 5)
    expect(b.bonus).toBe(BONUS_MAX)
  })

  it('kopi pada stamina penuh menjadi bonus', () => {
    const b = newBody(0, 0, 0, 0)
    applyToBody(b, t, 'kopi', { warm: false, lucky: true })
    expect(b.bonus).toBeGreaterThan(0.5)
  })

  it('semua segmen penuh = pingsan karena kelelahan', () => {
    const c = t.camps[0]
    const b = newBody(c.x, c.y, c.z, 0)
    b.fat.fall = 0.6
    b.fat.hunger = 0.42
    const ev = run(b, still, envOf(t), 0.2)
    expect(fatigueTotal(b)).toBeGreaterThanOrEqual(0.999)
    expect(b.mode).toBe('down')
    expect(ev.some((e) => e.k === 'down' && e.why === 'lelah')).toBe(true)
    // bangun: segmen dikurangi sebanding sampai 60% bar
    easeFatigue(b, 0.6)
    expect(fatigueTotal(b)).toBeCloseTo(0.6, 5)
    expect(b.fat.fall / b.fat.hunger).toBeCloseTo(0.6 / 0.42, 2)
  })
})

describe('inventaris: 3 saku + ransel 4', () => {
  const t = buildTerrain('hijau', 4, 7)

  it('bekal awal: pisang & kapur di saku, roti di ransel', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    expect(m.inv[0]).toHaveLength(SLOTS)
    expect(m.bag[0]).toHaveLength(BAG)
    expect(m.inv[0].slice(0, 2)).toEqual(['pisang', 'kapur'])
    expect(m.bag[0][0]).toBe('roti')
  })

  it('saku penuh: barang masuk ransel; ransel penuh: tas penuh', () => {
    const m = newMount(t, 1, 5, 'normal', 1)
    m.inv[0] = ['pisang', 'kapur', 'roti']
    m.drops.push({ id: 1, item: 'sate', x: 0, y: 0, z: 0 })
    pick(m, 0, 1)
    expect(m.bag[0]).toContain('sate')
    m.bag[0] = ['roti', 'roti', 'roti', 'roti']
    m.drops.push({ id: 2, item: 'madu', x: 0, y: 0, z: 0 })
    pick(m, 0, 2)
    expect(m.drops.some((d) => d.id === 2)).toBe(true)
    expect(m.fx.some((f) => f.kind === 'full')).toBe(true)
  })

  it('pindah saku ↔ ransel', () => {
    const m = newMount(t, 1, 5, 'normal', 1)
    expect(stash(m, 0, 0)).toBe(true)
    expect(m.inv[0][0]).toBeNull()
    expect(m.bag[0].filter(Boolean)).toEqual(['roti', 'pisang'])
    expect(unstash(m, 0, 0)).toBe(true)
    expect(m.inv[0]).toContain('roti')
  })
})

describe('lempar barang', () => {
  const t = buildTerrain('hijau', 4, 7)
  const c = t.camps[0]

  it('lemparan jatuh beberapa meter di depan di atas medan', () => {
    const land = throwArc(t, c.x, c.y, c.z, 0)
    const d = Math.hypot(land.x - c.x, land.z - c.z)
    expect(d).toBeGreaterThan(4)
    expect(d).toBeLessThan(10)
    expect(Math.abs(land.y - heightAt(t, land.x, land.z))).toBeLessThan(0.01)
  })

  it('teman di dekat titik jatuh menangkapnya; tanpa teman barang tergeletak', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    const land = throwArc(t, c.x, c.y, c.z, 0)
    const ok = throwItem(m, t, 0, 0, { x: c.x, y: c.y, z: c.z, yaw: 0 }, [null, { x: land.x + 0.5, y: land.y, z: land.z }])
    expect(ok).toBe(true)
    expect(m.inv[0][0]).toBeNull()
    expect([...m.inv[1], ...m.bag[1]].filter((i) => i === 'pisang')).toHaveLength(2)
    throwItem(m, t, 0, 1, { x: c.x, y: c.y, z: c.z, yaw: 0 }, [null, { x: c.x + 40, y: c.y, z: c.z }])
    const d = m.drops.at(-1)!
    expect(d.item).toBe('kapur')
    expect(d.fly?.dur).toBeGreaterThan(200)
  })

  it('lemparan ke tebing berhenti di kaki tebing', () => {
    const { b, yaw } = atCliffFoot(t)
    const land = throwArc(t, b.x, b.y, b.z, yaw)
    // tidak menembus dinding ke atas tebing: jatuh dekat kaki, paling tinggi di lereng bawahnya
    expect(land.y - b.y).toBeLessThan(3)
    expect(Math.hypot(land.x - b.x, land.z - b.z)).toBeLessThan(6)
  })
})

describe('kerja sama: pijakan, gendong, api unggun', () => {
  const t = buildTerrain('hijau', 4, 7)
  const c = t.camps[0]

  it('kepala teman yang sedang memanjat bisa dipijak', () => {
    const env = envOf(t, { heads: [{ x: c.x, y: c.y + 2, z: c.z }] })
    expect(floorAt(env, c.x, c.z, c.y + 2 + HEIGHT - 0.2)).toBeCloseTo(c.y + 2 + HEIGHT, 5)
  })

  it('menggendong: tidak bisa memanjat atau lari, jalan lebih lambat', () => {
    const go: Input = { ...still, mz: 1, sprint: true }
    const free = newBody(c.x, c.y, c.z, 0)
    const loaded = newBody(c.x, c.y, c.z, 0)
    run(free, go, envOf(t), 1.2)
    run(loaded, go, envOf(t, { load: 1 }), 1.2)
    expect(loaded.z - c.z).toBeLessThan((free.z - c.z) * 0.6)
    const { b, yaw } = atCliffFoot(t)
    b.yaw = yaw
    run(b, { ...still, mx: Math.sin(yaw), mz: Math.cos(yaw), grip: true }, envOf(t, { load: 1 }), 1)
    expect(b.mode).not.toBe('climb')
  })

  it('hanya teman pingsan yang bisa digendong; waktu pingsannya berhenti', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    expect(carry(m, 0, 1)).toBe(false)
    setDown(m, 1)
    expect(carry(m, 0, 1)).toBe(true)
    expect(carrierOf(m, 1)).toBe(0)
    // 60 dtk digendong: tidak kembali sendiri ke api unggun
    for (let i = 0; i < 60; i++) {
      m.t += 1000
      tickDown(m, t, [false, false], 1000)
    }
    expect(m.down[1]).not.toBeNull()
    putDown(m, 0)
    m.t += DOWN_SECS * 1000
    tickDown(m, t, [false, false], 0)
    expect(m.down[1]).toBeNull()
  })

  it('pingsan kelelahan tidak bisa dibangunkan di tempat, tapi bangun saat digendong ke api unggun', () => {
    const m = newMount(t, 2, 5, 'normal', 1)
    setDown(m, 1, true)
    expect(revive(m, 1, 0)).toBe(false)
    carry(m, 0, 1)
    const pos = [{ x: c.x + 1, y: c.y, z: c.z }, null]
    expect(campRevive(m, t, pos)).toBe(true)
    expect(m.down[1]).toBeNull()
    expect(m.carry[0]).toBeNull()
  })

  it('api unggun menunggu semua pendaki manusia; yang digendong ikut terhitung; bot tidak ditunggu', () => {
    const m = newMount(t, 3, 5, 'normal', 1)
    const k = 1
    const cp = t.camps[k]
    const here = { x: cp.x, y: cp.y, z: cp.z }
    const far = { x: cp.x, y: cp.y - 30, z: cp.z - 60 }
    const humans = [0, 1]
    expect(campGather(m, t, k, [here, far, far], humans)).toMatchObject({ have: 1, need: 2, ready: false })
    expect(campGather(m, t, k, [here, here, far], humans).ready).toBe(true)
    setDown(m, 1)
    carry(m, 0, 1)
    expect(campGather(m, t, k, [here, far, far], humans).ready).toBe(true)
    expect(lightCamp(m, k)).toBe(true)
  })
})
