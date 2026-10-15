import type { Level, Pack } from './types'

/** Kata per paket & tingkat, dipisah "|" supaya ringkas. Semua harus bisa digambar. */
const RAW: Record<Pack, Record<Level, string>> = {
  umum: {
    1: 'kucing|anjing|ikan|ayam|bebek|gajah|jerapah|ular|kupu-kupu|semut|apel|pisang|jeruk|semangka|wortel|roti|telur|es krim|kue|topi|sepatu|kacamata|jam|kunci|payung|bola|buku|pensil|gunting|kursi|meja|lampu|pintu|rumah|mobil|sepeda|pesawat|kapal|matahari|bulan|bintang|awan|hujan|pelangi|pohon|bunga|gunung|kado|hati|balon',
    2: 'kanguru|pinguin|gurita|kepiting|siput|lebah|burung hantu|kura-kura|lumba-lumba|kelinci|nanas|stroberi|brokoli|jamur|pizza|burger|kentang goreng|donat|gitar|piano|drum|kamera|televisi|kulkas|kipas angin|sikat gigi|cermin|tangga|jembatan|menara|tenda|roket|helikopter|kereta api|traktor|ambulans|robot|hantu|vampir|putri duyung|bajak laut|astronot|pemadam kebakaran|petir|salju|pasir|pulau|gunung berapi|air terjun|kembang api|ulang tahun',
    3: 'dinosaurus|bunglon|kalajengking|merak|landak|kuda laut|ubur-ubur|alpukat|kelapa|sushi|spageti|mikroskop|teleskop|kompas|jam pasir|magnet|baterai|parasut|kapal selam|kincir angin|mercusuar|komidi putar|roller coaster|trampolin|selancar|ski|bowling|panahan|tinju|yoga|piramida|menara eiffel|patung liberty|alien|zombi|naga|unicorn|penyihir|ninja|koboi|detektif|mumi|gerhana|tornado|gempa bumi|bumerang|labirin|teka-teki|bayangan|mimpi buruk',
  },
  lokal: {
    1: 'sate|bakso|nasi goreng|kerupuk|tempe|tahu|mie ayam|es teh|kopi|pisang goreng|becak|angkot|ojek|bajaj|sawah|kerbau|komodo|orang utan|batik|peci|sarung|kipas bambu|layangan|kelereng|congklak|gasing|bedug|ketupat|monas|candi',
    2: 'rendang|gado-gado|martabak|soto|rujak|klepon|onde-onde|cendol|es campur|lontong|bakwan|seblak|cilok|cimol|warteg|gerobak|tukang bakso|pasar malam|kondangan|mudik|lebaran|panjat pinang|balap karung|tarik tambang|makan kerupuk|wayang|angklung|gamelan|kuda lumping|jaipong',
    3: 'ondel-ondel|reog|barongsai|keris|rumah gadang|tongkonan|borobudur|danau toba|raja ampat|bajaj biru|kopi tubruk|teh botol|indomie|sambal|tumpeng|nasi padang|es doger|kerak telor|bubur ayam|lumpia|ronda malam|siskamling|tujuh belasan|upacara bendera|odong-odong|cabe-cabean|tukang parkir|ojol|gorengan|ngabuburit',
  },
  pasangan: {
    1: 'cium|peluk|cincin|bunga mawar|cokelat|surat cinta|selfie|kencan|nonton|bioskop|popcorn|makan malam|lilin|boneka|gombal|bucin|baper|kangen|janji|mimpi',
    2: 'ngambek|cemburu|ditinggal tidur|chat dibaca doang|nunggu balasan|telat jemput|salah kirim chat|video call|piknik|candle light dinner|naik motor berdua|antar jemput|tukar kado|sayang|pacar|gebetan|pdkt|tembak|ditolak|lamaran',
    3: 'mantan|ghosting|friendzone|kode keras|cinta segitiga|patah hati|move on|ldr|bulan madu|pelaminan|ngode|lagi pms|minta maaf duluan|terserah|sleep call|ngedate di warteg|bangun kesiangan|kangen berat|nyanyi berdua|anniversary',
  },
}

export type WordEntry = { word: string; level: Level }

export const PACK_WORDS: Record<Pack, WordEntry[]> = Object.fromEntries(
  (Object.keys(RAW) as Pack[]).map((p) => [
    p,
    ([1, 2, 3] as Level[]).flatMap((level) => RAW[p][level].split('|').map((word) => ({ word, level }))),
  ]),
) as Record<Pack, WordEntry[]>

/** Bersihkan daftar kata buatan host: pisah koma/baris, buang kosong & dobel, maksimal 32 huruf. */
export function parseCustom(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const w = raw.trim().replace(/\s+/g, ' ').slice(0, 32)
    const k = w.toLowerCase()
    if (w.length < 2 || seen.has(k)) continue
    seen.add(k)
    out.push(w)
  }
  return out.slice(0, 100)
}
