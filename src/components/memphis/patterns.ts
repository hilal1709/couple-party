import { nextRand } from '@/games/rng'

const cache = new Map<string, string>()

const svgUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`

/**
 * Terrazzo prosedural: serpihan bersudut acak di atas warna dasar.
 * Seed berbeda → pola berbeda, jadi tiap permukaan punya speckle sendiri.
 */
export function terrazzo(
  seed: number,
  colors = ['#ff37a6', '#43b929', '#121212', '#5cf64a'],
  size = 160,
  count = 34,
): string {
  const key = `t${seed}${colors.join()}${size}${count}`
  const hit = cache.get(key)
  if (hit) return hit
  let s = seed * 9973 + 17
  const r = () => {
    const [v, ns] = nextRand(s)
    s = ns
    return v
  }
  let chips = ''
  for (let i = 0; i < count; i++) {
    const cx = r() * size
    const cy = r() * size
    const rad = 1.2 + r() * (i % 5 === 0 ? 4.5 : 2.2)
    const sides = 3 + Math.floor(r() * 3)
    const rot = r() * Math.PI * 2
    const pts = Array.from({ length: sides }, (_, k) => {
      const a = rot + (k / sides) * Math.PI * 2
      const d = rad * (0.6 + r() * 0.6)
      return `${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`
    }).join(' ')
    chips += `<polygon points="${pts}" fill="${colors[Math.floor(r() * colors.length)]}"/>`
  }
  const url = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${chips}</svg>`)
  cache.set(key, url)
  return url
}

/** Laminasi squiggle: cacing tinta pendek berulang. */
export function squiggles(ink = '#121212', size = 56, weight = 3.2): string {
  const key = `q${ink}${size}${weight}`
  const hit = cache.get(key)
  if (hit) return hit
  const h = size / 2
  const path = (x: number, y: number, flip: number) =>
    `<path d="M${x} ${y} q4 ${-6 * flip} 8 0 t8 0" fill="none" stroke="${ink}" stroke-width="${weight}" stroke-linecap="round"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${path(4, 10, 1)}${path(h + 6, 6 + h / 2, -1)}${path(10, h + 14, -1)}${path(h + 2, size - 6, 1)}</svg>`
  const url = svgUrl(svg)
  cache.set(key, url)
  return url
}

/** Garis miring untuk status nonaktif (status lewat pola, bukan cuma warna). */
export function hatch(ink = '#121212', gap = 8, opacity = 0.18): string {
  const key = `h${ink}${gap}${opacity}`
  const hit = cache.get(key)
  if (hit) return hit
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${gap}" height="${gap}"><path d="M0 ${gap} L${gap} 0" stroke="${ink}" stroke-opacity="${opacity}" stroke-width="2"/></svg>`
  const url = svgUrl(svg)
  cache.set(key, url)
  return url
}

/** Polkadot Memphis. */
export function dots(color = '#121212', gap = 14, r = 2): string {
  const key = `d${color}${gap}${r}`
  const hit = cache.get(key)
  if (hit) return hit
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${gap}" height="${gap}"><circle cx="${gap / 4}" cy="${gap / 4}" r="${r}" fill="${color}"/><circle cx="${(gap * 3) / 4}" cy="${(gap * 3) / 4}" r="${r}" fill="${color}"/></svg>`
  const url = svgUrl(svg)
  cache.set(key, url)
  return url
}
