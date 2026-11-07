import { describe, expect, it } from 'vitest'
import { MOUNTAIN_IDS, zoneCount } from '../mountains'
import { buildTerrain, heightAt, slopeAt } from './terrain'

describe('generator gunung', () => {
  it.each(MOUNTAIN_IDS)('%s: tiap zona punya api unggun, rute naik, dan peti', (id) => {
    const t = buildTerrain(id, 4, 1234)
    expect(t.camps).toHaveLength(zoneCount(id, 4))
    expect(t.chests.length).toBeGreaterThanOrEqual(t.zones * 5)
    // api unggun makin tinggi
    for (let i = 1; i < t.camps.length; i++) expect(t.camps[i].y).toBeGreaterThan(t.camps[i - 1].y + 12)
    expect(t.summit.y).toBeGreaterThan(t.camps[t.zones - 1].y + 15)
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

  it.each(MOUNTAIN_IDS)('%s: tidak ada jalan — muka tebing bertingkat dengan pijakan & tonjolan', (id) => {
    const t = buildTerrain(id, 4, 1234)
    expect(t.summit.y).toBeGreaterThan(110)
    // bagian tebing di koridor (di luar jembatan/jurang) cukup banyak: harus memanjat, bukan berjalan
    let steep = 0
    let flatOnCliff = 0
    let total = 0
    const lo = t.camps[0].z + 20
    for (let z = lo; z < t.summit.z - 4; z += 1) {
      for (let x = -28; x <= 28; x += 1) {
        if (t.decks.some((d) => Math.hypot(d.x - x, d.z - z) < d.hz + 10)) continue
        const y = heightAt(t, x, z)
        if (y < 0) continue
        total++
        const s = slopeAt(t, x, z)
        if (s > 1) steep++
        // tempat berdiri di tengah pita tebing (pijakan / tonjolan)
        if (s < 0.5 && slopeAt(t, x, z + 1.5) > 1.5) flatOnCliff++
      }
    }
    expect(steep / total).toBeGreaterThan(0.25)
    expect(flatOnCliff).toBeGreaterThan(200)
    // tiap zona punya beberapa dinding yang wajib dipanjat di rute
    for (let k = 0; k < t.zones; k++) {
      const z0 = t.camps[k].z
      const z1 = k + 1 < t.zones ? t.camps[k + 1].z : t.summit.z
      // kemah awal Punggung Hijau sengaja hanya satu undakan latihan
      expect(t.route.filter((p) => p.climb && p.z > z0 && p.z <= z1).length).toBeGreaterThanOrEqual(t.kinds?.[k] === 'kemah' ? 1 : 2)
    }
    // tidak ada pita landai yang menyambung dari pantai ke puncak: di setiap kolom x ada tebing curam
    for (let x = -24; x <= 24; x += 8) {
      let maxS = 0
      for (let z = t.camps[0].z; z < t.camps[1].z; z += 0.5) maxS = Math.max(maxS, slopeAt(t, x, z))
      expect(maxS).toBeGreaterThan(2)
    }
  })

  it('Punggung Hijau: 6 zona berurutan, rute pendek tetap memuat tebing, punggung atas sempit', () => {
    const t = buildTerrain('hijau', 4, 1234)
    expect(t.kinds).toEqual(['kemah', 'hutan', 'batu', 'tebing', 'punggung', 'puncak'])
    expect(t.m.zones.map((z) => z.title)).toEqual(['Kemah Awal', 'Hutan Bawah', 'Formasi Batu', 'Tebing Besar', 'Punggung Atas', 'Puncak'])
    // peta persegi panjang: jauh lebih panjang daripada lebar
    expect(t.sx).toBeLessThan(t.sz / 2)
    const short = buildTerrain('hijau', 2, 1234)
    expect(short.kinds).toEqual(['kemah', 'tebing', 'puncak'])
    expect(short.camps).toHaveLength(3)
    // punggung atas: lebar tanah yang setinggi rute (±3 m) kurang dari 26 m; tebing besar jauh lebih lebar
    const span = (z: number) => {
      const y = heightAt(t, 0, z)
      let w = 0
      for (let x = -60; x <= 60; x += 0.5) if (Math.abs(heightAt(t, x, z) - y) < 3) w += 0.5
      return w
    }
    const zr = (t.camps[4].z + t.camps[5].z) / 2
    expect(span(zr)).toBeLessThan(26)
    expect(span(t.camps[3].z)).toBeGreaterThan(40)
    // hutan bawah paling rimbun
    const trees = (k: number) => t.solids.filter((s) => s.kind !== 'batu' && s.z > t.camps[k].z && s.z < (t.camps[k + 1]?.z ?? t.summit.z)).length
    expect(trees(1)).toBeGreaterThan(trees(3) * 2)
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
    expect(t.sz).toBeLessThan(buildTerrain('salju', 4, 5).sz)
  })
})
