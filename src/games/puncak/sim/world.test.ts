import { beforeAll, describe, expect, it } from 'vitest'
import { buildTerrain, heightAt } from './terrain'
import { buildWorld, loadRapier } from './world'

beforeAll(async () => {
  await loadRapier()
})

describe('dunia panjat Rapier', () => {
  const t = buildTerrain('karang', 4, 42)

  it('heightfield menempati tempat yang sama dengan medan sim', () => {
    const w = buildWorld(t)
    let worst = 0
    for (let k = 0; k < 200; k++) {
      // titik acak tetap (tanpa Math.random supaya tes stabil)
      const x = Math.sin(k * 12.9898) * t.hx * 0.8
      const z = Math.cos(k * 78.233) * t.hz * 0.8
      const h = heightAt(t, x, z)
      const hit = w.ray(x, h + 30, z, 0, -1, 0, 60)
      expect(hit).not.toBeNull()
      // batu & pohon bisa berada di atas medan: hanya bandingkan yang mengenai medan
      if (hit && Math.abs(hit.y - h) < 3) worst = Math.max(worst, Math.abs(hit.y - h))
    }
    // segitiga Rapier vs bilinear sim: beda kecil di sel yang sangat miring
    expect(worst).toBeLessThan(0.35)
    w.dispose()
  })

  it('batu menjadi silinder yang bisa dikenai sinar dari samping, normalnya mendatar', () => {
    const w = buildWorld(t)
    const s = t.solids.find((x) => x.kind === 'batu' && x.top - x.y > 1.5)!
    expect(s).toBeTruthy()
    const y = s.y + (s.top - s.y) / 2
    const hit = w.ray(s.x - s.r - 2, y, s.z, 1, 0, 0, 4)!
    expect(hit).not.toBeNull()
    expect(hit.surface).toBe('batu')
    expect(Math.abs(hit.ny)).toBeLessThan(0.05)
    expect(hit.nx).toBeLessThan(-0.9)
    w.dispose()
  })
})
