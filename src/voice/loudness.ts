/**
 * Klasifikasi keras-pelan suara mic, murni (tanpa Web Audio) supaya bisa dites.
 * Semua angka dalam dBFS: 0 = paling keras, makin negatif makin pelan.
 */

export type Level = 'diam' | 'bisik' | 'normal' | 'teriak'
export const LEVELS: Level[] = ['diam', 'bisik', 'normal', 'teriak']

/** seberapa gampang Penunggu mendengar: peka = bicara pelan pun sudah bahaya */
export type Sensitivity = 'peka' | 'sedang' | 'santai'

/** batas bawah mutlak "bicara normal", per kepekaan */
const ABS_NORMAL: Record<Sensitivity, number> = { peka: -44, sedang: -38, santai: -32 }

export type Meter = {
  /** level halus (dB) */
  db: number
  /** perkiraan bising ruangan */
  floor: number
  /** puncak bisikan saat kalibrasi; null = belum dikalibrasi */
  whisper: number | null
}

export const SILENT = -100
const FLOOR_MIN = -90
const FLOOR_MAX = -40

export const newMeter = (): Meter => ({ db: SILENT, floor: -70, whisper: null })

/** RMS satu blok sampel → dBFS */
export function rmsDb(samples: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  const rms = Math.sqrt(sum / Math.max(1, samples.length))
  return rms > 1e-5 ? Math.max(SILENT, 20 * Math.log10(rms)) : SILENT
}

/**
 * Masukkan satu bacaan mentah. Naik cepat (suara langsung terdeteksi), turun pelan (tidak berkedip).
 * Bising ruangan dilacak dari bacaan terendah: turun cepat, naik sangat pelan supaya bicara panjang tidak dianggap bising.
 */
export function feed(m: Meter, raw: number, dt: number): Meter {
  const tau = raw > m.db ? 0.04 : 0.35
  const k = 1 - Math.exp(-dt / tau)
  const db = m.db + (raw - m.db) * k
  const floor = raw < m.floor ? m.floor + (raw - m.floor) * (1 - Math.exp(-dt / 0.5)) : m.floor + Math.min(raw - m.floor, 0.6 * dt)
  return { ...m, db, floor: Math.min(FLOOR_MAX, Math.max(FLOOR_MIN, floor)) }
}

export type Thresholds = { bisik: number; normal: number; teriak: number }

export function thresholds(m: Meter, sens: Sensitivity = 'sedang'): Thresholds {
  const bisik = m.floor + 6
  const normal = Math.max(m.floor + 16, (m.whisper ?? -Infinity) + 5, ABS_NORMAL[sens])
  const teriak = Math.max(normal + 12, -20)
  return { bisik, normal, teriak }
}

export function classify(m: Meter, sens: Sensitivity = 'sedang'): Level {
  const t = thresholds(m, sens)
  if (m.db >= t.teriak) return 'teriak'
  if (m.db >= t.normal) return 'normal'
  if (m.db >= t.bisik) return 'bisik'
  return 'diam'
}

/** 0..1 posisi jarum di meter HUD; garis bahaya ada di `danger` */
export function needle(m: Meter, sens: Sensitivity = 'sedang'): { v: number; danger: number; scream: number } {
  const t = thresholds(m, sens)
  const lo = m.floor
  const hi = t.teriak + 8
  const at = (x: number) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)))
  return { v: at(m.db), danger: at(t.normal), scream: at(t.teriak) }
}

/**
 * Hasil kalibrasi bisikan: persentil ke-90 bacaan saat pemain disuruh berbisik,
 * diabaikan kalau hampir sama dengan bising ruangan (pemain diam saja).
 */
export function calibrate(m: Meter, samples: number[]): Meter {
  const voiced = samples.filter((d) => d > m.floor + 4).sort((a, b) => a - b)
  if (voiced.length < 5) return m
  const p90 = voiced[Math.min(voiced.length - 1, Math.floor(voiced.length * 0.9))]
  // bisikan yang terlalu keras tidak boleh membuat bicara normal dianggap aman
  return { ...m, whisper: Math.min(p90, -30) }
}
