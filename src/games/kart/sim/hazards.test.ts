import { describe, expect, it } from 'vitest'
import { TRACKS } from '../tracks'
import type { Entity } from '../types'
import { hazardContact, hazardPose, ownerSafe, PETASAN_BLAST, PETASAN_FUSE } from './hazards'
import { magnetPull, spawnKart } from './physics'
import { buildTrack, type Track } from './track'

const base = { x: 0, z: 0, s: 0, lane: 0, id: 1 }
const entity = (kind: Entity['kind'], by: number) => ({ ...base, kind, by }) as Entity

/** lintasan uji dengan satu rintangan saja */
function withHazard(hazard: Track['def']['hazards'][number]): Track {
  return buildTrack({ ...Object.values(TRACKS)[0], hazards: [hazard] })
}

describe('ownerSafe', () => {
  it('pelempar aman dari petasannya sendiri sepanjang ledakan', () => {
    const e = entity('petasan', 2)
    for (const age of [0, PETASAN_FUSE, 1.21, PETASAN_FUSE + PETASAN_BLAST - 0.01]) expect(ownerSafe(e, 2, age)).toBe(true)
  })

  it('petasan tetap mengenai kart lain', () => {
    expect(ownerSafe(entity('petasan', 2), 3, 1)).toBe(false)
  })

  it('pisang sendiri aman sebentar, lalu bisa mengenai pemiliknya', () => {
    const e = entity('pisang', 2)
    expect(ownerSafe(e, 2, 0.5)).toBe(true)
    expect(ownerSafe(e, 2, 2)).toBe(false)
  })
})

describe('hazardContact', () => {
  it('kart di tanah kena roller, kart yang melompat lolos', () => {
    const t = withHazard({ kind: 'roller', at: 0.3, period: 8, radius: 3, model: 'kepiting' } as Track['def']['hazards'][number])
    const p = hazardPose(t, t.def.hazards[0], 0)!
    expect(hazardContact(t, 0, p.x, p.z, p.y)).toBe('hit')
    expect(hazardContact(t, 0, p.x, p.z, p.y + 4)).toBeNull()
  })

  it('batu jatuh tidak kena kart yang sedang di udara', () => {
    const t = withHazard({ kind: 'drop', at: 0.3, period: 10, lane: 0 } as Track['def']['hazards'][number])
    const p = hazardPose(t, t.def.hazards[0], 0)!
    expect(hazardContact(t, 8, p.x, p.z, p.y)).toBe('hit')
    expect(hazardContact(t, 8, p.x, p.z, p.y + 4)).toBeNull()
    expect(hazardContact(t, 2, p.x, p.z, p.y)).toBeNull()
  })

  it('bandul yang lewat jauh di atas kart tidak mengenai', () => {
    const t = withHazard({ kind: 'swing', at: 0.3, period: 8, model: 'palu-permen' } as Track['def']['hazards'][number])
    const p = hazardPose(t, t.def.hazards[0], 0)!
    expect(hazardContact(t, 0, p.x, p.z, p.y + p.lift)).toBe('hit')
    expect(hazardContact(t, 0, p.x, p.z, p.y + p.lift + 5)).toBeNull()
  })
})

describe('magnetPull', () => {
  const track = buildTrack(Object.values(TRACKS)[0])

  it('menarik kart mendekati lawan di depan', () => {
    const k = spawnKart(track, 0)
    const target = { x: k.x + 50, z: k.z }
    expect(magnetPull(k, target, 1 / 60)).toBe(true)
    expect(target.x - k.x).toBeLessThan(50)
  })

  it('tidak bekerja kalau lawan terlalu jauh', () => {
    const k = spawnKart(track, 0)
    const x = k.x
    expect(magnetPull(k, { x: k.x + 500, z: k.z }, 1 / 60)).toBe(false)
    expect(k.x).toBe(x)
  })
})
