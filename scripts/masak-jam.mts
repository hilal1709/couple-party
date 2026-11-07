// Cari macet bot: jalankan N bot di satu dapur seperti tes bintang, cetak tiap 5 dtk posisi, tangan, dan rencana tiap bot.
// npx tsx scripts/masak-jam.mts <dapur> <bot> [detik]
import { spawnWalker } from '../src/games/petak/sim/walk'
import { layoutOf } from '../src/games/masak/kitchens'
import { newBot, stepBot, type Plan } from '../src/games/masak/sim/bots'
import { advance, newKit } from '../src/games/masak/sim/kitchen'
import type { KitchenId } from '../src/games/masak/types'

const id = (process.argv[2] ?? 'ramen') as KitchenId
const n = Number(process.argv[3] ?? 8)
const secs = Number(process.argv[4] ?? 60)
const L = layoutOf(id)
const k = newKit(id, n, 11)
const walkers = L.spawns.slice(0, n).map(([x, z]) => spawnWalker(x, z))
const bots = walkers.map(() => newBot())
const dt = 0.05
let next = 0
for (let t = 0; t < secs; t += dt) {
  advance(k, dt * 1000, true, n)
  bots.forEach((b, i) => {
    const claims = bots.flatMap((o, j) => (j !== i && o.plan ? [o.plan] : [])) as Plan[]
    stepBot(k, i, b, walkers[i], dt, 3, claims)
  })
  if (t >= next) {
    next += 5
    console.log(`t=${t.toFixed(1)} skor ${k.score} saji ${k.served} kabur ${k.missed} pesanan ${k.orders.map((o) => o.r).join(',')}`)
    const desc = (id: number | null) => {
      const it = k.items[id ?? -1]
      if (!it) return '?'
      if (it.k === 'food') return `${it.ing}:${it.s}${it.p ? '@' + it.p.toFixed(1) : ''}`
      if (it.k === 'plate') return `piring[${it.f.join(' ')}]`
      if (it.k === 'pot') return `${it.pan}(${it.in === null ? '' : desc(it.in)})`
      return it.k
    }
    console.log('  meja', k.hold.flatMap((id, si) => (id === null ? [] : [`${L.stations[si].kind}#${si}=${desc(id)}`])).join(' '), 'lantai', k.floor.length)
    bots.forEach((b, i) => {
      const h = k.items[k.hands[i] ?? -1]
      const hand = !h ? '-' : h.k === 'food' ? `${h.ing}:${h.s}` : h.k === 'plate' ? `piring[${h.f.join(' ')}]` : h.k === 'pot' ? `${h.pan}(${h.in})` : h.k
      const p = b.plan ? `${L.stations[b.plan.si].kind}#${b.plan.si}/${b.plan.op}` : 'diam'
      console.log(`  bot${i} (${walkers[i].x.toFixed(1)},${walkers[i].z.toFixed(1)}) ${hand} → ${p} jalur ${b.path.length - b.next} tunggu ${b.wait.toFixed(1)}`)
    })
  }
}
