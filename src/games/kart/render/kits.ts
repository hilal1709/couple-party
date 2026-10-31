import * as THREE from 'three'
import { STEP, curvature, pointAt, type Track } from '../sim/track'
import type { Theme } from '../tracks'
import { instanced, modelMaterials, placed, variants } from './models'
import type { Tier } from './quality'
import type { Recipe } from './recipe'
import { patchWindows } from './shaders'
import { canvasTex, seeded, tex } from './tex'

const up = new THREE.Vector3(0, 1, 0)
const SPONSORS = ['COUPLE PARTY', 'KART KACAU', 'SAMBAL TURBO', 'KOPI JAHIL', 'MIE NGEBUT', 'BAJAJ MINI', 'ES TEH NGEGAS', 'PISANG LICIN']

function banner(text: string, bg: string, fg: string) {
  return canvasTex(512, 96, (c) => {
    c.fillStyle = bg
    c.fillRect(0, 0, 512, 96)
    c.fillStyle = fg
    c.fillRect(0, 0, 512, 8)
    c.fillRect(0, 88, 512, 8)
    c.font = '900 56px "Dela Gothic One", sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(text, 256, 52)
  }, false)
}

/** satu InstancedMesh dari daftar matriks */
function batch(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length)
  mats.forEach((x, i) => m.setMatrixAt(i, x))
  m.castShadow = shadow
  m.receiveShadow = true
  m.computeBoundingSphere()
  return m
}

/** persimpangan: indeks sampel tempat kendaraan melintas; dinding & gedung diberi celah di sini */
const crossings = (t: Track) => t.def.hazards.flatMap((h) => (h.kind === 'roller' ? [Math.round(h.at * t.n)] : []))
const nearCross = (t: Track, list: number[], i: number, reach: number) =>
  list.some((c) => {
    const d = Math.abs(i - c)
    return Math.min(d, t.n - d) <= reach
  })

/** dinding lurus antar sampel: batang kotak di garis `wall`, satu matriks per ruas */
function wallSpans(t: Track, every: number, skip: (i: number) => boolean, y: number) {
  const mats: THREE.Matrix4[] = []
  const q = new THREE.Quaternion()
  for (let i = 0; i < t.n; i += every) {
    if (skip(i)) continue
    q.setFromAxisAngle(up, Math.atan2(t.tx[i], t.tz[i]))
    for (const side of [-1, 1]) {
      const p = pointAt(t, i * STEP, side * t.wall[i])
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + y, p.z), q.clone(), new THREE.Vector3(1, 1, 1)))
    }
  }
  return mats
}

/** tumpukan ban & papan chevron di sisi luar tikungan tajam */
function cornerMarks(t: Track, g: THREE.Group, tires = true) {
  const tireMats: THREE.Matrix4[] = []
  const signL: THREE.Matrix4[] = []
  const signR: THREE.Matrix4[] = []
  let lastSign = -999
  for (let i = 0; i < t.n; i += 2) {
    const c = curvature(t, i, 6)
    if (Math.abs(c) < 0.02) continue
    // sisi luar: belok kanan (c > 0) → luar di kiri
    const side = c > 0 ? -1 : 1
    for (let k = 0; tires && k < 3; k++) {
      const p = pointAt(t, i * STEP + k * 0.9, side * (t.wall[i] - 1.2))
      tireMats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + 0.3 + (k % 2) * 0.55, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)))
    }
    if (i - lastSign > 25) {
      lastSign = i
      // papan menghadap pengemudi yang datang, sedikit sebelum tikungan
      const p = pointAt(t, i * STEP - 30, side * (t.hw[i] + Math.min(6, t.wall[i] - t.hw[i] - 0.5)))
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(up, p.yaw + Math.PI), new THREE.Vector3(3, 3, 3))
      ;(c > 0 ? signR : signL).push(m)
    }
  }
  if (tireMats.length) g.add(batch(new THREE.TorusGeometry(0.55, 0.25, 8, 14), new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.9 }), tireMats))
  if (signL.length && variants('kit-arah-kiri').length) g.add(instanced('kit-arah-kiri', signL))
  if (signR.length && variants('kit-arah-kanan').length) g.add(instanced('kit-arah-kanan', signR))
}

/** spanduk sponsor menempel di dinding sepanjang lurusan */
function sponsors(t: Track, theme: Theme, g: THREE.Group, r: () => number, skip: (i: number) => boolean) {
  const mats = SPONSORS.map((s, i) => new THREE.MeshStandardMaterial({ map: banner(s, [theme.curb[0], '#121212', theme.wall, '#2f7bff'][i % 4], '#fff4fa'), roughness: 0.6 }))
  const geo = new THREE.PlaneGeometry(10, 1.9)
  let last = -999
  for (let i = 0; i < t.n; i += 4) {
    if (Math.abs(curvature(t, i, 10)) > 0.006 || i - last < 30 || skip(i)) continue
    last = i
    for (const side of [-1, 1]) {
      const p = pointAt(t, i * STEP, side * (t.wall[i] - 0.6))
      const b = new THREE.Mesh(geo, mats[Math.floor(r() * mats.length)])
      b.position.set(p.x, p.y + 1.6, p.z)
      b.rotation.y = p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2)
      g.add(b)
    }
  }
}

/** titik di kedua sisi garis dinding tiap `every` sampel */
function eachSide(t: Track, every: number, fn: (a: { x: number; y: number; z: number; yaw: number }, i: number, side: number) => void) {
  for (let i = 0; i < t.n; i += every) for (const side of [-1, 1]) fn(pointAt(t, i * STEP, side * t.wall[i]), i, side)
}

const mx = (x: number, y: number, z: number, q: THREE.Quaternion, s: THREE.Vector3) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s)
const yawQ = (yaw: number) => new THREE.Quaternion().setFromAxisAngle(up, yaw)

/** bahan bertekstur dari folder tekstur kart */
function textured(name: string, color: string, tier: Tier, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ map: tex(`${name}_diff.webp`), normalMap: tier.pbr ? tex(`${name}_nor.webp`, false) : null, color, roughness })
}

/** tiang dan palang di antaranya: tali pantai, pagar bambu sawah, tiang permen */
function postRail(t: Track, o: { post: THREE.Material; rail: THREE.Material; geo: THREE.BufferGeometry; rails: number[]; thick: number; lean: number; every: number }) {
  const g = new THREE.Group()
  const r = seeded(t.n * 7)
  const posts: THREE.Matrix4[] = []
  const bars: THREE.Matrix4[] = []
  for (let i = 0; i < t.n; i += o.every) {
    const j = (i + o.every) % t.n
    for (const side of [-1, 1]) {
      const a = pointAt(t, i * STEP, side * t.wall[i])
      const b = pointAt(t, j * STEP, side * t.wall[j])
      const lean = new THREE.Euler((r() - 0.5) * o.lean, r() * 6.28, (r() - 0.5) * o.lean)
      const tall = o.lean ? 0.85 + r() * 0.3 : 1
      posts.push(mx(a.x, a.y + 0.7 * tall, a.z, new THREE.Quaternion().setFromEuler(lean), new THREE.Vector3(1, tall, 1)))
      const len = Math.hypot(b.x - a.x, b.z - a.z)
      const q = yawQ(Math.atan2(b.x - a.x, b.z - a.z))
      for (const h of o.rails) bars.push(mx((a.x + b.x) / 2, (a.y + b.y) / 2 + h, (a.z + b.z) / 2, q, new THREE.Vector3(1, 1, len)))
    }
  }
  g.add(batch(o.geo, o.post, posts))
  g.add(batch(new THREE.BoxGeometry(o.thick, o.thick, 1), o.rail, bars, false))
  return g
}

/** tiang pancang di bawah jembatan */
function piles(t: Track, wood: THREE.Material) {
  const list: THREE.Matrix4[] = []
  for (const [from, to] of t.def.bridges ?? []) {
    for (let i = Math.floor(from * t.n); i < to * t.n; i += 6) {
      for (const lat of [-1, -0.4, 0.4, 1]) {
        const p = pointAt(t, i * STEP, lat * t.wall[i])
        list.push(mx(p.x, p.y - 3.6, p.z, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)))
      }
    }
  }
  return batch(new THREE.CylinderGeometry(0.42, 0.5, 7.4, 8), wood, list)
}

/** pagar alam per map, plus panah tikungan */
function alamSide(t: Track, recipe: Recipe, tier: Tier) {
  const g = new THREE.Group()
  const r = seeded(t.n * 17)
  const list: THREE.Matrix4[] = []
  const list2: THREE.Matrix4[] = []
  switch (recipe.fence) {
    case 'tali': {
      const wood = textured('papan-tua', '#d9c6a8', tier, 0.92)
      g.add(postRail(t, { post: wood, rail: new THREE.MeshStandardMaterial({ color: '#c9ad7c', roughness: 1 }), geo: new THREE.CylinderGeometry(0.2, 0.27, 1.5, 7), rails: [0.72, 1.18], thick: 0.09, lean: 0.16, every: 5 }))
      if (t.def.bridges) g.add(piles(t, wood))
      break
    }
    case 'bambu':
      g.add(postRail(t, { post: new THREE.MeshStandardMaterial({ color: '#b9a960', roughness: 0.6 }), rail: new THREE.MeshStandardMaterial({ color: '#c2bc66', roughness: 0.55 }), geo: new THREE.CylinderGeometry(0.13, 0.15, 1.6, 7), rails: [0.62, 1.2], thick: 0.16, lean: 0.06, every: 3 }))
      break
    case 'tiang-permen': {
      const stripes = canvasTex(32, 64, (c) => {
        c.fillStyle = '#fff4fa'
        c.fillRect(0, 0, 32, 64)
        c.fillStyle = '#ff2f6a'
        c.beginPath()
        for (const y of [-32, 0, 32, 64]) {
          c.moveTo(0, y)
          c.lineTo(32, y + 16)
          c.lineTo(32, y + 32)
          c.lineTo(0, y + 16)
        }
        c.fill()
      })
      g.add(postRail(t, { post: new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.3 }), rail: new THREE.MeshStandardMaterial({ color: '#ff8fd0', roughness: 0.3 }), geo: new THREE.CylinderGeometry(0.42, 0.42, 3, 12), rails: [1.1], thick: 0.32, lean: 0, every: 6 }))
      break
    }
    case 'akar': {
      // batang tumbang berselimut lumut, dengan jamur kecil menyala
      eachSide(t, 4, (a, i, side) => {
        const s = new THREE.Vector3(0.85 + r() * 0.5, 0.85 + r() * 0.5, 1)
        list.push(mx(a.x, a.y + 0.55, a.z, yawQ(a.yaw + (r() - 0.5) * 0.18), s))
        if (i % 12 === 0) {
          const b = pointAt(t, i * STEP, side * (t.wall[i] - 1.1))
          list2.push(mx(b.x, b.y + 0.7, b.z, new THREE.Quaternion(), new THREE.Vector3(1, 0.55, 1)))
        }
      })
      g.add(batch(new THREE.CylinderGeometry(0.75, 0.95, STEP * 4 + 1.6, 8).rotateX(Math.PI / 2), textured('papan-tua', '#5a6a42', tier), list))
      g.add(batch(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5cffd8').multiplyScalar(2), toneMapped: false }), list2, false))
      break
    }
    case 'balok':
      // balok candi: sebagian runtuh, tingginya tidak sama
      eachSide(t, 2, (a) => {
        if (r() < 0.08) return
        const h = 0.7 + r() * 0.8
        list.push(mx(a.x, a.y + h - 0.1, a.z, yawQ(a.yaw + (r() - 0.5) * 0.06), new THREE.Vector3(1, h, 1)))
      })
      g.add(batch(new THREE.BoxGeometry(1.7, 2, STEP * 2 - 0.15), textured('batu-merah', '#e8bc94', tier), list))
      break
    case 'tanggul': {
      // tanggul salju hasil bajak, dengan tiang penanda merah
      eachSide(t, 2, (a, i, side) => {
        list.push(mx(a.x, a.y + 0.3, a.z, yawQ(a.yaw), new THREE.Vector3(3.2 + r() * 1.6, 1.4 + r() * 0.9, 3 + r())))
        if (i % 14 === 0) {
          const b = pointAt(t, i * STEP, side * (t.wall[i] - 3.4))
          list2.push(mx(b.x, b.y + 1.3, b.z, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)))
        }
      })
      g.add(batch(new THREE.IcosahedronGeometry(1, 2), textured('salju', '#ffffff', tier, 0.7), list))
      g.add(batch(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#e8352f', roughness: 0.5 }), list2))
      break
    }
    case 'batu-tajam':
      // bongkah basal bergerigi; sesekali tiang batu tinggi
      eachSide(t, 2, (a, i) => {
        const k = 1 + r() * 1.6
        list.push(mx(a.x, a.y + k * 0.35, a.z, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(k, k * (0.8 + r() * 0.6), k)))
        if (i % 16 === 0) list2.push(mx(a.x, a.y + 3, a.z, yawQ(r() * 6.28), new THREE.Vector3(1 + r() * 0.7, 1 + r() * 0.6, 1 + r() * 0.7)))
      })
      g.add(batch(new THREE.DodecahedronGeometry(1, 0), textured('basal', '#6a5a5a', tier), list))
      g.add(batch(new THREE.ConeGeometry(1.6, 8, 5), textured('basal', '#4a3e3e', tier), list2))
      break
  }
  cornerMarks(t, g, false)
  return g
}

/** kit kota: pembatas jersey dengan strip LED, lampu jalan, gedung rapat, tiang ruas layang */
function kotaSide(t: Track, theme: Theme, tier: Tier) {
  const g = new THREE.Group()
  const r = seeded(t.n * 11)
  const every = 3
  const cross = crossings(t)
  const gap = (i: number) => nearCross(t, cross, i, 9)
  const mats = wallSpans(t, every, gap, 0.55)
  const concrete = new THREE.MeshStandardMaterial({ map: tex('beton_diff.webp'), color: '#8d8ba2', roughness: 0.75 })
  g.add(batch(new THREE.BoxGeometry(0.9, 1.1, STEP * every + 0.2), concrete, mats))
  const led = new THREE.InstancedMesh(new THREE.BoxGeometry(0.94, 0.16, STEP * every + 0.2), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), mats.length)
  const pal = [theme.curb[0], theme.curb[1], theme.wall].map((c) => new THREE.Color(c).multiplyScalar(2.2))
  mats.forEach((m, i) => {
    led.setMatrixAt(i, m)
    led.setColorAt(i, pal[Math.floor(i / 28) % pal.length])
  })
  led.computeBoundingSphere()
  g.add(led)
  cornerMarks(t, g)
  sponsors(t, theme, g, r, gap)

  // lampu jalan selang-seling, dengan bola cahaya supaya bloom menangkapnya
  const lamps: THREE.Matrix4[] = []
  const bulbs: THREE.Matrix4[] = []
  let flip = 1
  for (let i = 8; i < t.n; i += 22) {
    if (gap(i)) continue
    flip = -flip
    const p = pointAt(t, i * STEP, flip * (t.wall[i] + 0.8))
    const yaw = p.yaw + (flip > 0 ? Math.PI : 0)
    lamps.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(1.3, 1.3, 1.3)))
    const b = pointAt(t, i * STEP, flip * (t.wall[i] - 2))
    bulbs.push(new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.y + 10, b.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)))
  }
  if (lamps.length) g.add(instanced('lampu', lamps))
  if (bulbs.length) g.add(batch(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2b0').multiplyScalar(3), toneMapped: false }), bulbs, false))

  // ruas layang: tiang dan sisi bawah
  const piers: THREE.Matrix4[] = []
  for (let i = 0; i < t.n; i += 14) {
    if (t.py[i] < 3) continue
    piers.push(new THREE.Matrix4().compose(new THREE.Vector3(t.px[i], t.py[i] / 2 - 0.8, t.pz[i]), new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(t.tx[i], t.tz[i])), new THREE.Vector3(t.hw[i] * 1.1, t.py[i] - 1.6, 2.6)))
  }
  if (piers.length) g.add(batch(new THREE.BoxGeometry(1, 1, 1), concrete, piers))
  g.add(fascia(t, concrete))

  // barisan gedung membentuk ngarai kota; celah di persimpangan dan di tribun start
  const CH = 16
  const spots = new Map<string, THREE.Matrix4[][]>()
  const names = ['gedung', 'gedung-2', 'gedung-3', 'gedung-4']
  const step = Math.round(16 / Math.max(0.5, tier.props))
  const clear = (x: number, z: number, need: number) => {
    for (let j = 0; j < t.n; j += 4) if ((t.px[j] - x) ** 2 + (t.pz[j] - z) ** 2 < (t.wall[j] + need) ** 2) return false
    return true
  }
  const rows: [number, number][] = tier.q === 'low' ? [[17, 1.25]] : [[17, 1.25], [52, 1.9]]
  for (let i = 0; i < t.n; i += step) {
    if (nearCross(t, cross, i, 12) || i < 55 || i > t.n - 55) continue
    for (const side of [-1, 1]) {
      for (const [gapOut, s0] of rows) {
        const p = pointAt(t, i * STEP, side * (t.wall[i] + gapOut))
        if (!clear(p.x, p.z, gapOut - 6)) continue
        const s = s0 * (0.9 + r() * 0.45)
        const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, -0.1, p.z), new THREE.Quaternion().setFromAxisAngle(up, p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2)), new THREE.Vector3(s, s, s))
        const name = names[Math.floor(r() * names.length)]
        const list = spots.get(name) ?? Array.from({ length: CH }, () => [])
        list[Math.floor((i / t.n) * CH)].push(m)
        spots.set(name, list)
      }
    }
  }
  for (const [name, chunks] of spots) for (const list of chunks) if (list.length) g.add(instanced(name, list))
  for (const n of names) for (const m of modelMaterials(n)) patchWindows(m)
  return g
}

/** dinding samping & alas ruas layang, supaya jalan tidak tampak seperti pita tipis dari bawah */
function fascia(t: Track, mat: THREE.Material) {
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 0; i < t.n; i++) {
    const j = (i + 1) % t.n
    if (t.py[i] < 1 && t.py[j] < 1) continue
    for (const side of [-1, 1]) {
      const a = pointAt(t, i * STEP, side * (t.wall[i] + 0.7))
      const b = pointAt(t, j * STEP, side * (t.wall[j] + 0.7))
      const d = 1.6
      const quad = [[a.x, a.y, a.z], [a.x, a.y - d, a.z], [b.x, b.y, b.z], [a.x, a.y - d, a.z], [b.x, b.y - d, b.z], [b.x, b.y, b.z]]
      for (const v of quad) {
        pos.push(...v)
        uv.push((i * STEP) / 6, v[1] / 6)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  const m = (mat as THREE.MeshStandardMaterial).clone()
  m.side = THREE.DoubleSide
  return new THREE.Mesh(geo, m)
}

export function trackside(t: Track, theme: Theme, recipe: Recipe, tier: Tier) {
  return recipe.fence === 'jersey' ? kotaSide(t, theme, tier) : alamSide(t, recipe, tier)
}

/** gerbang start/finish dengan 5 lampu hitung mundur */
export function gantry(t: Track, theme: Theme, recipe: Recipe, tier: Tier) {
  const g = new THREE.Group()
  const p = pointAt(t, 0, 0)
  g.position.set(p.x, p.y, p.z)
  g.rotation.y = p.yaw
  const W = t.hw[0] * 2 + 6
  const { gate } = recipe
  const kota = recipe.fence === 'jersey'
  const steel = gate.tex ? textured(gate.tex, gate.color, tier, 0.85) : new THREE.MeshStandardMaterial({ color: gate.color, metalness: 0.6, roughness: 0.35 })
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(gate.round ? new THREE.CylinderGeometry(0.55, 0.75, 12, 10) : new THREE.BoxGeometry(1.4, 12, 1.4), steel)
    leg.position.set((s * W) / 2, 6, 0)
    leg.castShadow = true
    g.add(leg)
    if (gate.prop) {
      const board = placed(gate.prop)
      board.position.set((s * (W + 3.4)) / 2, 0, 0.6)
      board.rotation.y = s * 0.5
      board.scale.setScalar(2)
      g.add(board)
    }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 3, 1.6), steel)
  beam.position.y = 12.5
  beam.castShadow = true
  g.add(beam)
  if (kota) {
    const bar = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.curb[0]).multiplyScalar(2.4), toneMapped: false })
    const bar2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.curb[1]).multiplyScalar(2.4), toneMapped: false })
    for (const s of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 12, 1.5), s > 0 ? bar : bar2)
      strip.position.set((s * W) / 2 - s * 0.75, 6, 0)
      g.add(strip)
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.22, 1.7), bar)
    top.position.y = 14.1
    const low = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.22, 1.7), bar2)
    low.position.y = 10.9
    g.add(top, low)
  }
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.7, 2.4),
    new THREE.MeshStandardMaterial({ map: banner('START · FINISH', theme.curb[0], '#fff4fa'), roughness: 0.5 }),
  )
  label.position.set(0, 12.5, -0.82)
  label.rotation.y = Math.PI
  g.add(label)
  const label2 = label.clone()
  label2.position.z = 0.82
  label2.rotation.y = 0
  g.add(label2)
  // lampu: merah menyala satu per satu, hijau saat GO
  const lights: THREE.MeshStandardMaterial[] = []
  for (let k = 0; k < 5; k++) {
    const mat = new THREE.MeshStandardMaterial({ color: '#2a0a0a', emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0, roughness: 0.3 })
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), mat)
    bulb.rotation.x = Math.PI / 2
    bulb.position.set((k - 2) * 1.6, 10.4, -0.9)
    g.add(bulb)
    lights.push(mat)
  }
  // kotak-kotak hitam putih di aspal
  const checker = canvasTex(64, 16, (c) => {
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 4; y++) {
        c.fillStyle = (x + y) % 2 ? '#121212' : '#f4f4f8'
        c.fillRect(x * 4, y * 4, 4, 4)
      }
  }, false)
  checker.magFilter = THREE.NearestFilter
  const line = new THREE.Mesh(new THREE.PlaneGeometry(t.hw[0] * 2, 4), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 }))
  line.rotation.x = -Math.PI / 2
  line.position.y = 0.09
  line.receiveShadow = true
  g.add(line)
  return { group: g, lights }
}

/** tribun di kedua sisi lurusan start, berisi penonton yang bergoyang */
export function grandstands(t: Track, theme: Theme, tier: Tier) {
  const g = new THREE.Group()
  const off = t.wall[0] + 6
  const seat = new THREE.MeshStandardMaterial({ color: '#d8d8e4', roughness: 0.8 })
  const roof = new THREE.MeshStandardMaterial({ color: theme.curb[0], roughness: 0.5 })
  const crowd: THREE.Matrix4[] = []
  const colors: number[] = []
  const r = seeded(99)
  const palette = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c', '#fff4fa'].map((h) => new THREE.Color(h))
  const L = 70
  for (const side of [-1, 1]) {
    for (const s0 of [-60, 60]) {
      const p = pointAt(t, s0, side * off)
      const stand = new THREE.Group()
      stand.position.set(p.x, p.y, p.z)
      stand.rotation.y = p.yaw + (side > 0 ? Math.PI / 2 : -Math.PI / 2)
      for (let row = 0; row < 5; row++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(L, 1.2, 2.2), seat)
        step.position.set(0, 0.6 + row * 1.2, row * 2.2)
        step.castShadow = step.receiveShadow = true
        stand.add(step)
        for (let k = 0; k < (tier.q === 'low' ? 18 : 40); k++) {
          const lx = (r() - 0.5) * (L - 2)
          const v = new THREE.Vector3(lx, 1.2 + row * 1.2 + 0.7, row * 2.2 - 0.3)
          stand.updateMatrixWorld(true)
          crowd.push(new THREE.Matrix4().compose(v.applyMatrix4(stand.matrixWorld), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)))
          const c = palette[Math.floor(r() * palette.length)]
          colors.push(c.r, c.g, c.b)
        }
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(L + 2, 0.5, 12), roof)
      top.position.set(0, 9, 5)
      top.castShadow = true
      stand.add(top)
      for (const x of [-L / 2, 0, L / 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), roof)
        post.position.set(x, 4.5, 10.6)
        stand.add(post)
      }
      g.add(stand)
    }
  }
  // penonton: kapsul + kepala, bergoyang lewat shader (satu draw call)
  const body = new THREE.CapsuleGeometry(0.32, 0.6, 3, 8)
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 })
  const uTime = { value: 0 }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float time;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3;
         transformed.y += max(0.0, sin(time * 7.0 + ph)) * 0.35;
         transformed.x += sin(time * 3.0 + ph) * 0.08;`,
      )
  }
  const people = new THREE.InstancedMesh(body, mat, crowd.length)
  crowd.forEach((m, i) => people.setMatrixAt(i, m))
  people.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(colors), 3)
  g.add(people)
  return { group: g, time: uTime }
}
