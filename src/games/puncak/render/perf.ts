/**
 * Pengukur frame + pengatur kualitas adaptif Puncak.
 *
 * Urutan penurunan saat frame meleset dari target (spesifikasi §4):
 * 1. resolusi render internal, 2. bayangan, 3. rumput/vegetasi jauh, 4. efek opsional
 * (partikel & post-processing). Medan, pegangan panjat, dan bahaya tidak pernah disembunyikan.
 * Pemulihan hanya menaikkan resolusi lagi; langkah 2–4 tidak dinyalakan ulang supaya tidak naik-turun.
 */
export type Step = 'shadow' | 'grass' | 'fx' | 'post'
export const STEPS: Step[] = ['shadow', 'grass', 'fx', 'post']

export type Action = { kind: 'scale'; scale: number } | { kind: 'step'; step: Step } | null

export type GovernorOpts = {
  /** FPS target (30 di Low) */
  target: number
  minScale: number
  /** langkah yang memang masih bisa diturunkan pada profil ini */
  steps: Step[]
}

const WINDOW_MS = 1000
const SCALE_STEP = 0.1

export class Governor {
  scale = 1
  private steps: Step[]
  private budget: number
  private acc = 0
  private n = 0
  private worst = 0
  private miss = 0
  private calm = 0
  private work = 0
  private o: GovernorOpts

  constructor(o: GovernorOpts) {
    this.o = o
    this.steps = [...o.steps]
    this.budget = 1000 / o.target
  }

  /** `interval` = jarak antar frame yang benar-benar digambar (ms), `work` = waktu JS frame itu (ms) */
  feed(interval: number, work: number): Action {
    // lompatan besar = tab/aplikasi baru kembali dari latar; jangan dihitung
    if (interval > 250) return null
    this.acc += interval
    this.n++
    this.work += work
    this.worst = Math.max(this.worst, interval)
    if (this.acc < WINDOW_MS) return null
    const avg = this.acc / this.n
    const workAvg = this.work / this.n
    this.acc = this.n = this.work = this.worst = 0
    if (avg > this.budget * 1.12) {
      this.calm = 0
      if (++this.miss < 2) return null
      this.miss = 0
      if (this.scale > this.o.minScale + 1e-6) {
        this.scale = Math.max(this.o.minScale, Math.round((this.scale - SCALE_STEP) * 100) / 100)
        return { kind: 'scale', scale: this.scale }
      }
      const step = this.steps.shift()
      return step ? { kind: 'step', step } : null
    }
    this.miss = 0
    // frame dibatasi ke target, jadi jarak frame tidak menunjukkan sisa tenaga: pakai waktu kerja JS
    if (avg <= this.budget * 1.05 && workAvg < this.budget * 0.45 && this.scale < 1) {
      if (++this.calm >= 8) {
        this.calm = 0
        this.scale = Math.min(1, Math.round((this.scale + SCALE_STEP) * 100) / 100)
        return { kind: 'scale', scale: this.scale }
      }
    } else this.calm = 0
    return null
  }
}

/** statistik frame untuk overlay & laporan: rata-rata, p95, dan FPS 1%/5% terendah */
export class FrameStats {
  private buf: Float32Array
  private i = 0
  private full = false

  constructor(size = 240) {
    this.buf = new Float32Array(size)
  }

  push(ms: number) {
    if (ms > 250) return
    this.buf[this.i] = ms
    this.i = (this.i + 1) % this.buf.length
    if (this.i === 0) this.full = true
  }

  read() {
    const n = this.full ? this.buf.length : this.i
    if (n === 0) return { fps: 0, avgMs: 0, p95Ms: 0, low1: 0, low5: 0 }
    const a = Array.from(this.buf.subarray(0, n)).sort((x, y) => x - y)
    const avg = a.reduce((s, v) => s + v, 0) / n
    const at = (q: number) => a[Math.min(n - 1, Math.floor(q * n))]
    return { fps: Math.round(1000 / avg), avgMs: round1(avg), p95Ms: round1(at(0.95)), low1: Math.round(1000 / at(0.99)), low5: Math.round(1000 / at(0.95)) }
  }
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Pembatas frame: `true` jika frame ini harus digambar. Toleransi 2 ms supaya layar 60 Hz yang
 * dibatasi ke 30 tetap selang-seling rapi, bukan kadang melewatkan dua.
 */
export function shouldDraw(now: number, lastDrawn: number, target: number) {
  return now - lastDrawn >= 1000 / target - 2
}
