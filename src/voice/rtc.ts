import type { LiveChannel, Seat } from '@/games/types'

/**
 * Voice chat dua HP lewat WebRTC. Signaling menumpang saluran `live` room yang tidak menjamin sampai,
 * jadi semua pesan diulang sampai dijawab, dan ICE tidak dicicil (SDP dikirim lengkap sekali jadi).
 * Kursi 0 (host) selalu yang menawarkan; tamu menyapa terus selama belum tersambung.
 */

export type VoiceState = 'connecting' | 'connected' | 'failed'

type Wire =
  | { k: 'rtc'; t: 'hi' }
  | { k: 'rtc'; t: 'offer'; sid: number; sdp: string }
  | { k: 'rtc'; t: 'answer'; sid: number; sdp: string }

const HELLO_EVERY = 1500
const OFFER_EVERY = 2000
/** sambungan yang tidak jadi-jadi dibuang dan diulang */
const STALE_MS = 20000
const ICE_WAIT = 1500

function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
  const env = import.meta.env
  if (env.VITE_TURN_URL) list.push({ urls: String(env.VITE_TURN_URL).split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS })
  return list
}

/** tunggu kandidat ICE terkumpul (atau batas waktu), supaya SDP bisa dikirim sekali */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((res) => {
    const t = setTimeout(done, ICE_WAIT)
    function done() {
      clearTimeout(t)
      pc.removeEventListener('icegatheringstatechange', check)
      res()
    }
    function check() {
      if (pc.iceGatheringState === 'complete') done()
    }
    pc.addEventListener('icegatheringstatechange', check)
  })
}

export type VoiceLinkOptions = {
  live: LiveChannel
  seat: Seat
  /** kursi pasangan */
  peer: Seat
  stream: MediaStream
  onState?: (s: VoiceState) => void
}

export class VoiceLink {
  state: VoiceState = 'connecting'
  private o: VoiceLinkOptions
  private host: boolean
  private pc: RTCPeerConnection | null = null
  /** nomor sesi acak supaya tawaran setelah host memuat ulang tidak tertukar dengan yang lama */
  private sid = Math.floor(Math.random() * 1e9)
  private bornAt = 0
  private offer: string | null = null
  private answered = false
  /** tamu: jawaban terakhir, dikirim ulang kalau tawaran yang sama datang lagi */
  private answer: { sid: number; sdp: string } | null = null
  /** tamu: tawaran yang sedang/sudah dijawab */
  private pending = -1
  private timer: ReturnType<typeof setInterval>
  private stopLive: () => void
  private audio: HTMLAudioElement
  private volume = 1
  private closed = false

  constructor(o: VoiceLinkOptions) {
    this.o = o
    this.host = o.seat < o.peer
    this.audio = document.createElement('audio')
    this.audio.autoplay = true
    this.audio.setAttribute('playsinline', '')
    this.stopLive = o.live.on((d, from) => from === o.peer && this.onWire(d as Wire))
    this.timer = setInterval(() => this.tick(), 500)
    this.tick()
  }

  /** volume suara pasangan 0..1 (proximity chat) */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    this.audio.volume = this.volume
  }

  /** dipanggil dari ketukan pemain: Android kadang menolak autoplay sebelum ada sentuhan */
  resume() {
    if (this.audio.srcObject && this.audio.paused) void this.audio.play().catch(() => {})
  }

  private setState(s: VoiceState) {
    if (this.state === s) return
    this.state = s
    this.o.onState?.(s)
  }

  private send(w: Wire) {
    this.o.live.send(w)
  }

  private lastHello = 0
  private lastOffer = 0
  private tick() {
    if (this.closed) return
    const now = Date.now()
    const live = this.pc && (this.pc.connectionState === 'connected' || this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed')
    if (live) return this.setState('connected')
    if (this.state === 'connected') this.setState('connecting')
    if (this.host) {
      if (this.pc && now - this.bornAt > STALE_MS) this.drop()
      if (this.offer && !this.answered && now - this.lastOffer > OFFER_EVERY) {
        this.lastOffer = now
        this.send({ k: 'rtc', t: 'offer', sid: this.sid, sdp: this.offer })
      }
    } else if (now - this.lastHello > HELLO_EVERY) {
      this.lastHello = now
      this.send({ k: 'rtc', t: 'hi' })
      if (this.pc && now - this.bornAt > STALE_MS * 1.5) this.drop()
    }
  }

  private drop() {
    this.pc?.close()
    this.pc = null
    this.offer = null
    this.answered = false
  }

  private newPc(): RTCPeerConnection {
    this.drop()
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    for (const t of this.o.stream.getAudioTracks()) pc.addTrack(t, this.o.stream)
    pc.ontrack = (e) => {
      this.audio.srcObject = e.streams[0] ?? new MediaStream([e.track])
      this.audio.volume = this.volume
      void this.audio.play().catch(() => {})
    }
    pc.onconnectionstatechange = () => this.tick()
    this.pc = pc
    this.bornAt = Date.now()
    this.setState('connecting')
    return pc
  }

  private async onWire(w: Wire) {
    if (this.closed || w?.k !== 'rtc') return
    try {
      if (this.host && w.t === 'hi') {
        const connected = this.pc?.connectionState === 'connected'
        // tamu menyapa = dia belum tersambung; buat tawaran baru kalau belum ada yang berjalan
        if (connected || (this.pc && Date.now() - this.bornAt < STALE_MS)) return
        const pc = this.newPc()
        ++this.sid
        await pc.setLocalDescription(await pc.createOffer())
        await gathered(pc)
        if (this.pc !== pc) return
        this.offer = pc.localDescription!.sdp
        this.lastOffer = 0
        this.tick()
      } else if (this.host && w.t === 'answer') {
        if (w.sid !== this.sid || this.answered || !this.pc || this.pc.signalingState !== 'have-local-offer') return
        this.answered = true
        await this.pc.setRemoteDescription({ type: 'answer', sdp: w.sdp })
      } else if (!this.host && w.t === 'offer') {
        // tawaran yang sama dikirim ulang: jawab lagi kalau sudah siap, abaikan kalau masih disusun
        if (this.pending === w.sid && this.pc) {
          if (this.answer?.sid === w.sid) this.send({ k: 'rtc', t: 'answer', sid: w.sid, sdp: this.answer.sdp })
          return
        }
        this.pending = w.sid
        const pc = this.newPc()
        await pc.setRemoteDescription({ type: 'offer', sdp: w.sdp })
        await pc.setLocalDescription(await pc.createAnswer())
        await gathered(pc)
        if (this.pc !== pc) return
        this.answer = { sid: w.sid, sdp: pc.localDescription!.sdp }
        this.send({ k: 'rtc', t: 'answer', sid: w.sid, sdp: this.answer.sdp })
      }
    } catch (e) {
      console.warn('voice: signaling gagal, diulang', e)
      this.drop()
      this.setState('failed')
    }
  }

  close() {
    this.closed = true
    clearInterval(this.timer)
    this.stopLive()
    this.drop()
    this.audio.srcObject = null
  }
}
