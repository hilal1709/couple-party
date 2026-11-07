import { beforeAll, describe, expect, it } from 'vitest'
import { newBody, stepBody, type Body, type Env, type Input } from '../sim/climb'
import { buildTerrain, type Terrain } from '../sim/terrain'
import { buildWorld, loadRapier, type ClimbWorld } from '../sim/world'
import { eventsPerSec, isNetMsg, packCore, packInput, ratesFor, SIM_DT, unpackInput, type InMsg, type SnapMsg } from './protocol'
import { HostClock, InputQueue, Interp, MAX_CREDIT, Predictor, STARVE_TICKS } from './sync'

const t: Terrain = buildTerrain('karang', 4, 42)
let world: ClimbWorld
const env = (): Env => ({ t, ropes: [...t.vines], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0, world })

beforeAll(async () => {
  await loadRapier()
  world = buildWorld(t)
})

/** jaringan palsu: tiap paket telat `lag ± jitter` ms, sebagian hilang (acak tetap) */
function makeNet(lag: number, jitter: number, loss: number, seed = 1) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const q: { at: number; to: 'host' | 'client'; m: unknown }[] = []
  return {
    send(now: number, to: 'host' | 'client', m: unknown) {
      if (rnd() < loss) return
      // lewat JSON seperti Supabase: angka yang tidak bisa diserialisasi ketahuan
      q.push({ at: now + lag + (rnd() * 2 - 1) * jitter, to, m: JSON.parse(JSON.stringify(m)) })
    },
    take(now: number, to: 'host' | 'client') {
      const out = q.filter((x) => x.to === to && x.at <= now).sort((a, b) => a.at - b.at)
      for (const x of out) q.splice(q.indexOf(x), 1)
      return out.map((x) => x.m)
    },
  }
}

function route() {
  const i = t.route.findIndex((p) => p.climb)
  const foot = t.route[i - 1]
  const top = t.route[i]
  const d = Math.hypot(top.x - foot.x, top.z - foot.z)
  // mulai beberapa meter di depan kaki tebing: jalan, lalu memanjat
  const start = { x: foot.x - ((top.x - foot.x) / d) * 6, z: foot.z - ((top.z - foot.z) / d) * 6 }
  return { foot, top, dir: [(top.x - foot.x) / d, (top.z - foot.z) / d] as const, start }
}

/**
 * Satu host + satu klien selama `secs`. Klien berjalan ke tebing lalu memanjat.
 * Mengembalikan koreksi terbesar yang dilihat klien dan selisih akhir prediksi vs host.
 */
function play(lag: number, jitter: number, loss: number, secs = 12, rate = { input: 10, snap: 10, red: 6 }) {
  const net = makeNet(lag, jitter, loss)
  const { foot, dir } = route()
  const host = newBody(foot.x - dir[0] * 6, foot.y, foot.z - dir[1] * 6, 0)
  const client: Body = structuredClone(host)
  const queue = new InputQueue()
  const pred = new Predictor()
  const e = env()
  const step = (b: Body, i: Input) => void stepBody(b, i, e, SIM_DT)
  let worstCorr = 0
  let snapN = 0
  let inAcc = 0
  let snapAcc = 0
  const ticks = Math.round(secs / SIM_DT)
  for (let k = 0; k < ticks; k++) {
    const now = k * SIM_DT * 1000
    // klien: input dari stik (ke tebing, tahan Pegang, dorong naik)
    const raw: Input = { mx: dir[0], mz: dir[1], up: 1, side: Math.sin(k * 0.05) * 0.3, jump: k % 90 === 45, grip: k > 40, sprint: false }
    const p = packInput(raw)
    const n = pred.record(p)
    step(client, unpackInput(p))
    pred.stamp(n, client)
    inAcc += SIM_DT
    if (inAcc >= 1 / rate.input) {
      inAcc = 0
      const r = pred.recent(rate.red)
      net.send(now, 'host', { k: 'in', a: 1, s: r.first, i: r.inputs } satisfies InMsg)
    }
    // host
    for (const m of net.take(now, 'host')) if (isNetMsg(m) && m.k === 'in') queue.push(m.s, m.i)
    for (const i of queue.take().inputs) step(host, i)
    snapAcc += SIM_DT
    if (snapAcc >= 1 / rate.snap) {
      snapAcc = 0
      net.send(now, 'client', { k: 'snap', n: ++snapN, ms: now, b: [[1, queue.ack, ...packCore(host)]] } satisfies SnapMsg)
    }
    // klien menerima snapshot
    for (const m of net.take(now, 'client')) {
      if (!isNetMsg(m) || m.k !== 'snap') continue
      const [, ack, ...core] = m.b[0]
      pred.reconcile(client, core, undefined, ack, step)
      worstCorr = Math.max(worstCorr, pred.lastError)
    }
  }
  return { worstCorr, host, client, dropped: queue.dropped }
}

describe('sinkron host-otoritatif', () => {
  it('jaringan sempurna: prediksi klien sama dengan host, koreksi nol', () => {
    const r = play(0, 0, 0)
    expect(r.host.mode).toBe(r.client.mode)
    expect(Math.hypot(r.host.x - r.client.x, r.host.y - r.client.y, r.host.z - r.client.z)).toBeLessThan(0.05)
    expect(r.worstCorr).toBeLessThan(0.05)
  })

  it('latensi 150 ms ± 40 ms, paket hilang 5%: tetap memanjat, koreksi kecil', () => {
    const r = play(150, 40, 0.05)
    // host benar-benar memanjat (bukan diam di kaki tebing)
    expect(r.host.y).toBeGreaterThan(route().foot.y + 3)
    // koreksi tampilan terbesar tetap kecil (dihaluskan offset tampilan)
    expect(r.worstCorr).toBeLessThan(0.6)
    // setelah selesai, prediksi klien dekat dengan host (sisa beda = input yang masih di jalan)
    expect(Math.abs(r.client.y - r.host.y)).toBeLessThan(3)
  })

  it('laju 4 pemain (5 Hz input/snapshot) dengan latensi 150 ms & loss 5%: tetap memanjat', () => {
    const r = ratesFor(4)
    const res = play(150, 40, 0.05, 12, { input: r.input, snap: r.snap, red: r.redundancy })
    expect(res.host.y).toBeGreaterThan(route().foot.y + 3)
    expect(res.worstCorr).toBeLessThan(0.8)
  })

  it('kuota Supabase: laju per jumlah pemain tetap di bawah ±90 kejadian/dtk', () => {
    for (const n of [2, 3, 4]) expect(eventsPerSec(ratesFor(n), n)).toBeLessThan(90)
  })

  it('latensi 250 ms, paket hilang 10%: masih bisa dimainkan', () => {
    const r = play(250, 60, 0.1)
    expect(r.host.y).toBeGreaterThan(route().foot.y + 3)
    expect(r.worstCorr).toBeLessThan(1.2)
  })
})

describe('InputQueue', () => {
  const go = (mx: number, extra: Partial<Input> = {}) => packInput({ mx, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false, ...extra })

  it('mengabaikan input ganda dari redundansi, menerapkan berurutan', () => {
    const q = new InputQueue()
    q.push(1, [go(1), go(0.5)])
    q.push(1, [go(1), go(0.5)])
    expect(q.take().inputs.map((i) => i.mx)).toEqual([1, 0.5])
    expect(q.ack).toBe(2)
    expect(q.take().inputs).toEqual([])
  })

  it('input belum datang: badan menunggu; sinyal hilang lama: diam tapi tetap berpegangan', () => {
    const q = new InputQueue()
    q.push(1, [go(1, { grip: true, up: 1 })])
    q.take()
    for (let i = 0; i < STARVE_TICKS; i++) expect(q.take().inputs).toEqual([])
    const lost = q.take()
    expect(lost.idle).toBe(true)
    expect(lost.inputs[0].mx).toBe(0)
    expect(lost.inputs[0].grip).toBe(true)
    expect(q.ack).toBe(1)
  })

  it('klien membanjiri input: rata-rata tetap 1 input per tick (tidak bisa lebih cepat)', () => {
    const q = new InputQueue()
    q.push(1, Array(24).fill(go(1)))
    let applied = 0
    for (let i = 0; i < 60; i++) {
      q.push(q.ack + 1, Array(6).fill(go(1)))
      applied += q.take().inputs.length
    }
    expect(applied).toBeLessThanOrEqual(60 + MAX_CREDIT)
  })

  it('membersihkan input jahat: nilai di luar −1..1 dan arah lebih dari 1 dipotong', () => {
    const i = unpackInput([50, 50, 9, -9, 7])
    expect(Math.hypot(i.mx, i.mz)).toBeLessThanOrEqual(1.0001)
    expect(i.up).toBe(1)
    expect(i.side).toBe(-1)
    expect(isNetMsg({ k: 'in', a: 1, s: 1, i: Array(100).fill([0, 0, 0, 0, 0]) })).toBe(false)
  })
})

describe('Interp & HostClock', () => {
  it('interpolasi halus di antara snapshot dan berhenti setelah 120 ms kehabisan data', () => {
    const it = new Interp()
    const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0, mode: 0, flags: 0, stamina: 1 })
    it.push(0, pose(0))
    it.push(100, pose(1))
    expect(it.sample(50)!.x).toBeCloseTo(0.5)
    expect(it.sample(150)!.x).toBeCloseTo(1.5)
    expect(it.sample(1000)!.x).toBeCloseTo(2.2)
  })

  it('jam host tidak mundur walau paket datang tidak rata', () => {
    const c = new HostClock()
    c.seen(1000, 0)
    const a = c.now(10)!
    c.seen(1050, 200)
    const b = c.now(20)!
    expect(b).toBeGreaterThanOrEqual(a)
  })
})
