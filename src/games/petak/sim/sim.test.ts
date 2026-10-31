import { describe, expect, it } from 'vitest'
import { hiders, init, freeHiders, ranking, reduce, isSeeker } from '../engine'
import { MAP_IDS, mapData } from '../maps'
import type { PetakAction, PetakState } from '../types'
import { hiderBot, newBrain, noticeRate, seekerBot, type Sighting } from './bots'
import { buildNav, findPath, reachable } from './nav'
import { canSee, groundAt, HIDER_SPEED, pushOut, rayHit, spawnWalker, step, type Walker } from './walk'

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

describe('tabrakan', () => {
  const map = { ...mapData('gang'), boxes: [{ x: 0, z: 0, hx: 2, hz: 2, yaw: 0, top: 3 }, { x: 6, z: 0, hx: 1, hz: 1, yaw: 0, top: 0.4 }, { x: 0, z: 8, hx: 2, hz: 1, yaw: Math.PI / 4, top: 3 }] }

  it('tembok menahan langkah', () => {
    const w = spawnWalker(-4, 0)
    for (let i = 0; i < 120; i++) step(w, 1, 0, HIDER_SPEED, 1 / 60, map)
    expect(w.x).toBeLessThanOrEqual(-2.3)
  })

  it('tangga rendah bisa diinjak, lalu turun lagi', () => {
    const w = spawnWalker(4, 0)
    for (let i = 0; i < 40; i++) step(w, 1, 0, HIDER_SPEED, 1 / 60, map)
    expect(w.y).toBeCloseTo(0.4)
    for (let i = 0; i < 90; i++) step(w, 1, 0, HIDER_SPEED, 1 / 60, map)
    expect(w.y).toBe(0)
  })

  it('kotak miring mendorong keluar', () => {
    const [x, z] = pushOut(map.boxes, 0.2, 8.1, 0)
    expect(Math.hypot(x, z - 8)).toBeGreaterThan(0.9)
  })

  it('pandangan tertutup kotak', () => {
    expect(canSee(map.boxes, -5, 0, 5, 0)).toBe(false)
    expect(canSee(map.boxes, -5, 4, 5, 4)).toBe(true)
    expect(rayHit(map.boxes, -6, 0, 6, 0, 1)).toBeCloseTo(4 / 12)
  })

  it('kotak rendah tidak menutup mata', () => {
    expect(canSee(map.boxes, 4, 0, 9, 0)).toBe(true)
  })
})

describe.each(MAP_IDS)('map %s', (id) => {
  const map = mapData(id)
  const nav = buildNav(map)

  it('titik muncul tidak di dalam tembok', () => {
    for (const [x, z] of [...map.spawn.hider, ...map.spawn.seeker]) {
      const [px, pz] = pushOut(map.boxes, x, z, groundAt(map.boxes, x, z, 0.4))
      expect(Math.hypot(px - x, pz - z), `muncul ${x},${z}`).toBeLessThan(0.01)
    }
  })

  it('semua titik sembunyi terjangkau dari tempat muncul', () => {
    const [sx, sz] = map.spawn.hider[0]
    const bad = map.spots.filter((p) => !reachable(nav, sx, sz, p.x, p.z))
    expect(bad).toEqual([])
    expect(map.spots.length).toBeGreaterThanOrEqual(16)
  })

  it('pencari bisa keluar dari pos ke seluruh map', () => {
    const [sx, sz] = map.spawn.seeker[0]
    const [hx, hz] = map.spawn.hider[0]
    expect(findPath(nav, sx, sz, hx, hz).length).toBeGreaterThan(5)
  })
})

describe.each(MAP_IDS)('bot di %s', (id) => {
  it('bot hider sampai ke titiknya', () => {
    const map = mapData(id)
    for (const spot of map.spots) {
      const w = spawnWalker(map.spawn.hider[0][0], map.spawn.hider[0][1])
      const b = newBrain()
      let settled = false
      for (let i = 0; i < 60 * 60 && !settled; i++) {
        const r = hiderBot(b, w, spot, map)
        settled = r.settled
        step(w, r.move[0], r.move[1], HIDER_SPEED, 1 / 60, map)
      }
      expect(settled, `titik ${spot.x},${spot.z}`).toBe(true)
    }
  })
})

describe('bot', () => {
  const map = mapData('gang')

  it('samaran bagus lebih sulit terlihat, bergerak lebih mudah', () => {
    const w: Walker = { ...spawnWalker(0, 0.5), yaw: Math.PI / 2 }
    const h = (camo: number, moving: boolean): Sighting => ({ actor: 1, x: 5, z: 0.5, camo, moving })
    const open = { ...map, boxes: [] }
    expect(noticeRate(w, h(0.9, false), open, 2)).toBeLessThan(noticeRate(w, h(0.2, false), open, 2))
    expect(noticeRate(w, h(0.5, true), open, 2)).toBeGreaterThan(noticeRate(w, h(0.5, false), open, 2))
  })

  it('bot tidak melihat menembus tembok atau ke belakang', () => {
    const box = { ...map, boxes: [{ x: 3, z: 0, hx: 0.5, hz: 3, yaw: 0, top: 3 }] }
    const w: Walker = { ...spawnWalker(0, 0), yaw: Math.PI / 2 }
    expect(noticeRate(w, { actor: 1, x: 6, z: 0, camo: 0, moving: true }, box, 3)).toBe(0)
    expect(noticeRate({ ...w, yaw: -Math.PI / 2 }, { actor: 1, x: 2, z: 0, camo: 0, moving: true }, { ...map, boxes: [] }, 3)).toBe(0)
  })
})

/** satu permainan penuh tanpa render: bot jalan di simulasi yang sama dengan game sungguhan */
function play(seed: number, level: 1 | 2 | 3, camo: number) {
  let s = init(seed, { players: 1, total: 6, rounds: 3, level, hideSecs: 60, huntSecs: 120 })
  const act = (a: PetakAction) => (s = reduce(s, a, 0))
  const rnd = seeded(seed)
  const log: { caught: number; hiders: number }[] = []
  while (s.phase !== 'end') {
    const map = mapData(s.map)
    const walkers = s.actors.map((_, i) => spawnWalker(...(map.spawn[isSeeker(s, i) ? 'seeker' : 'hider'][i % 2] as [number, number])))
    const brains = s.actors.map(() => newBrain())
    const dt = 1 / 30
    const round: PetakState['round'] = s.round
    // sembunyi
    for (let t = 0; t < s.opts.hideSecs; t += dt) {
      for (const i of hiders(s)) {
        const spot = map.spots[s.botSpots[i] >= 0 ? s.botSpots[i] : 0]
        const r = hiderBot(brains[i], walkers[i], spot, map)
        step(walkers[i], r.move[0], r.move[1], HIDER_SPEED, dt, map)
      }
    }
    act({ type: 'toHunt' })
    for (let t = 0; t < s.opts.huntSecs && s.phase === 'hunt'; t += dt) {
      const list: Sighting[] = freeHiders(s).map((i) => ({ actor: i, x: walkers[i].x, z: walkers[i].z, moving: false, camo }))
      for (const i of s.seekers) {
        const r = seekerBot(brains[i], walkers[i], list, map, level, dt, rnd)
        step(walkers[i], r.move[0], r.move[1], 3.9, dt, map)
        if (r.grab !== null && s.phase === 'hunt') act({ type: 'catch', target: r.grab, seeker: i, t: Math.floor(t), nyali: [] })
      }
    }
    if (s.phase === 'hunt') act({ type: 'endHunt', nyali: [] })
    log.push({ caught: s.caught.filter((c) => c !== null).length, hiders: hiders(s).length })
    expect(s.round).toBe(round)
    act({ type: 'next' })
  }
  return { s, log }
}

describe('satu permainan penuh', () => {
  it('berakhir, semua dapat giliran, dan poin bertambah', () => {
    const { s, log } = play(11, 2, 0.6)
    expect(s.phase).toBe('end')
    expect(log).toHaveLength(3)
    expect(ranking(s)).toHaveLength(6)
    expect(s.points.every((p) => p >= 0)).toBe(true)
    expect(Math.max(...s.points)).toBeGreaterThan(0)
  })

  it('pencari bot lebih jago di level tinggi dan menghargai samaran bagus', () => {
    const total = (level: 1 | 2 | 3, camo: number) => [1, 2, 3].reduce((n, seed) => n + play(seed, level, camo).log.reduce((m, r) => m + r.caught, 0), 0)
    expect(total(3, 0.3)).toBeGreaterThan(total(1, 0.3))
    expect(total(2, 0.2)).toBeGreaterThan(total(2, 0.9))
  }, 60_000)

  it('pemain sendirian mulai sebagai hider', () => {
    const s = init(5, { players: 1, total: 4 })
    expect(s.actors[s.seekers[0]].seat).toBeNull()
  })

  it('hasil seed sama persis', () => {
    expect(init(9, { players: 3, total: 6 })).toEqual(init(9, { players: 3, total: 6 }))
  })

  it('hanya host yang bisa menyatakan tangkapan, dan hider tak bisa memilih dirinya', () => {
    let s = init(3, { players: 3, total: 3 })
    s = reduce(s, { type: 'toHunt' }, 0)
    const target = hiders(s)[0]
    const same = reduce(s, { type: 'catch', target, seeker: s.seekers[0], t: 5, nyali: [] }, 1)
    expect(same).toBe(s)
    s = reduce(s, { type: 'endHunt', nyali: [] }, 0)
    const mine = s.actors[target].seat!
    expect(reduce(s, { type: 'vote', target }, mine).votes[target]).toBeNull()
  })

  it('tangkapan terakhir langsung menutup perburuan', () => {
    let s = init(4, { players: 2, total: 2 })
    s = reduce(s, { type: 'toHunt' }, 0)
    s = reduce(s, { type: 'catch', target: hiders(s)[0], seeker: s.seekers[0], t: 30, nyali: [] }, 0)
    expect(s.phase).toBe('reveal')
    expect(s.gained[s.seekers[0]]).toBeGreaterThan(60)
  })
})
