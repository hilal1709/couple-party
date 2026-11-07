import type { MountainId } from './types'

/** lapisan tekstur medan; urutannya = indeks di texture array */
export const TEX = ['rumput', 'tanah', 'pasir', 'batu', 'tebing', 'lumut', 'salju', 'es', 'vulkanik', 'kristal', 'teh', 'kerikil'] as const
export type Tex = (typeof TEX)[number]
export const texIndex = (t: Tex) => TEX.indexOf(t)

/** jenis permukaan untuk fisika (licin, boros stamina) */
export type Surface = 'tanah' | 'batu' | 'lumut' | 'salju' | 'es' | 'pasir' | 'kristal' | 'vulkanik'

export const SURFACE_OF: Record<Tex, Surface> = {
  rumput: 'tanah',
  tanah: 'tanah',
  pasir: 'pasir',
  batu: 'batu',
  tebing: 'batu',
  lumut: 'lumut',
  salju: 'salju',
  es: 'es',
  vulkanik: 'vulkanik',
  kristal: 'kristal',
  teh: 'tanah',
  kerikil: 'batu',
}

export type Tree = 'palem' | 'jati' | 'beringin' | 'pinus' | 'kering' | 'semak' | 'teh' | 'kristal' | 'karang'
export type Creature = 'kepiting' | 'lebah' | 'kelelawar'
export type Hazard = 'batu' | 'angin' | 'badai' | 'uap' | 'retak' | 'malam'

export type Zone = {
  title: string
  /** 4 slot tanah (bobot dibagi noise), tebing, dan salju (0..1) */
  ground: [Tex, Tex, Tex, Tex]
  cliff: Tex
  snow: number
  /** pohon per 100 m² dan jenisnya */
  trees: Tree[]
  density: number
  /** dingin / panas di zona ini (0..1 per menit bertambah lelah) */
  cold: number
  heat: number
  /** warna gaya referensi: muka batu, tepian atas, tanah/pasir, dan jenis rumput */
  rock: string
  ledge: string
  soil: string
  grass: 'hijau' | 'kering' | null
}

export type Mountain = {
  id: MountainId
  title: string
  line: string
  sky: 'siang' | 'senja' | 'malam'
  /** warna kabut & kekuatan kabut */
  fog: string
  fogDensity: number
  /** gradasi warna akhir (dikalikan) */
  grade: [number, number, number]
  /** laut di kaki gunung */
  sea: { kind: 'air' | 'lava' | 'awan'; y: number } | null
  /** tinggi tanjakan tiap cincin & tebing antar cincin (m) */
  ramp: number
  cliff: number
  /** kekasaran medan */
  rough: number
  /** tangga-tangga teras (m per anak tangga), 0 = tidak */
  terrace: number
  /** puncak berupa kawah lava */
  crater?: boolean
  /** cincin dipecah jadi pulau melayang (jumlah celah per cincin) */
  islands?: number
  /** pilar batu/kristal menjulang di cincin */
  pillars?: number
  /** sulur yang sudah tergantung di tebing tinggi */
  vines?: number
  /** ukuran sel bongkahan (m) & seberapa acak tinggi tiap bongkahan */
  block?: number
  jag?: number
  zones: Zone[]
  creatures: Creature[]
  hazards: Hazard[]
  /** tata letak Punggung Hijau: tiap zona punya bentuk sendiri (lihat ZONE_KINDS), bukan pita tebing seragam */
  ridge?: boolean
  /** suara suasana */
  amb: 'pantai' | 'hutan' | 'angin' | 'kawah' | 'badai' | 'kabut' | 'gua' | 'langit'
}

const Z = (title: string, ground: Zone['ground'], cliff: Tex, trees: Tree[], density: number, o: Partial<Zone> = {}): Zone => ({ title, ground, cliff, snow: 0, trees, density, cold: 0, heat: 0, rock: '#8c9a98', ledge: '#d9c79a', soil: '#c8a46a', grass: 'hijau', ...o })

export const MOUNTAINS: Record<MountainId, Mountain> = {
  hijau: {
    id: 'hijau',
    title: 'Punggung Hijau',
    line: 'Hutan, formasi batu, tebing, punggung angin',
    sky: 'siang',
    fog: '#c6d9cf',
    fogDensity: 0.0034,
    grade: [0.99, 1.02, 0.97],
    sea: null,
    ramp: 20,
    cliff: 10,
    rough: 1,
    terrace: 0,
    vines: 2,
    block: 10,
    jag: 3,
    ridge: true,
    zones: [
      Z('Kemah Awal', ['rumput', 'tanah', 'rumput', 'kerikil'], 'batu', ['pinus', 'semak'], 0.3),
      Z('Hutan Bawah', ['tanah', 'lumut', 'rumput', 'kerikil'], 'lumut', ['jati', 'beringin', 'pinus', 'semak'], 1.8),
      Z('Formasi Batu', ['kerikil', 'rumput', 'batu', 'lumut'], 'tebing', ['pinus', 'semak'], 0.45),
      Z('Tebing Besar', ['batu', 'kerikil', 'rumput', 'lumut'], 'tebing', ['pinus', 'semak'], 0.25),
      Z('Punggung Atas', ['rumput', 'kerikil', 'batu', 'rumput'], 'batu', ['kering', 'semak', 'pinus'], 0.22, { cold: 0.12 }),
      Z('Puncak', ['kerikil', 'batu', 'rumput', 'kerikil'], 'batu', ['semak'], 0.08, { cold: 0.25, snow: 0.12 }),
    ],
    creatures: ['lebah'],
    hazards: ['batu', 'angin'],
    amb: 'hutan',
  },
  karang: {
    id: 'karang',
    title: 'Karang Tropis',
    line: 'Pantai, tebing karang, air terjun',
    sky: 'siang',
    fog: '#bfe3ee',
    fogDensity: 0.0042,
    grade: [1.02, 1.0, 0.97],
    sea: { kind: 'air', y: 0 },
    ramp: 20,
    cliff: 10,
    rough: 1,
    terrace: 0,
    vines: 2,
    block: 12,
    jag: 3.5,
    zones: [
      Z('Pantai Pasir Putih', ['pasir', 'pasir', 'kerikil', 'rumput'], 'batu', ['palem', 'palem', 'semak'], 0.9),
      Z('Hutan Pantai', ['pasir', 'tanah', 'rumput', 'kerikil'], 'batu', ['palem', 'palem', 'semak'], 0.9),
      Z('Tebing Karang', ['kerikil', 'pasir', 'batu', 'tanah'], 'batu', ['palem', 'semak'], 0.4),
      Z('Puncak Angin', ['rumput', 'batu', 'kerikil', 'tanah'], 'batu', ['semak', 'kering'], 0.25),
    ],
    creatures: ['kepiting'],
    hazards: ['batu'],
    amb: 'pantai',
  },
  rimba: {
    id: 'rimba',
    title: 'Rimba Lumut',
    line: 'Hutan raksasa, akar & sulur',
    sky: 'siang',
    fog: '#a9c9a0',
    fogDensity: 0.0075,
    grade: [0.95, 1.03, 0.94],
    sea: { kind: 'air', y: -0.5 },
    ramp: 22,
    cliff: 11,
    rough: 1.3,
    terrace: 0,
    vines: 5,
    zones: [
      Z('Lantai Rimba', ['tanah', 'lumut', 'rumput', 'kerikil'], 'lumut', ['beringin', 'jati', 'semak'], 1.6),
      Z('Akar Raksasa', ['lumut', 'tanah', 'rumput', 'lumut'], 'lumut', ['beringin', 'semak'], 1.4),
      Z('Tebing Basah', ['rumput', 'lumut', 'batu', 'tanah'], 'tebing', ['jati', 'pinus'], 0.9),
      Z('Mahkota Rimba', ['rumput', 'kerikil', 'lumut', 'batu'], 'batu', ['pinus', 'semak'], 0.5),
    ],
    creatures: ['lebah'],
    hazards: ['batu'],
    amb: 'hutan',
  },
  ngarai: {
    id: 'ngarai',
    title: 'Ngarai Merah',
    line: 'Batu pasir berlapis, angin kencang',
    sky: 'senja',
    fog: '#e6b98f',
    fogDensity: 0.0022,
    grade: [1.06, 0.98, 0.9],
    sea: null,
    ramp: 21,
    cliff: 13,
    rough: 1.1,
    terrace: 0,
    pillars: 7,
    zones: [
      Z('Dasar Ngarai', ['pasir', 'kerikil', 'tanah', 'pasir'], 'tebing', ['kering', 'semak'], 0.25),
      Z('Lorong Angin', ['kerikil', 'pasir', 'batu', 'tanah'], 'tebing', ['kering'], 0.15),
      Z('Mesa Merah', ['pasir', 'batu', 'kerikil', 'tanah'], 'tebing', ['kering', 'semak'], 0.15),
      Z('Menara Batu', ['batu', 'kerikil', 'pasir', 'batu'], 'tebing', ['kering'], 0.08),
    ],
    creatures: [],
    hazards: ['batu', 'angin'],
    amb: 'angin',
  },
  kawah: {
    id: 'kawah',
    title: 'Kawah Belerang',
    line: 'Gunung api, uap panas, lava',
    sky: 'senja',
    fog: '#8a7a74',
    fogDensity: 0.0034,
    grade: [1.08, 0.95, 0.88],
    sea: { kind: 'lava', y: -1 },
    ramp: 20,
    cliff: 11,
    rough: 1.2,
    terrace: 0,
    crater: true,
    zones: [
      Z('Kaki Gunung', ['tanah', 'rumput', 'kerikil', 'vulkanik'], 'batu', ['pinus', 'semak'], 0.8),
      Z('Hutan Mati', ['vulkanik', 'kerikil', 'tanah', 'vulkanik'], 'vulkanik', ['kering'], 0.4),
      Z('Ladang Belerang', ['vulkanik', 'kerikil', 'pasir', 'vulkanik'], 'vulkanik', [], 0, { heat: 0.25 }),
      Z('Bibir Kawah', ['vulkanik', 'vulkanik', 'kerikil', 'batu'], 'vulkanik', [], 0, { heat: 0.5 }),
    ],
    creatures: [],
    hazards: ['batu', 'uap'],
    amb: 'kawah',
  },
  salju: {
    id: 'salju',
    title: 'Puncak Salju',
    line: 'Es, badai salju, retakan',
    sky: 'siang',
    fog: '#dfe8f2',
    fogDensity: 0.0065,
    grade: [0.96, 1.0, 1.07],
    sea: { kind: 'air', y: -0.5 },
    ramp: 21,
    cliff: 11,
    rough: 1,
    terrace: 0,
    zones: [
      Z('Lembah Pinus', ['rumput', 'tanah', 'salju', 'kerikil'], 'batu', ['pinus', 'semak'], 1.2, { snow: 0.3 }),
      Z('Hutan Bersalju', ['salju', 'tanah', 'kerikil', 'salju'], 'batu', ['pinus'], 0.9, { snow: 0.7, cold: 0.2 }),
      Z('Glasier', ['salju', 'es', 'salju', 'kerikil'], 'es', ['pinus'], 0.2, { snow: 0.9, cold: 0.45 }),
      Z('Atap Dunia', ['salju', 'salju', 'es', 'batu'], 'es', [], 0, { snow: 1, cold: 0.7 }),
    ],
    creatures: [],
    hazards: ['batu', 'badai'],
    amb: 'badai',
  },
  teh: {
    id: 'teh',
    title: 'Kebun Teh Berkabut',
    line: 'Terasering hijau, kabut tebal',
    sky: 'siang',
    fog: '#d8e4dc',
    fogDensity: 0.011,
    grade: [0.97, 1.03, 0.98],
    sea: { kind: 'air', y: -0.5 },
    ramp: 20,
    cliff: 10,
    rough: 0.7,
    terrace: 0.42,
    zones: [
      Z('Desa Kaki Bukit', ['rumput', 'tanah', 'teh', 'kerikil'], 'batu', ['jati', 'semak'], 0.7),
      Z('Teras Teh', ['teh', 'teh', 'tanah', 'rumput'], 'tanah', ['teh'], 2.2),
      Z('Teras Tinggi', ['teh', 'rumput', 'tanah', 'teh'], 'batu', ['teh', 'pinus'], 1.8),
      Z('Bukit Kabut', ['rumput', 'lumut', 'kerikil', 'tanah'], 'batu', ['pinus', 'semak'], 0.6),
    ],
    creatures: ['lebah'],
    hazards: ['batu'],
    amb: 'kabut',
  },
  kristal: {
    id: 'kristal',
    title: 'Ngarai Kristal',
    line: 'Malam bercahaya, kristal licin',
    sky: 'malam',
    fog: '#1d1838',
    fogDensity: 0.0085,
    grade: [0.92, 0.94, 1.1],
    sea: { kind: 'air', y: -0.5 },
    ramp: 20,
    cliff: 11,
    rough: 1.1,
    terrace: 0,
    pillars: 12,
    zones: [
      Z('Gua Masuk', ['kerikil', 'batu', 'lumut', 'tanah'], 'batu', ['semak'], 0.3),
      Z('Taman Kristal', ['batu', 'lumut', 'kerikil', 'kristal'], 'tebing', ['kristal'], 0.6),
      Z('Dinding Kaca', ['batu', 'kerikil', 'lumut', 'kristal'], 'kristal', ['kristal'], 0.5),
      Z('Mahkota Cahaya', ['batu', 'kerikil', 'kristal', 'lumut'], 'kristal', ['kristal'], 0.4),
    ],
    creatures: ['kelelawar'],
    hazards: ['batu', 'retak', 'malam'],
    amb: 'gua',
  },
  langit: {
    id: 'langit',
    title: 'Pulau Langit',
    line: 'Pulau melayang, jembatan, angin naik',
    sky: 'senja',
    fog: '#f3d7e4',
    fogDensity: 0.0024,
    grade: [1.04, 0.99, 1.03],
    sea: { kind: 'awan', y: -14 },
    ramp: 20,
    cliff: 10,
    rough: 0.9,
    terrace: 0,
    islands: 3,
    zones: [
      Z('Dermaga Awan', ['rumput', 'tanah', 'kerikil', 'rumput'], 'batu', ['jati', 'semak'], 0.8),
      Z('Kebun Melayang', ['rumput', 'lumut', 'tanah', 'rumput'], 'tebing', ['beringin', 'semak'], 1),
      Z('Batu Terbang', ['kerikil', 'rumput', 'batu', 'lumut'], 'tebing', ['pinus', 'semak'], 0.5),
      Z('Istana Angin', ['rumput', 'batu', 'kerikil', 'rumput'], 'batu', ['semak'], 0.3),
    ],
    creatures: [],
    hazards: ['angin'],
    amb: 'langit',
  },
}

/** palet gaya referensi per gunung, dari kaki ke puncak: [batu, tepian, tanah, rumput] */
const PALETTE: Record<MountainId, [string, string, string, Zone['grass']][]> = {
  hijau: [
    ['#8d988c', '#a9c97c', '#8c7652', 'hijau'],
    ['#7a8876', '#93b866', '#6f6043', 'hijau'],
    ['#8f9690', '#b6c88a', '#8a7c62', 'hijau'],
    ['#8a9294', '#c2cc98', '#8e846c', 'hijau'],
    ['#949c98', '#c9cf9c', '#958b72', 'kering'],
    ['#a0a6a6', '#dcdcc4', '#a49c88', 'kering'],
  ],
  karang: [
    ['#97a7a3', '#e6d3a0', '#dcb877', 'kering'],
    ['#8d9f9c', '#d9cc96', '#c9b27a', 'kering'],
    ['#83979a', '#cfc79c', '#b9a985', 'kering'],
    ['#7d9197', '#c9c4a8', '#b0a690', 'hijau'],
  ],
  rimba: [
    ['#7c8a76', '#9fbf6a', '#7a6a48', 'hijau'],
    ['#768672', '#8fb562', '#6e6244', 'hijau'],
    ['#7b8a80', '#a8c47a', '#80745a', 'hijau'],
    ['#8a978c', '#bfcf8f', '#8e866a', 'hijau'],
  ],
  ngarai: [
    ['#c27b55', '#e8b77e', '#d99a62', 'kering'],
    ['#b8714f', '#e2ac78', '#cf8f5c', 'kering'],
    ['#ad6a4c', '#d9a274', '#c48659', 'kering'],
    ['#a3654a', '#cf9a70', '#ba7f56', null],
  ],
  kawah: [
    ['#6f6a66', '#a8a27a', '#857a62', 'kering'],
    ['#5f5753', '#8f8572', '#6e655a', 'kering'],
    ['#4f4846', '#c9b85a', '#5e5550', null],
    ['#463f3e', '#bfa94a', '#524a46', null],
  ],
  salju: [
    ['#8c98a0', '#e4ecf2', '#a99c84', 'hijau'],
    ['#8a96a2', '#eef3f8', '#b8b4ac', null],
    ['#94a4b4', '#f4f8fc', '#cfd6de', null],
    ['#a0b2c4', '#ffffff', '#e2e8ee', null],
  ],
  teh: [
    ['#8f9a8c', '#a7c97a', '#8a7650', 'hijau'],
    ['#8a988a', '#7fb35a', '#7c6a48', 'hijau'],
    ['#87968c', '#8fbf68', '#7a6a4c', 'hijau'],
    ['#909e96', '#b4cf8e', '#887a5e', 'hijau'],
  ],
  kristal: [
    ['#6c6a8a', '#8f8ab8', '#5e5a72', null],
    ['#65639a', '#9a8fd0', '#5a5674', null],
    ['#5f5ca8', '#a99be0', '#56527a', null],
    ['#5b58b4', '#b9aaf0', '#524e80', null],
  ],
  langit: [
    ['#a49aa6', '#f2d7a6', '#d9b98a', 'hijau'],
    ['#9c94a4', '#e9d2a8', '#ccb08a', 'hijau'],
    ['#968fa4', '#e2cfb0', '#c2aa90', 'kering'],
    ['#9290a8', '#ddd0bc', '#b8a698', 'kering'],
  ],
}
for (const id of Object.keys(MOUNTAINS) as MountainId[]) {
  MOUNTAINS[id].zones.forEach((z, k) => {
    const [rock, ledge, soil, grass] = PALETTE[id][k]
    Object.assign(z, { rock, ledge, soil, grass })
  })
}

export const MOUNTAIN_IDS = Object.keys(MOUNTAINS) as MountainId[]

/** bentuk tiap zona Punggung Hijau, dari kaki ke puncak */
export type ZoneKind = 'kemah' | 'hutan' | 'batu' | 'tebing' | 'punggung' | 'puncak'
const RIDGE_FULL: ZoneKind[] = ['kemah', 'hutan', 'batu', 'tebing', 'punggung', 'puncak']
/** rute pendek tetap memuat tebing besar */
const RIDGE_SHORT: ZoneKind[] = ['kemah', 'tebing', 'puncak']
const RIDGE_IDX: Record<ZoneKind, number> = { kemah: 0, hutan: 1, batu: 2, tebing: 3, punggung: 4, puncak: 5 }

/** jenis zona yang dipakai (hanya gunung ridge) */
export const zoneKinds = (id: MountainId, zones: number): ZoneKind[] | null => (MOUNTAINS[id].ridge ? (zones >= 4 ? RIDGE_FULL : RIDGE_SHORT) : null)

/**
 * Gunung seperti yang benar-benar dimainkan: Punggung Hijau rute pendek memakai sebagian zonanya.
 * Indeks zona di medan, HUD, dan api unggun selalu mengacu ke `mountainFor(...).zones`.
 */
export function mountainFor(id: MountainId, zones: number): Mountain {
  const m = MOUNTAINS[id]
  const kinds = zoneKinds(id, zones)
  if (!kinds) return { ...m, zones: m.zones.slice(0, Math.max(1, Math.min(m.zones.length, zones))) }
  return { ...m, zones: kinds.map((k) => m.zones[RIDGE_IDX[k]]) }
}

/** jumlah api unggun (= zona) untuk opsi rute */
export const zoneCount = (id: MountainId, zones: number) => mountainFor(id, zones).zones.length
