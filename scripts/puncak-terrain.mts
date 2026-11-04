// Ringkasan gunung Puncak Berdua: npx tsx scripts/puncak-terrain.mts [id] [zones] [seed]
import { MOUNTAIN_IDS } from '../src/games/puncak/mountains'
import { buildTerrain, heightAt, slopeAt } from '../src/games/puncak/sim/terrain'
import type { MountainId } from '../src/games/puncak/types'

const ids = process.argv[2] ? [process.argv[2] as MountainId] : MOUNTAIN_IDS
const Z = Number(process.argv[3] ?? 4)
const seed = Number(process.argv[4] ?? 1234)
for (const id of ids) {
  const t0 = performance.now()
  const t = buildTerrain(id, Z, seed)
  const ms = Math.round(performance.now() - t0)
  let steep = 0
  let vsteep = 0
  let tot = 0
  for (let z = t.start.z; z < t.summit.z; z += 1) {
    for (let x = -30; x <= 30; x += 1) {
      tot++
      const s = slopeAt(t, x, z)
      if (s > 1) steep++
      if (s > 6) vsteep++
    }
  }
  const climbs = t.route.filter((p) => p.climb).length
  let maxClimb = 0
  for (let i = 1; i < t.route.length; i++) if (t.route[i].climb) maxClimb = Math.max(maxClimb, t.route[i].y - t.route[i - 1].y)
  console.log(
    `${id.padEnd(8)} ${ms}ms size=${t.size} summit=${t.summit.y.toFixed(1)} camps=${t.camps.map((c) => c.y.toFixed(0)).join('/')} chests=${t.chests.length} route=${t.route.length} climbs=${climbs} maxClimb=${maxClimb.toFixed(1)} steep=${((steep / tot) * 100).toFixed(0)}% >6=${((vsteep / tot) * 100).toFixed(1)}% vines=${t.vines.length} decks=${t.decks.length} start=${t.start.y.toFixed(1)} h(start)=${heightAt(t, t.start.x, t.start.z).toFixed(1)}`,
  )
}
