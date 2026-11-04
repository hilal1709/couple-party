// Simulasi tanpa layar: bot koki menjalankan satu ronde, cetak skor vs ambang bintang.
// npx tsx scripts/masak-sim.mts [dapur] [detik]
import { spawnWalker } from '../src/games/petak/sim/walk'
import { KITCHEN_IDS, layoutOf, starGoals } from '../src/games/masak/kitchens'
import { newBot, stepBot, type Plan } from '../src/games/masak/sim/bots'
import { advance, newKit } from '../src/games/masak/sim/kitchen'
import type { KitchenId } from '../src/games/masak/types'

const ids = (process.argv[2] ? [process.argv[2]] : KITCHEN_IDS) as KitchenId[]
const secs = Number(process.argv[3] ?? 180)
for (const id of ids) {
  const L = layoutOf(id)
  for (const level of [1, 2, 3] as const) {
    const row: string[] = []
    for (const n of [1, 2, 4, 8]) {
      const k = newKit(id, n, 11)
      const w = L.spawns.slice(0, n).map(([x, z]) => spawnWalker(x, z))
      const bots = w.map(() => newBot())
      for (let t = 0; t < secs; t += 0.05) {
        advance(k, 50, true, n)
        bots.forEach((b, i) => stepBot(k, i, b, w[i], 0.05, level, bots.flatMap((o, j) => (j !== i && o.plan ? [o.plan] : [])) as Plan[]))
      }
      const g = starGoals(id, n, secs)
      const stars = g.filter((v) => k.score >= v).length
      row.push(`${n} koki ${k.score} (${k.served}/${k.missed}) ${'*'.repeat(stars)}${'-'.repeat(3 - stars)} [${g}]`)
    }
    console.log(`${id} bot ${level}: ${row.join(' | ')}`)
  }
}
