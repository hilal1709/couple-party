// Salin tekstur PBR CC0 (Poly Haven) yang sudah tertanam di map Petak ke aset Sunyi.
// Jalankan: node scripts/sunyi/extract-tex.mjs, lalu kecilkan ke 1024 px (WebP q84) supaya ringan di HP.
import fs from 'fs'
const MAPS = ['dapur', 'gang', 'kapal', 'kota', 'museum', 'pabrik', 'pasar', 'stasiun']
const WANT = {
  lantai: 'old_wood_floor', dinding: 'worn_mossy_plasterwall', plester: 'damaged_plaster', papan: 'weathered_planks',
  genteng: 'clay_roof_tiles', tanah: 'dirt_floor', batu: 'cobblestone_01', bata: 'brick_4', seng: 'rusty_corrugated_iron',
  pintu: 'distressed_painted_planks', kain: 'fabric_pattern_05',
}
// kulit kayu & daun pohon dari pack alam di map Gang
const EXACT = { Bark_NormalTree: 'kulit_diff', Bark_NormalTree_Normal: 'kulit_nor', Leaves_NormalTree_C: 'daun_diff', Leaves: 'daun2_diff' }
const found = {}
for (const m of MAPS) {
  const b = fs.readFileSync(`src/assets/petak/maps/${m}.glb`)
  const len = b.readUInt32LE(12)
  const j = JSON.parse(b.subarray(20, 20 + len).toString())
  const bin = 20 + len + 8
  for (const im of j.images ?? []) {
    if (EXACT[im.name] && !found[EXACT[im.name]]) {
      const bv = j.bufferViews[im.bufferView]
      found[EXACT[im.name]] = b.subarray(bin + (bv.byteOffset ?? 0), bin + (bv.byteOffset ?? 0) + bv.byteLength)
    }
    for (const [out, src] of Object.entries(WANT)) {
      const mm = im.name.match(new RegExp(`^${src}_(diff|nor|rough)$`))
      if (!mm) continue
      const bv = j.bufferViews[im.bufferView]
      const key = `${out}_${mm[1]}`
      // ambil versi terbesar (resolusi tertinggi)
      if ((found[key]?.length ?? 0) >= bv.byteLength) continue
      found[key] = b.subarray(bin + (bv.byteOffset ?? 0), bin + (bv.byteOffset ?? 0) + bv.byteLength)
    }
  }
}
for (const [k, v] of Object.entries(found)) fs.writeFileSync(`src/assets/sunyi/tex/${k}.webp`, v)
console.log(Object.keys(found).sort().join(' '))
