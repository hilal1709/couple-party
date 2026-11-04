import { feed, newMeter, rmsDb, type Meter } from './loudness'

export type MicStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'failed' | 'unsupported'

/**
 * Mic pemain: satu stream untuk voice chat dan pengukur keras-pelan.
 * AudioContext sendiri (bukan milik Howler) supaya tidak ikut dijeda saat musik dijeda,
 * dan echo cancellation menyala supaya suara game & suara pasangan dari speaker tidak terhitung sebagai teriakan.
 */
export class Mic {
  status: MicStatus = 'idle'
  stream: MediaStream | null = null
  meter: Meter = newMeter()
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private buf: Float32Array<ArrayBuffer> | null = null
  private last = 0

  async start(): Promise<MicStatus> {
    if (this.status === 'ok') return this.status
    if (!navigator.mediaDevices?.getUserMedia) return (this.status = 'unsupported')
    this.status = 'asking'
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
        video: false,
      })
    } catch (e) {
      const name = (e as DOMException)?.name
      return (this.status = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed')
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      const src = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.buf = new Float32Array(this.analyser.fftSize)
      src.connect(this.analyser)
      void this.ctx.resume()
      document.addEventListener('visibilitychange', this.onVisible)
    } catch {
      this.stop()
      return (this.status = 'failed')
    }
    this.last = performance.now()
    return (this.status = 'ok')
  }

  private onVisible = () => {
    if (!document.hidden) void this.ctx?.resume()
  }

  /** baca level sekarang (panggil tiap frame); mengembalikan dB mentah */
  read(): number {
    if (!this.analyser || !this.buf) return -100
    if (this.ctx?.state === 'suspended') void this.ctx.resume()
    this.analyser.getFloatTimeDomainData(this.buf)
    const raw = this.stream?.getAudioTracks()[0]?.enabled === false ? -100 : rmsDb(this.buf)
    const now = performance.now()
    const dt = Math.min(0.25, (now - this.last) / 1000)
    this.last = now
    this.meter = feed(this.meter, raw, dt)
    return raw
  }

  stop() {
    document.removeEventListener('visibilitychange', this.onVisible)
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close().catch(() => {})
    this.stream = null
    this.ctx = null
    this.analyser = null
    this.status = 'idle'
  }
}

let shared: Mic | null = null
/** satu mic untuk seluruh app: izin cukup diminta sekali */
export const sharedMic = () => (shared ??= new Mic())
