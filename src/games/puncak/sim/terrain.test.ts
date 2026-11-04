import { describe, expect, it } from 'vitest'
import { MOUNTAIN_IDS } from '../mountains'
import { buildTerrain, heightAt, slopeAt } from './terrain'

describe('generator gunung', () => {
  it.each(MOUNTAIN_IDS)('%s: tiap zona punya api unggun, rute naik, dan peti', (id) => {
    const t = buildTerrain(id, 4, 1234)
    expect(t.camps).toHaveLength(4)
    expect(t.chests.length).toBeGreaterThanOrEqual(4 * 5)
    // api unggun makin tinggi
    for (let i = 1; i < t.camps.length; i++) expect(t.camps[i].y).toBeGreaterThan(t.camps[i - 1].y + 15)
    expect(t.summit.y).toBeGreaterThan(t.camps[3].y + 15)
    // tanah api unggun rata
    for (const c of t.camps) expect(slopeAt(t, c.x, c.z)).toBeLessThan(0.3)
    // tiap tebing di rute bisa dipanjat dengan satu bar stamina (≤ 15 m)
    for (let i = 1; i < t.route.length; i++) {
      const a = t.route[i - 1]
      const b = t.route[i]
      if (b.climb) expect(b.y - a.y).toBeLessThan(15)
      else if (!a.climb) expect(Math.abs(b.y - a.y)).toBeLessThan(4.5)
    }
  })

  it('sama persis untuk benih yang sama', () => {
    const a = buildTerrain('karang', 4, 99)
    const b = buildTerrain('karang', 4, 99)
    expect(heightAt(a, 10.3, -40.7)).toBe(heightAt(b, 10.3, -40.7))
    expect(a.chests).toEqual(b.chests)
  })

  it('rute pendek 2 zona lebih kecil', () => {
    const t = buildTerrain('salju', 2, 5)
    expect(t.camps).toHaveLength(2)
    expect(t.size).toBeLessThan(buildTerrain('salju', 4, 5).size)
  })
})
