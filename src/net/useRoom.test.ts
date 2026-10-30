import { describe, expect, it } from 'vitest'
import { applyAction, type Session } from './session'

const host = { id: 'h', name: 'Host' }
const guest = { id: 'g', name: 'Tamu' }
const lobby = (players = [host, guest]): Session => ({
  players,
  pick: { gameId: 'snakes', options: { penalty: 3 } },
  gameId: null,
  game: null,
  rev: 0,
})

describe('applyAction: kursi bot', () => {
  const solo = (gameId = 'ludo', options: unknown = {}): Session => ({ ...lobby([host]), pick: { gameId, options } })

  it('host menambah bot lalu bisa mulai sendirian', () => {
    const s = applyAction(solo(), { kind: 'addBot' }, 'h')
    expect(s.players).toHaveLength(2)
    expect(s.players[1].bot).toBe(true)
    const started = applyAction(s, { kind: 'start' }, 'h', 3)
    expect(started.gameId).toBe('ludo')
    expect((started.game as { opts: { botSeats: number[] } }).opts.botSeats).toEqual([1])
  })

  it('tamu tidak bisa mengatur bot', () => {
    const s = lobby()
    expect(applyAction(s, { kind: 'addBot' }, 'g')).toBe(s)
    expect(applyAction(s, { kind: 'botLevel', level: 3 }, 'g')).toBe(s)
  })

  it('nama bot tidak kembar dan berhenti di batas pemain mode', () => {
    let s: Session = solo('remi', { mode: 'bigtwo' })
    for (let i = 0; i < 8; i++) s = applyAction(s, { kind: 'addBot' }, 'h')
    expect(s.players).toHaveLength(4)
    expect(new Set(s.players.map((p) => p.name)).size).toBe(4)
  })

  it('removeBot melepas bot terakhir, tidak pernah manusia', () => {
    let s = applyAction(lobby(), { kind: 'addBot' }, 'h')
    s = applyAction(s, { kind: 'removeBot' }, 'h')
    expect(s.players.map((p) => p.id)).toEqual(['h', 'g'])
    expect(applyAction(s, { kind: 'removeBot' }, 'h')).toBe(s)
  })

  it('bot tidak bisa diubah saat game berjalan', () => {
    const s = applyAction(applyAction(solo(), { kind: 'addBot' }, 'h'), { kind: 'start' }, 'h', 3)
    expect(applyAction(s, { kind: 'addBot' }, 'h')).toBe(s)
    expect(applyAction(s, { kind: 'removeBot' }, 'h')).toBe(s)
  })

  it('pindah ke Kart melepas kursi bot', () => {
    const s = applyAction(applyAction(solo(), { kind: 'addBot' }, 'h'), { kind: 'pick', gameId: 'kart', options: {} }, 'h')
    expect(s.players.map((p) => p.id)).toEqual(['h'])
    expect(applyAction(s, { kind: 'addBot' }, 'h')).toBe(s)
  })
})

describe('applyAction: pilih game dulu, room menyusul', () => {
  it('start memakai game pilihan host beserta jumlah pemain', () => {
    const s = applyAction(lobby(), { kind: 'start' }, 'h', 7)
    expect(s.gameId).toBe('snakes')
    expect((s.game as { opts: { players: number; penalty: number } }).opts).toMatchObject({ players: 2, penalty: 3 })
  })

  it('tamu tidak bisa memulai atau mengganti game', () => {
    const s = lobby()
    expect(applyAction(s, { kind: 'start' }, 'g')).toBe(s)
    expect(applyAction(s, { kind: 'pick', gameId: 'uno', options: {} }, 'g')).toBe(s)
  })

  it('tidak mulai kalau pemain kurang dari minimum', () => {
    const s = lobby([host])
    expect(applyAction(s, { kind: 'start' }, 'h')).toBe(s)
  })

  it('Kartu Remi memakai batas pemain sesuai mode', () => {
    const five = [host, guest, { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
    const capsa: Session = { ...lobby(five), pick: { gameId: 'remi', options: { mode: 'bigtwo' } } }
    expect(applyAction(capsa, { kind: 'start' }, 'h')).toBe(capsa)
    const poker: Session = { ...lobby(five), pick: { gameId: 'remi', options: { mode: 'poker' } } }
    expect(applyAction(poker, { kind: 'start' }, 'h').gameId).toBe('remi')
  })

  it('Domino memakai batas pemain sesuai mode', () => {
    const five = [host, guest, { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
    const gaple: Session = { ...lobby(five), pick: { gameId: 'domino', options: { mode: 'gaple' } } }
    expect(applyAction(gaple, { kind: 'start' }, 'h')).toBe(gaple)
    const qiu: Session = { ...lobby(five), pick: { gameId: 'domino', options: { mode: 'qiuqiu' } } }
    expect(applyAction(qiu, { kind: 'start' }, 'h').gameId).toBe('domino')
  })

  it('Monopoli bisa dimulai dengan 2 pemain', () => {
    const s: Session = { ...lobby(), pick: { gameId: 'monopoly', options: { end: 'rounds', rounds: 15 } } }
    expect(applyAction(s, { kind: 'start' }, 'h').gameId).toBe('monopoly')
  })

  it('host bisa ganti game; game tak dikenal ditolak', () => {
    const s = applyAction(lobby(), { kind: 'pick', gameId: 'uno', options: { variant: 'flip' } }, 'h')
    expect(s.pick).toEqual({ gameId: 'uno', options: { variant: 'flip' } })
    expect(applyAction(s, { kind: 'pick', gameId: 'catur', options: {} }, 'h')).toBe(s)
  })

  it('keluar dari game tetap menyimpan pilihan supaya bisa main lagi', () => {
    const playing = applyAction(lobby(), { kind: 'start' }, 'h', 1)
    const back = applyAction(playing, { kind: 'exit' }, 'g')
    expect(back.gameId).toBeNull()
    expect(back.pick?.gameId).toBe('snakes')
  })
})
