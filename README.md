# 💞 Couple Party

Kumpulan game berdua untuk Android — main dari HP masing-masing, online.

## Game
- 🃏 **Warna Warni** — game kartu cocokkan warna/angka (aturan 2 pemain: Skip/Reverse/+2/+4 = main lagi).
- 🎲 Party Board — *segera*
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
