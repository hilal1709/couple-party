import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, getToasts, toast } from './toast'

afterEach(() => {
  for (const t of getToasts()) dismissToast(t.id)
  vi.useRealTimers()
})

describe('toast', () => {
  it('menumpuk maksimal 3 dan membuang yang paling lama', () => {
    ;['a', 'b', 'c', 'd'].forEach((t) => toast(t))
    expect(getToasts().map((t) => t.text)).toEqual(['b', 'c', 'd'])
  })

  it('pesan sama yang masih tampil tidak digandakan', () => {
    const a = toast('Kode disalin')
    expect(toast('Kode disalin')).toBe(a)
    expect(getToasts()).toHaveLength(1)
  })

  it('hilang sendiri setelah durasinya', () => {
    vi.useFakeTimers()
    toast('sebentar', { ms: 1000 })
    vi.advanceTimersByTime(1001)
    expect(getToasts()).toHaveLength(0)
  })
})
