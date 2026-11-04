import { describe, expect, it } from 'vitest'
import { MOUNTAIN_IDS } from '../mountains'
import { buildTerrain, heightAt, slopeAt } from './terrain'

describe('generator gunung', () => {
  it.each(MOUNTAIN_IDS)('%s: tiap zona punya api unggun, rute naik, dan peti', (id) => {
    const t = buildTerrain(id, 4, 1234)
    expect(t.camps).toHaveLength(4)
    expect(t.chests.length).toBeGreaterThanOrEqual(4 * 5)
    // api unggun makin tinggi
    for (let i = 1; i < t.camps.length; i++) expect(t.camps[i].y).toBeGreaterThan(t.camps[i - 1].y + 12)
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

  it.each(MOUNTAIN_IDS)('%s: massif bongkahan tanpa dinding tegak, jalur bisa dijalani', (id) => {
    const t = buildTerrain(id, 4, 1234)
    // gunung tinggi
    expect(t.summit.y).toBeGreaterThan(110)
    // muka batu miring (≤ ~80°), bukan dinding 90°; lubang celah Pulau Langit/Ngarai Kristal dikecualikan
    let steep = 0
    let total = 0
    for (let j = 4; j < t.n - 4; j += 3) {
      for (let i = 4; i < t.n - 4; i += 3) {
        const x = i * 0.5 - t.half
        const z = j * 0.5 - t.half
        const y = heightAt(t, x, z)
        if (y < 0 || t.decks.some((d) => Math.hypot(d.x - x, d.z - z) < d.hz + 10)) continue
        total++
        if (slopeAt(t, x, z) > 6) steep++
      }
    }
    expect(steep / total).toBeLessThan(0.012)
    // titik jalur (selain bibir tebing panjat) bisa dipijak
    const walk = t.route.filter((p) => !p.climb && !t.decks.some((d) => Math.hypot(d.x - p.x, d.z - p.z) < d.hz + 1))
    const flat = walk.filter((p) => slopeAt(t, p.x, p.z) < 1).length
    expect(flat / walk.length).toBeGreaterThan(0.9)
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
