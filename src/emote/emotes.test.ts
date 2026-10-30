import { describe, expect, it } from 'vitest'
import { bubbleSpot, EMOTES, emoteById } from './emotes'

describe('katalog emote', () => {
  it('id unik, 8 stiker dan 8 teks', () => {
    expect(new Set(EMOTES.map((e) => e.id)).size).toBe(EMOTES.length)
    expect(EMOTES.filter((e) => e.kind === 'sticker')).toHaveLength(8)
    expect(EMOTES.filter((e) => e.kind === 'text')).toHaveLength(8)
  })

  it('semua stiker punya versi diam dan animasi', () => {
    for (const e of EMOTES) if (e.kind === 'sticker') expect(e.art && e.anim).toBeTruthy()
  })

  it('id tak dikenal diabaikan', () => {
    expect(emoteById('rahasia')).toBeUndefined()
  })
})

describe('posisi gelembung', () => {
  const vw = 844
  const vh = 390

  it('di atas kursi dan rata tengah', () => {
    expect(bubbleSpot({ left: 400, top: 200, width: 100, height: 40 }, 80, 90, vw, vh)).toEqual({ x: 410, y: 106 })
  })

  it('pindah ke bawah kalau kursi di tepi atas', () => {
    expect(bubbleSpot({ left: 400, top: 10, width: 100, height: 40 }, 80, 90, vw, vh).y).toBe(54)
  })

  it('kursi setinggi layar: di sisi atas kursi', () => {
    expect(bubbleSpot({ left: 12, top: 8, width: 164, height: 374 }, 80, 90, vw, vh).y).toBe(34)
  })

  it('tetap di dalam layar', () => {
    const left = bubbleSpot({ left: 0, top: 200, width: 40, height: 40 }, 80, 90, vw, vh)
    const right = bubbleSpot({ left: 810, top: 200, width: 40, height: 40 }, 80, 90, vw, vh)
    expect(left.x).toBe(8)
    expect(right.x).toBe(756)
  })

  it('tanpa kursi: tengah atas', () => {
    expect(bubbleSpot(null, 80, 90, vw, vh)).toEqual({ x: 382, y: 8 })
  })
})
