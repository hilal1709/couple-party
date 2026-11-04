import type { Body } from './climb'
import { gradAt, heightAt, type Rope, type Terrain } from './terrain'

export type ItemId =
  | 'paku'
  | 'tangga'
  | 'kait'
  | 'sepatu'
  | 'kapur'
  | 'balon'
  | 'payung'
  | 'pisang'
  | 'roti'
  | 'sate'
  | 'mi'
  | 'kopi'
  | 'madu'
  | 'jamur'
  | 'syal'
  | 'termos'
  | 'penawar'
  | 'perban'
  | 'obor'
  | 'teropong'
  | 'peluit'
  | 'kompas'
  | 'suar'
  | 'piknik'

export type ItemKind = 'panjat' | 'makan' | 'tahan' | 'lain'

export type ItemInfo = {
  title: string
  line: string
  kind: ItemKind
  /** peluang muncul relatif di peti */
  weight: number
  /** warna ikon */
  color: string
  /** tidak habis dipakai (payung dibuka-tutup) */
  keep?: boolean
}

export const ITEMS: Record<ItemId, ItemInfo> = {
  paku: { title: 'Paku Tali', line: 'Pasang tali permanen di tebing depanmu', kind: 'panjat', weight: 7, color: '#d9a066' },
  tangga: { title: 'Tangga Lipat', line: 'Tangga 5 m, naik tanpa capek', kind: 'panjat', weight: 5, color: '#c7b38a' },
  kait: { title: 'Kait Lempar', line: 'Tarik badan langsung ke bibir tebing', kind: 'panjat', weight: 4, color: '#8a96a8' },
  sepatu: { title: 'Sepatu Paku', line: 'Anti licin di es & salju (2 menit)', kind: 'panjat', weight: 4, color: '#5b6cff' },
  kapur: { title: 'Kapur Tangan', line: 'Memanjat setengah capek (45 detik)', kind: 'panjat', weight: 6, color: '#f4f1ea' },
  balon: { title: 'Balon Helium', line: 'Badan ringan, lompat tinggi (10 detik)', kind: 'panjat', weight: 4, color: '#ff37a6' },
  payung: { title: 'Payung Layang', line: 'Buka di udara: turun pelan tanpa luka', kind: 'panjat', weight: 4, color: '#ff6b35', keep: true },
  pisang: { title: 'Pisang', line: 'Stamina +35%, lapar berkurang', kind: 'makan', weight: 8, color: '#f7d84a' },
  roti: { title: 'Roti', line: 'Kenyang lumayan', kind: 'makan', weight: 7, color: '#d99a4e' },
  sate: { title: 'Sate', line: 'Kenyang banget + stamina +50%', kind: 'makan', weight: 4, color: '#8a4f1e' },
  mi: { title: 'Mi Instan', line: 'Masak di api unggun: kenyang & hangat', kind: 'makan', weight: 5, color: '#f5d27a' },
  kopi: { title: 'Kopi Tubruk', line: 'Stamina penuh, pulih 2x (30 detik)', kind: 'makan', weight: 4, color: '#6b3f22' },
  madu: { title: 'Madu Hutan', line: 'Manis... kadang ada lebahnya', kind: 'makan', weight: 4, color: '#e8a317' },
  jamur: { title: 'Jamur Aneh', line: 'Bisa segar bugar, bisa pusing', kind: 'makan', weight: 4, color: '#c44dff' },
  syal: { title: 'Syal Hangat', line: 'Kebal dingin (3 menit)', kind: 'tahan', weight: 5, color: '#e8432f' },
  termos: { title: 'Termos Teh', line: 'Hangat & lega: dingin/panas hilang', kind: 'tahan', weight: 5, color: '#43b929' },
  penawar: { title: 'Penawar', line: 'Hilangkan racun lebah & jamur', kind: 'tahan', weight: 4, color: '#5cf64a' },
  perban: { title: 'Perban', line: 'Pulihkan luka jatuh', kind: 'tahan', weight: 6, color: '#fff4fa' },
  obor: { title: 'Obor', line: 'Terang & usir lebah/kelelawar (90 detik)', kind: 'tahan', weight: 5, color: '#ffa21a' },
  teropong: { title: 'Teropong', line: 'Lihat peti & jalur terdekat (25 detik)', kind: 'lain', weight: 4, color: '#3a6fe0' },
  peluit: { title: 'Peluit', line: 'Panggil pasangan, tandai tempatmu', kind: 'lain', weight: 3, color: '#ffcc1f', keep: true },
  kompas: { title: 'Kompas', line: 'Panah ke api unggun berikutnya (2 menit)', kind: 'lain', weight: 4, color: '#c0c0c0' },
  suar: { title: 'Suar', line: 'Jadikan tempat ini titik kembali', kind: 'lain', weight: 3, color: '#ff2a2a' },
  piknik: { title: 'Bekal Piknik', line: 'Makan berdua: semua di dekatmu kenyang & segar', kind: 'lain', weight: 2, color: '#ffcae9' },
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
export const SLOTS = 4

/** isi peti dari angka acak 0..1 (host) */
export function rollItem(r: number, kind: 'peti' | 'sarang' | 'tas'): ItemId {
  // sarang burung: makanan; tas pendaki: alat panjat & bertahan
  const pool = ITEM_IDS.filter((i) => (kind === 'sarang' ? ITEMS[i].kind === 'makan' : kind === 'tas' ? ITEMS[i].kind !== 'makan' : true))
  const total = pool.reduce((s, i) => s + ITEMS[i].weight, 0)
  let x = r * total
  for (const i of pool) {
    x -= ITEMS[i].weight
    if (x <= 0) return i
  }
  return pool[pool.length - 1]
}

/** Cari bibir tebing di depan (arah dx,dz): titik pertama yang lebih tinggi lalu landai. */
export function findLedge(t: Terrain, x: number, y: number, z: number, dx: number, dz: number, maxRise: number) {
  const len = Math.hypot(dx, dz) || 1
  dx /= len
  dz /= len
  let rose = false
  for (let d = 0.4; d < 18; d += 0.35) {
    const px = x + dx * d
    const pz = z + dz * d
    const h = heightAt(t, px, pz)
    if (h - y > maxRise) return null
    if (h - y > 1.2) rose = true
    if (rose && Math.hypot(...gradAt(t, px, pz)) < 0.6) {
      const fx = px + dx * 0.8
      const fz = pz + dz * 0.8
      return { x: fx, y: heightAt(t, fx, fz), z: fz, bx: x, bz: z }
    }
  }
  return null
}

/** arah ke tebing: menanjak kalau sedang memanjat, atau arah hadap */
function wallDir(t: Terrain, b: Body): [number, number] {
  if (b.mode === 'climb') {
    const [gx, gz] = gradAt(t, b.x, b.z)
    return [gx, gz]
  }
  return [Math.sin(b.yaw), Math.cos(b.yaw)]
}

/** Tali/tangga dari posisi badan ke bibir di depan; null = tidak ada tebing yang cocok. */
export function planRope(t: Terrain, b: Body, kind: 'tali' | 'tangga', id: number): Rope | null {
  const [dx, dz] = wallDir(t, b)
  const ledge = findLedge(t, b.x, b.y, b.z, dx, dz, kind === 'tangga' ? 6 : 34)
  if (!ledge) return null
  const len = Math.hypot(dx, dz) || 1
  const nx = -dx / len
  const nz = -dz / len
  // tali menjuntai dari bibir sampai dekat pemasang; turun dari tali = di bibir atas
  const rx = b.x - nx * 0.4
  const rz = b.z - nz * 0.4
  const bottom = Math.min(b.y, heightAt(t, b.x, b.z)) + 0.2
  if (ledge.y - bottom < 1.5) return null
  return { id, x: rx, z: rz, top: ledge.y + 0.2, bottom, nx, nz, tx: ledge.x, tz: ledge.z, kind }
}

export type UseOutcome = { text: string; good?: boolean }

/**
 * Efek item pada badan pemakainya. Dijalankan di HP pemilik badan setelah host menyetujui.
 * `lucky` = hasil undian host untuk madu/jamur.
 */
export function applyToBody(b: Body, t: Terrain, item: ItemId, ctx: { warm: boolean; lucky: boolean }): UseOutcome {
  const f = b.fat
  const fill = (v: number) => (b.stamina = Math.min(1, b.stamina + v))
  switch (item) {
    case 'pisang':
      f.hunger = Math.max(0, f.hunger - 0.15)
      fill(0.35)
      return { text: 'Nyam, pisang!' }
    case 'roti':
      f.hunger = Math.max(0, f.hunger - 0.3)
      fill(0.15)
      return { text: 'Kenyang!' }
    case 'sate':
      f.hunger = 0
      fill(0.5)
      return { text: 'Sate! Mantap' }
    case 'mi':
      if (ctx.warm) {
        f.hunger = 0
        f.cold = 0
        fill(0.6)
        return { text: 'Mi rebus panas!' }
      }
      f.hunger = Math.max(0, f.hunger - 0.1)
      return { text: 'Mi mentah... kriuk' }
    case 'kopi':
      b.buffs.kopi = 30
      fill(1)
      return { text: 'Melek!' }
    case 'madu':
      if (ctx.lucky) {
        fill(1)
        f.hunger = Math.max(0, f.hunger - 0.2)
        return { text: 'Madu manis!', good: true }
      }
      f.poison = Math.min(0.4, f.poison + 0.22)
      return { text: 'Aduh, disengat!', good: false }
    case 'jamur':
      if (ctx.lucky) {
        f.fall = f.cold = f.heat = f.poison = 0
        fill(1)
        return { text: 'Segar bugar!', good: true }
      }
      f.poison = Math.min(0.45, f.poison + 0.3)
      return { text: 'Pusing...', good: false }
    case 'syal':
      b.buffs.syal = 180
      f.cold = 0
      return { text: 'Hangat' }
    case 'termos':
      f.cold = 0
      f.heat = 0
      fill(0.2)
      return { text: 'Lega' }
    case 'penawar':
      f.poison = 0
      return { text: 'Racun hilang' }
    case 'perban':
      f.fall = 0
      return { text: 'Luka dibalut' }
    case 'obor':
      b.buffs.obor = 90
      return { text: 'Obor menyala' }
    case 'kapur':
      b.buffs.kapur = 45
      return { text: 'Tangan kesat' }
    case 'sepatu':
      b.buffs.sepatu = 120
      return { text: 'Sepatu paku terpasang' }
    case 'balon':
      b.buffs.balon = 10
      return { text: 'Melayang~' }
    case 'payung':
      b.umbrella = b.mode === 'air' ? !b.umbrella : false
      return { text: b.umbrella ? 'Payung terbuka' : 'Buka saat melayang' }
    case 'kait': {
      const [dx, dz] = wallDir(t, b)
      const l = findLedge(t, b.x, b.y, b.z, dx, dz, 16)
      if (!l) return { text: 'Nggak ada bibir tebing' }
      b.x = l.x
      b.y = l.y
      b.z = l.z
      b.mode = 'ground'
      b.vx = b.vy = b.vz = 0
      b.peak = b.y
      return { text: 'Wuuush!' }
    }
    case 'teropong':
      b.buffs.teropong = 25
      return { text: 'Kelihatan!' }
    case 'kompas':
      b.buffs.kompas = 120
      return { text: 'Arah api unggun' }
    case 'piknik':
      f.hunger = 0
      f.fall = Math.max(0, f.fall - 0.2)
      fill(1)
      return { text: 'Piknik berdua!' }
    case 'paku':
      return { text: 'Tali terpasang' }
    case 'tangga':
      return { text: 'Tangga terpasang' }
    case 'peluit':
      return { text: 'Priiit!' }
    case 'suar':
      return { text: 'Titik kembali baru' }
  }
}
