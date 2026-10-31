import { describe, expect, it } from 'vitest'
import { statsFor } from '../data'
import { TRACKS, TRACK_IDS } from '../tracks'
import { botInput, newBrain } from './bots'
import { hitKart, rainKart, SHIELD_GRACE, spawnKart, stepKart } from './physics'
import { buildTrack, nearest, pointAt } from './track'

const DT = 1 / 60

describe('lintasan', () => {
  it.each(TRACK_IDS)('%s: panjang lintasan besar (≥ 3 km) dan titiknya tersambung', (id) => {
    const t = buildTrack(TRACKS[id])
    expect(t.length).toBeGreaterThan(3000)
    const p = pointAt(t, 500, 0)
    expect(nearest(t, p.x, p.z).i).toBe(250)
  })

  it('tanpa profil, lebar & dinding sama di seluruh lintasan', () => {
    const t = buildTrack({ ...TRACKS.sawah, profile: undefined })
    expect(new Set(t.hw).size).toBe(1)
    expect(t.hw[0]).toBe(TRACKS.sawah.width / 2)
    expect(t.wall[0]).toBe(TRACKS.sawah.width / 2 + 14)
  })

  it('profil lebar mulus, termasuk di sambungan akhir-awal lap', () => {
    const t = buildTrack({ ...TRACKS.sawah, profile: [[0.2, 20, 4], [0.5, 36, 12], [0.8, 18, 3]] })
    for (let i = 0; i < t.n; i++) {
      expect(Math.abs(t.hw[(i + 1) % t.n] - t.hw[i])).toBeLessThan(0.1)
      expect(t.wall[i]).toBeGreaterThan(t.hw[i])
    }
    expect(t.hw[Math.round(0.2 * t.n)]).toBeCloseTo(10, 1)
  })

  it('dinding menahan kart di lebar lokal, bukan lebar nominal', () => {
    const t = buildTrack({ ...TRACKS.sawah, profile: [[0, 16, 3], [0.5, 16, 3]] })
    const k = spawnKart(t, 0)
    const i = 100
    k.x = t.px[i] - t.tz[i] * 30
    k.z = t.pz[i] + t.tx[i] * 30
    k.i = i
    stepKart(k, { steer: 0, gas: false, brake: false, drift: false }, statsFor(2, 'bajaj'), t, DT)
    expect(Math.abs(k.lateral)).toBeLessThanOrEqual(11.01)
  })

  it('bot tetap menyelesaikan satu putaran di gang tersempit', () => {
    const t = buildTrack({ ...TRACKS.neon, profile: [[0, 16, 3], [0.5, 16, 3]] })
    const k = spawnKart(t, 3)
    const b = newBrain(7)
    const st = statsFor(2, 'bajaj')
    let done = false
    for (let f = 0; f < 60 * 240 && !done; f++) done = Boolean(stepKart(k, botInput(k, b, t, DT, 0.9), st, t, DT).lap)
    expect(done).toBe(true)
  })
})

describe('fisika & bot', () => {
  it.each(TRACK_IDS)('%s: bot menyelesaikan satu putaran tanpa nyangkut', (id) => {
    const t = buildTrack(TRACKS[id])
    const k = spawnKart(t, 3)
    const brain = newBrain(5)
    const st = statsFor(2, 'bajaj')
    let laps = 0
    let time = 0
    for (; time < 260 && laps < 2; time += DT) {
      const ev = stepKart(k, botInput(k, brain, t, DT, 1), st, t, DT)
      if (ev.lap) laps++
    }
    // putaran pertama hanya melewati garis start dari grid
    expect(laps).toBe(2)
    expect(time).toBeLessThan(200)
  })

  it('drift lalu lepas memberi turbo', () => {
    const t = buildTrack(TRACKS.pantai)
    const k = spawnKart(t, 0)
    const st = statsFor(0, 'bajaj')
    for (let i = 0; i < 180; i++) stepKart(k, { steer: 0, gas: true, brake: false, drift: false }, st, t, DT)
    for (let i = 0; i < 50; i++) stepKart(k, { steer: 1, gas: true, brake: false, drift: true }, st, t, DT)
    expect(k.drift).toBe(1)
    const ev = stepKart(k, { steer: 0, gas: true, brake: false, drift: false }, st, t, DT)
    expect(ev.boost).toBeGreaterThanOrEqual(1)
    expect(k.boostT).toBeGreaterThan(0)
  })

  it('perisai menahan satu serangan', () => {
    const t = buildTrack(TRACKS.pantai)
    const k = spawnKart(t, 0)
    k.shieldT = 5
    expect(hitKart(k)).toBe(false)
    expect(k.shieldT).toBe(0)
    k.guardT = 0
    expect(hitKart(k)).toBe(true)
    expect(k.spinT).toBeGreaterThan(0)
  })

  it('kontak beruntun tepat setelah perisai pecah tetap tertahan', () => {
    const t = buildTrack(TRACKS.pantai)
    const k = spawnKart(t, 0)
    const st = statsFor(0, 'bajaj')
    const coast = { steer: 0, gas: false, brake: false, drift: false }
    k.shieldT = 5
    for (let i = 0; i < 6; i++) {
      expect(hitKart(k)).toBe(false)
      stepKart(k, coast, st, t, DT)
    }
    expect(k.spinT).toBe(0)
    for (let i = 0; i < (SHIELD_GRACE + 0.1) / DT; i++) stepKart(k, coast, st, t, DT)
    expect(hitKart(k)).toBe(true)
  })

  it('perisai menahan awan hujan', () => {
    const t = buildTrack(TRACKS.pantai)
    const k = spawnKart(t, 0)
    k.shieldT = 5
    expect(rainKart(k)).toBe(false)
    expect(k.slowT).toBe(0)
    expect(k.shieldT).toBe(0)
    k.guardT = 0
    expect(rainKart(k)).toBe(true)
    expect(k.slowT).toBeGreaterThan(0)
  })
})
