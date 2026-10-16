import type { Pack } from './types'

/**
 * Pasangan kata mirip "warga/penyusup", dipisah "|" lalu "/" supaya ringkas.
 * Sengaja mirip: petunjuknya harus bisa cocok untuk dua-duanya.
 */
const RAW: Record<Pack, string> = {
  umum:
    'kucing/anjing|singa/harimau|kuda/zebra|bebek/angsa|lebah/tawon|kupu-kupu/capung|katak/kodok|buaya/komodo|lumba-lumba/hiu|pinguin/burung hantu|' +
    'apel/pir|jeruk/lemon|semangka/melon|stroberi/ceri|kopi/teh|susu/yoghurt|pizza/burger|roti/donat|es krim/puding|cokelat/permen|' +
    'gitar/ukulele|piano/keyboard|drum/rebana|biola/cello|sepeda/motor|mobil/truk|pesawat/helikopter|kapal/perahu|kereta/trem|bus/angkot|' +
    'dokter/perawat|guru/dosen|polisi/satpam|pilot/pramugari|koki/pelayan|penyanyi/rapper|' +
    'pantai/kolam renang|gunung/bukit|hutan/kebun|sungai/danau|matahari/bulan|hujan/salju|' +
    'sendok/garpu|bantal/guling|sikat gigi/sisir|kacamata/lensa kontak|jam tangan/gelang|payung/jas hujan|sepatu/sandal|topi/helm|' +
    'facebook/instagram|whatsapp/telegram|youtube/tiktok|netflix/bioskop|laptop/tablet|charger/powerbank|kamera/webcam|' +
    'sepak bola/futsal|basket/voli|badminton/tenis|renang/selam|catur/dam|yoga/senam|' +
    'harry potter/hogwarts|spiderman/batman|doraemon/nobita|upin ipin/shiva|santa/elf|vampir/zombi|hantu/pocong',
  lokal:
    'bakso/mie ayam|sate/gulai|nasi goreng/mie goreng|soto/rawon|rendang/opor|gado-gado/pecel|martabak manis/martabak telur|seblak/cilok|' +
    'tempe/tahu|kerupuk/rempeyek|bakwan/tahu isi|nasi uduk/nasi kuning|lontong/ketupat|klepon/onde-onde|cendol/es doger|es teh/es jeruk|' +
    'kopi tubruk/kopi susu|indomie/sarimi|teh botol/teh kotak|warteg/warung padang|pecel lele/ayam penyet|bubur ayam/nasi tim|' +
    'ojol/opang|angkot/bajaj|becak/delman|kopaja/transjakarta|krl/mrt|tol/jalan tikus|' +
    'mudik/arus balik|lebaran/natal|thr/gaji ke-13|kondangan/arisan|tahlilan/pengajian|ronda/siskamling|' +
    'batik/kebaya|peci/blangkon|sarung/kain|wayang/ondel-ondel|angklung/gamelan|jaipong/kecak|reog/barongsai|' +
    'monas/tugu jogja|borobudur/prambanan|bali/lombok|raja ampat/labuan bajo|danau toba/danau kelimutu|bromo/semeru|' +
    'pasar malam/sekaten|panjat pinang/balap karung|tukang parkir/pak ogah|satpam kompleks/hansip|' +
    'sinetron/ftv|dangdut/koplo|kpop/jpop|mie instan/bihun|sambal/saus|kecap/saus tiram|odong-odong/komidi putar',
  pasangan:
    'mantan/gebetan|pacar/selingkuhan|pdkt/ldr|ghosting/ngilang|friendzone/kakak-adikan|bucin/budak cinta|kangen/rindu|cemburu/curiga|' +
    'ngambek/marah|baper/sensi|gombal/rayuan|kode/sindiran|tembak/lamaran|tunangan/nikahan|bulan madu/staycation|anniversary/ulang tahun|' +
    'kencan/nongkrong|nonton/netflix and chill|candle light dinner/makan di warteg|piknik/jalan sore|video call/sleep call|chat/telepon|' +
    'dibaca doang/centang satu|terserah/bebas|sayang/beb|ayang/cinta|peluk/cium|gandengan/rangkulan|' +
    'mertua/ipar|kondangan mantan/reuni|kado/surprise|bunga/cokelat|cincin/kalung|boneka/bantal|' +
    'antar jemput/nebeng|bonceng/gandeng|curhat/ngedumel|minta maaf/ngalah|move on/balikan|putus/break|' +
    'jealous/posesif|overthinking/insecure|red flag/green flag|bestie/teman curhat|crush/idola|stalking/kepoin|' +
    'skincare/makeup|parfum/deodoran|kaos couple/baju samaan|foto berdua/selfie|story/close friends|nyanyi berdua/karaoke',
}

export type WordPair = [string, string]

export const PACK_PAIRS: Record<Pack, WordPair[]> = Object.fromEntries(
  (Object.keys(RAW) as Pack[]).map((p) => [p, RAW[p].split('|').map((x) => x.split('/') as WordPair)]),
) as Record<Pack, WordPair[]>

/**
 * Pasangan kata buatan host: satu pasangan per baris (atau dipisah koma), dua kata dipisah "/".
 * Pasangan yang kembar/tidak lengkap dibuang; maksimal 24 huruf per kata.
 */
export function parseCustom(text: string): WordPair[] {
  const seen = new Set<string>()
  const out: WordPair[] = []
  for (const raw of text.split(/[,\n]/)) {
    const parts = raw.split('/').map((w) => w.trim().replace(/\s+/g, ' ').slice(0, 24))
    if (parts.length !== 2 || parts.some((w) => w.length < 2)) continue
    const [a, b] = parts
    const k = [a, b].map((w) => w.toLowerCase()).sort().join('/')
    if (a.toLowerCase() === b.toLowerCase() || seen.has(k)) continue
    seen.add(k)
    out.push([a, b])
  }
  return out.slice(0, 60)
}
