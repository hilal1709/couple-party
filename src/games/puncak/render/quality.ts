import type { Tier } from '@/games/kart/render/quality'

/**
 * Tingkat grafis Puncak Berdua = tier bersama (Kart) + penyesuaian anti-aliasing khusus gunung.
 * Tebing tinggi penuh garis tipis & tepi bongkahan, jadi tangga-tangga piksel lebih terlihat daripada di Kart.
 * - Hemat: MSAA kanvas + pixel ratio 1,5 (tanpa post-processing)
 * - Sedang: MSAA 4× di target composer + SMAA
 * - Tinggi: MSAA 4× + SMAA + pixel ratio 2
 */
export function puncakTier(t: Tier): Tier {
  if (t.q === 'low') return { ...t, ratio: Math.max(t.ratio, 1.5) }
  if (t.q === 'med') return { ...t, samples: Math.max(t.samples, 4), ratio: Math.max(t.ratio, 1.6) }
  return { ...t, samples: Math.max(t.samples, 4), ratio: Math.max(t.ratio, 2) }
}

/** penyaringan anisotropik tekstur medan (tebing miring tidak buram/berkedip) */
export const ANISO: Record<Tier['q'], number> = { low: 4, med: 8, high: 16 }
