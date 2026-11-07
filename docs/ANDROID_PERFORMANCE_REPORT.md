# Puncak Berdua v3: laporan performa Android

Status: **final Tahap 9 (2026-11-07)**. **Belum ada pengukuran di HP Android fisik mana pun.**
HP low-end fisik tidak tersedia, dan sesi 15 menit di Xiaomi 14T Pro dilewati atas keputusan user.
Yang terukur: emulator Android (profil Hemat) dan Chrome desktop. Bagian "Belum diuji" di bawah
menyebut semua yang belum diverifikasi.

## Profil grafis (src/games/puncak/render/quality.ts)
| Profil | Batas FPS | Render internal | Bayangan | Post | Skala min | Langkah turun setelah resolusi |
|---|---|---|---|---|---|---|
| Hemat (Low) | 30 | 720p | tidak (blob) | tidak | 0,70 | rumput → partikel |
| Sedang | 60 | 900p | 1024 | grading + SMAA (tanpa bloom sejak Tahap 7) | 0,70 | bayangan → rumput → partikel → post |
| Tinggi | 60 | 1080p | 2048 | sama | 0,75 | sama |

- Render internal tidak pernah di bawah 480p dan tidak pernah melebihi resolusi layar asli.
- Pengatur adaptif (render/perf.ts) bekerja per jendela 1 detik. Dua detik berturut-turut di atas
  112% anggaran frame memicu satu langkah turun. Resolusi naik lagi setelah 8 detik tenang.
  Langkah lain tidak dinyalakan ulang.
- Medan, pegangan panjat, dan bahaya tidak pernah disembunyikan oleh pengatur ini.

## Pengukuran
### 2026-11-07: Chrome headless di laptop (bukan Android)
Diukur dengan `scripts/capture.mjs` (ANGLE D3D11), viewport 844×390, dpr 2, gunung Karang Tropis,
di kemah awal. Ini hanya pemeriksaan bahwa alat ukurnya bekerja. Angka ini **bukan** performa HP.

| Profil | FPS (batas) | Render internal | Draw call | Segitiga | Tekstur |
|---|---|---|---|---|---|
| Hemat | 29 (30) | 720p | 176 | 155 ribu | 58 |
| Sedang | 49 (60) | 780p (mentok dpr 2) | 385 | 384 ribu | 79 |

### Hambatan yang terlihat di Tahap 1 (sudah ditangani di Tahap 8, lihat di bawah)
- Draw call Low 176, sedangkan targetnya < 100. Rumput, prop, dan dekorasi masih banyak yang
  berupa mesh terpisah. Perlu digabung atau dijadikan instanced per chunk.
- Medium 385 draw call sudah termasuk pass bayangan. Caster bayangan perlu dibatasi.
- Pendaki: 20 ribu segitiga di file (16 tulang, 25 klip). Varian topi dan wajah yang
  disembunyikan tidak ikut digambar, jadi angka yang tergambar lebih kecil. Badan sendiri ±11 ribu
  segitiga, jadi empat pendaki masih memakan sebagian besar anggaran Low. Perlu versi LOD untuk
  aktor jauh.

## Animasi (Tahap 2)
- LOD animasi: aktor dalam 22 m diperbarui tiap frame, 22–50 m tiap 2 frame, lebih jauh tiap
  4 frame. Aktor di luar layar tidak diperbarui dan tidak digambar.

## Panjat & Rapier (Tahap 3)
- Rapier 0.19.3 (`@dimforge/rapier3d-compat`) dimuat lazy saat Puncak dibuka: chunk 2,2 MB
  (842 KB gzip), WASM di dalam JS. Gagal dimuat = panjat jatuh ke heightfield, game tetap jalan.
- Dunia tabrakan dibangun ±0,7 dtk di laptop (heightfield medan + silinder batu/pohon) saat layar
  muat. Di HP low-end perkiraannya 2–3× lebih lama dan **belum diukur**.
- Anggaran sinar: 0 saat berjalan tanpa Pegang. Saat memanjat ±3 per tick (dibatasi tes: maks 6).
  Teramati 89 sinar/dtk untuk satu pemanjat + satu bot pada 30 FPS.
- Gerak darat masih memakai heightfield sim (belum KinematicCharacterController Rapier). Rapier
  dipakai untuk semua kueri panjat: pegang, tempel, bibir, naik tepian, tangkap di udara.

## Jaringan (Tahap 4)
Model: HP host = otoritas (Supabase Realtime broadcast, tanpa server Colyseus atas pilihan user).
Klien mengirim input bernomor urut, dan host menjalankan sim semua pendaki pada 30 Hz tetap.
Snapshot membawa ack. Klien memprediksi badan sendiri dan hanya menyelaraskan ulang kalau prediksinya
berbeda dari host. Teman diinterpolasi 1,5 interval snapshot + 40 ms di belakang.

**Laju per jumlah pemain** (`ratesFor`, net/protocol.ts). Batasnya kuota Supabase Free: ±100
kejadian/dtk per proyek, dan setiap pengiriman ke tiap penerima dihitung. Kuota bulanannya 2 juta pesan.
| Pemain | Input | Snapshot | Redundansi | Perkiraan kejadian/dtk |
|---|---|---|---|---|
| 2 | 10 Hz | 10 Hz | 6 input | ≈ 43 |
| 3 | 7,5 Hz | 8 Hz | 8 input | ≈ 77 |
| 4 | 5 Hz | 5 Hz | 12 input | ≈ 88 |

Ukuran pesan (JSON): snapshot 4 pendaki 495 B (629 B saat lengkap), input 169 B. Untuk 2 pemain,
tiap klien menerima ±5 KB/dtk dan mengirim ±1,7 KB/dtk.

> **Batas kuota bulanan (Supabase Free):** 4 pemain ≈ 88 × 3600 ≈ 317 ribu pesan per jam main.
> Jadi kuota 2 juta pesan habis dalam ±6 jam main 4 orang per bulan, atau ±13 jam untuk 2 orang.
> Kuota ini dipakai bersama semua game real-time di aplikasi (Kart, dll.).

### Hasil uji (2026-11-07, `scripts/net-test.mjs`: tab = jendela Chrome headless di satu laptop)
| Pemain | Gangguan | Hasil |
|---|---|---|
| 2 | tanpa | 92 snapshot, 0 hilang; 82 cocok dengan prediksi, 9 dikoreksi; keduanya memanjat sama di semua HP |
| 4 | lag 150 ms, jitter 40, loss 5% | jatuh → pingsan terlihat di 4 HP; host membangunkan; posisi akhir sama (≤ 1 cm) |
| 4 | lag 120 ms, jitter 40, loss 5% (laju 5 Hz) | keempat pendaki sampai naik tepian; koreksi terbesar 0,41 m (dihaluskan) |
| 2 | klien curang memindahkan badannya +40 m | host mengembalikannya |
- Uji sim (vitest): latensi 250 ms dengan loss 10% masih bisa memanjat. Antrean input menolak
  kiriman berlebih, jadi pemain tidak bisa bergerak lebih cepat dari 1×.
- Ping di uji 4 jendela tidak bisa dipakai: tanpa lag pun terbaca 150–380 ms karena keempat
  jendela merender WebGL software di satu laptop. Dua jendela tanpa lag membaca 35 ms.
- **Belum diuji:** sesi online sungguhan (Supabase) antara 14T Pro dan HP/laptop lain, dan
  putus-sambung jaringan seluler.

## Bioma Punggung Hijau (Tahap 5)
Punggung Hijau adalah gunung bawaan baru. Rute penuhnya 6 zona, dari kemah awal ke puncak setinggi
±135 m dan sepanjang ±400 m. Rute pendeknya 3 zona: kemah, tebing besar, dan puncak.

- **Grid medan persegi panjang:** peta sebelumnya selalu persegi. Untuk Punggung Hijau ukurannya akan
  531 × 531 m (1,13 juta sampel, dibangun 1,6 dtk), padahal koridornya hanya ±170 m lebar. Sekarang
  petanya 178 × 548 m (375 ribu sampel) dan dibangun ±0,7 dtk di laptop (Node). Gunung lain ikut
  mengecil, misalnya Karang dari 289 × 289 m ke 178 × 289 m (sampel −38%). Memori medan, heightfield
  Rapier, dan AO berkurang sebanding.
- **Streaming potongan medan** (render/terrain.ts): saat muat hanya blok kasar 128 m (4 m/sel) yang
  dibangun. Saat kamera mendekat, blok dipecah jadi potongan 32 m. Potongan itu mendapat detail 2 m,
  1 m, lalu 0,5 m, dua geometri per 3 frame, dan detail halus dibuang lagi saat kamera menjauh.
  Sebelumnya semua potongan dengan 4 tingkat detail dibangun sekaligus saat muat.
- **Benda kecil dipangkas menurut jarak:** peti dan sarang lebah disembunyikan di luar ±70 m, api
  unggun di luar ±150 m. Bagian statis peti dan api unggun digabung per bahan (api unggun
  17 → 3 draw call).
- **Latar** (render/backdrop.ts) cukup 3 draw call: dasar lembah, ±1.400 kerucut pinus (instanced),
  dan tiga cincin pegunungan jauh.

### Pengukuran 2026-11-07: Chrome headless di laptop (bukan Android), 844×390
Diukur dengan `scripts/puncak-tour.mjs`: pendaki dipindah ke tiap zona, lalu FPS dicatat 3 detik.
| Titik | Hemat: FPS / draw call / segitiga | Sedang: FPS / draw call / segitiga |
|---|---|---|
| Kemah awal (melihat seluruh gunung) | 29 / 392 / 709 ribu | 45 / 705 / 1,14 juta |
| Hutan bawah | 29 / 126 / 304 ribu | 48 / 126 / 356 ribu |
| Formasi batu | 29 / 105 / 230 ribu | 48 / 110 / 289 ribu |
| Tebing besar | 29 / 99 / 217 ribu | 48 / 189 / 472 ribu |
| Punggung atas | 29 / 105 / 158 ribu | 48 / 228 / 393 ribu |
| Dekat puncak (melihat ke bawah) | 29 / 396 / 686 ribu | 45 / 460 / 797 ribu |

Siap main ±12–19 dtk dari navigasi di server dev Vite, termasuk transform modul. Pembanding: Karang
±11–14 dtk. Memori heap JS ±230–260 MB, Karang ±200–257 MB.

**Masih di atas target Hemat (< 100 draw call, 100–200 ribu segitiga), untuk Tahap 8:**
- Dari kemah awal dan puncak, seluruh hutan bawah terlihat. Pohonnya model penuh (±1.200 poligon),
  jadi butuh LOD atau impostor untuk pohon jauh.
- Potongan medan jarak menengah (54 mesh di kemah). Blok hanya menyatu kalau seluruh 16 potongannya
  jauh. Perlu penggabungan tingkat 2 m juga.
- Angka di atas dari laptop, bukan HP. Profil Hemat mentok di batas 30 FPS di laptop, sehingga belum
  memberi tahu performa di HP low-end.

## Stamina & kerja sama (Tahap 6)
Tidak ada biaya render baru. Isi gunung (`mnt`) bertambah: ransel 4 slot per pendaki, gendongan, dan
penanda pingsan-kelelahan. Ukurannya tetap beberapa ratus byte dan dikirim hanya saat berubah (paling
cepat 4×/dtk) plus detak 1 dtk. Snapshot badan bertambah satu angka (stamina bonus).

Uji 2 pemain lewat jaringan (`scripts/net-scenarios/coop.mjs`, `pull.mjs`; 2026-11-07, Chrome headless):
| Uji | Hasil |
|---|---|
| Ransel di HP klien | kapur saku → ransel, roti ransel → saku; terlihat sama di host |
| Lempar | host melempar sate ke titik jatuh tempat klien berdiri, klien menangkapnya |
| Pingsan kelelahan | semua segmen penuh → klien pingsan (tidak bisa dibangunkan di tempat); host mendapat "Gendong" |
| Gendong ke api unggun | klien menempel di punggung host (0,35 m); sampai di api unggun menyala → bangun, stamina maks 75% |
| Api unggun menunggu semua | host sendirian: 1/2, belum menyala; klien datang → menyala |
| Tarik tangan | klien menggantung 2,5 m di bawah bibir → mode naik tepian → berdiri 0,6 m dari host |
| Regresi jatuh → bangunkan (lag 120 ms, loss 5%) | tetap lulus |

## Seni, cahaya & audio (Tahap 7)
- **Bloom** hanya di profil Tinggi. Sedang kini cukup gradasi warna dan SMAA, jadi satu rangkaian pass
  setengah resolusi berkurang. Hemat tetap tanpa post.
- **Suasana per zona** Punggung Hijau hanya mengubah uniform tiap frame, tanpa draw call atau tekstur
  baru. Yang diubah: warna & tebal kabut, warna & kuat matahari, warna langit hemisfer, dan gradasi.
  Nilainya berbaur di separuh akhir tiap zona.
- **Audio baru:** 2 lagu ±0,5 MB per lagu (OGG 80 kbps), 3 loop suasana 35–75 KB, 3 SFX < 10 KB.
  Loop suasana hanya diputar dan diatur keras-pelannya, tanpa dekode tambahan per frame.
- **Uji di laptop** (Chrome headless, Sedang): FPS tur sama dengan Tahap 5 (45–48). Belum ada
  pengukuran di HP.

## Optimasi low-end (Tahap 8)
Profil satu frame dengan `scripts/puncak-profile.mjs` (hitungan lewat `renderBufferDirect`, per sumber),
dan tur lewat `scripts/puncak-tour.mjs`. Chrome headless di laptop, 844×390. **Bukan HP.**

| Titik (Hemat) | Sebelum Tahap 8: draw call / segitiga | Sesudah |
|---|---|---|
| Kemah awal | 392 / 709 ribu | 99 / 204 ribu |
| Hutan bawah | 126 / 304 ribu | 68 / 181 ribu |
| Tebing besar | 99 / 217 ribu | 57 / 189 ribu |
| Punggung atas | 105 / 158 ribu | 48 / 92 ribu |
| Dekat puncak | 396 / 686 ribu | 91 / 99 ribu |

Target spesifikasi Hemat (< 100 draw call, 100–200 ribu segitiga) tercapai di semua titik tur, di laptop.
Memori tekstur (perkiraan dari ukuran gambar + mipmap): Hemat 72 → 23 MB, Sedang 142 → 96 MB.

Yang diubah:
1. **Kaca lentera** (Poly Haven, `KHR_materials_transmission`) membuat three.js menggambar ulang
   **semua** benda buram ke render target tambahan, sehingga draw call jadi ×2. Bahan itu kini kaca
   transparan biasa. Angka Tahap 5 di atas sebagian besar tergelembung oleh ini. Bahan transparan dua
   sisi di prop juga digambar satu pass.
2. **Medan quadtree** (render/terrain.ts): setiap simpul 64×64 sel, sisinya 32/64/128/256 m, dan
   dipecah saat kamera < 0,6 × sisi × `far`. Simpul dipotong di tepi peta, dan tirai tepinya makin dalam
   untuk simpul kasar. Hasilnya medan 84 → 14 draw call dan 204 → 105 ribu segitiga di kemah.
3. **LOD pohon & batu:** model `-lod` ±160 poligon dibuat di Blender (kartu daun ditipiskan 1:4 lalu
   diperbesar). Pohon dekat memakai model penuh, yang sedang memakai LOD, dan yang di luar 230 m × `far`
   tidak digambar. Hemat: model penuh hanya dalam 12 m dan satu varian per jenis pohon.
4. **Hiasan & rumput:** petak 24 m digabung jadi satu InstancedMesh per jenis (render/tiles.ts), diisi
   ulang dari petak di sekitar kamera saat bergeser 3 m.
5. **Pendaki:** versi gabungan (semua bagian yang terlihat → satu SkinnedMesh berwarna per titik).
   Dipakai untuk teman yang jaraknya lebih dari 25 m, dan untuk semua pendaki di Hemat. Satu pendaki
   ±10 → 1 draw call.
6. **Benda kecil:** batu menggelinding dipangkas di luar 110 m × `far`, dan bagian tali/sulur digabung
   per bahan. Di Hemat peti dipangkas di 60 m × `far`, burung paling banyak 3, dan tanpa kupu-kupu.
7. **Tekstur:** tekstur kembar (nama & ukuran sama) dari GLB berbeda dipakai bersama. Hemat: tanpa
   normal/roughness map, dan tekstur prop maksimal 256 px.

**Belum (butuh keputusan/alat):**
- **KTX2:** belum ada encoder (`toktx`/`basisu`) di mesin ini. Transcoder three sudah tersedia di
  `three/examples/jsm/libs/basis`. Yang tersisa sesudah langkah 7 adalah langit HDR + PMREM (±14 MB),
  medan, dan tekstur prop Sedang/Tinggi.
- **Memori heap JS** ±220–230 MB di Chrome desktop. Belum diukur di Android.

## QA Tahap 9
### Emulator Android (2026-11-07)
Perangkat: AVD `Aura_Pixel` (sdk_gphone64_x86_64, Android 15, RAM 3 GB, layar 1080×2400, GPU host
lewat emulator). APK QA dari `scripts/qa-apk.mjs`. Diukur dengan
`node scripts/puncak-device.mjs emulator-5554 6 <keluar.json> "tur:q=low"`: Punggung Hijau rute penuh,
pendaki dipindah ke enam zona (1 menit per zona), sampel tiap 10 detik.

| Ukuran (Hemat, 6 menit, 33 sampel) | Hasil |
|---|---|
| FPS rata-rata (batas 30) | 29,1 |
| FPS sampel terendah / persentil 5 | 27 / 28 |
| 1% terendah / 5% terendah (rata-rata per sampel) | 19,7 / 23,6 FPS |
| Waktu frame p95 (rata-rata) | 44 ms |
| Draw call / segitiga (rata-rata) | 57 / 102 ribu |
| Skala resolusi akhir (pengatur adaptif) | 0,9 (dari 720p) |
| Heap JS maks | 86 MB |
| PSS proses app / proses render WebView (maks) | 272 / 458 MB |

Catatan:
- Turun ke skala 0,9 terjadi di zona puncak, karena dari sana seluruh gunung terlihat.
- GPU emulator memakai GPU laptop, jadi FPS ini bukan perkiraan FPS HP low-end. Angka yang lebih
  berguna adalah beban render (draw call, segitiga) dan memori.
- Suhu emulator palsu (sensor uji 30,8 °C), jadi tidak dilaporkan sebagai data.
- Total memori ±730 MB di perangkat 3 GB tidak menimbulkan masalah selama 6 menit, tetapi angka itu
  belum mengukur tekanan memori di HP sungguhan.

### Xiaomi 14T Pro
**Tidak diuji**: sesi 15 menit dilewati atas keputusan user. Skripnya sudah siap untuk saat HP
tersambung:
`node scripts/qa-apk.mjs`, lalu `adb install -r CoupleParty-QA.apk`, lalu
`node scripts/puncak-device.mjs <serial> 15 hasil.json`. Mode bawaan hanya mencatat, sementara
manusia memainkan game, karena `adb input` di HP ini diblokir. Skrip mencatat FPS, p95, 1%/5%
terendah, draw call, PSS app & render, serta suhu dari `dumpsys thermalservice` & baterai.

## Belum diuji
- **Xiaomi 14T Pro:** sesi 15 menit, termasuk FPS, suhu, dan memori di HP sungguhan.
- **Sesi online sungguhan** lewat Supabase antar-HP, termasuk putus-sambung jaringan seluler.
- **KTX2:** belum dibuat, karena belum ada encoder.
- HP low-end fisik (RAM 3–4 GB): **belum ada perangkatnya**.
- Hilangnya konteks WebGL di perangkat nyata. Di desktop sudah ditangani: loop berhenti, muncul
  overlay "Memulihkan grafis", lalu lanjut saat konteks pulih.
