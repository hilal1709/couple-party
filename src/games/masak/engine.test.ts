import { describe, expect, it } from 'vitest'
import { fillKoki, init, reduce } from './engine'
import { ANIMALS } from './types'

describe('pilih koki hewan', () => {
  it('ronde mulai di fase pilih, hewan tidak bisa dipakai dua koki', () => {
    let s = init(7, { players: 2, total: 4 })
    expect(s.phase).toBe('pick')
    s = reduce(s, { type: 'koki', animal: 'panda' }, 0)
    s = reduce(s, { type: 'koki', animal: 'panda' }, 1)
    expect(s.koki[0]).toBe('panda')
    expect(s.koki[1]).toBeNull()
    s = reduce(s, { type: 'koki', animal: 'rubah' }, 1)
    expect(s.koki[1]).toBe('rubah')
  })

  it('hanya host yang memulai; yang belum memilih dapat hewan sisa yang berbeda', () => {
    let s = init(7, { players: 2, total: 8 })
    s = reduce(s, { type: 'koki', animal: 'kodok' }, 0)
    expect(reduce(s, { type: 'go' }, 1).phase).toBe('pick')
    s = reduce(s, { type: 'go' }, 0)
    expect(s.phase).toBe('play')
    expect(s.koki[0]).toBe('kodok')
    expect(new Set(s.koki).size).toBe(8)
    expect(s.koki.every((k) => k && ANIMALS.includes(k))).toBe(true)
    // ganti hewan setelah mulai tidak berlaku
    expect(reduce(s, { type: 'koki', animal: 'ayam' }, 0).koki[0]).toBe('kodok')
  })

  it('isian sama di semua HP untuk benih yang sama', () => {
    expect(fillKoki([null, 'bebek', null], 3)).toEqual(fillKoki([null, 'bebek', null], 3))
  })
})
