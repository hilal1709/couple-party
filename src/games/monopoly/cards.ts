import type { Deck } from './types'

export type CardFx =
  /** terima (+) atau bayar (−) ke bank */
  | { k: 'money'; amount: number }
  /** maju ke petak (lewat START dapat gaji) */
  | { k: 'goto'; sq: number }
  | { k: 'back'; n: number }
  | { k: 'jail' }
  | { k: 'jailFree' }
  /** maju ke bandara/utilitas terdekat, sewa dilipatgandakan */
  | { k: 'nearest'; kind: 'airport' | 'utility' }
  | { k: 'repairs'; house: number; hotel: number }
  /** + = tiap pemain bayar ke kamu, − = kamu bayar ke tiap pemain */
  | { k: 'each'; amount: number }

export type Card = { text: string; fx: CardFx }

export const CARDS: Record<Deck, Card[]> = {
  chance: [
    { text: 'Maju ke START. Ambil gaji 200, jangan langsung habis buat jajan.', fx: { k: 'goto', sq: 0 } },
    { text: 'Liburan romantis ke Roma. Kalau lewat START, ambil 200.', fx: { k: 'goto', sq: 24 } },
    { text: 'Diundang karnaval di Rio de Janeiro. Joget dulu, bayar belakangan.', fx: { k: 'goto', sq: 11 } },
    { text: 'Terbang ke Tokyo. Sushi-nya mahal, siap-siap.', fx: { k: 'goto', sq: 39 } },
    { text: 'Check-in di Bandara Changi. Lewat START ambil 200.', fx: { k: 'goto', sq: 5 } },
    { text: 'Maju ke bandara terdekat. Kalau ada yang punya, bayar sewa 2x lipat.', fx: { k: 'nearest', kind: 'airport' } },
    { text: 'Maju ke perusahaan terdekat. Kalau ada yang punya, bayar 10x angka dadu.', fx: { k: 'nearest', kind: 'utility' } },
    { text: 'Salah naik bus. Mundur 3 petak.', fx: { k: 'back', n: 3 } },
    { text: 'Ketahuan nyontek. Masuk penjara, jangan lewat START.', fx: { k: 'jail' } },
    { text: 'Kartu Bebas Penjara. Simpan baik-baik, bisa dijual juga.', fx: { k: 'jailFree' } },
    { text: 'Renovasi semua properti: bayar 25 per rumah, 100 per hotel.', fx: { k: 'repairs', house: 25, hotel: 100 } },
    { text: 'Kena tilang karena ngebut. Bayar 15.', fx: { k: 'money', amount: -15 } },
    { text: 'Bank salah transfer ke rekeningmu. Terima 50, pura-pura nggak tahu.', fx: { k: 'money', amount: 50 } },
    { text: 'Pinjaman rumahmu cair. Terima 150.', fx: { k: 'money', amount: 150 } },
    { text: 'Kepilih jadi ketua arisan. Traktir tiap pemain 50.', fx: { k: 'each', amount: -50 } },
    { text: 'Juara lomba makan kerupuk tingkat RT. Terima 100.', fx: { k: 'money', amount: 100 } },
  ],
  chest: [
    { text: 'Maju ke START. Ambil gaji 200.', fx: { k: 'goto', sq: 0 } },
    { text: 'Bank salah hitung bunga, untung buat kamu. Terima 200.', fx: { k: 'money', amount: 200 } },
    { text: 'Periksa gigi ke dokter. Bayar 50.', fx: { k: 'money', amount: -50 } },
    { text: 'Jual saham meme-mu pas lagi naik. Terima 50.', fx: { k: 'money', amount: 50 } },
    { text: 'Kartu Bebas Penjara. Simpan baik-baik, bisa dijual juga.', fx: { k: 'jailFree' } },
    { text: 'Ketahuan ghosting. Masuk penjara, jangan lewat START.', fx: { k: 'jail' } },
    { text: 'Hari ulang tahunmu! Tiap pemain kasih kado 10.', fx: { k: 'each', amount: 10 } },
    { text: 'Tabungan liburan cair. Terima 100.', fx: { k: 'money', amount: 100 } },
    { text: 'Restitusi pajak. Terima 20.', fx: { k: 'money', amount: 20 } },
    { text: 'Juara 2 lomba foto paling estetik. Terima 10.', fx: { k: 'money', amount: 10 } },
    { text: 'Asuransi jiwamu jatuh tempo. Terima 100.', fx: { k: 'money', amount: 100 } },
    { text: 'Opname di rumah sakit gara-gara kebanyakan seblak. Bayar 100.', fx: { k: 'money', amount: -100 } },
    { text: 'Bayar uang sekolah adik. 50.', fx: { k: 'money', amount: -50 } },
    { text: 'Dapat proyek freelance. Terima 25.', fx: { k: 'money', amount: 25 } },
    { text: 'Perbaikan jalan depan propertimu: 40 per rumah, 115 per hotel.', fx: { k: 'repairs', house: 40, hotel: 115 } },
    { text: 'Dapat warisan dari om jauh yang nggak pernah ketemu. Terima 100.', fx: { k: 'money', amount: 100 } },
  ],
}

export const DECK_TITLE: Record<Deck, string> = { chance: 'Kesempatan', chest: 'Dana Umum' }
