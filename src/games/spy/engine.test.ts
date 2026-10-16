import { describe, expect, it } from 'vitest'
import { lcg, randomStep } from './dev'
import { POINTS, aliveSeats, clueProblem, defaultOptions, guessMatches, init, reduce, roleCounts } from './engine'
import { LOCATIONS } from './locations'
import type { Role, SpyAction, SpyOptions, SpyState } from './types'
import { PACK_PAIRS, parseCustom } from './words'

const start = (players = 5, opts: Partial<SpyOptions> = {}) => init(11, { ...defaultOptions(players), ...opts })
const run = (s: SpyState, ...steps: [SpyAction, number][]) => steps.reduce((cur, [a, by]) => reduce(cur, a, by), s)
const seatOf = (s: SpyState, r: Role) => s.roles.indexOf(r)
const seatsOf = (s: SpyState, r: Role) => s.roles.map((x, i) => (x === r ? i : -1)).filter((i) => i >= 0)

/** semua siap, lalu semua yang hidup memberi petunjuk sampai fase voting */
function toVote(s: SpyState): SpyState {
  let st = s
  if (st.phase === 'role') st = reduce(st, { type: 'next' }, 0)
  for (let k = 0; st.phase === 'clue' && k < 20; k++) st = reduce(st, { type: 'clue', text: `petunjuk ${k}` }, st.turn)
  expect(st.phase).toBe('vote')
  return st
}

/** semua yang hidup memilih `target` (target sendiri memilih orang lain) */
function voteOut(s: SpyState, target: number): SpyState {
  let st = s
  for (const by of aliveSeats(s)) {
    const t = by === target ? aliveSeats(s).find((x) => x !== target)! : target
    st = reduce(st, { type: 'vote', target: t }, by)
  }
  return st
}

describe('peran', () => {
  it('susunan peran mengikuti jumlah pemain', () => {
    expect(roleCounts({ ...defaultOptions(3) })).toMatchObject({ warga: 2, penyusup: 1, mrwhite: 0 })
    expect(roleCounts({ ...defaultOptions(4) })).toMatchObject({ warga: 3, penyusup: 1, mrwhite: 0 })
    expect(roleCounts({ ...defaultOptions(5) })).toMatchObject({ warga: 3, penyusup: 1, mrwhite: 1 })
    expect(roleCounts({ ...defaultOptions(8) })).toMatchObject({ warga: 5, penyusup: 2, mrwhite: 1 })
    expect(roleCounts({ ...defaultOptions(8), mrWhite: false })).toMatchObject({ warga: 6, penyusup: 2, mrwhite: 0 })
    expect(roleCounts({ ...defaultOptions(6), mode: 'lokasi' })).toMatchObject({ warga: 5, spy: 1 })
  })

  it('warga & penyusup dapat kata berbeda, Mr. White kosong, pembuka bukan Mr. White', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = init(seed, defaultOptions(6))
      const civ = seatsOf(s, 'warga').map((i) => s.secret[i])
      expect(new Set(civ).size).toBe(1)
      expect(s.secret[seatOf(s, 'penyusup')]).toBe(s.decoy)
      expect(s.decoy).not.toBe(s.answer)
      expect(s.secret[seatOf(s, 'mrwhite')]).toBe('')
      expect(s.roles[s.starter]).not.toBe('mrwhite')
    }
  })

  it('mode lokasi: semua tahu lokasi & punya pekerjaan kecuali mata-mata', () => {
    const s = start(6, { mode: 'lokasi' })
    const spy = seatOf(s, 'spy')
    expect(LOCATIONS.some((l) => l.name === s.answer)).toBe(true)
    s.roles.forEach((_, i) => {
      expect(s.secret[i]).toBe(i === spy ? '' : s.answer)
      expect(Boolean(s.jobs[i])).toBe(i !== spy)
    })
  })

  it('semua siap → giliran petunjuk dimulai dari pembuka', () => {
    let s = start(3)
    s = run(s, [{ type: 'ready' }, 0], [{ type: 'ready' }, 1])
    expect(s.phase).toBe('role')
    s = reduce(s, { type: 'ready' }, 2)
    expect(s.phase).toBe('clue')
    expect(s.turn).toBe(s.starter)
  })
})

describe('petunjuk', () => {
  it('menolak petunjuk yang menyebut kata sendiri', () => {
    const s = { ...start(4), secret: ['Kupu-kupu', 'Kupu-kupu', 'Capung', 'Kupu-kupu'] }
    expect(clueProblem(s, 0, 'kupu kupu terbang')).toBeTruthy()
    expect(clueProblem(s, 0, 'kupu')).toBeTruthy()
    expect(clueProblem(s, 0, 'bersayap')).toBeNull()
    expect(clueProblem(s, 0, '   ')).toBeTruthy()
    expect(clueProblem(s, 0, 'x'.repeat(30))).toBeTruthy()
  })

  it('hanya yang gilirannya boleh memberi petunjuk; putaran penuh → voting', () => {
    let s = reduce(start(4, { mrWhite: false }), { type: 'next' }, 0)
    const other = (s.turn + 1) % 4
    expect(reduce(s, { type: 'clue', text: 'halo' }, other)).toBe(s)
    s = toVote(s)
    expect(s.clues).toHaveLength(4)
  })

  it('waktu habis dicatat sebagai petunjuk kosong', () => {
    const s = reduce(reduce(start(4), { type: 'next' }, 0), { type: 'timeUp' }, 0)
    expect(s.clues[0].text).toBe('')
  })
})

describe('voting', () => {
  it('suara terbanyak tereliminasi, perannya dibuka di fase out', () => {
    let s = toVote(start(4, { mrWhite: false }))
    const civ = seatsOf(s, 'warga')[0]
    s = voteOut(s, civ)
    expect(s.phase).toBe('out')
    expect(s.lastOut).toBe(civ)
    expect(s.alive[civ]).toBe(false)
  })

  it('seri → voting ulang antar yang seri; seri lagi → tak ada yang keluar', () => {
    let s = toVote(start(4, { mrWhite: false }))
    s = run(s, [{ type: 'vote', target: 1 }, 0], [{ type: 'vote', target: 0 }, 1], [{ type: 'vote', target: 0 }, 2], [{ type: 'vote', target: 1 }, 3])
    expect(s.phase).toBe('vote')
    expect(s.candidates).toEqual([0, 1])
    // di luar kandidat ditolak
    expect(reduce(s, { type: 'vote', target: 2 }, 3)).toBe(s)
    s = run(s, [{ type: 'vote', target: 1 }, 0], [{ type: 'vote', target: 0 }, 1], [{ type: 'vote', target: 0 }, 2], [{ type: 'vote', target: 1 }, 3])
    expect(s.phase).toBe('out')
    expect(s.lastOut).toBeNull()
  })

  it('tidak boleh memilih diri sendiri', () => {
    const s = toVote(start(4))
    expect(reduce(s, { type: 'vote', target: 0 }, 0)).toBe(s)
  })
})

describe('akhir ronde & poin', () => {
  it('penyusup ketahuan → warga menang, tiap warga dapat poin', () => {
    let s = toVote(start(4, { mrWhite: false }))
    s = voteOut(s, seatOf(s, 'penyusup'))
    s = reduce(s, { type: 'next' }, 0)
    expect(s.phase).toBe('roundEnd')
    expect(s.winner).toBe('warga')
    seatsOf(s, 'warga').forEach((i) => expect(s.gained[i]).toBe(POINTS.warga))
    expect(s.gained[seatOf(s, 'penyusup')]).toBe(0)
  })

  it('penyusup bertahan sampai jumlahnya menyamai warga → penyusup menang', () => {
    let s = toVote(start(3))
    s = voteOut(s, seatsOf(s, 'warga')[0])
    s = reduce(s, { type: 'next' }, 0)
    expect(s.winner).toBe('penyusup')
    expect(s.result).toBe('survive')
    expect(s.gained[seatOf(s, 'penyusup')]).toBe(POINTS.survive)
  })

  it('Mr. White ketahuan lalu menebak benar → dia menang sendiri', () => {
    let s = toVote(start(5))
    const mw = seatOf(s, 'mrwhite')
    s = reduce(voteOut(s, mw), { type: 'next' }, 0)
    expect(s.phase).toBe('guess')
    expect(reduce(s, { type: 'guess', text: s.answer }, (mw + 1) % 5)).toBe(s)
    s = reduce(s, { type: 'guess', text: ` ${s.answer.toUpperCase()} ` }, mw)
    expect(s.phase).toBe('roundEnd')
    expect(s.result).toBe('guessed')
    expect(s.gained[mw]).toBe(POINTS.mrwhite)
  })

  it('Mr. White menebak salah → ronde lanjut ke putaran petunjuk berikutnya', () => {
    let s = toVote(start(5))
    const mw = seatOf(s, 'mrwhite')
    s = reduce(reduce(voteOut(s, mw), { type: 'next' }, 0), { type: 'guess', text: 'ngawur banget' }, mw)
    expect(s.phase).toBe('clue')
    expect(s.cycle).toBe(2)
    expect(s.guessOk).toBe(false)
    expect(s.alive[s.turn]).toBe(true)
  })

  it('mata-mata nekat menebak lokasi: benar menang, salah kalah', () => {
    const base = reduce(start(4, { mode: 'lokasi' }), { type: 'next' }, 0)
    const spy = seatOf(base, 'spy')
    const right = reduce(base, { type: 'guess', text: base.answer }, spy)
    expect(right.winner).toBe('penyusup')
    expect(right.gained[spy]).toBe(POINTS.spy)
    const wrong = reduce(base, { type: 'guess', text: LOCATIONS.find((l) => l.name !== base.answer)!.name }, spy)
    expect(wrong.winner).toBe('warga')
    expect(wrong.result).toBe('blunder')
    // warga tidak bisa "menebak"
    expect(reduce(base, { type: 'guess', text: base.answer }, (spy + 1) % 4)).toBe(base)
  })

  it('tebakan toleran salah ketik satu huruf untuk kata panjang', () => {
    expect(guessMatches('kupu kupu', 'Kupu-kupu')).toBe(true)
    expect(guessMatches('kupu-kopu', 'kupu-kupu')).toBe(true)
    expect(guessMatches('kucin', 'kucing')).toBe(true)
    expect(guessMatches('teh', 'tea')).toBe(false)
  })

  it('setelah semua ronde, skor terbanyak juara (bisa seri) dan "again" mulai ulang', () => {
    const rnd = lcg(5)
    let s: SpyState = start(6, { rounds: 3 })
    for (let i = 0; i < 5000 && s.phase !== 'end'; i++) s = randomStep(s, rnd) ?? s
    expect(s.phase).toBe('end')
    const top = Math.max(...s.scores)
    expect(s.winners!.every((w) => s.scores[w] === top)).toBe(true)
    const again = reduce(s, { type: 'again' }, 0)
    expect(again.phase).toBe('role')
    expect(again.scores.every((p) => p === 0)).toBe(true)
  })

  it('simulasi acak semua jumlah pemain & mode selesai tanpa macet', () => {
    for (const mode of ['kata', 'lokasi'] as const)
      for (let n = 3; n <= 8; n++) {
        const rnd = lcg(n * 7)
        let s: SpyState = init(n, { ...defaultOptions(n), mode, rounds: 3 })
        for (let i = 0; i < 5000 && s.phase !== 'end'; i++) s = randomStep(s, rnd) ?? s
        expect(s.phase).toBe('end')
        expect(s.round).toBe(3)
      }
  })
})

describe('kata', () => {
  it('pasangan paket lengkap & tidak kembar', () => {
    for (const list of Object.values(PACK_PAIRS)) {
      expect(list.length).toBeGreaterThanOrEqual(50)
      list.forEach(([a, b]) => {
        expect(a && b).toBeTruthy()
        expect(a).not.toBe(b)
      })
    }
  })

  it('parseCustom: "a / b" per baris, buang yang rusak & dobel', () => {
    expect(parseCustom('kopi / teh\nteh/kopi, susu, a/b, nasi / nasi, mie/bihun')).toEqual([
      ['kopi', 'teh'],
      ['mie', 'bihun'],
    ])
  })

  it('tiap lokasi punya cukup pekerjaan', () => {
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(20)
    LOCATIONS.forEach((l) => expect(l.jobs.length).toBeGreaterThanOrEqual(7))
  })
})
