import type { TrackId } from './types'

/** jenis tanah di luar aspal */
export type Offroad = 'pasir' | 'rumput' | 'salju' | 'lava' | 'air' | 'permen' | 'kota'

/** bahaya khas tema; semua digerakkan oleh jam balapan supaya sama di tiap HP */
export type Hazard =
  /** benda menggelinding melintasi jalan bolak-balik (kepiting, kerbau, bola salju, mobil) */
  | { kind: 'roller'; at: number; model: string; period: number; radius: number }
  /** bagian jalan dengan cengkeraman beda: es licin / lantai lengket / pasir */
  | { kind: 'grip'; from: number; to: number; grip: number; drag: number; color: string }
  /** jamur / pegas pantul: melempar kart ke udara */
  | { kind: 'bounce'; at: number; lane: number; power: number }
  /** batu jatuh di titik tertentu secara berkala */
  | { kind: 'drop'; at: number; lane: number; period: number }
  /** rintangan diam di jalan (peti, batu, kerucut); `lane` -1..1 dari kiri ke kanan */
  | { kind: 'block'; at: number; lane: number; model: string; radius: number }
  /** bandul / palu yang mengayun melintasi jalan */
  | { kind: 'swing'; at: number; model: string; period: number }

export type Ground = 'pasir' | 'rumput' | 'salju' | 'batu' | 'kerikil' | 'cobble'

/** tampilan premium: langit HDRI, tekstur tanah & jalan, warna celup */
export type Look = {
  sky: 'siang' | 'senja' | 'malam'
  ground: Ground
  /** warna pengali tekstur tanah (boleh > terang dari tekstur aslinya) */
  tint: string
  /** warna pengali aspal (tekstur aslinya gelap) */
  road: string
  /** tanah di luar bahu jalan (runoff) */
  runoff: Ground
  /** air di sekitar (laut / sungai cokelat) */
  water?: string
}

export type Theme = {
  look: Look
  sky: [string, string]
  fog: string
  fogNear: number
  fogFar: number
  ground: string
  ground2: string
  road: string
  roadLine: string
  curb: [string, string]
  wall: string
  sun: string
  sunPower: number
  ambient: string
  night: boolean
  offroad: Offroad
  /** model prop beserta kerapatan relatifnya */
  props: [string, number][]
}

/** bangunan / benda khas tema di posisi tetap: `at` 0..1 sepanjang lintasan, `side` -1 kiri / 1 kanan,
 *  `dist` meter dari tepi jalan, `turn` putaran tambahan (radian), `float` = mengapung di air */
export type Landmark = { model: string; at: number; side: -1 | 1; dist: number; turn?: number; scale?: number; float?: boolean }

export type TrackDef = {
  id: TrackId
  title: string
  line: string
  /** titik rapat lintasan tertutup: [x, z, tinggi?] dalam meter, searah putaran (dari road()) */
  points: [number, number, number?][]
  width: number
  /** posisi (0..1 sepanjang lintasan) deretan kotak item */
  boxes: number[]
  /** panel turbo: [posisi, offset samping -1..1] */
  pads: [number, number][]
  /** tanjakan lompat: posisi */
  ramps: number[]
  hazards: Hazard[]
  landmarks?: Landmark[]
  theme: Theme
}

/** sudut sirkuit: [x, z, radius tikungan?, tinggi?] (meter). Radius kecil = tikungan tajam. */
type Corner = [number, number, number?, number?]

/**
 * Sirkuit gaya jalan raya: lurusan di antara sudut-sudut, tiap sudut dibulatkan dengan busur
 * berjari-jari `radius` (bawaan 30 m). Hasilnya titik rapat untuk kurva lintasan, mulai dari
 * tengah lurusan pertama (garis start).
 */
function road(corners: Corner[]): [number, number, number?][] {
  const n = corners.length
  const out: [number, number, number][] = []
  const at = (i: number) => corners[((i % n) + n) % n]
  const lerpY = (a: Corner, b: Corner, f: number) => (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * f
  // titik di sepanjang lurusan supaya kurva tetap lurus di antara sudut
  const straight = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0)
    const k = Math.floor(len / 40)
    for (let j = 1; j < k; j++) out.push([x0 + ((x1 - x0) * j) / k, z0 + ((z1 - z0) * j) / k, y0 + ((y1 - y0) * j) / k])
  }
  const a0 = at(0)
  const a1 = at(1)
  out.push([(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, lerpY(a0, a1, 0.5)])
  let prev: [number, number, number] = out[0]
  for (let k = 1; k <= n; k++) {
    const A = at(k - 1)
    const B = at(k)
    const C = at(k + 1)
    const l1 = Math.hypot(B[0] - A[0], B[1] - A[1])
    const l2 = Math.hypot(C[0] - B[0], C[1] - B[1])
    const d1 = [(B[0] - A[0]) / l1, (B[1] - A[1]) / l1]
    const d2 = [(C[0] - B[0]) / l2, (C[1] - B[1]) / l2]
    const cross = d1[0] * d2[1] - d1[1] * d2[0]
    const turn = Math.atan2(Math.abs(cross), d1[0] * d2[0] + d1[1] * d2[1])
    const yB = B[3] ?? 0
    if (turn < 0.02) {
      straight(prev[0], prev[2 - 1], B[0], B[1], prev[2], yB)
      prev = [B[0], B[1], yB]
      out.push(prev)
      continue
    }
    let r = B[2] ?? 30
    let tl = r * Math.tan(turn / 2)
    const max = 0.48 * Math.min(l1, l2)
    if (tl > max) {
      tl = max
      r = tl / Math.tan(turn / 2)
    }
    const p1 = [B[0] - d1[0] * tl, B[1] - d1[1] * tl]
    straight(prev[0], prev[1], p1[0], p1[1], prev[2], yB)
    const side = Math.sign(cross)
    // pusat busur: tegak lurus arah datang, ke sisi belokan
    const cx = p1[0] - d1[1] * r * side
    const cz = p1[1] + d1[0] * r * side
    const a = Math.atan2(p1[1] - cz, p1[0] - cx)
    const steps = Math.max(2, Math.ceil((turn * r) / 4))
    for (let j = 0; j <= steps; j++) {
      const ang = a + side * turn * (j / steps)
      out.push([cx + Math.cos(ang) * r, cz + Math.sin(ang) * r, yB])
    }
    prev = out[out.length - 1]
  }
  straight(prev[0], prev[1], out[0][0], out[0][1], prev[2], out[0][2])
  return out
}

export const TRACKS: Record<TrackId, TrackDef> = {
  pantai: {
    id: 'pantai',
    title: 'Pantai Kelapa',
    line: 'Ngebut di tepi ombak, awas kepiting nyebrang',
    points: road([[0, 0, 40], [-500, -500, 18], [-520, -640, 16], [-440, -720, 14], [-340, -700, 14], [-300, -780, 16], [-160, -780, 20], [-120, -660, 14], [-200, -600, 14], [-160, -520, 18], [-40, -440, 24], [60, -300, 16], [20, -220, 14], [100, -160, 14], [200, -80, 20], [380, 60, 30], [420, 160, 16], [340, 220, 14], [260, 180, 16], [120, 140, 22]]),
    width: 30,
    boxes: [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9],
    pads: [[0.03, 0], [0.25, 0.5], [0.47, -0.4], [0.72, 0.4], [0.95, 0]],
    ramps: [0.4, 0.55, 0.83],
    hazards: [
      { kind: 'roller', at: 0.15, model: 'kepiting', period: 5, radius: 2.5 },
      { kind: 'roller', at: 0.3, model: 'kepiting', period: 6, radius: 2.5 },
      { kind: 'roller', at: 0.66, model: 'kepiting', period: 4.5, radius: 2.5 },
      { kind: 'roller', at: 0.79, model: 'kepiting', period: 6, radius: 2.5 },
      { kind: 'grip', from: 0.5, to: 0.53, grip: 0.9, drag: 0.35, color: '#f6dc9a' },
      { kind: 'block', at: 0.1, lane: -0.5, model: 'istana-pasir', radius: 2.6 },
      { kind: 'block', at: 0.1, lane: 0.5, model: 'istana-pasir', radius: 2.6 },
      { kind: 'block', at: 0.37, lane: 0, model: 'batu', radius: 2.4 },
      { kind: 'block', at: 0.58, lane: -0.6, model: 'batu', radius: 2.4 },
      { kind: 'block', at: 0.58, lane: 0.3, model: 'kerang', radius: 2.4 },
      { kind: 'block', at: 0.88, lane: 0.55, model: 'istana-pasir', radius: 2.6 },
      { kind: 'swing', at: 0.7, model: 'kelapa-ayun', period: 3.2 },
    ],
    landmarks: [
      { model: 'mercusuar', at: 0.34, side: -1, dist: 120, scale: 1.4 },
      { model: 'dermaga', at: 0.62, side: 1, dist: 45, turn: Math.PI / 2 },
      { model: 'perahu', at: 0.6, side: 1, dist: 95, turn: 0.4, float: true },
      { model: 'perahu', at: 0.66, side: 1, dist: 120, turn: -0.8, float: true },
      { model: 'perahu', at: 0.15, side: -1, dist: 160, turn: 1.2, float: true },
      { model: 'perahu', at: 0.88, side: 1, dist: 140, turn: 2.2, float: true },
      { model: 'pondok', at: 0.04, side: -1, dist: 40 },
      { model: 'pondok', at: 0.47, side: 1, dist: 38 },
      { model: 'pondok', at: 0.8, side: -1, dist: 45 },
      { model: 'selancar', at: 0.05, side: -1, dist: 34 },
      { model: 'selancar', at: 0.81, side: -1, dist: 38 },
      { model: 'pelampung', at: 0.25, side: 1, dist: 110, float: true },
      { model: 'pelampung', at: 0.4, side: 1, dist: 130, float: true },
      { model: 'pelampung', at: 0.72, side: -1, dist: 120, float: true },
    ],
    theme: {
      look: { sky: 'siang', ground: 'pasir', tint: '#fff0c8', road: '#9a98a8', runoff: 'pasir', water: '#2fb8ff' },
      sky: ['#5ac8ff', '#fff4fa'], fog: '#bfe9ff', fogNear: 120, fogFar: 520,
      ground: '#f6dc9a', ground2: '#e9c77a', road: '#5a5a66', roadLine: '#fff4fa', curb: ['#ff37a6', '#fff4fa'], wall: '#43b929',
      sun: '#fff1d6', sunPower: 2.4, ambient: '#bfe4ff', night: false, offroad: 'pasir',
      props: [['kelapa', 6], ['payung', 3], ['batu', 1], ['semak', 1], ['kerang', 1]],
    },
  },
  sawah: {
    id: 'sawah',
    title: 'Sawah Terasering',
    line: 'Naik-turun pematang, kerbau jalan santai',
    points: road([[0, 0, 40, 0], [600, 0, 24, 6], [680, -80, 16, 10], [640, -200, 14, 14], [760, -260, 18, 18], [880, -180, 22, 22], [900, 40, 26, 22], [820, 120, 14, 18], [860, 220, 14, 14], [760, 300, 18, 10], [400, 300, 30, 6], [300, 400, 16, 4], [180, 360, 14, 2], [80, 440, 16, 2], [-80, 400, 24, 0], [-120, 200, 18, 0], [-40, 120, 14, 0], [-100, 40, 22, 0]]),
    width: 28,
    boxes: [0.05, 0.18, 0.32, 0.46, 0.6, 0.74, 0.88],
    pads: [[0.12, 0], [0.22, 0], [0.5, 0.5], [0.66, -0.35], [0.94, 0]],
    ramps: [0.28, 0.46, 0.78, 0.9],
    hazards: [
      { kind: 'roller', at: 0.15, model: 'kerbau', period: 9, radius: 2.6 },
      { kind: 'roller', at: 0.27, model: 'kerbau', period: 8, radius: 2.6 },
      { kind: 'roller', at: 0.63, model: 'kerbau', period: 7, radius: 2.6 },
      { kind: 'roller', at: 0.73, model: 'kerbau', period: 8, radius: 2.6 },
      { kind: 'grip', from: 0.36, to: 0.4, grip: 0.8, drag: 0.45, color: '#7a5a3a' },
      { kind: 'grip', from: 0.52, to: 0.57, grip: 0.8, drag: 0.45, color: '#7a5a3a' },
      { kind: 'grip', from: 0.84, to: 0.87, grip: 0.8, drag: 0.45, color: '#7a5a3a' },
      { kind: 'block', at: 0.08, lane: 0.4, model: 'jerami', radius: 2.2 },
      { kind: 'block', at: 0.42, lane: -0.5, model: 'jerami', radius: 2.2 },
      { kind: 'block', at: 0.42, lane: 0.5, model: 'jerami', radius: 2.2 },
      { kind: 'block', at: 0.69, lane: 0, model: 'gerobak-padi', radius: 2.6 },
      { kind: 'swing', at: 0.96, model: 'orang-orangan-ayun', period: 3.6 },
    ],
    theme: {
      look: { sky: 'siang', ground: 'rumput', tint: '#b8ff7a', road: '#b89a7a', runoff: 'kerikil', water: '#5fc8d8' },
      sky: ['#7fd0ff', '#f3ffe9'], fog: '#d6f5d0', fogNear: 110, fogFar: 500,
      ground: '#7ad35a', ground2: '#5cb845', road: '#8a6a4a', roadLine: '#f6dc9a', curb: ['#ffcc1f', '#43b929'], wall: '#5a3e24',
      sun: '#fff6e0', sunPower: 2.2, ambient: '#d6ffd0', night: false, offroad: 'rumput',
      props: [['padi', 6], ['orang-orangan', 1], ['gubuk', 1], ['kincir', 1], ['pohon', 2], ['semak', 2]],
    },
  },
  jamur: {
    id: 'jamur',
    title: 'Hutan Jamur',
    line: 'Jamur raksasa melempar kart ke udara',
    points: road([[0, 0, 35], [300, 0, 14], [340, 80, 14], [440, 80, 20], [520, -20, 22], [660, 0, 26], [700, 140, 16], [600, 200, 14], [660, 290, 18], [780, 320, 24], [760, 460, 26], [620, 500, 16], [540, 420, 14], [440, 460, 18], [360, 560, 22], [200, 540, 14], [180, 420, 14], [60, 400, 20], [-60, 480, 24], [-160, 380, 26], [-120, 240, 14], [-40, 200, 14], [-110, 100, 22]]),
    width: 27,
    boxes: [0.05, 0.19, 0.33, 0.46, 0.58, 0.72, 0.86],
    pads: [[0.1, 0], [0.3, -0.5], [0.45, 0.3], [0.64, 0], [0.9, -0.3]],
    ramps: [0.38, 0.8],
    hazards: [
      { kind: 'bounce', at: 0.13, lane: 0.4, power: 1 },
      { kind: 'bounce', at: 0.18, lane: -0.4, power: 1 },
      { kind: 'bounce', at: 0.5, lane: 0.4, power: 1 },
      { kind: 'bounce', at: 0.7, lane: 0, power: 1.2 },
      { kind: 'bounce', at: 0.93, lane: -0.5, power: 0.9 },
      { kind: 'block', at: 0.24, lane: 0, model: 'kayu-tumbang', radius: 2.4 },
      { kind: 'block', at: 0.4, lane: -0.55, model: 'jamur-merah', radius: 2.8 },
      { kind: 'block', at: 0.55, lane: 0.6, model: 'jamur-ungu', radius: 2.8 },
      { kind: 'block', at: 0.76, lane: -0.3, model: 'kayu-tumbang', radius: 2.4 },
      { kind: 'block', at: 0.84, lane: 0.5, model: 'batu', radius: 2.4 },
      { kind: 'swing', at: 0.28, model: 'akar-ayun', period: 3 },
      { kind: 'swing', at: 0.62, model: 'akar-ayun', period: 3.4 },
      { kind: 'roller', at: 0.88, model: 'kumbang', period: 5, radius: 1.8 },
    ],
    theme: {
      look: { sky: 'senja', ground: 'rumput', tint: '#8ff08a', road: '#a08070', runoff: 'kerikil' },
      sky: ['#2b8a6a', '#d7ffe0'], fog: '#9fd8b4', fogNear: 80, fogFar: 400,
      ground: '#3f9b4a', ground2: '#2f7f3c', road: '#6a4a3a', roadLine: '#ffcae9', curb: ['#ff37a6', '#fff4fa'], wall: '#5a3a2a',
      sun: '#fff0c0', sunPower: 1.8, ambient: '#b8ffd8', night: false, offroad: 'rumput',
      props: [['jamur-merah', 4], ['jamur-ungu', 3], ['pohon', 4], ['semak', 3], ['batu', 1]],
    },
  },
  candi: {
    id: 'candi',
    title: 'Gurun Candi',
    line: 'Lompatan jauh di antara reruntuhan & badai pasir',
    points: road([[0, 0, 45, 0], [800, 0, 30, 0], [900, 120, 14, 4], [820, 240, 14, 8], [600, 240, 14, 10], [560, 320, 14, 10], [760, 420, 24, 6], [780, 600, 18, 2], [680, 660, 12, 0], [580, 560, 12, 0], [300, 560, 26, 2], [160, 700, 30, 4], [-60, 660, 16, 4], [-100, 520, 14, 2], [0, 420, 14, 0], [-140, 320, 24, 0], [-160, 120, 30, 0]]),
    width: 29,
    boxes: [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9],
    pads: [[0.03, 0], [0.2, 0], [0.52, 0.3], [0.78, -0.3], [0.86, 0.3]],
    ramps: [0.15, 0.29, 0.45, 0.6, 0.83],
    hazards: [
      { kind: 'grip', from: 0.37, to: 0.43, grip: 0.85, drag: 0.4, color: '#e0b060' },
      { kind: 'grip', from: 0.68, to: 0.72, grip: 0.85, drag: 0.4, color: '#e0b060' },
      { kind: 'block', at: 0.1, lane: -0.4, model: 'pilar-runtuh', radius: 2.6 },
      { kind: 'block', at: 0.24, lane: 0.5, model: 'pilar-runtuh', radius: 2.6 },
      { kind: 'block', at: 0.33, lane: 0, model: 'arca', radius: 2.4 },
      { kind: 'block', at: 0.56, lane: -0.6, model: 'batu', radius: 2.4 },
      { kind: 'block', at: 0.56, lane: 0.6, model: 'batu', radius: 2.4 },
      { kind: 'block', at: 0.93, lane: 0, model: 'arca', radius: 2.4 },
      { kind: 'roller', at: 0.5, model: 'gulungan-semak', period: 4, radius: 1.8 },
      { kind: 'roller', at: 0.74, model: 'gulungan-semak', period: 5, radius: 1.8 },
      { kind: 'swing', at: 0.65, model: 'gada-batu', period: 3.4 },
      { kind: 'drop', at: 0.8, lane: 0.2, period: 4.5 },
    ],
    theme: {
      look: { sky: 'senja', ground: 'pasir', tint: '#ffd08a', road: '#c09a78', runoff: 'cobble' },
      sky: ['#ffb85a', '#fff1d0'], fog: '#ffd9a0', fogNear: 90, fogFar: 450,
      ground: '#efc277', ground2: '#d9a75a', road: '#a0754a', roadLine: '#fff4fa', curb: ['#ff8a1c', '#fff4fa'], wall: '#b9844a',
      sun: '#fff0d0', sunPower: 2.6, ambient: '#ffe0b0', night: false, offroad: 'pasir',
      props: [['stupa', 3], ['pilar', 3], ['kaktus', 3], ['batu', 2]],
    },
  },
  neon: {
    id: 'neon',
    title: 'Kota Neon Malam',
    line: 'Jalan raya berlampu, mobil lalu-lalang di persimpangan',
    points: road([[0, 0, 30], [520, 0, 14], [520, 160, 14], [660, 160, 14], [660, -40, 18], [820, -40, 20], [880, 60, 22], [880, 340, 14], [740, 340, 14], [740, 480, 16], [560, 480, 14], [560, 360, 14], [380, 360, 14], [380, 560, 18], [160, 560, 14], [160, 420, 14], [40, 420, 16], [-60, 520, 20], [-160, 440, 22], [-160, 200, 14], [-60, 200, 14], [-60, 80, 18], [-120, 20, 18]]),
    width: 30,
    boxes: [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9],
    pads: [[0.03, 0.4], [0.03, -0.4], [0.3, 0], [0.48, 0], [0.72, 0], [0.86, 0.4]],
    ramps: [0.27, 0.66],
    hazards: [
      { kind: 'roller', at: 0.12, model: 'mobil', period: 4, radius: 2.8 },
      { kind: 'roller', at: 0.18, model: 'bus', period: 6, radius: 3.4 },
      { kind: 'roller', at: 0.42, model: 'mobil-2', period: 4.5, radius: 2.8 },
      { kind: 'roller', at: 0.56, model: 'mobil', period: 5, radius: 2.8 },
      { kind: 'roller', at: 0.8, model: 'bus', period: 6.5, radius: 3.4 },
      { kind: 'roller', at: 0.9, model: 'mobil-2', period: 4.5, radius: 2.8 },
      { kind: 'block', at: 0.23, lane: -0.5, model: 'kerucut', radius: 1.4 },
      { kind: 'block', at: 0.235, lane: 0, model: 'kerucut', radius: 1.4 },
      { kind: 'block', at: 0.24, lane: 0.5, model: 'kerucut', radius: 1.4 },
      { kind: 'block', at: 0.52, lane: -0.4, model: 'pembatas', radius: 2.4 },
      { kind: 'block', at: 0.7, lane: 0.4, model: 'pembatas', radius: 2.4 },
      { kind: 'swing', at: 0.36, model: 'palang-parkir', period: 2.8 },
    ],
    theme: {
      look: { sky: 'malam', ground: 'cobble', tint: '#6a6090', road: '#8a8aa0', runoff: 'cobble' },
      sky: ['#120a33', '#3a1a66'], fog: '#24104a', fogNear: 90, fogFar: 460,
      ground: '#2a2440', ground2: '#221d36', road: '#2c2c3a', roadLine: '#5cf64a', curb: ['#ff37a6', '#2f7bff'], wall: '#8a55ff',
      sun: '#c0b0ff', sunPower: 1.5, ambient: '#9a8ae0', night: true, offroad: 'kota',
      props: [['gedung', 6], ['lampu', 4], ['papan-neon', 2]],
    },
  },
  permen: {
    id: 'permen',
    title: 'Pabrik Permen',
    line: 'Lantai cokelat lengket & ban berjalan bikin ngebut',
    points: road([[0, 0, 30], [380, 0, 12], [420, 80, 12], [300, 120, 12], [340, 220, 18], [500, 220, 20], [560, 120, 14], [700, 120, 22], [760, 260, 14], [660, 320, 12], [720, 420, 18], [640, 540, 26], [460, 540, 12], [440, 440, 12], [320, 460, 14], [260, 580, 22], [100, 580, 12], [60, 460, 12], [-40, 520, 16], [-140, 440, 22], [-120, 300, 12], [-20, 260, 12], [-60, 160, 16], [-140, 80, 20]]),
    width: 28,
    boxes: [0.05, 0.19, 0.33, 0.47, 0.6, 0.73, 0.87],
    pads: [[0.15, 0], [0.16, 0], [0.4, -0.4], [0.62, 0], [0.63, 0], [0.92, 0.4]],
    ramps: [0.42, 0.7],
    hazards: [
      { kind: 'grip', from: 0.24, to: 0.3, grip: 1, drag: 0.55, color: '#7a3a1a' },
      { kind: 'grip', from: 0.52, to: 0.56, grip: 1, drag: 0.55, color: '#7a3a1a' },
      { kind: 'grip', from: 0.75, to: 0.8, grip: 1, drag: 0.55, color: '#7a3a1a' },
      { kind: 'bounce', at: 0.9, lane: 0, power: 0.9 },
      { kind: 'bounce', at: 0.36, lane: 0.5, power: 0.9 },
      { kind: 'block', at: 0.1, lane: 0.4, model: 'donat', radius: 2.4 },
      { kind: 'block', at: 0.45, lane: -0.5, model: 'kue', radius: 2.6 },
      { kind: 'block', at: 0.66, lane: 0.5, model: 'donat', radius: 2.4 },
      { kind: 'block', at: 0.84, lane: -0.4, model: 'kue', radius: 2.6 },
      { kind: 'swing', at: 0.2, model: 'palu-permen', period: 3 },
      { kind: 'swing', at: 0.58, model: 'palu-permen', period: 2.6 },
      { kind: 'roller', at: 0.97, model: 'bola-permen', period: 5, radius: 2 },
    ],
    theme: {
      look: { sky: 'siang', ground: 'pasir', tint: '#ffc4ea', road: '#c89ab8', runoff: 'kerikil', water: '#7a3a1a' },
      sky: ['#ffb0e0', '#fff4fa'], fog: '#ffd6ef', fogNear: 90, fogFar: 430,
      ground: '#ffcae9', ground2: '#ffb0dc', road: '#8a5a7a', roadLine: '#fff4fa', curb: ['#ff37a6', '#fff4fa'], wall: '#ff37a6',
      sun: '#fff0f8', sunPower: 2.2, ambient: '#ffe0f4', night: false, offroad: 'permen',
      props: [['lolipop', 4], ['donat', 2], ['permen-tongkat', 3], ['kue', 1]],
    },
  },
  salju: {
    id: 'salju',
    title: 'Puncak Salju',
    line: 'Es licin di tikungan, bola salju menggelinding',
    points: road([[0, 0, 40, 50], [400, 0, 20, 46], [460, 100, 14, 42], [100, 160, 14, 38], [60, 260, 14, 34], [460, 320, 14, 30], [500, 420, 14, 26], [100, 480, 14, 22], [60, 580, 14, 18], [460, 640, 20, 14], [520, 760, 26, 10], [380, 860, 30, 6], [-100, 860, 26, 2], [-220, 740, 20, 0], [-200, 400, 30, 10], [-220, 100, 26, 30]]),
    width: 28,
    boxes: [0.05, 0.18, 0.32, 0.46, 0.6, 0.74, 0.88],
    pads: [[0.08, 0], [0.26, 0.4], [0.48, 0], [0.7, 0.35], [0.92, -0.3]],
    ramps: [0.2, 0.4, 0.55, 0.78],
    hazards: [
      { kind: 'grip', from: 0.12, to: 0.16, grip: 0.45, drag: 0, color: '#bfe9ff' },
      { kind: 'grip', from: 0.3, to: 0.38, grip: 0.45, drag: 0, color: '#bfe9ff' },
      { kind: 'grip', from: 0.62, to: 0.68, grip: 0.45, drag: 0, color: '#bfe9ff' },
      { kind: 'grip', from: 0.85, to: 0.88, grip: 0.45, drag: 0, color: '#bfe9ff' },
      { kind: 'roller', at: 0.24, model: 'bola-salju', period: 6, radius: 2.6 },
      { kind: 'roller', at: 0.44, model: 'bola-salju', period: 6, radius: 2.6 },
      { kind: 'roller', at: 0.82, model: 'bola-salju', period: 7, radius: 2.6 },
      { kind: 'block', at: 0.09, lane: 0.5, model: 'manusia-salju', radius: 2 },
      { kind: 'block', at: 0.5, lane: -0.5, model: 'batu-es', radius: 2.4 },
      { kind: 'block', at: 0.72, lane: 0, model: 'manusia-salju', radius: 2 },
      { kind: 'block', at: 0.95, lane: 0.4, model: 'batu-es', radius: 2.4 },
      { kind: 'swing', at: 0.58, model: 'es-ayun', period: 3.2 },
    ],
    theme: {
      look: { sky: 'siang', ground: 'salju', tint: '#ffffff', road: '#a8b4c4', runoff: 'salju' },
      sky: ['#8fc4ff', '#f4fbff'], fog: '#e4f2ff', fogNear: 80, fogFar: 420,
      ground: '#f4fbff', ground2: '#dcebfa', road: '#6a7a8a', roadLine: '#ff37a6', curb: ['#2f7bff', '#fff4fa'], wall: '#9ab8d8',
      sun: '#ffffff', sunPower: 2.4, ambient: '#d0e6ff', night: false, offroad: 'salju',
      props: [['cemara', 6], ['manusia-salju', 1], ['batu-es', 2]],
    },
  },
  lava: {
    id: 'lava',
    title: 'Kawah Berapi',
    line: 'Jatuh ke lava = balik ke jalan; batu api berjatuhan',
    points: road([[0, 0, 35, 0], [700, 0, 20, 4], [760, 100, 14, 8], [680, 160, 14, 12], [740, 240, 14, 16], [860, 260, 18, 20], [900, 400, 22, 24], [800, 500, 16, 22], [500, 500, 14, 18], [460, 400, 14, 14], [360, 440, 16, 10], [300, 560, 20, 6], [120, 580, 14, 4], [80, 460, 14, 2], [-60, 420, 20, 0], [-120, 280, 14, 2], [-40, 200, 14, 4], [-120, 100, 22, 2]]),
    width: 26,
    boxes: [0.05, 0.19, 0.33, 0.47, 0.6, 0.73, 0.87],
    pads: [[0.12, 0], [0.25, 0], [0.5, -0.3], [0.76, 0.3], [0.94, 0]],
    ramps: [0.17, 0.4, 0.55, 0.68, 0.82],
    hazards: [
      { kind: 'drop', at: 0.08, lane: -0.3, period: 4 },
      { kind: 'drop', at: 0.22, lane: 0.3, period: 3.5 },
      { kind: 'drop', at: 0.32, lane: 0.3, period: 4 },
      { kind: 'drop', at: 0.58, lane: -0.3, period: 5 },
      { kind: 'drop', at: 0.78, lane: 0.4, period: 3.8 },
      { kind: 'drop', at: 0.9, lane: 0, period: 4.5 },
      { kind: 'block', at: 0.14, lane: 0.5, model: 'batu-api', radius: 2.4 },
      { kind: 'block', at: 0.36, lane: -0.5, model: 'batu-api', radius: 2.4 },
      { kind: 'block', at: 0.63, lane: 0, model: 'kristal', radius: 2 },
      { kind: 'block', at: 0.86, lane: -0.5, model: 'batu-api', radius: 2.4 },
      { kind: 'swing', at: 0.46, model: 'rantai-api', period: 3 },
      { kind: 'swing', at: 0.71, model: 'rantai-api', period: 2.7 },
      { kind: 'roller', at: 0.96, model: 'bola-api', period: 5, radius: 2.2 },
    ],
    theme: {
      look: { sky: 'malam', ground: 'batu', tint: '#5a4040', road: '#8a7070', runoff: 'batu' },
      sky: ['#3a0a12', '#ff6a2a'], fog: '#5a1a14', fogNear: 70, fogFar: 380,
      ground: '#ff5a1a', ground2: '#ffa21a', road: '#3a2a2a', roadLine: '#ffcc1f', curb: ['#121212', '#ff8a1c'], wall: '#2a1a1a',
      sun: '#ffb070', sunPower: 1.6, ambient: '#ff8060', night: true, offroad: 'lava',
      props: [['batu-api', 5], ['tulang', 1], ['kristal', 2]],
    },
  },
}

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[]
