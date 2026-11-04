// Tulis denah semua dapur Dapur Kacau ke JSON supaya skrip Blender memakai tata letak yang sama persis dengan game.
// npx tsx scripts/masak-layout.mts  →  scripts/blender/masak_layouts.json
import { writeFileSync } from 'node:fs'
import { CELL, COUNTER_TOP, KITCHEN_IDS, KITCHENS, layoutOf } from '../src/games/masak/kitchens'

const out: Record<string, unknown> = { cell: CELL, top: COUNTER_TOP }
for (const id of KITCHEN_IDS) {
  const L = layoutOf(id)
  out[id] = {
    w: L.w,
    h: L.h,
    title: KITCHENS[id].title,
    // sumbu three (x, z) → Blender (x, -z)
    stations: L.stations.map((s, i) => ({
      kind: s.kind,
      ing: s.ing ?? null,
      c: s.c,
      r: s.r,
      x: +s.x.toFixed(3),
      y: +(-s.z).toFixed(3),
      // sisi yang menghadap lantai, untuk memutar kompor & wastafel
      open: L.fronts[i].map(([x, z]) => [+(x - s.x).toFixed(2), +(-(z - s.z)).toFixed(2)]),
      ext: i === L.extinguisher,
    })),
    gimmick: KITCHENS[id].gimmick ?? null,
    belt: L.belt,
    gap: L.gap.map(([x, z]) => [+x.toFixed(3), +(-z).toFixed(3)]),
    lava: L.lava.map((g) => g.map(([x, z]) => [+x.toFixed(3), +(-z).toFixed(3)])),
  }
}
writeFileSync(new URL('./blender/masak_layouts.json', import.meta.url), JSON.stringify(out, null, 1))
console.log('ditulis', KITCHEN_IDS.join(', '))
