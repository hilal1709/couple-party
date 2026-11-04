// Jejak bot satu dapur untuk mencari kenapa bot macet: rencana, tangan, pesanan per beberapa detik.
// npx tsx scripts/masak-trace.mts <dapur> [koki] [detik]
import { spawnWalker } from '../src/games/petak/sim/walk'
import { layoutOf } from '../src/games/masak/kitchens'
import { newBot, stepBot, type Plan } from '../src/games/masak/sim/bots'
import { advance, newKit } from '../src/games/masak/sim/kitchen'
import type { KitchenId } from '../src/games/masak/types'

const id = (process.argv[2] ?? 'pizza') as KitchenId
const n = Number(process.argv[3] ?? 1)
const secs = Number(process.argv[4] ?? 60)
const L = layoutOf(id)
const k = newKit(id, n, 11)
const w = L.spawns.slice(0, n).map(([x, z]) => spawnWalker(x, z))
const bots = w.map(() => newBot())
let last = ''
for (let t = 0; t < secs; t += 0.05) {
  advance(k, 50, true, n)
  bots.forEach((b, i) => stepBot(k, i, b, w[i], 0.05, 3, bots.flatMap((o, j) => (j !== i && o.plan ? [o.plan] : [])) as Plan[]))
  const line = bots
    .map((b, i) => {
      const h = k.items[k.hands[i] ?? -1]
      const hand = !h ? '-' : h.k === 'food' ? `${h.ing}:${h.s}` : h.k === 'plate' ? `piring[${h.f}]` : h.k
      const pl = b.plan ? `${L.stations[b.plan.si].kind}#${b.plan.si}/${b.plan.op}` : 'diam'
      return `bot${i} ${hand} → ${pl}`
    })
    .join(' | ')
  if (line !== last) {
    const surf = k.hold.flatMap((x, si) => (x === null ? [] : [`${L.stations[si].kind}#${si}:${JSON.stringify(k.items[x]).slice(0, 60)}`]))
    console.log(t.toFixed(1), line, '| pesanan', k.orders.map((o) => o.r).join(','), '| meja', surf.length > 6 ? surf.length : surf.join(' '))
    last = line
  }
}
console.log('skor', k.score, 'tersaji', k.served, 'kabur', k.missed)
