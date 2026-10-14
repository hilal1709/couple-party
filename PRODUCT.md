# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Web app di dalam WebView Capacitor, dipasang sebagai APK Android. Bukan UI native Android.)

## Users

Dua orang: pemilik app dan pasangannya. Masing-masing memakai HP Android sendiri, sering di tempat berbeda (jarak jauh), memainkan game berdua untuk bersenang-senang dan saling ledek. Tidak ada pengguna lain.

## Product Purpose

Kumpulan game berdua yang bisa dimainkan online dari dua HP. Game pertama dan fokus saat ini: UNO lengkap — Classic dengan aturan internasional resmi, UNO Flip, UNO No Mercy, plus house rules yang bisa diaktifkan. Berhasil kalau satu sesi main terasa lancar, adil, dan bikin ketawa.

## Positioning

App pribadi untuk satu pasangan: tanpa akun, tanpa iklan, tanpa matchmaking. Masuk dengan kode room 4 huruf, langsung main.

## Operating Context

- Main di HP portrait, satu tangan atau dua tangan, sering sambil rebahan.
- Koneksi sering lemot / putus-sambung: state harus pulih sendiri saat tersambung lagi, aksi tidak boleh hilang diam-diam, status koneksi pasangan harus selalu kelihatan.
- Sinkronisasi lewat Supabase Realtime; HP pembuat room adalah host yang menjalankan aturan.

## Capabilities and Constraints

- Room 2 pemain dengan kode; presence online/offline.
- UNO: Classic (108 kartu, tantang Wild +4, penalti UNO, skor 500), Flip (112 kartu dua sisi), No Mercy (168 kartu, stacking, 0/7 tukar, mercy 25 kartu), house rules toggle.
- Distribusi: APK sideload untuk pemakaian pribadi; tidak dipublikasi ke Play Store.
- Bahasa UI: Indonesia.
- Ilustrasi tidak boleh hasil AI generatif: dibuat sendiri (SVG manual, render Blender), animasi Lottie dibuat sendiri.

## Brand Commitments

- Nama: **Couple Party**.
- Nada: santai & jahil, Bahasa Indonesia gaul ringan, saling ledek ("Hayo lupa UNO!").
- Palet wajib (semua dipakai): Electric Green `#5cf64a`, Radioactive Grass `#87e752`, Bright Fern `#43b929`, Pastel Petal `#ffcae9`, Brilliant Rose `#ff37a6`.
- Gaya ilustrasi: kartun lucu & cute.
- Stack UI ditetapkan user: shadcn/ui, GSAP, Hugeicons (ikon secukupnya), Lottie.

## Evidence on Hand

Belum ada aset gambar/logo. Logo akan dibuat lewat skill logo-design. Tidak ada testimoni atau data pemakaian, dan tidak boleh dikarang.

## Product Principles

1. Giliran siapa dan apa yang bisa dilakukan harus jelas dalam sekali lirik.
2. Aturan ditegakkan mesin dengan setia ke aturan resmi; house rules selalu eksplisit.
3. Koneksi jelek tidak boleh merusak permainan.
4. Kepribadian ada di momen (UNO!, ketahuan, menang), bukan di setiap pixel.
