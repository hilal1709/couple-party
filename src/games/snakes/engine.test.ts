import { describe, expect, it } from 'vitest'
import { cellOf, makeBoard } from './board'
import { QUIZ } from './challenges'
import { BONUS, canUseItem, defaultOptions, init, reduce, SETBACK } from './engine'
import { GOAL, type Board, type SnakesOptions, type SnakesState } from './types'

/** State buatan dengan papan & posisi yang ditentukan; dadu tetap acak dari seed. */
function table(board: Partial<Board>, pos: number[], opts: Partial<SnakesOptions> = {}): SnakesState {
  const base = init(11, { ...defaultOptions(), players: pos.length, ...opts })
  return { ...base, board: { jumps: {}, tiles: {}, ...board }, pos }
}

/** Cari seed RNG yang menghasilkan lemparan dadu tertentu. */
function withRoll(s: SnakesState, want: number): SnakesState {
  for (let rng = 1; rng < 10_000; rng++) {
    const t = { ...s, rng }
    const after = reduce(t, { type: 'roll' }, t.turn)
    if (after.event?.dice?.[0] === want) return t
  }
  throw new Error('seed tidak ketemu')
}

describe('papan', () => {
  it('valid untuk banyak seed: tidak bertumpuk, 1 & 100 polos, tiles tidak di ujung ular/tangga', () => {
    for (let seed = 1; seed < 300; seed++) {
      const [b] = makeBoard(defaultOptions(), seed)
      const ends = Object.entries(b.jumps).flatMap(([f, t]) => [Number(f), t])
      expect(new Set(ends).size).toBe(ends.length)
      expect(ends).not.toContain(1)
      expect(ends).not.toContain(GOAL)
      expect(Object.keys(b.jumps)).toHaveLength(12)
      for (const t of Object.keys(b.tiles).map(Number)) expect(ends).not.toContain(t)
      for (const t of Object.keys(b.tiles).map(Number)) expect(t > 1 && t < GOAL).toBe(true)
    }
  })

  it('kotak spesial ikut pengaturan', () => {
    const [b] = makeBoard({ ...defaultOptions(), challenges: false, effects: false, items: false, quiz: false }, 5)
    expect(Object.keys(b.tiles)).toHaveLength(0)
    const [b2] = makeBoard({ ...defaultOptions(), effects: false, items: false, quiz: false }, 5)
    expect(Object.values(b2.tiles).every((t) => t.kind === 'challenge')).toBe(true)
  })

  it('zig-zag: 1 kiri bawah, 11 kanan baris kedua, 100 kiri atas', () => {
    expect(cellOf(1)).toEqual({ row: 0, col: 0 })
    expect(cellOf(10)).toEqual({ row: 0, col: 9 })
    expect(cellOf(11)).toEqual({ row: 1, col: 9 })
    expect(cellOf(100)).toEqual({ row: 9, col: 0 })
  })
})

describe('gerak dasar', () => {
  it('lempar dadu memajukan bidak dan ganti giliran', () => {
    const s = withRoll(table({}, [0, 0]), 4)
    const n = reduce(s, { type: 'roll' }, 0)
    expect(n.pos[0]).toBe(4)
    expect(n.turn).toBe(1)
    expect(n.event?.path).toEqual([0, 1, 2, 3, 4])
  })

  it('aksi di luar giliran diabaikan (state sama)', () => {
    const s = table({}, [0, 0])
    expect(reduce(s, { type: 'roll' }, 1)).toBe(s)
    expect(reduce(s, { type: 'answer', choice: 0 }, 0)).toBe(s)
  })

  it('tangga naik, ular turun', () => {
    const up = reduce(withRoll(table({ jumps: { 5: 30 } }, [1, 0]), 4), { type: 'roll' }, 0)
    expect(up.pos[0]).toBe(30)
    const down = reduce(withRoll(table({ jumps: { 5: 2 } }, [1, 0]), 4), { type: 'roll' }, 0)
    expect(down.pos[0]).toBe(2)
    expect(down.event?.log).toContainEqual({ t: 'snake', from: 5, to: 2 })
  })

  it('harus pas di 100: kelebihan memantul', () => {
    const n = reduce(withRoll(table({}, [97, 0]), 5), { type: 'roll' }, 0)
    expect(n.pos[0]).toBe(98)
    expect(n.winner).toBeNull()
    expect(n.event?.log).toContainEqual({ t: 'bounce' })
  })

  it('tanpa aturan pas: langsung menang', () => {
    const n = reduce(withRoll(table({}, [97, 0], { exact: false }), 5), { type: 'roll' }, 0)
    expect(n.pos[0]).toBe(GOAL)
    expect(n.winner).toBe(0)
  })

  it('menang lalu main lagi mengulang papan', () => {
    const won = reduce(withRoll(table({}, [96, 0]), 4), { type: 'roll' }, 0)
    expect(won.winner).toBe(0)
    expect(reduce(won, { type: 'roll' }, 1)).toBe(won)
    const again = reduce(won, { type: 'again' }, 1)
    expect(again.winner).toBeNull()
    expect(again.pos).toEqual([0, 0])
  })
})

describe('efek papan', () => {
  it('maju 3 tetap kena tangga di tujuan, tapi tidak memicu kotak spesial lagi', () => {
    const s = table({ tiles: { 5: { kind: 'fx', fx: 'fwd3' }, 9: { kind: 'quiz' } }, jumps: { 8: 40 } }, [1, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.pos[0]).toBe(40)
    expect(n.pending).toBeNull()
  })

  it('lempar lagi: giliran tetap', () => {
    const s = table({ tiles: { 5: { kind: 'fx', fx: 'again' } } }, [1, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.turn).toBe(0)
  })

  it('skip: giliran berikutnya pemain itu dilewati', () => {
    const s = table({ tiles: { 5: { kind: 'fx', fx: 'skip' } } }, [1, 0, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.skip[0]).toBe(true)
    const n1 = reduce(withRoll(n, 1), { type: 'roll' }, 1)
    const n2 = reduce(withRoll(n1, 1), { type: 'roll' }, 2)
    expect(n2.turn).toBe(1)
    expect(n2.skip[0]).toBe(false)
  })

  it('tukar posisi dengan pemain terdekat di depan', () => {
    const s = table({ tiles: { 5: { kind: 'fx', fx: 'swap' } } }, [1, 50, 20])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.pos).toEqual([20, 50, 5])
  })
})

describe('item', () => {
  it('kotak item memberi item, maks 2', () => {
    const s = table({ tiles: { 5: { kind: 'item' } } }, [1, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.items[0]).toHaveLength(1)
    const full = reduce(withRoll({ ...s, items: [['shield', 'trap'], []] }, 4), { type: 'roll' }, 0)
    expect(full.items[0]).toHaveLength(2)
    expect(full.event?.log).toContainEqual({ t: 'bagFull' })
  })

  it('perisai menahan satu ular', () => {
    const s = { ...table({ jumps: { 5: 2 } }, [1, 0]), items: [['shield'], []] as SnakesState['items'] }
    const armed = reduce(s, { type: 'useItem', item: 'shield' }, 0)
    expect(armed.turn).toBe(0)
    expect(canUseItem(armed, 0, 'shield')).toBe(false)
    const n = reduce(withRoll(armed, 4), { type: 'roll' }, 0)
    expect(n.pos[0]).toBe(5)
    expect(n.shield[0]).toBe(false)
  })

  it('dadu ganda melempar dua dadu', () => {
    const s = { ...table({}, [1, 0]), items: [['double'], []] as SnakesState['items'] }
    const n = reduce(reduce(s, { type: 'useItem', item: 'double' }, 0), { type: 'roll' }, 0)
    expect(n.event?.dice).toHaveLength(2)
    expect(n.pos[0]).toBe(1 + n.event!.dice![0] + n.event!.dice![1])
    expect(n.double).toBe(false)
  })

  it('jebakan memundurkan lawan, bukan pemiliknya', () => {
    const s = { ...table({}, [10, 6]), items: [['trap'], []] as SnakesState['items'] }
    const set = reduce(s, { type: 'useItem', item: 'trap' }, 0)
    expect(set.traps[10]).toBe(0)
    const moved = reduce(withRoll(set, 3), { type: 'roll' }, 0)
    const hit = reduce(withRoll(moved, 4), { type: 'roll' }, 1)
    expect(hit.pos[1]).toBe(10 - SETBACK.trap)
    expect(hit.traps[10]).toBeUndefined()
  })
})

describe('tantangan Truth/Dare', () => {
  const onChallenge = () => {
    const s = table({ tiles: { 5: { kind: 'challenge' } } }, [1, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.pending).toEqual({ kind: 'pickDeck' })
    expect(n.turn).toBe(0)
    return reduce(n, { type: 'pickDeck', deck: 'dare' }, 0)
  }

  it('jalanin → lawan menilai lolos: maju bonus', () => {
    const card = onChallenge()
    expect(card.pending?.kind).toBe('card')
    const judging = reduce(card, { type: 'doIt' }, 0)
    expect(judging.pending?.kind).toBe('judge')
    expect(reduce(judging, { type: 'judge', ok: true }, 0)).toBe(judging) // tidak bisa menilai diri sendiri
    const n = reduce(judging, { type: 'judge', ok: true }, 1)
    expect(n.pos[0]).toBe(5 + BONUS.judge)
    expect(n.turn).toBe(1)
  })

  it('gagal atau tolak: mundur sesuai pengaturan', () => {
    const judging = reduce(onChallenge(), { type: 'doIt' }, 0)
    expect(reduce(judging, { type: 'judge', ok: false }, 1).pos[0]).toBe(5 - 3)
    const refused = reduce(onChallenge(), { type: 'refuse' }, 0)
    expect(refused.pos[0]).toBe(2)
    expect(refused.turn).toBe(1)
  })

  it('Bebas Tugas melewati tantangan tanpa hukuman', () => {
    const card = onChallenge()
    const withPass = { ...card, items: [['pass'], []] as SnakesState['items'] }
    const n = reduce(withPass, { type: 'useItem', item: 'pass' }, 0)
    expect(n.pos[0]).toBe(5)
    expect(n.pending).toBeNull()
    expect(n.turn).toBe(1)
  })
})

describe('kuis', () => {
  const onQuiz = () => {
    const s = table({ tiles: { 5: { kind: 'quiz' } } }, [1, 0])
    const n = reduce(withRoll(s, 4), { type: 'roll' }, 0)
    expect(n.pending?.kind).toBe('quiz')
    return n
  }

  it('benar maju, salah mundur', () => {
    const q = onQuiz()
    const i = q.pending?.kind === 'quiz' ? q.pending.i : -1
    const right = reduce(q, { type: 'answer', choice: QUIZ[i].answer }, 0)
    expect(right.pos[0]).toBe(5 + BONUS.quiz)
    const wrong = reduce(q, { type: 'answer', choice: (QUIZ[i].answer + 1) % QUIZ[i].options.length }, 0)
    expect(wrong.pos[0]).toBe(5 - SETBACK.quiz)
    expect(wrong.turn).toBe(1)
  })

  it('kunci jawaban semua soal valid', () => {
    for (const q of QUIZ) expect(q.answer).toBeLessThan(q.options.length)
  })
})

describe('simulasi', () => {
  it('permainan acak selalu selesai tanpa macet', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = init(seed, { ...defaultOptions(), players: 3 })
      for (let step = 0; step < 3000 && s.winner === null; step++) {
        const p = s.pending
        const t = s.turn
        if (!p) s = reduce(s, { type: 'roll' }, t)
        else if (p.kind === 'pickDeck') s = reduce(s, { type: 'pickDeck', deck: step % 2 ? 'truth' : 'dare' }, t)
        else if (p.kind === 'card') s = reduce(s, step % 3 ? { type: 'doIt' } : { type: 'refuse' }, t)
        else if (p.kind === 'judge') s = reduce(s, { type: 'judge', ok: step % 2 === 0 }, (t + 1) % 3)
        else s = reduce(s, { type: 'answer', choice: step % 3 }, t)
      }
      expect(s.winner).not.toBeNull()
      expect(s.pos.every((p) => p >= 0 && p <= GOAL)).toBe(true)
    }
  })
})
