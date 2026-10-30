import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { BODY_IDS, CHARACTERS, CUPS, ITEM_INFO, MAX_RACERS, POINTS, rollItem } from './data'
import { TRACK_IDS } from './tracks'
import type { Entity, KartAction, KartOptions, KartState, RaceEvent, Racer, TrackId } from './types'

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 8
/** batas benda di lintasan & kejadian yang disimpan (yang lama dibuang) */
const ENTITY_MAX = 36
const EVENT_MAX = 16
/** detik hitung mundur sebelum GO (dihitung di tiap HP sejak phaseId berubah) */
export const COUNTDOWN = 4
/** batas aman setelah pemain pertama finish, kalau ada yang putus koneksi (detik) */
export const FINISH_GRACE = 180
/** setelah semua pemain finish, bot yang masih di jalan ditunggu selama ini (detik) */
export const BOT_GRACE = 20

export function defaultOptions(players = 2): KartOptions {
  return { players, course: 'daun', laps: 3, bots: true, level: 'normal' }
}

export const isCup = (c: KartOptions['course']): c is keyof typeof CUPS => c in CUPS

export function scheduleOf(o: KartOptions): TrackId[] {
  return isCup(o.course) ? CUPS[o.course].tracks : [o.course as TrackId]
}

export function init(seed: number, options?: Partial<KartOptions>): KartState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, opts.players))
  const o = { ...opts, players: n, course: (isCup(opts.course) || TRACK_IDS.includes(opts.course as TrackId) ? opts.course : 'daun') as KartOptions['course'] }
  const total = o.bots ? MAX_RACERS : Math.max(n, 1)
  // pemain mulai dengan karakter sewarna kursinya; bot memakai sisanya
  const racers: Racer[] = Array.from({ length: total }, (_, i) => ({
    seat: i < n ? i : null,
    char: i % CHARACTERS.length,
    body: BODY_IDS[i % BODY_IDS.length],
  }))
  return {
    opts: o,
    rng: seed,
    phase: 'pick',
    phaseId: 0,
    racers,
    ready: Array(n).fill(false),
    schedule: scheduleOf(o),
    race: 0,
    ...freshRace(total),
    points: Array(total).fill(0),
    gained: Array(total).fill(0),
  }
}

function freshRace(total: number) {
  return {
    laps: Array(total).fill(0),
    times: Array<number | null>(total).fill(null),
    order: [] as number[],
    items: Array(total).fill(null),
    uses: Array(total).fill(0),
    entities: [] as Entity[],
    events: [] as RaceEvent[],
    seq: 0,
  }
}

/** kart milik kursi ini */
export const racerOf = (s: KartState, seat: Seat) => s.racers.findIndex((r) => r.seat === seat)

/** kursi `by` boleh mengendalikan kart `racer`: miliknya sendiri, atau host untuk bot */
function controls(s: KartState, by: Seat, racer: number): boolean {
  const r = s.racers[racer]
  if (!r) return false
  return r.seat === by || (r.seat === null && by === 0)
}

const humans = (s: KartState) => s.racers.map((r, i) => (r.seat !== null ? i : -1)).filter((i) => i >= 0)

function startRace(s: KartState): KartState {
  // bot mengambil karakter yang belum dipakai pemain, diacak
  const taken = new Set(s.racers.filter((r) => r.seat !== null).map((r) => r.char))
  const [free, rng] = shuffle(
    CHARACTERS.map((_, i) => i).filter((i) => !taken.has(i)),
    s.rng,
  )
  let k = 0
  const racers = s.racers.map((r, i) => (r.seat !== null ? r : { ...r, char: free[k++ % Math.max(1, free.length)] ?? i % CHARACTERS.length }))
  return { ...s, rng, racers, phase: 'race', phaseId: s.phaseId + 1, ...freshRace(racers.length), gained: Array(racers.length).fill(0) }
}

type NewEvent = RaceEvent extends infer E ? (E extends RaceEvent ? Omit<E, 'id'> : never) : never

function pushEvent(s: KartState, e: NewEvent): Pick<KartState, 'events' | 'seq'> {
  const id = s.seq + 1
  return { events: [...s.events, { ...e, id } as RaceEvent].slice(-EVENT_MAX), seq: id }
}

function finishRace(s: KartState, rest: number[]): KartState {
  const order = [...s.order]
  for (const r of rest) if (!order.includes(r) && s.racers[r]) order.push(r)
  for (let i = 0; i < s.racers.length; i++) if (!order.includes(i)) order.push(i)
  const gained = Array(s.racers.length).fill(0)
  order.forEach((r, pos) => (gained[r] = POINTS[pos] ?? 0))
  return {
    ...s,
    order,
    phase: 'results',
    phaseId: s.phaseId + 1,
    gained,
    points: s.points.map((p, i) => p + gained[i]),
  }
}

/** urutan klasemen Grand Prix: poin terbanyak, seri → posisi balapan terakhir */
export function standings(s: KartState): number[] {
  return s.racers
    .map((_, i) => i)
    .sort((a, b) => s.points[b] - s.points[a] || s.order.indexOf(a) - s.order.indexOf(b))
}

export function reduce(s: KartState, a: KartAction, by: Seat): KartState {
  switch (a.type) {
    case 'pick': {
      const me = racerOf(s, by)
      if (s.phase !== 'pick' || me < 0 || s.ready[by]) return s
      if (!CHARACTERS[a.char] || !BODY_IDS.includes(a.body)) return s
      // karakter tidak boleh kembar antar pemain
      if (s.racers.some((r, i) => i !== me && r.seat !== null && r.char === a.char)) return s
      return { ...s, racers: s.racers.map((r, i) => (i === me ? { ...r, char: a.char, body: a.body } : r)) }
    }
    case 'ready': {
      if (s.phase !== 'pick' || s.ready[by] === undefined || s.ready[by]) return s
      const ready = s.ready.map((v, i) => v || i === by)
      const next = { ...s, ready }
      return ready.every(Boolean) ? startRace(next) : next
    }
    case 'go':
      if (by !== 0 || s.phase !== 'pick') return s
      return startRace(s)

    case 'box': {
      if (s.phase !== 'race' || !controls(s, by, a.racer) || s.items[a.racer] || s.times[a.racer] !== null) return s
      const [r, rng] = nextRand(s.rng)
      const kind = rollItem(r, Math.max(0, a.rank), s.racers.length)
      return {
        ...s,
        rng,
        items: s.items.map((v, i) => (i === a.racer ? kind : v)),
        uses: s.uses.map((v, i) => (i === a.racer ? ITEM_INFO[kind].uses : v)),
      }
    }
    case 'use': {
      const kind = s.items[a.racer]
      if (s.phase !== 'race' || !controls(s, by, a.racer) || !kind) return s
      const left = s.uses[a.racer] - 1
      const base = {
        ...s,
        items: s.items.map((v, i) => (i === a.racer ? (left > 0 ? v : null) : v)),
        uses: s.uses.map((v, i) => (i === a.racer ? Math.max(0, left) : v)),
      }
      const id = s.seq + 1
      let entity: Entity | null = null
      if (kind === 'pisang' || kind === 'pisang3') entity = { id, kind: 'pisang', by: a.racer, x: a.x, z: a.z }
      else if (kind === 'roket') entity = { id, kind: 'roket', by: a.racer, s: a.s, lane: a.lane }
      else if (kind === 'petasan') entity = { id, kind: 'petasan', by: a.racer, x: a.x, z: a.z }
      if (entity) return { ...base, seq: id, entities: [...s.entities, entity].slice(-ENTITY_MAX) }
      // efek langsung (turbo, perisai, magnet) sudah dijalankan di HP pemakai; awan perlu dilihat semua
      return { ...base, ...pushEvent(s, kind === 'awan' ? { kind: 'awan', by: a.racer } : { kind: 'use', racer: a.racer, item: kind }) }
    }
    case 'hit': {
      if (s.phase !== 'race' || !controls(s, by, a.racer)) return s
      const e = s.entities.find((x) => x.id === a.id)
      if (!e) return s
      // petasan meledak di area: tidak hilang saat mengenai satu kart
      const entities = e.kind === 'petasan' ? s.entities : s.entities.filter((x) => x.id !== a.id)
      return { ...s, entities, ...pushEvent(s, { kind: 'hit', racer: a.racer, by: e.by, item: e.kind }) }
    }
    case 'lap': {
      if (s.phase !== 'race' || !controls(s, by, a.racer) || a.lap <= s.laps[a.racer] || a.lap >= s.opts.laps) return s
      return { ...s, laps: s.laps.map((v, i) => (i === a.racer ? a.lap : v)) }
    }
    case 'finish': {
      if (s.phase !== 'race' || !controls(s, by, a.racer) || s.times[a.racer] !== null) return s
      const next = {
        ...s,
        laps: s.laps.map((v, i) => (i === a.racer ? s.opts.laps : v)),
        times: s.times.map((v, i) => (i === a.racer ? Math.max(0, Math.round(a.time)) : v)),
        order: [...s.order, a.racer],
        items: s.items.map((v, i) => (i === a.racer ? null : v)),
      }
      // semua pemain sudah finish → selesai (bot sisanya diurutkan host lewat 'end')
      return humans(next).every((i) => next.times[i] !== null) && next.racers.every((_, i) => next.times[i] !== null) ? finishRace(next, []) : next
    }
    case 'end':
      if (by !== 0 || s.phase !== 'race') return s
      return finishRace(s, a.rest)

    case 'next': {
      if (by !== 0) return s
      if (s.phase === 'results') {
        const last = s.race >= s.schedule.length - 1
        return { ...s, phase: last ? 'end' : 'standings', phaseId: s.phaseId + 1 }
      }
      if (s.phase === 'standings') return startRace({ ...s, race: s.race + 1 })
      return s
    }
    case 'again': {
      if (by !== 0 || s.phase !== 'end') return s
      const fresh = init(s.rng, s.opts)
      // pilihan karakter dipertahankan
      return { ...fresh, racers: fresh.racers.map((r, i) => (r.seat !== null ? { ...r, char: s.racers[i].char, body: s.racers[i].body } : r)) }
    }
  }
}

/** semua pemain manusia sudah finish (host lalu menutup balapan untuk bot) */
export const humansDone = (s: KartState) => humans(s).every((i) => s.times[i] !== null)
