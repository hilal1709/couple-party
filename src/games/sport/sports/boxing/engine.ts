import type { Seat } from '../../../types'
import type { Attack, BoxHand, BoxingMatch, BoxOutcome, SportAction, SportOptions, Stance } from '../../types'

export const MAX_HP = 100
/** jeda dari pukulan terlihat sampai kena; dinilai di HP yang dipukul, jadi jeda jaringan tidak terasa */
export const IMPACT_MS = 620
/** tambahan untuk pemain kamera: badan dan kamera lebih lambat daripada jempol */
export const CAMERA_GRACE_MS = 220
/** lewat segini tanpa jawaban dari HP lawan, pukulan dihitung kena */
export const EXPIRE_MS = 1700
export const ROUND_MS = 45000
export const INTRO_MS = 2600
export const BREAK_MS = 3600

const BASE_HIT = 9
const POWER_HIT = 6
const BLOCK_HIT = 2
/** pukulan balasan setelah berhasil menghindar */
const COUNTER_X = 1.6

const STANCES: Stance[] = ['none', 'guard', 'dodgeL', 'dodgeR']

export function initBoxing(opts: SportOptions): BoxingMatch {
  return {
    kind: 'boxing',
    phase: 'intro',
    phaseId: 1,
    round: 1,
    rounds: opts.rounds,
    hp: [MAX_HP, MAX_HP],
    wins: [0, 0],
    stance: ['none', 'none'],
    attacks: [],
    nextId: 1,
    counter: [false, false],
    last: null,
    winners: [],
  }
}

/** Hasil pukulan menurut sikap pihak yang dipukul: hindar harus menjauhi tangan yang datang. */
export function defend(hand: BoxHand, stance: Stance): BoxOutcome {
  if (stance === 'guard') return 'block'
  return stance === `dodge${hand}` ? 'dodge' : 'hit'
}

function damage(a: Attack, outcome: BoxOutcome) {
  if (outcome === 'dodge') return 0
  if (outcome === 'block') return BLOCK_HIT
  const base = BASE_HIT + a.power * POWER_HIT
  return Math.round(a.counter ? base * COUNTER_X : base)
}

/** Ronde habis: yang darahnya lebih banyak dapat satu kemenangan; seri tidak dapat apa-apa. */
function closeRound(m: BoxingMatch): BoxingMatch {
  const [a, b] = m.hp
  const wins: [number, number] = [m.wins[0] + (a > b ? 1 : 0), m.wins[1] + (b > a ? 1 : 0)]
  const need = Math.floor(m.rounds / 2) + 1
  const done = m.round >= m.rounds || wins[0] >= need || wins[1] >= need
  const base = { ...m, wins, attacks: [], stance: ['none', 'none'] as [Stance, Stance], phaseId: m.phaseId + 1 }
  if (!done) return { ...base, phase: 'roundEnd' }
  return { ...base, phase: 'end', winners: wins[0] === wins[1] ? [0, 1] : [wins[0] > wins[1] ? 0 : 1] }
}

function resolve(m: BoxingMatch, a: Attack, outcome: BoxOutcome): BoxingMatch {
  const target = (1 - a.by) as Seat
  const dmg = damage(a, outcome)
  const hp: [number, number] = [...m.hp]
  hp[target] = Math.max(0, hp[target] - dmg)
  const counter: [boolean, boolean] = [...m.counter]
  // menghindar membuka peluang balasan
  if (outcome === 'dodge') counter[target] = true
  const ko = hp[target] === 0
  const next: BoxingMatch = { ...m, hp, counter, attacks: m.attacks.filter((x) => x.id !== a.id), last: { id: a.id, by: a.by, hand: a.hand, outcome, dmg, counter: a.counter, ko } }
  return ko ? closeRound(next) : next
}

export function reduceBoxing(m: BoxingMatch, a: SportAction, by: Seat): BoxingMatch {
  switch (a.type) {
    case 'stance': {
      if (m.phase !== 'fight' || !STANCES.includes(a.stance) || m.stance[by] === a.stance) return m
      const stance: [Stance, Stance] = [...m.stance]
      stance[by] = a.stance
      return { ...m, stance }
    }
    case 'punch': {
      if (m.phase !== 'fight' || (a.hand !== 'L' && a.hand !== 'R')) return m
      // satu pukulan di udara per pemain; yang lagi menangkis harus menurunkan tangan dulu
      if (m.attacks.some((x) => x.by === by) || m.stance[by] === 'guard') return m
      const power = Number.isFinite(a.power) ? Math.min(1, Math.max(0, a.power)) : 0
      const counter: [boolean, boolean] = [...m.counter]
      const attack: Attack = { id: m.nextId, by, hand: a.hand, power, counter: counter[by] }
      counter[by] = false
      return { ...m, attacks: [...m.attacks, attack], nextId: m.nextId + 1, counter }
    }
    case 'resolve': {
      const atk = m.attacks.find((x) => x.id === a.id)
      // hanya pihak yang dipukul yang boleh menilai
      if (m.phase !== 'fight' || !atk || atk.by === by || !['hit', 'block', 'dodge'].includes(a.outcome)) return m
      return resolve(m, atk, a.outcome)
    }
    case 'expire': {
      const atk = m.attacks.find((x) => x.id === a.id)
      return m.phase === 'fight' && atk ? resolve(m, atk, 'hit') : m
    }
    case 'bell':
      return m.phase === 'fight' && a.id === m.phaseId ? closeRound(m) : m
    case 'next':
      if (a.id !== m.phaseId) return m
      if (m.phase === 'intro') return { ...m, phase: 'fight', phaseId: m.phaseId + 1 }
      if (m.phase === 'roundEnd') return { ...m, phase: 'intro', phaseId: m.phaseId + 1, round: m.round + 1, hp: [MAX_HP, MAX_HP], counter: [false, false], last: null }
      return m
    default:
      return m
  }
}
