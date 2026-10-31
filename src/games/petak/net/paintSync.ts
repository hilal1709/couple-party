import type { LiveChannel, Seat } from '@/games/types'

/** isi satu pesan; batas Supabase diukur oleh scripts/petak-probe.mts */
export const CHUNK_BYTES = 12_000
/** jeda antar potongan supaya tidak melewati batas pesan per detik */
export const CHUNK_GAP_MS = 40
/** selama ini tanpa potongan baru = minta kirim ulang yang hilang */
export const RETRY_MS = 1200

type Chunk = { k: 'paint'; v: number; i: number; n: number; d: string }
type Need = { k: 'paint-need'; to: Seat; v: number; miss: number[] }

function toBase64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}

function fromBase64(s: string): Uint8Array {
  const r = atob(s)
  const b = new Uint8Array(r.length)
  for (let i = 0; i < r.length; i++) b[i] = r.charCodeAt(i)
  return b
}

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

type Incoming = { v: number; n: number; parts: (Uint8Array | undefined)[]; timer: ReturnType<typeof setTimeout> | null }

/**
 * Mengirim cat lewat saluran `live`, yang tidak menjamin pesan sampai. Cat dipecah jadi potongan; penerima
 * meminta ulang potongan yang hilang, dan versi lebih baru selalu menggantikan yang lama.
 */
export class PaintSync {
  private version = 0
  private outgoing: string[] = []
  private queue: number[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private incoming = new Map<Seat, Incoming>()
  private done = new Map<Seat, number>()
  private stop: () => void
  private live: LiveChannel
  private me: Seat
  private onPaint: (from: Seat, bytes: Uint8Array, version: number) => void

  constructor(live: LiveChannel, me: Seat, onPaint: (from: Seat, bytes: Uint8Array, version: number) => void) {
    this.live = live
    this.me = me
    this.onPaint = onPaint
    this.stop = live.on((d, from) => this.receive(d, from))
  }

  /** ganti cat sendiri; pengiriman versi lama dihentikan */
  publish(bytes: Uint8Array): number {
    this.version++
    this.outgoing = []
    for (let at = 0; at < bytes.length; at += CHUNK_BYTES) this.outgoing.push(toBase64(bytes.subarray(at, at + CHUNK_BYTES)))
    if (!this.outgoing.length) this.outgoing.push('')
    this.queue = this.outgoing.map((_, i) => i)
    this.pump()
    return this.version
  }

  /** kirim ulang semua potongan, untuk pemain yang baru masuk */
  resend() {
    if (!this.outgoing.length) return
    this.queue = this.outgoing.map((_, i) => i)
    this.pump()
  }

  private pump() {
    if (this.timer !== null) return
    const next = () => {
      const i = this.queue.shift()
      if (i === undefined) {
        this.timer = null
        return
      }
      this.live.send({ k: 'paint', v: this.version, i, n: this.outgoing.length, d: this.outgoing[i] } satisfies Chunk)
      this.timer = setTimeout(next, CHUNK_GAP_MS)
    }
    next()
  }

  private receive(d: unknown, from: Seat) {
    const m = d as Chunk | Need
    if (m?.k === 'paint') this.chunk(m, from)
    else if (m?.k === 'paint-need' && m.to === this.me && m.v === this.version) {
      for (const i of m.miss) if (!this.queue.includes(i)) this.queue.push(i)
      this.pump()
    }
  }

  private chunk(m: Chunk, from: Seat) {
    if (m.v <= (this.done.get(from) ?? 0)) return
    let inc = this.incoming.get(from)
    if (!inc || m.v > inc.v) {
      if (inc?.timer) clearTimeout(inc.timer)
      inc = { v: m.v, n: m.n, parts: Array(m.n).fill(undefined), timer: null }
      this.incoming.set(from, inc)
    }
    if (m.v < inc.v) return
    inc.parts[m.i] = fromBase64(m.d)
    if (inc.timer) clearTimeout(inc.timer)
    if (inc.parts.every(Boolean)) {
      this.incoming.delete(from)
      this.done.set(from, m.v)
      this.onPaint(from, join(inc.parts as Uint8Array[]), m.v)
      return
    }
    const cur = inc
    const ask = () => {
      const miss = cur.parts.flatMap((p, i) => (p ? [] : [i]))
      this.live.send({ k: 'paint-need', to: from, v: cur.v, miss } satisfies Need)
      cur.timer = setTimeout(ask, RETRY_MS)
    }
    inc.timer = setTimeout(ask, RETRY_MS)
  }

  dispose() {
    this.stop()
    if (this.timer !== null) clearTimeout(this.timer)
    for (const i of this.incoming.values()) if (i.timer) clearTimeout(i.timer)
  }
}
