import { describe, expect, it } from 'vitest'
import { buildNav, reachable } from '../../petak/sim/nav'
import { spawnWalker } from '../../petak/sim/walk'
import { init } from '../engine'
import { KITCHEN_IDS, layoutOf, starGoals } from '../kitchens'
import { moveCook, newBot, stepBot, type Plan } from './bots'
import { advance, BELT_MS, chop, contentAt, pickFloor, resolveFlying, throwItem, GAP_CYCLE_MS, isPlate, isPot, LAVA_CYCLE_MS, lavaOn, lavaSoon, LIFT_CYCLE_MS, LIFT_UP_MS, liftUp, newKit, prank, SHIP_PERIOD_MS, shipTilt, slip, use, wallsOf, type Kit } from './kitchen'

const at = (k: Kit, kind: string, ing?: string) => layoutOf(k.kitchen).stations.findIndex((s) => s.kind === kind && (!ing || s.ing === ing))

describe('aturan dapur', () => {
  it('burger: roti + daging matang + selada potong disajikan dapat poin', () => {
    const k = newKit('burger', 1, 7)
    advance(k, 1600, true, 1)
    expect(k.orders.length).toBe(1)
    const board = at(k, 'board')
    const stove = at(k, 'stove')
    const counter = at(k, 'counter')
    // selada → talenan → potong
    use(k, 0, at(k, 'crate', 'selada'))
    use(k, 0, board)
    expect(chop(k, 0, board, true)).toBe(true)
    advance(k, 2300, true, 1)
    expect(k.items[k.hold[board]!]).toMatchObject({ s: 'cut' })
    // daging → wajan di kompor
    expect(isPot(k.items[k.hold[stove]!])).toBe(true)
    use(k, 0, at(k, 'crate', 'daging'))
    use(k, 0, stove)
    expect(k.hands[0]).toBeNull()
    advance(k, 7100, true, 1)
    expect(contentAt(k, stove)).toMatchObject({ s: 'cooked' })
    // piring di meja, isi
    use(k, 0, at(k, 'plates'))
    use(k, 0, counter)
    use(k, 0, board)
    use(k, 0, counter)
    // angkat wajan, tuang ke piring, kembalikan wajan ke kompor
    use(k, 0, stove)
    expect(isPot(k.items[k.hands[0]!])).toBe(true)
    use(k, 0, counter)
    expect(contentAt(k, stove)).toBeUndefined()
    use(k, 0, stove)
    expect(isPot(k.items[k.hold[stove]!])).toBe(true)
    use(k, 0, counter)
    const plate = k.items[k.hands[0]!]
    expect(isPlate(plate) && plate.f.length).toBe(2)
    use(k, 0, at(k, 'crate', 'roti'))
    use(k, 0, at(k, 'serve'))
    expect(k.served).toBe(1)
    expect(k.score).toBeGreaterThan(30)
  })

  it('daging gosong kalau dibiarkan, piring salah ditolak', () => {
    const k = newKit('burger', 1, 3)
    const stove = at(k, 'stove')
    use(k, 0, at(k, 'crate', 'daging'))
    use(k, 0, stove)
    for (let t = 0; t < 17_000; t += 100) advance(k, 100, true, 1)
    expect(contentAt(k, stove)).toMatchObject({ s: 'burnt' })
    use(k, 0, at(k, 'plates'))
    use(k, 0, at(k, 'crate', 'roti'))
    use(k, 0, at(k, 'serve'))
    expect(k.served).toBe(0)
    expect(k.fx.some((f) => f.kind === 'wrong')).toBe(true)
  })

  it('gosong dibiarkan jadi api, merambat, lalu padam disemprot', () => {
    const k = newKit('burger', 1, 5)
    const L = layoutOf('burger')
    const stove = at(k, 'stove')
    use(k, 0, at(k, 'crate', 'daging'))
    use(k, 0, stove)
    for (let t = 0; t < 22_000; t += 100) advance(k, 100, true, 1)
    expect(k.fire[stove]).toBeGreaterThan(0)
    for (let t = 0; t < 8000; t += 100) advance(k, 100, true, 1)
    expect(k.fire.filter((f) => f > 0).length).toBeGreaterThan(1)
    // stasiun terbakar tidak bisa dipakai
    expect(use(k, 0, stove)).toBe(false)
    // ambil alat pemadam dan semprot sampai semua padam
    expect(use(k, 0, L.extinguisher)).toBe(true)
    for (let guard = 0; guard < 40 && k.fire.some((f) => f > 0); guard++) {
      const si = k.fire.findIndex((f) => f > 0)
      const spot = L.fronts[si].length ? si : L.near[si].find((n) => L.fronts[n].length)!
      expect(chop(k, 0, spot, true)).toBe(true)
      for (let t = 0; t < 2000; t += 100) advance(k, 100, true, 1)
    }
    expect(k.fire.every((f) => f === 0)).toBe(true)
  })

  it('piring tersaji kembali kotor ke wastafel, dicuci jadi bersih', () => {
    const k = newKit('burger', 1, 5)
    const sink = at(k, 'sink')
    const before = k.stack.reduce((a, b) => a + b, 0)
    k.returns.push(100)
    advance(k, 200, true, 1)
    expect(k.dirty[sink]).toBe(1)
    expect(chop(k, 0, sink, true)).toBe(true)
    for (let t = 0; t < 2200; t += 100) advance(k, 100, true, 1)
    expect(k.dirty[sink]).toBe(0)
    expect(k.stack.reduce((a, b) => a + b, 0)).toBe(before + 1)
  })

  it('versus: jatah iseng dari pesanan tersaji, kulit pisang & bom tepung ke dapur lawan', () => {
    const a = newKit('burger', 2, 5, true)
    const b = newKit('burger', 2, 5, true)
    expect(prank(a, b)).toBeNull()
    a.jahil = 6
    const kinds = new Set<string>()
    for (let i = 0; i < 6; i++) kinds.add(prank(a, b)!)
    expect(kinds).toEqual(new Set(['pisang', 'tepung']))
    expect(a.jahil).toBe(0)
    expect(b.peels.length).toBeGreaterThan(0)
    expect(b.flour).toBeGreaterThan(b.t)
    // kulit pisang hanya di lantai
    const L = layoutOf('burger')
    for (const p of b.peels) expect(L.stations.some((s) => Math.abs(s.x - p.x) < 0.5 && Math.abs(s.z - p.z) < 0.5)).toBe(false)
    expect(slip(b, b.peels[0].id)).toBe(true)
    expect(slip(b, -1)).toBe(false)
  })

  it('versus: tiap dua pesanan tersaji dapat satu jatah', () => {
    const k = newKit('burger', 1, 5, true)
    for (let i = 0; i < 4; i++) {
      k.orders.push({ id: 100 + i, r: 'burger', born: k.t, life: 80_000 })
      k.items[900 + i] = { id: 900 + i, k: 'plate', f: ['roti:raw', 'daging:cooked', 'selada:cut'] }
      k.hands[0] = 900 + i
      use(k, 0, at(k, 'serve'))
    }
    expect(k.served).toBe(4)
    expect(k.jahil).toBe(2)
  })

  it('sabuk membawa bahan berputar, lift menahan sajian, jembatan menutup jalan, truk menggeser barang', () => {
    // sabuk
    const s = newKit('sushi', 1, 3)
    const L = layoutOf('sushi')
    for (let t = 0; t < 2000; t += 100) advance(s, 100, true, 1)
    const first = L.belt.findIndex((si) => s.hold[si] !== null)
    expect(first).toBeGreaterThanOrEqual(0)
    for (let t = 0; t < BELT_MS * 2; t += 100) advance(s, 100, true, 1)
    expect(L.belt.findIndex((si) => s.hold[si] !== null)).not.toBe(first)
    // lift
    const p = newKit('pizza', 1, 3)
    p.t = LIFT_UP_MS + 100
    expect(liftUp(p)).toBe(false)
    p.orders.push({ id: 9, r: 'pizza', born: p.t, life: 80_000 })
    p.items[50] = { id: 50, k: 'plate', f: ['adonan:baked', 'tomat:cut', 'keju:cut'] }
    p.hands[0] = 50
    expect(use(p, 0, at(p, 'serve'))).toBe(false)
    p.t = LIFT_CYCLE_MS + 10
    expect(use(p, 0, at(p, 'serve'))).toBe(true)
    // jembatan
    const r = newKit('ramen', 1, 3)
    expect(wallsOf(r)).toBe(layoutOf('ramen'))
    r.t = GAP_CYCLE_MS - 100
    expect(wallsOf(r).boxes.length).toBe(layoutOf('ramen').boxes.length + layoutOf('ramen').gap.length)
    // truk
    const k = newKit('taco', 1, 3)
    const T = layoutOf('taco')
    const counters = T.stations.flatMap((st, si) => (st.kind === 'counter' && T.near[si].some((n) => T.stations[n].kind === 'counter' && T.stations[n].r === st.r) ? [si] : []))
    const si = counters.find((c) => T.stations[c + k.turnDir]?.kind === 'counter' && T.stations[c + k.turnDir].r === T.stations[c].r)!
    k.items[70] = { id: 70, k: 'food', ing: 'tomat', s: 'raw', p: 0 }
    k.hold[si] = 70
    for (let t = 0; t < 14_200; t += 100) advance(k, 100, true, 1)
    expect(k.hold[si]).toBeNull()
    expect(k.fx.some((f) => f.kind === 'belok')).toBe(true)
  })

  it('es meluncur, kapal menghanyutkan & menggeser barang, lava menutup petaknya', () => {
    // es: setelah stik dilepas koki masih meluncur
    const e = newKit('es', 1, 3)
    const w = spawnWalker(0, 0)
    const v = { x: 0, z: 0 }
    for (let i = 0; i < 20; i++) moveCook(e, w, v, 1, 0, 3.6, 0.05)
    const x0 = w.x
    for (let i = 0; i < 10; i++) moveCook(e, w, v, 0, 0, 3.6, 0.05)
    expect(w.x - x0).toBeGreaterThan(0.3)
    // kapal: tanpa stik tetap hanyut saat dek miring
    const kp = newKit('kapal', 1, 3)
    kp.t = SHIP_PERIOD_MS / 4
    expect(shipTilt(kp)).toBeCloseTo(1)
    const w2 = spawnWalker(0, 0)
    for (let i = 0; i < 10; i++) moveCook(kp, w2, { x: 0, z: 0 }, 0, 0, 3.6, 0.05)
    expect(w2.x).toBeGreaterThan(0.2)
    const K = layoutOf('kapal')
    const si = K.stations.findIndex((st, i) => st.kind === 'counter' && K.stations[i + 1]?.kind === 'counter' && K.stations[i + 1].r === st.r && st.r === 3)
    const k2 = newKit('kapal', 1, 3)
    k2.items[80] = { id: 80, k: 'food', ing: 'udang', s: 'raw', p: 0 }
    k2.hold[si] = 80
    for (let t = 0; t < SHIP_PERIOD_MS / 4 + 200; t += 100) advance(k2, 100, true, 1)
    expect(k2.hold[si]).toBeNull()
    // lava: kelompok A menyala di awal siklus, petaknya jadi dinding
    const lv = newKit('lava', 1, 3)
    expect(lavaOn(lv)).toBe(0)
    expect(wallsOf(lv)).toBe(layoutOf('lava').lavaWalls[0])
    lv.t = LAVA_CYCLE_MS / 2 + 100
    expect(lavaOn(lv)).toBe(1)
    lv.t = LAVA_CYCLE_MS / 2 - 500
    expect(lavaSoon(lv)).toBe(1)
  })

  it('wadah: kompor hanya menerima wajan/panci, bahan mentah salah wadah ditolak, isi gosong dibuang ke tong', () => {
    const k = newKit('ramen', 1, 3)
    const L = layoutOf('ramen')
    const stoves = L.stations.flatMap((s, si) => (s.kind === 'stove' ? [si] : []))
    const pans = stoves.map((si) => (k.items[k.hold[si]!] as { pan: string }).pan)
    expect(new Set(pans)).toEqual(new Set(['wajan', 'panci']))
    const panci = stoves[pans.indexOf('panci')]
    const wajan = stoves[pans.indexOf('wajan')]
    // telur (goreng) tidak masuk panci, mie (rebus) masuk
    use(k, 0, at(k, 'crate', 'telur'))
    expect(use(k, 0, panci)).toBe(false)
    expect(use(k, 0, wajan)).toBe(true)
    use(k, 0, at(k, 'crate', 'mie'))
    expect(use(k, 0, panci)).toBe(true)
    // angkat panci berisi: kompor kosong menolak bahan langsung
    use(k, 0, panci)
    const counter = L.stations.findIndex((s, si) => s.kind === 'counter' && k.hold[si] === null && L.fronts[si].length > 0)
    use(k, 0, counter)
    use(k, 0, at(k, 'crate', 'daging'))
    expect(use(k, 0, panci)).toBe(false)
    // isi gosong di wajan: angkat wajan, buang isi ke tong, wajan tetap di tangan
    const egg = contentAt(k, wajan)!
    egg.s = 'burnt'
    use(k, 0, at(k, 'crate', 'daging'))
    use(k, 0, wajan)
    expect(isPot(k.items[k.hands[0]!])).toBe(true)
    use(k, 0, at(k, 'trash'))
    expect((k.items[k.hands[0]!] as { in: number | null }).in).toBeNull()
  })

  it('lempar: jatuh ke lantai lalu dipungut, ditangkap rekan yang menghadap, mendarat di wajan yang cocok', () => {
    const fly = (k: Kit, cooks: ({ x: number; z: number; yaw: number } | null)[]) => {
      for (let i = 0; i < 60 && k.flying.length; i++) {
        advance(k, 50, true, 2)
        resolveFlying(k, cooks)
      }
    }
    // ke lantai: lempar sepanjang lorong tanpa sasaran
    const k = newKit('burger', 2, 3)
    k.items[500] = { id: 500, k: 'food', ing: 'tomat', s: 'raw', p: 0 }
    k.hands[0] = 500
    expect(throwItem(k, 0, { x: -3, z: -1.8, yaw: Math.PI / 2 }, null)).toBe(true)
    expect(k.hands[0]).toBeNull()
    fly(k, [null, null])
    expect(k.floor.map((f) => f.id)).toEqual([500])
    const f = k.floor[0]
    expect(pickFloor(k, 1, 500, { x: f.x + 0.3, z: f.z, yaw: 0 })).toBe(true)
    expect(k.hands[1]).toBe(500)
    // ditangkap: rekan 3 m di depan, menghadap pelempar
    k.hands[1] = null
    k.hands[0] = 500
    k.floor = []
    throwItem(k, 0, { x: -3, z: -1.8, yaw: Math.PI / 2 }, { x: 0, z: -1.8, y: 1 })
    fly(k, [null, { x: 0, z: -1.8, yaw: -Math.PI / 2 }])
    expect(k.hands[1]).toBe(500)
    // ke wajan: daging mentah dibidik ke kompor
    const L = layoutOf('burger')
    const stove = at(k, 'stove')
    const st = L.stations[stove]
    k.items[501] = { id: 501, k: 'food', ing: 'daging', s: 'raw', p: 0 }
    k.hands[0] = 501
    throwItem(k, 0, { x: st.x - 3, z: st.z, yaw: Math.PI / 2 }, { x: st.x, z: st.z, y: 0.97 })
    fly(k, [null, null])
    expect(contentAt(k, stove)?.id).toBe(501)
  })

  it('bot memungut bahan yang jatuh di lantai', () => {
    const k = newKit('burger', 1, 3)
    const L = layoutOf('burger')
    const [sx, sz] = L.spawns[0]
    k.items[600] = { id: 600, k: 'food', ing: 'selada', s: 'raw', p: 0 }
    k.floor.push({ id: 600, x: sx + 2.4, z: sz })
    const w = spawnWalker(sx, sz)
    const b = newBot()
    for (let t = 0; t < 6 && k.floor.length; t += 0.05) stepBot(k, 0, b, w, 0.05, 3, [])
    expect(k.floor.length).toBe(0)
    expect(k.hands[0]).toBe(600)
  })

  it('tip beruntun: menyajikan pesanan paling tua berturut-turut menaikkan pengali, salah urut mengembalikannya', () => {
    const k = newKit('burger', 1, 5)
    const serve = at(k, 'serve')
    const plate = (id: number) => {
      k.items[id] = { id, k: 'plate', f: ['roti:raw', 'daging:cooked', 'selada:cut'] }
      k.hands[0] = id
    }
    for (let i = 0; i < 4; i++) k.orders.push({ id: 200 + i, r: 'burger', born: k.t + i, life: 80_000 })
    plate(901)
    use(k, 0, serve)
    expect(k.streak).toBe(2)
    plate(902)
    use(k, 0, serve)
    expect(k.streak).toBe(3)
    // pesanan yang lebih muda didahulukan: pengali balik
    k.orders.push({ id: 300, r: 'burgerKeju', born: k.t + 99, life: 80_000 })
    k.items[903] = { id: 903, k: 'plate', f: ['roti:raw', 'daging:cooked', 'keju:cut'] }
    k.hands[0] = 903
    use(k, 0, serve)
    expect(k.streak).toBe(1)
  })

  it('pesanan kedaluwarsa memotong skor', () => {
    const k = newKit('burger', 2, 3)
    for (let t = 0; t < 90_000; t += 100) advance(k, 100, true, 2)
    expect(k.missed).toBeGreaterThan(0)
  })
})

describe.each(KITCHEN_IDS)('dapur %s', (id) => {
  const L = layoutOf(id)
  it('semua stasiun bisa didatangi dari titik muncul', () => {
    const nav = buildNav(L)
    const [sx, sz] = L.spawns[0]
    L.stations.forEach((s, si) => {
      // meja sudut tanpa lantai di depannya hanya dinding
      if (s.kind === 'counter' && !L.fronts[si].length) return
      expect(L.fronts[si].some(([x, z]) => reachable(nav, sx, sz, x, z)), `stasiun ${s.kind} di ${s.c},${s.r}`).toBe(true)
    })
    expect(L.spawns.length).toBe(8)
  })

  it.each([1, 2, 4, 8])('%i bot koki dapat minimal satu bintang dalam 180 detik', (n) => {
    const k = newKit(id, n, 11)
    const walkers = L.spawns.slice(0, n).map(([x, z]) => spawnWalker(x, z))
    const bots = walkers.map(() => newBot())
    const dt = 0.05
    for (let t = 0; t < 180; t += dt) {
      advance(k, dt * 1000, true, n)
      bots.forEach((b, i) => {
        const claims = bots.flatMap((o, j) => (j !== i && o.plan ? [o.plan] : [])) as Plan[]
        stepBot(k, i, b, walkers[i], dt, 3, claims)
      })
    }
    expect(k.score, `dilayani ${k.served}, terlewat ${k.missed}`).toBeGreaterThanOrEqual(starGoals(id, n, 180)[0])
  })
})

describe('tim versus', () => {
  it('kursi selang-seling, bot mengisi kedua tim', () => {
    const s = init(1, { players: 2, total: 5, mode: 'versus' })
    expect(s.actors.map((a) => a.team)).toEqual([0, 1, 0, 1, 0])
    expect(init(1, { players: 1, total: 1, mode: 'versus' }).opts.mode).toBe('coop')
  })
})
