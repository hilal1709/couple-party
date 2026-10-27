import { describe, expect, it } from 'vitest'
import { statsFor } from '../data'
import { TRACKS, TRACK_IDS } from '../tracks'
import { botInput, newBrain } from './bots'
import { hitKart, spawnKart, stepKart } from './physics'
import { buildTrack, nearest, pointAt } from './track'

const DT = 1 / 60

describe('lintasan', () => {
  it.each(TRACK_IDS)('%s: panjang lintasan besar (≥ 3 km) dan titiknya tersambung', (id) => {
    const t = buildTrack(TRACKS[id])
    expect(t.length).toBeGreaterThan(3000)
    const p = pointAt(t, 500, 0)
    expect(nearest(t, p.x, p.z).i).toBe(250)
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
    expect(hitKart(k)).toBe(true)
    expect(k.spinT).toBeGreaterThan(0)
  })
})
