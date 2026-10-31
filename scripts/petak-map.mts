// Periksa data map Petak Cat: titik yang tak terjangkau/menembus tembok, plus peta ASCII jalan bot.
// Jalankan: npx tsx scripts/petak-map.mts gang
import { readFileSync } from 'node:fs'
import { buildNav, reachable } from '../src/games/petak/sim/nav.ts'
import { pushOut } from '../src/games/petak/sim/walk.ts'

const name = process.argv[2] ?? 'gang'
const map = JSON.parse(readFileSync(`src/assets/petak/maps/${name}.json`, 'utf8'))
const nav = buildNav(map)
const [sx, sz] = map.spawn.hider[0]
console.log('titik', map.spots.length, 'kotak', map.boxes.length)
for (const p of map.spots) {
  const ok = reachable(nav, sx, sz, p.x, p.z)
  const [px, pz] = pushOut(map.boxes, p.x, p.z, 0)
  const d = Math.hypot(px - p.x, pz - p.z)
  if (!ok || d > 0.02) console.log(`blender(${p.x}, ${-p.z}) terjangkau=${ok} terdorong=${d.toFixed(2)}`)
}
for (const [x, z] of [...map.spawn.hider, ...map.spawn.seeker]) {
  const [px, pz] = pushOut(map.boxes, x, z, 0.4)
  if (Math.hypot(px - x, pz - z) > 0.01) console.log('muncul', x, z, Math.hypot(px - x, pz - z).toFixed(2))
}
// peta: # tembok, angka = wilayah tersambung; utara Blender di atas
const SIZE = Math.ceil(52 / 0.6)
const rows: string[] = []
for (let y = 21; y >= -21; y -= 1) {
  let r = ''
  for (let x = -25; x <= 25; x += 0.5) {
    const i = Math.floor((-y + 26) / 0.6) * SIZE + Math.floor((x + 26) / 0.6)
    r += nav.free[i] ? String(nav.region[i] % 10) : '#'
  }
  rows.push(r)
}
console.log(rows.join('\n'))
