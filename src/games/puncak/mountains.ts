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
  zones: Zone[]
  creatures: Creature[]
  hazards: Hazard[]
  /** suara suasana */
  amb: 'pantai' | 'hutan' | 'angin' | 'kawah' | 'badai' | 'kabut' | 'gua' | 'langit'
}

const Z = (title: string, ground: Zone['ground'], cliff: Tex, trees: Tree[], density: number, o: Partial<Zone> = {}): Zone => ({ title, ground, cliff, snow: 0, trees, density, cold: 0, heat: 0, ...o })

export const MOUNTAINS: Record<MountainId, Mountain> = {
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
    zones: [
      Z('Pantai Pasir Putih', ['pasir', 'pasir', 'kerikil', 'rumput'], 'batu', ['palem', 'semak'], 0.5),
      Z('Hutan Pantai', ['rumput', 'tanah', 'lumut', 'pasir'], 'tebing', ['palem', 'jati', 'semak'], 1.1),
      Z('Tebing Karang', ['kerikil', 'rumput', 'batu', 'tanah'], 'tebing', ['karang', 'semak'], 0.4),
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

export const MOUNTAIN_IDS = Object.keys(MOUNTAINS) as MountainId[]
