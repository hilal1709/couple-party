import { describe, expect, it } from 'vitest'
import { init, reduce } from '../../engine'
import { LM, type Pt } from '../../input/pose/landmarks'
import type { RacketMatch, SportState } from '../../types'
import { flightMs, windowMs } from './engine'
import { SwingGesture } from './gesture'

const start = (points: 5 | 7 | 11 = 5, sport: 'tenis' | 'badminton' = 'tenis') => init(1, { sport, players: 2, points })
const rk = (s: SportState) => s.m as RacketMatch
const serve = (s: SportState) => reduce(s, { type: 'hit', id: rk(s).phaseId, x: 0.2, shot: 'drive', power: 0.6, err: 0 }, rk(s).server)
const back = (s: SportState, opts: { err?: number; power?: number; shot?: 'drive' | 'lob' | 'smash' } = {}) => {
  const b = rk(s).ball!
  return reduce(s, { type: 'hit', id: b.id, x: 0.3, shot: opts.shot ?? 'drive', power: opts.power ?? 0.5, err: opts.err ?? 0 }, 1 - b.by)
}
const land = (s: SportState) => reduce(s, { type: 'land', id: rk(s).ball!.id }, 0)
const next = (s: SportState) => reduce(s, { type: 'next', id: rk(s).phaseId }, 0)
/** satu poin untuk `seat`: lawan gagal mengembalikan bola */
function point(s: SportState, seat: number) {
  let t = serve(s)
  if (rk(t).ball!.by !== seat) t = back(t)
  return land(t)
}

describe('waktu reli', () => {
  it('makin panjang reli makin cepat, ada batasnya', () => {
    expect(flightMs('tenis', 'drive', 10, false)).toBeLessThan(flightMs('tenis', 'drive', 0, false))
    expect(flightMs('tenis', 'drive', 99, false)).toBe(780)
  })

  it('lob lambat, smash cepat', () => {
    const d = flightMs('badminton', 'drive', 0, false)
    expect(flightMs('badminton', 'lob', 0, false)).toBeGreaterThan(d)
    expect(flightMs('badminton', 'smash', 0, false)).toBeLessThan(d)
  })

  it('bola ke pinggir jendelanya lebih sempit', () => {
    expect(windowMs(1)).toBeLessThan(windowMs(0))
  })
})

describe('reducer reli', () => {
  it('hanya server yang boleh servis', () => {
    const s = start()
    expect(reduce(s, { type: 'hit', id: rk(s).phaseId, x: 0, shot: 'drive', power: 1, err: 0 }, 1)).toBe(s)
  })

  it('pemukul tidak bisa memukul bolanya sendiri', () => {
    const s = serve(start())
    expect(reduce(s, { type: 'hit', id: rk(s).ball!.id, x: 0, shot: 'drive', power: 1, err: 0 }, 0)).toBe(s)
  })

  it('bola yang tidak dikembalikan jadi poin; servis = ace', () => {
    const s = land(serve(start()))
    expect(rk(s).points).toEqual([1, 0])
    expect(rk(s).last).toEqual({ winner: 0, why: 'ace' })
  })

  it('pukulan balik menghapus laporan jatuh yang basi', () => {
    const s = serve(start())
    const id = rk(s).ball!.id
    const a = back(s)
    expect(reduce(a, { type: 'land', id }, 0)).toBe(a)
  })

  it('waktu meleset jauh + tenaga besar = keluar, poin untuk lawan', () => {
    const a = back(serve(start()), { err: 0.95, power: 0.9 })
    expect(rk(a).ball!.out).toBe(true)
    const b = land(a)
    expect(rk(b).points).toEqual([1, 0])
    expect(rk(b).last!.why).toBe('out')
  })

  it('pukul pelan tidak keluar walau telat', () => {
    expect(rk(back(serve(start()), { err: 0.95, power: 0.3 })).ball!.out).toBe(false)
  })

  it('waktu meleset menggeser arah bola', () => {
    const tepat = rk(back(serve(start()))).ball!.x
    expect(rk(back(serve(start()), { err: 0.5 })).ball!.x).toBeGreaterThan(tepat)
  })

  it('smash hanya sah menjawab lob', () => {
    expect(rk(back(serve(start()), { shot: 'smash' })).ball!.kind).toBe('drive')
    const lob = back(serve(start()), { shot: 'lob' })
    expect(rk(back(lob, { shot: 'smash' })).ball!.kind).toBe('smash')
  })

  it('servis bergantian tiap poin', () => {
    const s = next(point(start(), 0))
    expect(rk(s).server).toBe(1)
    expect(rk(s).phase).toBe('serve')
  })

  it('menang harus unggul dua', () => {
    let s = start(5)
    for (let i = 0; i < 8; i++) s = next(point(s, i % 2))
    expect(rk(s).points).toEqual([4, 4])
    s = next(point(s, 0))
    expect(rk(s).phase).toBe('serve')
    s = point(s, 0)
    expect(rk(s).phase).toBe('end')
    expect(rk(s).winners).toEqual([0])
  })

  it('seri panjang tetap ada ujungnya', () => {
    let s = start(5)
    for (let i = 0; i < 40 && rk(s).phase !== 'end'; i++) {
      s = point(s, i % 2)
      if (rk(s).phase === 'point') s = next(s)
    }
    expect(rk(s).phase).toBe('end')
  })

  it('pemain diam: servis otomatis', () => {
    const s = start()
    expect(rk(reduce(s, { type: 'auto', id: rk(s).phaseId }, 0)).ball?.power).toBe(0.2)
  })

  it('angka ngawur dipangkas', () => {
    const s = serve(start())
    const a = reduce(s, { type: 'hit', id: rk(s).ball!.id, x: 1e9, shot: 'drive', power: Number.NaN, err: 9 }, 1)
    expect(rk(a).ball!.x).toBe(1)
    expect(rk(a).ball!.power).toBe(0)
  })
})

function body(right: [number, number]) {
  const unit = 0.2
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const top = 0.35
  lm[LM.lShoulder] = { x: 0.58, y: top, visibility: 0.9 }
  lm[LM.rShoulder] = { x: 0.42, y: top, visibility: 0.9 }
  lm[LM.lHip] = { x: 0.55, y: top + unit, visibility: 0.9 }
  lm[LM.rHip] = { x: 0.45, y: top + unit, visibility: 0.9 }
  lm[LM.lWrist] = { x: 0.7, y: top + unit, visibility: 0.9 }
  lm[LM.rWrist] = { x: 0.5 + right[0] * unit, y: top + right[1] * unit, visibility: 0.9 }
  return lm
}

function run(a: [number, number], b: [number, number], ms: number) {
  const g = new SwingGesture()
  let t = 1000
  for (let i = 0; i < 8; i++, t += 50) g.push(body(a), t)
  const n = Math.max(1, Math.round(ms / 50))
  for (let i = 1; i <= n; i++, t += 50) {
    const r = g.push(body([a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)]), t)
    if (r.swing) return r.swing
  }
  return null
}

describe('gestur raket', () => {
  it('ayunan mendatar = pukulan biasa', () => {
    expect(run([-1.2, 0.5], [1.2, 0.3], 150)?.shot).toBe('drive')
  })

  it('ayunan ke atas = lob', () => {
    expect(run([-0.5, 1.2], [-0.4, -0.8], 150)?.shot).toBe('lob')
  })

  it('dari atas kepala turun = smash', () => {
    expect(run([-0.5, -1], [-0.3, 0.8], 150)?.shot).toBe('smash')
  })

  it('gerakan pelan bukan ayunan', () => {
    expect(run([-1.2, 0.5], [1.2, 0.3], 1500)).toBeNull()
  })

  it('makin cepat makin kuat', () => {
    expect(run([-1.2, 0.5], [1.2, 0.3], 300)!.power).toBeGreaterThan(run([-1.2, 0.5], [1.2, 0.3], 500)!.power)
  })

  it('badan keluar bingkai tidak mengayun', () => {
    const lm = body([0, 0])
    lm[LM.lHip].visibility = 0.1
    expect(new SwingGesture().push(lm, 1000)).toEqual({ ok: false, swing: null })
  })
})
