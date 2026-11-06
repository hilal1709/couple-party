// Kalibrasi bintang Dapur Kacau: rata-rata skor bot (beberapa benih) per dapur, level, dan jumlah koki.
// Usulan ambang: bintang 1/2/3 = 35% / 65% / 95% skor rata-rata bot Susah dengan 2 koki, 180 dtk;
// skala per jumlah koki = rasio rata-rata skor bot Susah n koki terhadap 2 koki di semua dapur.
// npx tsx scripts/masak-calibrate.mts [benih...]
import { spawnWalker } from '../src/games/petak/sim/walk'
import { KITCHEN_IDS, layoutOf } from '../src/games/masak/kitchens'
import { newBot, stepBot, type Plan } from '../src/games/masak/sim/bots'
import { advance, newKit } from '../src/games/masak/sim/kitchen'
import type { KitchenId } from '../src/games/masak/types'

const seeds = process.argv.slice(2).map(Number).filter(Boolean)
const SEEDS = seeds.length ? seeds : [11, 23, 37, 51]
const NS = [1, 2, 3, 4, 6, 8]

function run(id: KitchenId, n: number, level: 1 | 2 | 3, seed: number) {
  const L = layoutOf(id)
  const k = newKit(id, n, seed)
  const w = L.spawns.slice(0, n).map(([x, z]) => spawnWalker(x, z))
  const bots = w.map(() => newBot())
  for (let t = 0; t < 180; t += 0.05) {
    advance(k, 50, true, n)
    bots.forEach((b, i) => stepBot(k, i, b, w[i], 0.05, level, bots.flatMap((o, j) => (j !== i && o.plan ? [o.plan] : [])) as Plan[]))
  }
  return k.score
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const out: Record<string, Record<string, number[]>> = {}
for (const id of KITCHEN_IDS) {
  out[id] = {}
  for (const level of [1, 2, 3] as const) {
    out[id][level] = NS.map((n) => Math.round(mean(SEEDS.map((s) => run(id, n, level, s)))))
  }
  console.log(id, JSON.stringify(out[id]))
}
const ratio = NS.map((_, i) => mean(KITCHEN_IDS.map((id) => out[id][3][i] / out[id][3][1])))
console.log('skala per koki', NS.map((n, i) => `${n}:${ratio[i].toFixed(2)}`).join(' '))
for (const id of KITCHEN_IDS) {
  const s2 = out[id][3][1]
  const r = (f: number) => Math.round((s2 * f) / 5) * 5
  console.log(`${id} stars: [${r(0.35)}, ${r(0.65)}, ${r(0.95)}]`)
}
