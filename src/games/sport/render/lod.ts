import type { Quality } from './stage'

/** Apa yang digambar per tingkat grafis. */
export type Detail = {
  /** kerapatan rumput instanced (0 = tidak ada) */
  grass: number
  /** bagian penonton yang digambar */
  crowd: number
  particles: number
  /** normal & roughness map */
  pbr: boolean
}

export const DETAIL: Record<Quality, Detail> = {
  low: { grass: 0, crowd: 0.3, particles: 120, pbr: false },
  med: { grass: 0.5, crowd: 0.7, particles: 240, pbr: true },
  high: { grass: 1, crowd: 1, particles: 400, pbr: true },
}
