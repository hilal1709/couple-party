# 💞 Couple Party

Kumpulan game untuk 2–8 pemain di Android (landscape) — main dari HP masing-masing, online.

## Game
- 🃏 **Warna Warni** — game kartu cocokkan warna/angka (aturan 2 pemain: Skip/Reverse/+2/+4 = main lagi).
- 🐍 **Ular Tangga Tantangan** — papan 10x10 + kotak Truth/Dare (dinilai lawan), kotak efek, item/power-up, dan mini-kuis.
- 🪢 **Tali Jodoh** — co-op berdua: Onde & Klepon terikat satu tali; lompat, gelantungan di kait, kuda-kuda & gulung tali buat menarik pasangan, 8 level 3D (Sawah sampai Pasar Malam). Bisa main sendiri: Klepon dijalankan bot yang menunggu, ikut melompat, dan memberi petunjuk.
- 🏔️ **Puncak Berdua** — mendaki gunung co-op 3D (1–4 pendaki + bot): 8 gunung raksasa bertingkat, stamina & lelah, memanjat tebing, tali/tangga/kait, 24 item, saling tarik & bangunkan, api unggun sebagai checkpoint, cuaca & bahaya per gunung.
- 🕺 Gerak! (kamera) — *segera*

## Setup online (sekali saja)
1. Buat project gratis di https://supabase.com
2. Project Settings → API → salin **Project URL** & **anon public key**
3. Salin `.env.example` jadi `.env`, isi kedua nilai itu.

Tanpa `.env`, app jalan di **mode lokal** (cuma antar tab di browser yang sama — buat testing).

## Perintah
- `npm run dev` — jalankan di browser (buka 2 tab untuk 2 pemain)
- `npm test` — tes aturan game
- `npm run apk` — build APK → `CoupleParty.apk`

## Instal di HP
Kirim `CoupleParty.apk` ke HP (WhatsApp/Drive) → buka → izinkan "Instal aplikasi tak dikenal".

## Struktur
- `src/net/` — room online (Supabase Realtime) / lokal (BroadcastChannel). HP pembuat room = host yang menjalankan logika game.
- `src/games/<game>/` — `rules.ts` (reducer murni + tes) dan tampilan React. Daftarkan game baru di `src/games/registry.ts`.

## Rilis & update dari dalam aplikasi
- `npm run release -- <patch|minor|major|x.y.z> "catatan rilis"` → naikkan versi, build APK bertanda tangan, unggah ke
  https://github.com/hilal1709/couple-party-releases (repo publik khusus APK; kode sumber tidak ikut).
- App mengecek rilis terbaru saat dibuka; kalau ada versi lebih baru, tombol "Unduh & pasang" mengunduh APK lalu membuka pemasang Android.
- Kunci tanda tangan: `D:/dev/couple-party-keystore/release.jks` + `android/keystore.properties`. **Backup keduanya** — tanpa itu update tidak bisa menimpa versi lama.

## Menambah game
Daftarkan di `src/games/registry.ts` dengan kategori `kartu` / `board` / `lainnya` serta jumlah pemain minimum & maksimum.
