// Cek lintasan Kart Kacau (dev): panjang, jarak antar bagian, radius tikungan, lalu gambar PNG peta.
// npx tsx scripts/kart-tracks.mts [folder-png]
import { writeFileSync } from 'node:fs'
import { TRACKS } from '../src/games/kart/tracks.ts'
import { buildTrack } from '../src/games/kart/sim/track.ts'
const out = process.argv[2]
for (const def of Object.values(TRACKS)) {
  const t = buildTrack(def)
  let gap = Infinity
  for (let i = 0; i < t.n; i += 2)
    for (let j = i + 60; j < t.n; j += 2) {
      if (t.n - j + i < 60) continue
      gap = Math.min(gap, Math.hypot(t.px[i] - t.px[j], t.pz[i] - t.pz[j]))
    }
  let rmin = Infinity
  for (let i = 0; i < t.n; i++) {
    const a = (i + t.n - 4) % t.n, b = (i + 4) % t.n
    let d = Math.atan2(t.tx[b], t.tz[b]) - Math.atan2(t.tx[a], t.tz[a])
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    if (Math.abs(d) > 1e-4) rmin = Math.min(rmin, 16 / Math.abs(d))
  }
  console.log(def.id.padEnd(8), 'len', t.length.toFixed(0), 'gap', gap.toFixed(0), 'rmin', rmin.toFixed(0), 'width', def.width)
  if (out) {
    const pts: string[] = []
    for (let i = 0; i < t.n; i += 2) pts.push(`${t.px[i].toFixed(0)},${t.pz[i].toFixed(0)}`)
    writeFileSync(`${out}/${def.id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-650 -850 1600 1600" width="380" height="380"><rect x="-300" y="-200" width="1300" height="1000" fill="#24506a"/><polygon points="${pts.join(' ')}" fill="none" stroke="#121212" stroke-width="${def.width + 10}" stroke-linejoin="round"/><polygon points="${pts.join(' ')}" fill="none" stroke="#ff4d6d" stroke-width="${def.width}" stroke-linejoin="round"/><circle cx="${t.px[0]}" cy="${t.pz[0]}" r="18" fill="#fff"/><text x="-280" y="-150" font-size="60" fill="#fff">${def.id}</text></svg>`)
  }
}
