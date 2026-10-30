import { store } from '@/net/transport'

export type Quality = 'low' | 'med' | 'high'

/** apa saja yang dinyalakan per tingkat grafis */
export type Tier = {
  q: Quality
  /** batas pixel ratio */
  ratio: number
  /** ukuran peta bayangan matahari; 0 = blob shadow saja */
  shadow: number
  /** bloom + FXAA lewat EffectComposer */
  post: boolean
  /** kerapatan rumput/bunga/kerikil kecil (0..1) */
  detail: number
  /** kerapatan prop di luar jalan (0..1) */
  props: number
  /** jumlah partikel maksimum per jenis */
  particles: number
  /** jarak pandang (kabut) dikalikan ini */
  far: number
  /** tekstur normal & roughness pada jalan/tanah */
  pbr: boolean
}

export const TIERS: Record<Quality, Tier> = {
  low: { q: 'low', ratio: 1, shadow: 0, post: false, detail: 0.25, props: 0.35, particles: 120, far: 0.75, pbr: false },
  med: { q: 'med', ratio: 1.25, shadow: 1024, post: true, detail: 0.6, props: 0.8, particles: 260, far: 1, pbr: true },
  high: { q: 'high', ratio: 1.75, shadow: 2048, post: true, detail: 1, props: 1, particles: 420, far: 1.25, pbr: true },
}

export const QUALITY_INFO: Record<Quality, { title: string; line: string }> = {
  low: { title: 'Hemat', line: 'Paling ringan, buat HP lama' },
  med: { title: 'Sedang', line: 'Bayangan & cahaya kilau' },
  high: { title: 'Tinggi', line: 'Semua efek, paling cantik' },
}

const KEY = 'couple-party:kart-quality'

let detected: Quality | null = null

/** tebakan awal dari GPU, memori, dan jumlah inti CPU; dihitung sekali karena butuh context WebGL */
export function detectQuality(): Quality {
  return (detected ??= probeQuality())
}

function probeQuality(): Quality {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return 'low'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase()
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const cores = navigator.hardwareConcurrency ?? 4
    // GPU HP lama / kelas bawah
    if (/mali-(4|t[0-9])|adreno \(tm\) (3|4|50)|powervr|sgx|mali-g(31|51|52|57)/.test(gpu) || mem <= 3 || cores <= 4) return 'low'
    if (/adreno \(tm\) (7[3-9]|[89]\d\d)|mali-g(7[1-9]|71[0-9]|72[0-9])|immortalis|apple|nvidia|geforce|radeon|intel\(r\) (iris|arc)/.test(gpu) && mem >= 6) return 'high'
    return 'med'
  } catch {
    return 'low'
  }
}

/** pilihan tersimpan ('auto' = deteksi) */
export function savedQuality(): Quality | 'auto' {
  const v = store.getItem(KEY)
  return v === 'low' || v === 'med' || v === 'high' ? v : 'auto'
}

export function saveQuality(q: Quality | 'auto') {
  store.setItem(KEY, q)
}

/** dev: paksa tingkat lewat ?q=low|med|high */
export function initialTier(): Tier {
  const dev = import.meta.env.DEV ? new URLSearchParams(location.search).get('q') : null
  const pick = dev === 'low' || dev === 'med' || dev === 'high' ? dev : savedQuality()
  return TIERS[pick === 'auto' ? detectQuality() : pick]
}
