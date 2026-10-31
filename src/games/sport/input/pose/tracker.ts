import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision'

export type Delegate = 'GPU' | 'CPU'

/** satu hasil pelacakan; `landmarks` kosong kalau tidak ada badan di bingkai */
export type PoseFrame = {
  landmarks: NormalizedLandmark[]
  /** waktu frame (performance.now) */
  at: number
  /** lama inferensi, ms */
  ms: number
}

// berkas ikut APK di public/pose supaya pelacakan jalan tanpa internet
const BASE = `${import.meta.env.BASE_URL}pose/`

/**
 * x & y MediaPipe dinormalisasi terpisah ke lebar & tinggi video. Gestur membandingkan jarak dua arah,
 * jadi x direntangkan dari tengah gambar supaya satu satuan sama panjang di kedua sumbu.
 */
export function squareUp(lm: NormalizedLandmark[], aspect: number): NormalizedLandmark[] {
  return lm.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * aspect }))
}

/** Nyalakan kamera depan dan pasang ke elemen video. */
export async function openCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
  })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  return stream
}

export function closeCamera(video: HTMLVideoElement) {
  const stream = video.srcObject as MediaStream | null
  stream?.getTracks().forEach((t) => t.stop())
  video.srcObject = null
}

async function loadModel(delegate: Delegate): Promise<PoseLandmarker> {
  const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
  return PoseLandmarker.createFromOptions(
    { wasmLoaderPath: `${BASE}vision_wasm_internal.js`, wasmBinaryPath: `${BASE}vision_wasm_internal.wasm` },
    {
      baseOptions: { modelAssetPath: `${BASE}pose_landmarker_lite.task`, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    },
  )
}

/** Membaca video dengan laju terbatas dan melapor lewat `onFrame`. */
export class PoseTracker {
  private model: PoseLandmarker | null = null
  private video: HTMLVideoElement | null = null
  private running = false
  private last = 0
  private onFrame: (f: PoseFrame) => void
  private maxHz: number
  delegate: Delegate = 'GPU'

  constructor(onFrame: (f: PoseFrame) => void, maxHz = 20) {
    this.onFrame = onFrame
    this.maxHz = maxHz
  }

  /** GPU dulu; HP yang tidak sanggup jatuh ke CPU. */
  async load(prefer: Delegate = 'GPU') {
    this.model?.close()
    this.model = null
    try {
      this.model = await loadModel(prefer)
      this.delegate = prefer
    } catch (e) {
      if (prefer === 'CPU') throw e
      this.model = await loadModel('CPU')
      this.delegate = 'CPU'
    }
  }

  start(video: HTMLVideoElement) {
    this.video = video
    this.running = true
    this.queue()
  }

  stop() {
    this.running = false
  }

  close() {
    this.stop()
    this.model?.close()
    this.model = null
  }

  private queue() {
    const v = this.video
    if (!this.running || !v) return
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => this.tick())
    else requestAnimationFrame(() => this.tick())
  }

  private tick() {
    const v = this.video
    if (!this.running || !v || !this.model) return
    const now = performance.now()
    if (now - this.last >= 1000 / this.maxHz && v.readyState >= 2) {
      this.last = now
      const res = this.model.detectForVideo(v, now)
      this.onFrame({ landmarks: squareUp(res.landmarks[0] ?? [], v.videoWidth / v.videoHeight), at: now, ms: performance.now() - now })
    }
    this.queue()
  }
}
