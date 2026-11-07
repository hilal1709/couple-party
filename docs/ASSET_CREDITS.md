# Kredit aset: Puncak Berdua v3 (Punggung Hijau)

Semua aset pihak ketiga di bawah berlisensi **CC0 1.0** (domain publik). Atribusi tidak wajib,
tetapi tetap dicatat di sini supaya asal tiap file bisa ditelusuri. Paket sumbernya disimpan di luar
repo, di `D:/dev/asset-src`, dan diolah dengan skrip Blender. Hasilnya berupa GLB yang sudah
didecimate dengan tekstur WebP maksimal 512 px.

## Model alam (pohon, semak, batu, hiasan kecil)
| Sumber | Lisensi | Dipakai sebagai | Skrip |
|---|---|---|---|
| Quaternius: Stylized Nature MegaKit (Standard), quaternius.itch.io/stylized-nature-megakit | CC0 1.0 (`License_Standard.txt` di paket) | `jati-*`, `beringin-*`, `pinus-1/2`, `kering-*`, `semak-*`, `batu-1..3`, `hias-bunga/pakis/jamur/kerikil-*` | `scripts/blender/puncak_props.py` |
| Quaternius: Ultimate Nature Pack, quaternius.itch.io/ultimate-nature-pack | CC0 1.0 (`License.txt` di paket) | `palem-*`, `pinus-salju-*`, `kering-salju-1`, `semak-salju-1`, `teh-*`, `batu-lumut-1`, `batu-salju-1`, `hias-kayu-1`, `hias-tunggul-1`, `hias-kaktus-*` | `scripts/blender/puncak_props.py` |

`semak-2` (Bush_Common) di paket aslinya berdaun merah. Di sini daunnya diganti tekstur daun hijau dari
paket yang sama (`Leaves_NormalTree_C`, lihat `RETEX` di skrip), supaya tidak terlihat seperti gumpalan
merah di bioma hijau.

## Hiasan kemah & penanda Punggung Hijau (Tahap 5)
| File | Sumber | Lisensi |
|---|---|---|
| `kemah-kayu.glb` (tumpukan kayu bakar) | Quaternius Ultimate Nature Pack: `WoodLog`, `WoodLog_Moss` | CC0 1.0 |
| `kemah-tugu.glb` (tumpukan batu penanda) | Quaternius Stylized Nature MegaKit: `Pebble_Round_1..5` | CC0 1.0 |
| `kemah-peti.glb` (peti perbekalan) | Poly Haven: `wooden_crate_01` (polyhaven.com/a/wooden_crate_01) | CC0 1.0 (polyhaven.com/license) |
| `kemah-lentera.glb` (lentera) | Poly Haven: `Lantern_01` (polyhaven.com/a/Lantern_01) | CC0 1.0 (polyhaven.com/license) |
| `kemah-tenda-1..3.glb` (tenda) | dibuat sendiri (geometri prosedural di Blender) | milik proyek |
| `kemah-papan.glb` (papan arah) | dibuat sendiri | milik proyek |
| `kemah-bendera.glb` (tali bendera) | dibuat sendiri | milik proyek |

Skrip pembuatnya: `scripts/blender/puncak_kemah.py`.

## Dibuat sendiri (tanpa aset pihak ketiga, tanpa AI generatif)
- Tekstur medan PBR (`src/assets/puncak/tex/*`): procedural (noise + voronoi), `scripts/puncak_tex.py`.
- Pendaki gendut & animasinya: `scripts/blender/puncak_chars.py`.
- Medan, tugu batu "Batu Kembar", air terjun, api unggun, peti, dan sarang: dibangkitkan dari kode
  (`sim/terrain.ts`, `render/props.ts`, `render/fluids.ts`).
- Latar Punggung Hijau (dasar lembah, hutan lembah, tiga lapis pegunungan jauh): geometri dari kode,
  `render/backdrop.ts`.

## Langit
Langit HDR `src/assets/sport/tex/langit-*.hdr` dipakai ulang dari Sport Kacau. Menurut
`public/audio/CREDITS.md`, langit Kart/Sport berasal dari HDRI **Poly Haven** (CC0):
kloofendal_43d_clear_puresky, belfast_sunset_puresky, dan kloppenheim_02_puresky. Pemetaan nama mana ke
file `langit-*` mana tidak tercatat di repo.

## Musik & suara (Tahap 7)
Semuanya disintesis dari nol, tanpa sampel dan tanpa AI generatif:
- Lagu "Kemah Pagi" dan "Punggung Angin"
- Suasana hutan, air terjun, dan api unggun
- SFX lempar, tangkap, dan gendong

Sumbernya `scripts/audio/puncak_songs.py`. SFX lama ada di `scripts/audio/build.py`.

## Ilustrasi & animasi (Tahap 7)
- **Tile menu** `src/assets/puncak/tile-puncak.webp`: adegan three.js prosedural
  (`src/games/puncak/dev/tile.ts`) dengan pendaki dari `pendaki.glb` milik proyek. Masternya di
  `brand/illustrations/puncak/tile-puncak.png`.
- **Lottie** `puncak-api` (api unggun menyala) dan `puncak-puncak` (bendera puncak): dibuat dengan
  generator sendiri `scripts/lottie.mjs`.
