# Puncak v3: catatan rasa main (dari video gameplay PEAK)

Sumber: video walkthrough publik PEAK di YouTube (`_f0Vrs0q7Ig`, sekitar 1 jam 47 menit,
480p). Diamati dengan mengambil frame di menit 1, 4, 7, 10, 20, 35, 50, 67, 83, dan 98.
Bar stamina diukur per piksel dari frame video pada detik 360–418.
Ini **pengamatan mekanik**, bukan isi file game. Tampilan, karakter, dan nama di Puncak tetap
milik kita.

> Angka bertanda ≈ masih kasar (480p, sampel 0,5 detik, bar kadang tertutup efek).
> Angka ini disetel ulang saat Tahap 2 sambil dibandingkan berdampingan dengan klip.

## 1. HUD
- **Bar stamina** horizontal di kiri bawah, ≈32% lebar layar, tanpa angka.
  - Hijau = stamina saat ini.
  - **Segmen status menggerogoti dari ujung kanan.** Tiap status punya warna dan ikon kecil
    di atas segmennya: lapar oranye bergaris, dingin biru, racun ungu, luka merah, panas kuning.
    Stamina maksimal = panjang bar dikurangi semua segmen.
  - Ada **bar kedua di bawahnya (kuning-hijau, ikon petir)**: stamina bonus dari
    makanan/minuman. Dipakai lebih dulu, lalu habis. Tanpa bonus, bar ini hanya kapsul kecil.
- **Inventaris** di kanan bawah: 3 slot bernomor + 1 slot ransel (4). Item yang dipegang
  terlihat di tangan FP. Ada petunjuk aksi kecil di kanan (use / drop / throw).
- Nama pemain lain melayang di atas kepala. Ada petunjuk konteks di tengah ("set piton").
- Tidak ada minimap atau kompas di layar.

## 2. Kamera dan gerak
- **Orang pertama penuh.** Tangan dan sarung tangan selalu terlihat di bawah layar dan
  ikut bergerak saat memanjat. Badan sendiri terlihat saat menunduk.
- Gerak terasa "berbobot dan lucu": ada akselerasi, ayunan kepala, dan tubuh limbung.
  Inilah yang membuat Puncak v2 terasa kaku, karena v2 langsung berpindah dari jalan ke panjat.
- Lari menguras stamina. Jalan biasa tidak.
- Jatuh atau stamina habis saat bergantung → karakter **ragdoll** dan terguling.
  Jatuh tinggi memberi segmen luka.

## 3. Memanjat
- **Permukaan apa pun yang terjal bisa dipanjat**: batu, tebing, batang pohon. Tidak ada
  pegangan khusus. Tahan tombol panjat saat menghadap dinding, lalu tangan menempel.
- Selama memanjat, stamina terkuras terus.
  - ≈ 40 px/detik dari 250 px bar penuh → **≈ 15–17%/detik**, jadi bar penuh ≈ 6 detik
    panjat terus-menerus.
  - Menggantung diam menguras lebih lambat daripada naik (≈ setengahnya, perkiraan
    sementara).
- **Lunge/lompat panjat:** dorongan ke atas yang mahal, memakan sebagian besar bar sekaligus
  (≈ 40–60%). Dipakai untuk meraih tepian.
- **Pemulihan di tanah:** ada jeda ≈ 0,5–1 detik, lalu terisi kembali ≈ 3–5 detik dari
  kosong ke penuh (≈ 20–30%/detik).
- Stamina habis saat memanjat = lepas pegangan = jatuh.
- **Piton/paku tebing:** item yang dipasang di dinding sebagai pijakan istirahat
  (petunjuk "set piton").

## 4. Status (memotong stamina maksimal)
| Status | Sumber | Pulih |
|---|---|---|
| Lapar | naik pelan seiring waktu (≈ 5% bar di menit 10, ≈ 25% di menit 35) | makan |
| Dingin | bioma salju, malam, angin | api unggun, pakaian, sinar matahari |
| Panas | bioma gunung api, matahari gurun | keteduhan, minum |
| Racun | jamur/buah tertentu, tanaman berduri | waktu, penawar |
| Luka | jatuh, tanaman duri, makhluk | perban/P3K |
Jika semua segmen mengisi bar → **pingsan**. Teman harus menolong, kalau tidak, mati.

## 5. Kerja sama
- **Jadi pijakan:** satu pemain berdiri atau bergantung, lalu teman memanjat badannya
  (terlihat di detik 367–376: kaki teman menginjak kepala pemain).
- **Tarik tangan:** pemain di tepian mengulurkan tangan untuk menarik teman yang
  menggantung.
- **Bawa teman pingsan:** teman yang pingsan bisa digendong, lalu dihidupkan di
  api unggun atau dengan item.
- Item bisa dilempar ke teman. Makanan dibagi.

## 6. Dunia dan struktur
- Satu gunung besar, naik dari pantai. Urutan bioma yang terlihat:
  1. Pantai/pulau dengan rumput tinggi, pohon kelapa, batu besar, dan koper loot oranye.
  2. Hutan lebat/rimba pada malam (daun raksasa, dahan berduri).
  3. Tebing alpine bersalju dan berkabut (kabut tebal, pohon pinus).
  4. Gunung api: batu basal hitam beretak, langit merah, lava.
  5. Kaldera dan gua lava: dinding oranye menyala, lalu mendaki ke puncak.
- **Api unggun** di ujung tiap bioma sebagai checkpoint. Semua pemain harus berkumpul
  untuk menyalakan dan beristirahat.
- **Koper loot** tersebar di jalur dan dibuka untuk mendapat item acak.
- Siklus siang/malam terlihat (langit ungu malam di pantai).

## 7. Hal yang membuat Puncak v2 terasa beda (prioritas perbaikan)
1. Belum ada akselerasi, bobot, dan ayunan kamera. v2 terasa kaku.
2. Panjat v2 masih bergantung pada sel terrain. v3 butuh panjat di permukaan apa pun
   dengan raycast tangan, plus tangan FP yang terlihat.
3. Bar stamina v2 belum punya segmen status yang menggerogoti dari kanan dan bar bonus.
4. Belum ada ragdoll.
5. Belum ada aksi pijakan dan tarik tangan.
6. Bioma perlu berganti tegas per zona, dengan api unggun sebagai gerbang.

## Yang tetap milik kita
Pendaki gendut berkupluk dan beransel (skrip Blender), nama dan teks Indonesia, musik CC0,
palet warna dan bentuk gunung sendiri. Tidak memakai karakter kapsul, logo, nama item,
atau model dari PEAK.
