import type { Body, Input } from '../sim/climb'
import { packCore, unpackCore, unpackInput, unpackSlow, type Core, type PackedInput } from './protocol'

/**
 * HOST: antrean input satu pemain, diproses "saat tiba" (seperti server game):
 * - Badan pemain hanya maju saat inputnya diterapkan, satu input = satu langkah sim. Input datang
 *   berkelompok, jadi satu tick host bisa menerapkan beberapa (mengejar), paling banyak {@link MAX_PER_TICK}.
 * - Kredit waktu: tiap tick host memberi 1 kredit (maks {@link MAX_CREDIT}); tiap input memakai 1.
 *   Jadi pemain tidak bisa lebih cepat dari 1× walau membanjiri input.
 * - Input macet lebih dari {@link STARVE_TICKS} tick (sinyal hilang): badan disimulasikan dengan input
 *   diam supaya gravitasi tetap berlaku untuk teman yang melihat; ack tidak naik.
 * - Input ganda dari redundansi diabaikan; antrean terlalu panjang membuang yang tertua.
 */
export const MAX_PER_TICK = 3
export const MAX_CREDIT = 8
export const STARVE_TICKS = 8
export const MAX_QUEUE = 24

const IDLE: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }

export class InputQueue {
  /** nomor input terakhir yang sudah diterapkan (dikirim balik sebagai ack) */
  ack = 0
  private q = new Map<number, PackedInput>()
  private last: Input = IDLE
  private starved = 0
  private credit = 2
  dropped = 0

  push(first: number, inputs: readonly PackedInput[]) {
    inputs.forEach((p, k) => {
      const seq = first + k
      if (seq > this.ack) this.q.set(seq, p)
    })
    if (this.q.size > MAX_QUEUE) {
      const keys = [...this.q.keys()].sort((a, b) => a - b)
      for (const s of keys.slice(0, this.q.size - MAX_QUEUE)) {
        this.q.delete(s)
        this.dropped++
      }
    }
  }

  /**
   * Input yang harus diterapkan pada tick host ini (bisa 0, 1, atau beberapa).
   * `idle` = langkah tanpa input sungguhan karena sinyal macet (tidak menaikkan ack).
   */
  take(): { inputs: Input[]; idle: boolean } {
    this.credit = Math.min(MAX_CREDIT, this.credit + 1)
    const out: Input[] = []
    while (out.length < MAX_PER_TICK && this.credit >= 1) {
      const want = this.ack + 1
      let p = this.q.get(want)
      if (!p && this.q.size) {
        // yang ditunggu hilang (semua salinan redundan ikut hilang) tapi yang sesudahnya ada: lompati
        const lo = Math.min(...this.q.keys())
        if (lo > want && this.starved >= 2) {
          this.ack = lo - 1
          p = this.q.get(lo)
        }
      }
      if (!p) break
      this.q.delete(this.ack + 1)
      this.ack++
      this.credit--
      this.last = unpackInput(p)
      out.push(this.last)
    }
    if (out.length) {
      this.starved = 0
      return { inputs: out, idle: false }
    }
    this.starved++
    if (this.starved <= STARVE_TICKS) return { inputs: [], idle: false }
    // sinyal hilang: diam tapi tetap berpegangan (tidak langsung jatuh dari tebing karena lag)
    this.credit = Math.max(0, this.credit - 1)
    return { inputs: [{ ...IDLE, grip: this.last.grip }], idle: true }
  }
}

/**
 * KLIEN: riwayat input yang sudah diprediksi, untuk di-replay setelah snapshot host.
 */
export type Step = (b: Body, inp: Input) => void

export class Predictor {
  seq = 0
  private hist: { seq: number; inp: PackedInput; core?: Core }[] = []
  /** snapshot yang cocok dengan prediksi (tanpa koreksi) dan yang perlu dikoreksi */
  agreed = 0
  corrected = 0
  /** selisih tampilan (m) yang dihapus pelan-pelan supaya koreksi tidak terlihat sebagai lompatan */
  ox = 0
  oy = 0
  oz = 0
  /** besar koreksi terakhir & terbesar (untuk statistik) */
  lastError = 0
  worstError = 0

  /** catat input yang baru diprediksi (dan keadaan badan sesudahnya); kembalikan nomornya */
  record(inp: PackedInput) {
    this.seq++
    this.hist.push({ seq: this.seq, inp })
    this.trim()
    return this.seq
  }

  /** simpan keadaan badan setelah input `seq` diprediksi (dipanggil setelah langkah sim) */
  stamp(seq: number, after: Body) {
    const h = this.hist[this.hist.length - 1]
    if (h?.seq === seq) h.core = packCore(after)
  }

  private trim() {
    if (this.hist.length > 120) this.hist.shift()
  }

  /** input yang belum di-ack, untuk dikirim ulang bersama yang baru (tahan paket hilang) */
  recent(n: number): { first: number; inputs: PackedInput[] } {
    const tail = this.hist.slice(-n)
    return { first: tail[0]?.seq ?? this.seq + 1, inputs: tail.map((h) => h.inp) }
  }

  /**
   * Snapshot host datang: set badan ke keadaan host saat `ack`, lalu jalankan ulang semua input
   * sesudahnya. Selisih posisi sebelum/sesudah disimpan sebagai offset tampilan yang memudar.
   */
  reconcile(b: Body, core: readonly number[], slow: readonly number[] | undefined, ack: number, step: Step, snapAt = 3) {
    // keadaan host di ack sama dengan prediksi kita saat itu: tidak ada yang perlu dikoreksi.
    // (menimpa dengan nilai terkuantisasi justru memicu ambang diskret panjat dan membuat koreksi palsu)
    const mine = this.hist.find((h) => h.seq === ack)
    if (mine?.core && agrees(mine.core, core)) {
      this.hist = this.hist.filter((h) => h.seq > ack)
      if (slow) unpackSlow(b, slow)
      this.lastError = 0
      this.agreed++
      return
    }
    this.corrected++
    const px = b.x
    const py = b.y
    const pz = b.z
    unpackCore(b, core)
    if (slow) unpackSlow(b, slow)
    this.hist = this.hist.filter((h) => h.seq > ack)
    for (const h of this.hist) {
      step(b, unpackInput(h.inp))
      // prediksi baru (dari keadaan host) jadi pembanding untuk snapshot berikutnya
      h.core = packCore(b)
    }
    const ex = px - b.x
    const ey = py - b.y
    const ez = pz - b.z
    this.lastError = Math.hypot(ex, ey, ez)
    this.worstError = Math.max(this.worstError, this.lastError)
    if (this.lastError > snapAt) {
      // teleport sungguhan (dibangunkan, kembali ke api unggun): langsung pindah
      this.ox = this.oy = this.oz = 0
    } else {
      this.ox += ex
      this.oy += ey
      this.oz += ez
    }
  }

  /** pudarkan offset tampilan (±0,1 dtk) */
  decay(dt: number) {
    const k = Math.exp(-dt * 10)
    this.ox *= k
    this.oy *= k
    this.oz *= k
  }

  pending() {
    return this.hist.length
  }
}

/** prediksi dianggap sama dengan host: posisi < 2 cm, mode & tali sama, stamina & bonus < 1% */
function agrees(a: Core, b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.02 && a[7] === b[7] && a[17] === b[17] && Math.abs(a[8] - b[8]) < 0.01 && Math.abs((a[20] ?? 0) - (b[20] ?? 0)) < 0.01
}

/**
 * KLIEN: buffer interpolasi pendaki lain. Snapshot disimpan menurut waktu host; tampilan
 * diambil {@link delay} ms di belakang waktu host perkiraan, jadi selalu ada dua snapshot untuk
 * diinterpolasi walau paket datang tidak rata. Kehabisan data: ekstrapolasi paling lama 120 ms.
 */
export type Pose = { x: number; y: number; z: number; yaw: number; mode: number; flags: number; stamina: number }

export class Interp {
  private buf: { t: number; p: Pose }[] = []

  push(t: number, p: Pose) {
    const last = this.buf[this.buf.length - 1]
    if (last && t <= last.t) return
    this.buf.push({ t, p })
    if (this.buf.length > 30) this.buf.shift()
  }

  sample(t: number): Pose | null {
    const b = this.buf
    if (!b.length) return null
    if (t <= b[0].t) return b[0].p
    for (let i = b.length - 1; i > 0; i--) {
      const a = b[i - 1]
      const c = b[i]
      if (t >= a.t && t <= c.t) return mix(a.p, c.p, (t - a.t) / (c.t - a.t || 1))
    }
    const last = b[b.length - 1]
    const prev = b[b.length - 2]
    if (!prev) return last.p
    // telat: lanjutkan arah gerak sebentar, lalu berhenti (tidak terbang ke mana-mana)
    const over = Math.min(120, t - last.t)
    return mix(prev.p, last.p, 1 + over / (last.t - prev.t || 1), true)
  }

  /** snapshot terakhir (untuk mode & stamina terbaru) */
  latest(): Pose | null {
    return this.buf[this.buf.length - 1]?.p ?? null
  }
}

function mix(a: Pose, b: Pose, k: number, extrapolate = false): Pose {
  const d = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw))
  // mode berganti di tengah: pakai mode baru setelah separuh jalan (ekstrapolasi selalu mode baru)
  const later = extrapolate || k >= 0.5
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k,
    yaw: a.yaw + d * Math.min(1, k),
    mode: later ? b.mode : a.mode,
    flags: later ? b.flags : a.flags,
    stamina: b.stamina,
  }
}

/**
 * KLIEN: perkiraan jam host dari snapshot. Offset disetel pelan (tidak melompat saat satu paket
 * telat) dan hanya maju, supaya waktu tampilan tidak mundur.
 */
export class HostClock {
  private off: number | null = null
  private shown = -Infinity

  /** `hostMs` = waktu host di snapshot, `now` = performance.now() saat diterima */
  seen(hostMs: number, now: number) {
    const o = hostMs - now
    // paket yang datang lebih awal dari perkiraan = offset sebenarnya lebih besar: ikuti cepat;
    // paket telat: ikuti sangat pelan (telat itu jitter, bukan jam bergeser)
    if (this.off === null) this.off = o
    else this.off += (o - this.off) * (o > this.off ? 0.3 : 0.02)
  }

  now(now: number) {
    if (this.off === null) return null
    this.shown = Math.max(this.shown, now + this.off)
    return this.shown
  }
}
