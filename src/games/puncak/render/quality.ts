import { detectQuality, TIERS, type Quality, type Tier } from '@/games/kart/render/quality'
import type { GfxChoice } from '../platform/settings'
import type { Step } from './perf'

/**
 * Profil grafis Puncak (spesifikasi §4). Resolusi dihitung dari tinggi render internal, bukan
 * pixel ratio tetap, supaya HP 1080p dan 1440p sama-sama dapat ±720p di Low.
 */
export type Profile = {
  tier: Tier
  /** FPS yang dikejar & batas atas frame (hemat panas) */
  fps: number
  /** tinggi render internal (piksel) pada skala 1 */
  height: number
  /** skala resolusi terendah yang boleh dipakai pengatur adaptif */
  minScale: number
  /** langkah turun yang tersedia setelah resolusi mentok */
  steps: Step[]
}

const PROFILES: Record<Quality, Omit<Profile, 'tier'>> = {
  low: { fps: 30, height: 720, minScale: 0.7, steps: ['grass', 'fx'] },
  med: { fps: 60, height: 900, minScale: 0.7, steps: ['shadow', 'grass', 'fx', 'post'] },
  high: { fps: 60, height: 1080, minScale: 0.75, steps: ['shadow', 'grass', 'fx', 'post'] },
}

/**
 * Tier bersama (Kart) + penyesuaian gunung:
 * - Low: tanpa bayangan peta (blob), tanpa post, MSAA kanvas.
 * - Medium: bayangan 1024, MSAA 4× di target composer + SMAA.
 * - High: bayangan 2048, MSAA 4× + SMAA.
 */
function puncakTier(t: Tier): Tier {
  if (t.q === 'low') return { ...t, shadow: 0, post: false, samples: 0 }
  return { ...t, samples: Math.max(t.samples, 4) }
}

export function profileFor(choice: GfxChoice): Profile {
  const dev = import.meta.env.DEV ? new URLSearchParams(location.search).get('q') : null
  const q: Quality = dev === 'low' || dev === 'med' || dev === 'high' ? dev : choice === 'auto' ? detectQuality() : choice
  return { tier: puncakTier(TIERS[q]), ...PROFILES[q] }
}

/** pixel ratio untuk mencapai tinggi internal profil pada kanvas setinggi `cssH`, dikali skala adaptif */
export function ratioFor(p: Profile, cssH: number, scale: number, dpr = devicePixelRatio) {
  const want = (p.height * scale) / Math.max(1, cssH)
  // jangan melebihi layar asli, dan jangan di bawah 480p supaya tebing tetap terbaca
  return Math.min(dpr, Math.max(want, 480 / Math.max(1, cssH)))
}

/** penyaringan anisotropik tekstur medan (tebing miring tidak buram/berkedip) */
export const ANISO: Record<Tier['q'], number> = { low: 4, med: 8, high: 16 }
