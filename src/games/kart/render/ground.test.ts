import { describe, expect, it } from 'vitest'
import { buildTrack, hwAt, pointAt } from '../sim/track'
import { TRACKS, TRACK_IDS } from '../tracks'
import { groundOf, WATER_Y } from './ground'
import { recipeOf } from './recipe'

describe('tanah semua lintasan', () => {
  it.each(TRACK_IDS)('%s: tanah tidak menutup jalan sampai dinding', (id) => {
    const t = buildTrack(TRACKS[id])
    const height = groundOf(t, recipeOf(t.def).ground)
    for (let i = 0; i < t.n; i += 7) {
      for (const lat of [-1, -0.5, 0, 0.5, 1]) {
        const p = pointAt(t, i * 2, lat * t.wall[i])
        expect(height(p.x, p.z), `sampel ${i}`).toBeLessThan(t.py[i] + 1.2)
      }
    }
  })

  it.each(TRACK_IDS)('%s: landmark darat berdiri di tanah yang wajar', (id) => {
    const t = buildTrack(TRACKS[id])
    const height = groundOf(t, recipeOf(t.def).ground)
    for (const l of t.def.landmarks ?? []) {
      if (l.arch || l.float) continue
      const s = l.at * t.length
      const p = pointAt(t, s, l.side * (hwAt(t, s) + l.dist))
      expect(Math.abs(height(p.x, p.z) - p.y), `${l.model} di ${l.at}`).toBeLessThan(45)
    }
  })
})

describe('bentuk tanah', () => {
  const t = buildTrack(TRACKS.pantai)
  const height = groundOf(t, 'pesisir')

  it('perahu dan pelampung Pantai Kelapa benar-benar di air', () => {
    for (const l of t.def.landmarks ?? []) {
      if (!l.float) continue
      const s = l.at * t.length
      const p = pointAt(t, s, l.side * (hwAt(t, s) + l.dist))
      expect(height(p.x, p.z), `${l.model} di ${l.at}`).toBeLessThan(WATER_Y)
    }
  })

  it('bangunan darat Pantai Kelapa tidak terendam', () => {
    for (const l of t.def.landmarks ?? []) {
      if (l.float || l.arch) continue
      const s = l.at * t.length
      const p = pointAt(t, s, l.side * (hwAt(t, s) + l.dist))
      expect(height(p.x, p.z), `${l.model} di ${l.at}`).toBeGreaterThan(WATER_Y)
    }
  })

  it('kedua sisi jembatan adalah laut', () => {
    const [[from, to]] = t.def.bridges!
    for (let f = from + 0.01; f < to; f += 0.01) {
      for (const side of [-1, 1]) {
        const p = pointAt(t, f * t.length, side * 20)
        expect(height(p.x, p.z)).toBeLessThan(WATER_Y)
      }
    }
  })

  it('kota rata, ruas layang berdiri di atas tanah', () => {
    const n = buildTrack(TRACKS.neon)
    const flat = groundOf(n, 'kota')
    expect(flat(880, 200)).toBe(flat(0, 0))
    expect(Math.max(...n.py)).toBeGreaterThan(10)
  })
})
