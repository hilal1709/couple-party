import { describe, expect, it } from 'vitest'
import { calibrate, classify, feed, newMeter, rmsDb, type Meter } from './loudness'

/** jalankan meter selama `secs` detik pada level mentah `db` */
function hold(m: Meter, db: number, secs: number): Meter {
  for (let t = 0; t < secs; t += 0.05) m = feed(m, db, 0.05)
  return m
}

describe('loudness', () => {
  it('rmsDb: sinus amplitudo 1 sekitar -3 dB, hening = SILENT', () => {
    const s = Array.from({ length: 1024 }, (_, i) => Math.sin((i / 1024) * Math.PI * 2 * 8))
    expect(rmsDb(s)).toBeCloseTo(-3.01, 1)
    expect(rmsDb(new Float32Array(256))).toBe(-100)
  })

  it('kamar sepi: bisik aman, bicara normal & teriak terdeteksi', () => {
    let m = hold(newMeter(), -68, 3)
    expect(classify(m)).toBe('diam')
    expect(classify(hold(m, -52, 0.5))).toBe('bisik')
    m = hold(m, -28, 0.4)
    expect(classify(m)).toBe('normal')
    m = hold(m, -10, 0.3)
    expect(classify(m)).toBe('teriak')
  })

  it('bicara panjang tidak dianggap bising ruangan', () => {
    let m = hold(newMeter(), -68, 3)
    m = hold(m, -28, 8)
    expect(classify(m)).toBe('normal')
  })

  it('turun pelan setelah bicara (tidak langsung aman)', () => {
    let m = hold(hold(newMeter(), -68, 3), -24, 0.5)
    m = feed(m, -68, 0.05)
    expect(classify(m)).not.toBe('diam')
    m = hold(m, -68, 2)
    expect(classify(m)).toBe('diam')
  })

  it('kalibrasi: bisikan pemain yang agak keras tetap dihitung bisik', () => {
    let m = hold(newMeter(), -66, 3)
    const whisper = Array.from({ length: 60 }, (_, i) => -42 + (i % 5))
    m = calibrate(m, whisper)
    expect(m.whisper).toBeCloseTo(-38, 0)
    expect(classify(hold(m, -40, 0.5))).toBe('bisik')
    expect(classify(hold(m, -26, 0.5))).toBe('normal')
  })

  it('kalibrasi diabaikan kalau pemain diam saja', () => {
    const m = hold(newMeter(), -66, 3)
    expect(calibrate(m, Array(50).fill(-66)).whisper).toBeNull()
  })

  it('kepekaan "peka" lebih cepat menganggap bahaya', () => {
    const m = hold(hold(newMeter(), -75, 3), -41, 0.5)
    expect(classify(m, 'peka')).toBe('normal')
    expect(classify(m, 'santai')).toBe('bisik')
  })
})
