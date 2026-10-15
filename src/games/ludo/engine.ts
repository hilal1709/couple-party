import { nextRand } from '../rng'
import type { Seat } from '../types'
import { armsFor, BOOST, finishOf, isSafe, minArms, SLIP, specialAt, trackIndex, trackLen } from './board'
import { ARM, type LudoAction, type LudoOptions, type LudoState, type Move, type Note, type Prog } from './types'

export function defaultOptions(players = 2): LudoOptions {
  return { players, arms: minArms(players), pieces: 4, teams: false, specials: true, freeOut: false }
}

/** Mode tim butuh jumlah pemain genap minimal 4. */
export const teamsAllowed = (players: number) => players >= 4 && players % 2 === 0

export function init(seed: number, options?: Partial<LudoOptions>): LudoState {
  const base = { ...defaultOptions(options?.players ?? 2), ...options }
  const n = Math.min(8, Math.max(2, base.players))
  const arms = base.arms >= n ? base.arms : minArms(n)
  const opts: LudoOptions = { ...base, players: n, arms, teams: base.teams && teamsAllowed(n) }
  return {
    opts,
    rng: seed,
    arm: armsFor(n, arms),
    team: Array.from({ length: n }, (_, i) => (opts.teams ? i % 2 : i)),
    prog: Array.from({ length: n }, () => Array(opts.pieces).fill(-1)),
    turn: 0,
    phase: 'roll',
    die: null,
    sixes: 0,
    bonus: false,
    winner: null,
    eventId: 0,
    event: null,
  }
}

/* ---------- helper murni untuk UI, bot & tes ---------- */

export const finish = (s: LudoState) => finishOf(s.opts.arms)
export const doneAll = (s: LudoState, seat: Seat) => s.prog[seat].every((p) => p === finish(s))

/** Kursi yang bidaknya boleh digerakkan `seat`: miliknya sendiri, atau rekan setim kalau semua bidaknya sudah finis. */
export function ownersFor(s: LudoState, seat: Seat): Seat[] {
  if (!doneAll(s, seat) || !s.opts.teams) return [seat]
  return s.team.map((t, i) => (t === s.team[seat] && i !== seat && !doneAll(s, i) ? i : -1)).filter((i) => i >= 0)
}

const canExit = (s: LudoState, roll: number) => roll === 6 || s.opts.freeOut

/** Tujuan bidak kalau digerakkan `roll` langkah; null kalau tidak sah. */
export function target(s: LudoState, owner: Seat, piece: number, roll: number): Prog | null {
  const p = s.prog[owner][piece]
  const F = finish(s)
  if (p === F) return null
  if (p < 0) return canExit(s, roll) ? (s.opts.freeOut ? roll - 1 : 0) : null
  return p + roll <= F ? p + roll : null
}

/** Semua langkah sah untuk giliran ini (bidak di kandang dianggap satu pilihan). */
export function legalMoves(s: LudoState, roll = s.die ?? 0): { owner: Seat; piece: number }[] {
  if (!roll) return []
  const out: { owner: Seat; piece: number }[] = []
  for (const owner of ownersFor(s, s.turn)) {
    let yard = false
    s.prog[owner].forEach((p, piece) => {
      if (target(s, owner, piece, roll) === null) return
      if (p < 0) {
        if (yard) return
        yard = true
      }
      out.push({ owner, piece })
    })
  }
  return out
}

/** Bidak lawan (bukan setim) yang berdiri di petak keliling `t`. */
function enemiesAt(s: LudoState, owner: Seat, t: number): { seat: Seat; piece: number }[] {
  const hit: { seat: Seat; piece: number }[] = []
  s.prog.forEach((ps, seat) => {
    if (s.team[seat] === s.team[owner]) return
    ps.forEach((p, piece) => {
      if (trackIndex(s.opts.arms, s.arm[seat], p) === t) hit.push({ seat, piece })
    })
  })
  return hit
}

/** Peringkat: tim pemenang dulu, lalu jumlah bidak finis, lalu total kemajuan bidak. */
export function standings(s: LudoState): Seat[] {
  const home = (i: Seat) => s.prog[i].filter((p) => p === finish(s)).length
  const score = (i: Seat) => s.prog[i].reduce((a, p) => a + Math.max(0, p) + 1, 0)
  return s.prog
    .map((_, i) => i)
    .sort((a, b) => Number(s.team[b] === s.winner) - Number(s.team[a] === s.winner) || home(b) - home(a) || score(b) - score(a))
}

/* ---------- mesin ---------- */

type Draft = LudoState & { log: Note[]; moves: Move[] }

function rand(d: Draft, n: number): number {
  const [r, s] = nextRand(d.rng)
  d.rng = s
  return Math.floor(r * n)
}

function draft(s: LudoState): Draft {
  return { ...structuredClone(s), log: [], moves: [] }
}

function emit(d: Draft, by: Seat, dice?: number): LudoState {
  const { log, moves, ...rest } = d
  return { ...rest, eventId: d.eventId + 1, event: { by, dice, moves, log } }
}

const pathOf = (from: Prog, to: Prog) => {
  const out: Prog[] = [from]
  const step = to > from ? 1 : -1
  // dari kandang langsung loncat ke petak keluar
  if (from < 0) return [from, to]
  for (let p = from + step; step > 0 ? p <= to : p >= to; p += step) out.push(p)
  return out
}

function sendHome(d: Draft, seat: Seat, piece: number) {
  d.moves.push({ seat, piece, path: [d.prog[seat][piece], -1], jump: true })
  d.prog[seat][piece] = -1
}

/** Bidak berhenti: tangkap lawan di petak tak aman. Mengembalikan true kalau ada yang ditangkap. */
function capture(d: Draft, owner: Seat, piece: number): boolean {
  const t = trackIndex(d.opts.arms, d.arm[owner], d.prog[owner][piece])
  if (t === null) return false
  const hit = enemiesAt(d, owner, t)
  if (!hit.length) return false
  if (isSafe(t)) {
    d.log.push({ t: 'safe' })
    return false
  }
  for (const h of hit) {
    d.log.push({ t: 'capture', seat: owner, piece, victim: h.seat, vpiece: h.piece })
    sendHome(d, h.seat, h.piece)
  }
  return true
}

/** Efek petak jahil; tidak berantai. */
function special(d: Draft, owner: Seat, piece: number) {
  if (!d.opts.specials) return
  const p = d.prog[owner][piece]
  const t = trackIndex(d.opts.arms, d.arm[owner], p)
  if (t === null) return
  const fx = specialAt(t)
  if (!fx) return
  const L = trackLen(d.opts.arms)
  const F = finishOf(d.opts.arms)
  switch (fx) {
    case 'boost': {
      const to = Math.min(p + BOOST, F - 1)
      d.log.push({ t: 'special', fx, seat: owner, piece })
      d.moves.push({ seat: owner, piece, path: pathOf(p, to) })
      d.prog[owner][piece] = to
      if (capture(d, owner, piece)) d.bonus = true
      return
    }
    case 'slip': {
      const to = Math.max(0, p - SLIP)
      d.log.push({ t: 'special', fx, seat: owner, piece })
      d.moves.push({ seat: owner, piece, path: pathOf(p, to) })
      d.prog[owner][piece] = to
      if (capture(d, owner, piece)) d.bonus = true
      return
    }
    case 'portal': {
      // loncat ke petak yang sama di lengan berikutnya, asal belum lewat pintu rumah
      const to = p + ARM
      if (to >= L) return
      d.log.push({ t: 'special', fx, seat: owner, piece })
      d.moves.push({ seat: owner, piece, path: [p, to], jump: true })
      d.prog[owner][piece] = to
      if (capture(d, owner, piece)) d.bonus = true
      return
    }
    case 'bomb': {
      // pulangkan bidak lawan terdekat di depan (bukan di petak aman, bukan di jalur rumah)
      let best: { seat: Seat; piece: number; dist: number } | null = null
      const N = ARM * d.opts.arms
      d.prog.forEach((ps, seat) => {
        if (d.team[seat] === d.team[owner]) return
        ps.forEach((q, qi) => {
          const tq = trackIndex(d.opts.arms, d.arm[seat], q)
          if (tq === null || isSafe(tq)) return
          const dist = (tq - t + N) % N
          if (dist > 0 && (!best || dist < best.dist)) best = { seat, piece: qi, dist }
        })
      })
      const b = best as { seat: Seat; piece: number } | null
      d.log.push({ t: 'special', fx, seat: owner, piece, victim: b?.seat })
      if (b) sendHome(d, b.seat, b.piece)
      return
    }
  }
}

function teamDone(d: LudoState, team: number) {
  return d.team.every((t, i) => t !== team || doneAll(d, i))
}

/** Pindah giliran: bonus = lempar lagi; kursi yang sudah selesai (tanpa rekan tersisa) dilewati. */
function endTurn(d: Draft) {
  d.phase = 'roll'
  d.die = null
  if (d.winner !== null) {
    d.phase = 'end'
    return
  }
  if (d.bonus && ownersFor(d, d.turn).length && !(doneAll(d, d.turn) && !d.opts.teams)) {
    d.bonus = false
    return
  }
  d.bonus = false
  d.sixes = 0
  const n = d.opts.players
  let next = d.turn
  for (let guard = 0; guard < n; guard++) {
    next = (next + 1) % n
    if (!doneAll(d, next) || (d.opts.teams && ownersFor(d, next).length)) break
  }
  d.turn = next
}

function applyMove(d: Draft, owner: Seat, piece: number) {
  const roll = d.die!
  const from = d.prog[owner][piece]
  const to = target(d, owner, piece, roll)!
  d.prog[owner][piece] = to
  d.moves.push({ seat: owner, piece, path: pathOf(from, to) })
  d.log.push(from < 0 ? { t: 'out', seat: owner, piece } : { t: 'move', seat: owner, piece })
  if (roll === 6) d.bonus = true

  if (to === finish(d)) {
    d.log.push({ t: 'home', seat: owner, piece })
    d.bonus = true
    if (doneAll(d, owner)) d.log.push({ t: 'allHome', seat: owner })
    if (teamDone(d, d.team[owner])) {
      d.winner = d.team[owner]
      d.log.push({ t: 'win', team: d.winner })
    }
  } else {
    if (capture(d, owner, piece)) d.bonus = true
    else special(d, owner, piece)
  }
  if (d.bonus && d.winner === null) d.log.push({ t: 'bonus', why: roll === 6 ? 'six' : d.log.some((n) => n.t === 'home') ? 'home' : 'capture' })
  endTurn(d)
}

export function reduce(s: LudoState, a: LudoAction, by: Seat): LudoState {
  if (a.type === 'again') {
    if (s.phase !== 'end') return s
    return init(s.rng, s.opts)
  }
  if (s.phase === 'end' || by !== s.turn) return s

  switch (a.type) {
    case 'roll': {
      if (s.phase !== 'roll') return s
      const d = draft(s)
      const roll = 1 + rand(d, 6)
      d.die = roll
      if (roll === 6) {
        d.sixes++
        d.log.push({ t: 'six' })
        if (d.sixes >= 3) {
          // tiga kali 6 beruntun: hangus
          d.log.push({ t: 'tripleSix' })
          d.bonus = false
          endTurn(d)
          return emit(d, by, roll)
        }
      }
      const moves = legalMoves(d, roll)
      if (!moves.length) {
        d.log.push({ t: 'noMove' })
        d.bonus = roll === 6
        endTurn(d)
        return emit(d, by, roll)
      }
      if (moves.length === 1) {
        applyMove(d, moves[0].owner, moves[0].piece)
        return emit(d, by, roll)
      }
      d.phase = 'move'
      return emit(d, by, roll)
    }

    case 'move': {
      if (s.phase !== 'move') return s
      if (!legalMovesAll(s).some((m) => m.owner === a.owner && m.piece === a.piece)) return s
      const d = draft(s)
      applyMove(d, a.owner, a.piece)
      return emit(d, by)
    }
  }
  return s
}

/** Semua bidak yang boleh dipilih (termasuk tiap bidak kandang, bukan cuma satu wakil). */
export function legalMovesAll(s: LudoState): { owner: Seat; piece: number }[] {
  if (s.phase !== 'move' || !s.die) return []
  const out: { owner: Seat; piece: number }[] = []
  for (const owner of ownersFor(s, s.turn)) s.prog[owner].forEach((_, piece) => target(s, owner, piece, s.die!) !== null && out.push({ owner, piece }))
  return out
}
