import * as THREE from 'three'
import { boxSpots, hazardPose } from '../sim/hazards'
import { STEP, hwAt, pointAt, type Track } from '../sim/track'
import type { Ground, Theme } from '../tracks'
import { groundOf, WATER_Y } from './ground'
import { gantry, grandstands, trackside } from './kits'
import { instanced, modelMaterials, placed, variants, withVariants } from './models'
import type { Tier } from './quality'
import { recipeOf, type Recipe } from './recipe'
import { WATER_FRAG, WATER_VERT, patchRoad, patchTerrain, patchWind, worldClock } from './shaders'
import { bakeSky } from './sky'
import { canvasTex, seeded, tex } from './tex'

/** bahan tanah bertekstur dengan warna celup per tema */
function groundMat(g: Ground, tint: string, tier: Tier, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    map: tex(`${g}_diff.webp`),
    normalMap: tier.pbr ? tex(`${g}_nor.webp`, false) : null,
    normalScale: new THREE.Vector2(0.8, 0.8),
    color: new THREE.Color(tint),
    roughness: g === 'salju' ? 0.6 : 0.95,
    ...extra,
  })
}

// ---------------------------------------------------------------------------
// Jalan: aspal, marka, kerb timbul, runoff

type Off = number | ((i: number) => number)

/** pita mengikuti lintasan dari offset samping a ke b (meter, boleh per sampel), dengan UV dunia;
 *  atribut `side` -1..1 memberi tahu shader posisi melintang */
function ribbon(t: Track, a: Off, b: Off, lift: number, uvScale: number, every = 1, ramp = true, from = 0, to = t.n) {
  const n = t.n
  const A = typeof a === 'number' ? () => a : a
  const B = typeof b === 'number' ? () => b : b
  const pos: number[] = []
  const uv: number[] = []
  const side: number[] = []
  const idx: number[] = []
  let k = 0
  for (let i = from; i <= to; i += every) {
    const s = i % n
    const rx = -t.tz[s]
    const rz = t.tx[s]
    const y = t.py[s] + (ramp ? t.ramp[s] : 0) + lift
    const la = A(s)
    const lb = B(s)
    pos.push(t.px[s] + rx * la, y, t.pz[s] + rz * la, t.px[s] + rx * lb, y, t.pz[s] + rz * lb)
    const v = (i * STEP) / uvScale
    uv.push(la / uvScale, v, lb / uvScale, v)
    side.push(-1, 1)
    if (i + every <= to) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2)
    k++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function road(t: Track, theme: Theme, recipe: Recipe, tier: Tier): THREE.Object3D[] {
  const look = theme.look
  const r = recipe.road
  const city = recipe.fence === 'jersey'
  const hw = (i: number) => t.hw[i]
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: tex(`${r.tex}_diff.webp`),
    normalMap: tier.pbr ? tex(`${r.tex}_nor.webp`, false) : null,
    normalScale: new THREE.Vector2(r.normal ?? 1, r.normal ?? 1),
    // tekstur aspal Poly Haven sangat gelap: dicerahkan lewat warna > 1
    color: new THREE.Color(look.road).multiplyScalar(r.gain),
    roughness: r.roughness,
    // malam: aspal tampak diterangi lampu jalan tanpa lampu sungguhan yang mahal di HP
    emissive: new THREE.Color(look.dark ? '#d8c8ff' : '#000000'),
    emissiveIntensity: look.dark ? 0.07 : 0,
  })
  // Hemat tidak memakai tambalan, kecuali jalan yang teksturnya perlu dihaluskan
  if (tier.pbr || r.soften) patchRoad(asphaltMat, r, tier.q === 'high')
  const asphalt = new THREE.Mesh(ribbon(t, (i) => -hw(i), hw, 0.05, 9), asphaltMat)
  asphalt.receiveShadow = true

  // marka: garis tepi + garis tengah putus-putus; kota punya lajur tambahan di ruas lebar
  const line = new THREE.MeshStandardMaterial({ color: theme.roadLine, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })
  const edgeL = new THREE.Mesh(ribbon(t, (i) => -hw(i) + 0.6, (i) => -hw(i) + 1.1, 0.07, 9), line)
  const edgeR = new THREE.Mesh(ribbon(t, (i) => hw(i) - 1.1, (i) => hw(i) - 0.6, 0.07, 9), line)
  const dash: number[] = []
  const dashIdx: number[] = []
  let q = 0
  for (let i = 0; i < t.n; i += 5) {
    for (const lane of r.lines === 'kota' ? [-0.5, 0, 0.5] : [0]) {
      if (lane && t.hw[i] < 13) continue
      for (const j of [i, i + 2]) {
        const s = j % t.n
        const rx = -t.tz[s]
        const rz = t.tx[s]
        const y = t.py[s] + t.ramp[s] + 0.07
        const off = lane * t.hw[s]
        dash.push(t.px[s] + rx * (off - 0.25), y, t.pz[s] + rz * (off - 0.25), t.px[s] + rx * (off + 0.25), y, t.pz[s] + rz * (off + 0.25))
      }
      dashIdx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2)
      q += 4
    }
  }
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dash, 3))
  dg.setIndex(dashIdx)
  dg.computeVertexNormals()
  const center = new THREE.Mesh(dg, line)
  for (const m of [edgeL, edgeR, center]) m.receiveShadow = true
  const out: THREE.Object3D[] = [asphalt]
  if (r.lines !== 'tanpa') out.push(edgeL, edgeR)
  if (r.lines === 'kota' || r.lines === 'penuh') out.push(center)

  if (recipe.kerb) out.push(kerb(t, theme))

  if (city) {
    // trotoar paving timbul sampai pembatas, dengan bibir beton
    const walk = new THREE.MeshStandardMaterial({ map: tex('paving_diff.webp'), normalMap: tier.pbr ? tex('paving_nor.webp', false) : null, color: '#8d84aa', roughness: 0.6 })
    const lip = new THREE.MeshStandardMaterial({ color: '#b6b2c6', roughness: 0.7 })
    for (const s of [-1, 1]) {
      const inner = (i: number) => s * (t.hw[i] + 0.3)
      const outer = (i: number) => s * (t.wall[i] + 0.7)
      const a = new THREE.Mesh(ribbon(t, s > 0 ? inner : outer, s > 0 ? outer : inner, 0.24, 4, 1, false), walk)
      const b = new THREE.Mesh(ribbon(t, (i) => s * t.hw[i] - 0.15, (i) => s * t.hw[i] + 0.3, 0.26, 4, 1, false), lip)
      a.receiveShadow = b.receiveShadow = true
      out.push(a, b)
    }
    return out
  }

  // runoff di luar jalan; bahu sempit (jembatan) menghapusnya sama sekali
  const inner = recipe.kerb ? 2.3 : 0
  const outer = (i: number) => Math.max(inner + 0.01, Math.min(9, t.wall[i] - t.hw[i] - 5))
  const runMat = groundMat(look.runoff, look.runoff === look.ground ? look.tint : '#d8d0c8', tier)
  const runL = new THREE.Mesh(ribbon(t, (i) => -hw(i) - outer(i), (i) => -hw(i) - inner, 0.0, 7, 2, false), runMat)
  const runR = new THREE.Mesh(ribbon(t, (i) => hw(i) + inner, (i) => hw(i) + outer(i), 0.0, 7, 2, false), runMat)
  runL.receiveShadow = runR.receiveShadow = true
  out.push(runL, runR)

  // jembatan: lantai papan menutup jalan sampai pagar
  if (recipe.deck) {
    const deck = new THREE.MeshStandardMaterial({ map: tex(`${recipe.deck}_diff.webp`), normalMap: tier.pbr ? tex(`${recipe.deck}_nor.webp`, false) : null, color: '#e8d8bc', roughness: 0.85 })
    for (const [from, to] of t.def.bridges ?? []) {
      const m = new THREE.Mesh(ribbon(t, (i) => -t.wall[i] - 0.5, (i) => t.wall[i] + 0.5, 0.075, 6, 1, true, Math.floor(from * t.n), Math.ceil(to * t.n)), deck)
      m.receiveShadow = true
      out.push(m)
    }
  }
  return out
}

/** kerb timbul belang-belang di kedua tepi */
function kerb(t: Track, theme: Theme) {
  const cpos: number[] = []
  const ccol: number[] = []
  const ca = new THREE.Color(theme.curb[0])
  const cb = new THREE.Color(theme.curb[1])
  for (let i = 0; i < t.n; i++) {
    const i2 = (i + 1) % t.n
    const c = Math.floor(i / 2) % 2 ? ca : cb
    for (const side of [-1, 1]) {
      // profil: tepi jalan → punggung (naik 0.18) → tepi luar
      const prof = [
        [0, 0.06],
        [1.1, 0.24],
        [2.4, 0.04],
      ]
      for (let p = 0; p < 2; p++) {
        const quad = [i, i2].flatMap((s) => {
          const rx = -t.tz[s] * side
          const rz = t.tx[s] * side
          const y = t.py[s] + t.ramp[s]
          return [prof[p], prof[p + 1]].map(([l, h]) => [t.px[s] + rx * (t.hw[s] + l), y + h, t.pz[s] + rz * (t.hw[s] + l)])
        })
        const [a0, a1, b0, b1] = quad
        const tri = side > 0 ? [a0, b0, a1, a1, b0, b1] : [a0, a1, b0, a1, b1, b0]
        for (const v of tri) {
          cpos.push(...v)
          ccol.push(c.r, c.g, c.b)
        }
      }
    }
  }
  const cg = new THREE.BufferGeometry()
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3))
  cg.setAttribute('color', new THREE.Float32BufferAttribute(ccol, 3))
  cg.computeVertexNormals()
  const curb = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }))
  curb.receiveShadow = true
  return curb
}

// ---------------------------------------------------------------------------
// Tanah & langit

/** kotak item lebih jauh dari ini (meter) tidak digambar */
const BOX_VIEW = 260

/** landmark tema di posisi tetap, menghadap jalan; yang mengapung ikut ombak */
function landmarks(t: Track, height: Height) {
  const g = new THREE.Group()
  const floating: THREE.Object3D[] = []
  for (const l of t.def.landmarks ?? []) {
    const o = placed(l.model)
    if (l.arch) {
      // gerbang / terowongan melintang di atas jalan (model membentang sumbu X, dibuat untuk lebar `width`)
      const c = pointAt(t, l.at * t.length, 0)
      o.position.set(c.x, c.y, c.z)
      o.rotation.y = c.yaw + (l.turn ?? 0)
      o.scale.setScalar((l.scale ?? 1) * (hwAt(t, l.at * t.length) / t.half))
      g.add(o)
      continue
    }
    const p = pointAt(t, l.at * t.length, l.side * (hwAt(t, l.at * t.length) + l.dist))
    const y = l.float ? WATER_Y + 0.2 : height(p.x, p.z)
    o.position.set(p.x, y, p.z)
    // menghadap ke jalan (depan model = +Z)
    o.rotation.y = p.yaw + (l.side > 0 ? -Math.PI / 2 : Math.PI / 2) + (l.turn ?? 0)
    o.scale.setScalar(l.scale ?? 1)
    if (l.float) {
      o.userData.baseY = y
      floating.push(o)
    }
    g.add(o)
  }
  // bagian yang bergerak & titik asap
  const spin: THREE.Object3D[] = []
  const blink: THREE.Object3D[] = []
  const screens: THREE.Mesh[] = []
  const smoke: THREE.Vector3[] = []
  g.updateMatrixWorld(true)
  g.traverse((o) => {
    if (o.name === 'blades') spin.push(o)
    else if (o.name === 'light') blink.push(o)
    else if (o.name === 'screen') screens.push(o as THREE.Mesh)
    else if (/^smoke_/.test(o.name)) smoke.push(o.getWorldPosition(new THREE.Vector3()))
    else if (o.name === 'gunung') {
      const b = new THREE.Box3().setFromObject(o)
      smoke.push(new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2))
    }
  })
  return { group: g, floating, spin, blink, screens, smoke }
}

type Height = (x: number, z: number) => number

/** kawanan burung berputar di langit dekat garis start */
function birds(t: Track, model: string, n: number) {
  const g = new THREE.Group()
  const list: THREE.Object3D[] = []
  for (let k = 0; k < n; k++) {
    const b = placed(model)
    b.scale.setScalar(1.6)
    b.traverse((o) => (o.castShadow = false))
    g.add(b)
    list.push(b)
  }
  const c = pointAt(t, t.length * 0.02, 0)
  return { group: g, list, cx: c.x, cz: c.z, cy: c.y + 38 }
}

function terrain(t: Track, theme: Theme, recipe: Recipe, tier: Tier, height: Height) {
  const look = theme.look
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < t.n; i++) {
    minX = Math.min(minX, t.px[i]); maxX = Math.max(maxX, t.px[i])
    minZ = Math.min(minZ, t.pz[i]); maxZ = Math.max(maxZ, t.pz[i])
  }
  const pad = 420
  const w = maxX - minX + pad * 2
  const d = maxZ - minZ + pad * 2
  const flat = recipe.ground === 'kota'
  // bentuk bertepi tegas butuh kisi lebih rapat
  const sharp = recipe.ground === 'terasering' || recipe.ground === 'ngarai' || recipe.ground === 'gunung'
  const seg = flat ? 24 : tier.q === 'low' ? (sharp ? 130 : 90) : sharp ? 210 : 140
  const g = new THREE.PlaneGeometry(w, d, seg, seg)
  g.rotateX(-Math.PI / 2)
  g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  const p = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const col = new Float32Array(p.count * 3)
  const lava = theme.offroad === 'lava'
  for (let v = 0; v < p.count; v++) {
    const x = p.getX(v)
    const z = p.getZ(v)
    p.setY(v, height(x, z))
    // dunia: UV mengikuti meter supaya tekstur tidak melar
    uv.setXY(v, x / 9, z / 9)
    const n = 0.85 + 0.15 * Math.sin(x * 0.05 + z * 0.03) * Math.cos(z * 0.07)
    col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = n
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  const mat = groundMat(look.ground, look.tint, tier, {
    vertexColors: true,
    // grafis Hemat: retakan lava dari tekstur; selain itu aliran lava di shader
    emissive: lava && !tier.pbr ? new THREE.Color('#ff5a1a') : new THREE.Color('#000000'),
    emissiveMap: lava && !tier.pbr ? lavaTex() : null,
    emissiveIntensity: lava && !tier.pbr ? 1.3 : 0,
  })
  if (tier.pbr) {
    const low = recipe.low
    patchTerrain(mat, {
      ...recipe.terrain,
      low: low && { map: tex(`${low.tex}_diff.webp`)!, from: low.from, to: low.to, roughness: low.roughness },
      steep: recipe.steep ? (tex(`${recipe.steep}_diff.webp`) ?? undefined) : undefined,
      foamY: recipe.foam ? WATER_Y : undefined,
    })
  }
  const m = new THREE.Mesh(g, mat)
  m.receiveShadow = true
  return m
}

/** retakan lava bercabang (Voronoi kasar) untuk peta emisi tanah Kawah Berapi; offset-nya digeser pelan */
let lavaTexture: THREE.CanvasTexture | null = null
function lavaTex() {
  lavaTexture ??= canvasTex(256, 256, (c) => {
    const r = seeded(31)
    const pts = Array.from({ length: 26 }, () => [r() * 256, r() * 256])
    const img = c.createImageData(256, 256)
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        let d1 = 1e9
        let d2 = 1e9
        for (const [px, py] of pts)
          for (const ox of [-256, 0, 256])
            for (const oy of [-256, 0, 256]) {
              const d = (x - px - ox) ** 2 + (y - py - oy) ** 2
              if (d < d1) {
                d2 = d1
                d1 = d
              } else if (d < d2) d2 = d
            }
        const v = Math.max(0, 1 - (Math.sqrt(d2) - Math.sqrt(d1)) / 9)
        const i = (y * 256 + x) * 4
        img.data[i] = 40 + v * 215
        img.data[i + 1] = 10 + v * v * 160
        img.data[i + 2] = v * v * v * 40
        img.data[i + 3] = 255
      }
    c.putImageData(img, 0, 0)
  })
  return lavaTexture
}

/** laut / sungai: gelombang di vertex, shader di shaders.ts */
function water(color: string, y: number, size: number, skyTint: string, waveK: number, sunDir: THREE.Vector3, sun: string) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: worldClock,
      deep: { value: new THREE.Color(color).multiplyScalar(0.55) },
      shallow: { value: new THREE.Color(color).lerp(new THREE.Color('#bff6ff'), 0.45) },
      sky: { value: new THREE.Color(skyTint) },
      waveK: { value: waveK },
      sunDir: { value: sunDir },
      sunCol: { value: new THREE.Color(sun) },
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 80, 80), mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = y
  return m
}

/** awan kartun mengambang di kejauhan */
function clouds(t: Track, night: boolean) {
  const r = seeded(77)
  const parts: THREE.Matrix4[] = []
  const cx = t.px[0]
  const cz = t.pz[0]
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2
    const d = 700 + r() * 700
    const x = cx + Math.cos(a) * d
    const z = cz + Math.sin(a) * d
    const y = 160 + r() * 140
    for (let k = 0; k < 5; k++) {
      const s = 28 + r() * 30
      parts.push(new THREE.Matrix4().compose(new THREE.Vector3(x + (k - 2) * 34 + r() * 12, y + r() * 14, z + r() * 20), new THREE.Quaternion(), new THREE.Vector3(s * 1.3, s * 0.7, s)))
    }
  }
  const im = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshStandardMaterial({ color: night ? '#3a3560' : '#ffffff', roughness: 1, emissive: new THREE.Color(night ? '#1a1530' : '#ffffff'), emissiveIntensity: night ? 0.2 : 0.35, fog: false }),
    parts.length,
  )
  parts.forEach((m, i) => im.setMatrixAt(i, m))
  return im
}

// ---------------------------------------------------------------------------
// Prop tema, tersebar dan dipecah per wilayah supaya bisa di-cull

function props(t: Track, theme: Theme, tier: Tier, height: Height, sea: boolean, scatter: number) {
  const r = seeded(t.def.id.length * 97 + t.n)
  const group = new THREE.Group()
  const total = Math.round((t.length / 3.5) * tier.props * (tier.q === 'low' ? Math.min(scatter, 0.6) : scatter))
  const weights = theme.props
  const sum = weights.reduce((a, [, w]) => a + w, 0)
  const CH = tier.q === 'low' ? 8 : 16
  // nama model (varian) → wilayah → matriks
  const spots = new Map<string, THREE.Matrix4[][]>()
  for (let k = 0; k < total; k++) {
    const i = Math.floor(r() * t.n)
    const side = r() > 0.5 ? 1 : -1
    const lat = side * (t.hw[i] + 18 + r() ** 1.9 * 150)
    const p = pointAt(t, i * STEP, lat)
    let ok = true
    for (let j = 0; j < t.n && ok; j += 4) ok = (t.px[j] - p.x) ** 2 + (t.pz[j] - p.z) ** 2 >= (t.hw[j] + 16) ** 2
    if (!ok) continue
    const y = height(p.x, p.z)
    if (sea && y < WATER_Y + 0.5) continue
    let pick = r() * sum
    let name = weights[0][0]
    for (const [nm, w] of weights) {
      pick -= w
      if (pick < 0) {
        name = nm
        break
      }
    }
    const vs = variants(name)
    const model = vs.length ? vs[Math.floor(r() * vs.length)] : name
    const s = 0.75 + r() * 0.7
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, y - 0.1, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2), new THREE.Vector3(s, s, s))
    const chunk = Math.floor((i / t.n) * CH)
    const list = spots.get(model) ?? Array.from({ length: CH }, () => [])
    list[chunk].push(m)
    spots.set(model, list)
  }
  for (const [name, chunks] of spots) for (const list of chunks) if (list.length) group.add(instanced(name, list))
  return group
}

/** rumput, bunga, kerikil kecil di dekat jalan (dikurangi di grafis Hemat) */
function details(t: Track, theme: Theme, tier: Tier, height: Height, sea: boolean) {
  const g = new THREE.Group()
  const kinds = theme.look.ground === 'rumput' || theme.look.ground === 'hutan' ? ['rumput-kecil', 'bunga', 'pakis'] : theme.look.ground === 'pasir' ? ['kerikil-kecil'] : theme.look.ground === 'salju' ? ['kerikil-kecil'] : []
  const avail = kinds.filter((k) => variants(k).length)
  if (!avail.length || tier.detail <= 0) return g
  const r = seeded(4242)
  const count = Math.round((t.length / 2.2) * tier.detail)
  const CH = 8
  const buckets = new Map<string, THREE.Matrix4[][]>()
  for (let k = 0; k < count; k++) {
    const i = Math.floor(r() * t.n)
    const side = r() > 0.5 ? 1 : -1
    const lat = side * (t.hw[i] + 10 + r() * 40)
    const p = pointAt(t, i * STEP, lat)
    const y = height(p.x, p.z)
    if (sea && y < WATER_Y + 0.5) continue
    const vs = variants(avail[Math.floor(r() * avail.length)])
    const model = vs[Math.floor(r() * vs.length)]
    const s = 0.8 + r() * 0.8
    const list = buckets.get(model) ?? Array.from({ length: CH }, () => [])
    list[Math.floor((i / t.n) * CH)].push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, y - 0.05, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(s, s, s)))
    buckets.set(model, list)
  }
  for (const [name, chunks] of buckets) for (const list of chunks) if (list.length) g.add(instanced(name, list, false))
  return g
}

/** panel turbo (panah bergulir), zona grip, tanjakan */
function markings(t: Track, theme: Theme, recipe: Recipe) {
  const g = new THREE.Group()
  const decal = (s: number, lat: number, w: number, len: number, mat: THREE.Material, lift = 0.09) => {
    const p = pointAt(t, s, lat)
    const i = Math.round(s / STEP) % t.n
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat)
    m.rotation.order = 'YXZ'
    m.rotation.set(-Math.PI / 2, p.yaw, 0)
    m.position.set(p.x, p.y + t.ramp[(i + t.n) % t.n] + lift, p.z)
    m.receiveShadow = true
    g.add(m)
    return m
  }
  const arrow = canvasTex(64, 128, (c) => {
    const grd = c.createLinearGradient(0, 0, 0, 128)
    grd.addColorStop(0, '#ffcc1f')
    grd.addColorStop(1, '#ff37a6')
    c.fillStyle = '#ff8a1c'
    c.fillRect(0, 0, 64, 128)
    c.fillStyle = grd
    for (const y of [10, 52, 94]) {
      c.beginPath()
      c.moveTo(6, y + 26)
      c.lineTo(32, y)
      c.lineTo(58, y + 26)
      c.lineTo(46, y + 26)
      c.lineTo(32, y + 12)
      c.lineTo(18, y + 26)
      c.fill()
    }
  })
  const padMat = new THREE.MeshStandardMaterial({ map: arrow, emissive: new THREE.Color('#ff8a1c'), emissiveMap: arrow, emissiveIntensity: 0.9, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -3 })
  for (const [at, lane] of t.def.pads) decal(at * t.length, lane * hwAt(t, at * t.length) * 0.6, 7, 9, padMat)
  for (const h of t.def.hazards) {
    if (h.kind !== 'grip') continue
    const mat = new THREE.MeshStandardMaterial({ color: h.color, transparent: true, opacity: 0.85, roughness: h.grip < 0.6 ? 0.1 : 0.9, metalness: h.grip < 0.6 ? 0.2 : 0, polygonOffset: true, polygonOffsetFactor: -2 })
    for (let s = h.from * t.length; s < h.to * t.length; s += 8) decal(s, 0, hwAt(t, s) * 2 - 1, 8.4, mat, 0.08)
  }
  const rampMat = new THREE.MeshStandardMaterial({ color: theme.curb[0], roughness: 0.5 })
  const rampStripe = new THREE.MeshStandardMaterial({ color: theme.curb[1], roughness: 0.5 })
  for (const end of t.rampAt) {
    decal(end * STEP - 2, 0, t.hw[end] * 1.4, 4, rampMat, 0.1)
    decal(end * STEP - 7, 0, t.hw[end] * 1.4, 2, rampStripe, 0.1)
  }
  if (recipe.fence === 'jersey') crossingsDecals(t, g, decal)
  return { group: g, pad: arrow }
}

/** persimpangan kota: zebra cross di kedua sisi dan jalan samping tempat kendaraan melintas */
function crossingsDecals(t: Track, g: THREE.Group, decal: (s: number, lat: number, w: number, len: number, mat: THREE.Material, lift?: number) => THREE.Mesh) {
  const zebra = canvasTex(256, 32, (c) => {
    c.clearRect(0, 0, 256, 32)
    c.fillStyle = '#ece8f4'
    for (let x = 8; x < 256; x += 32) c.fillRect(x, 0, 16, 32)
  })
  const zebraMat = new THREE.MeshStandardMaterial({ map: zebra, transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3 })
  const lane = new THREE.MeshStandardMaterial({ map: tex('aspal-kota_diff.webp'), color: '#5e5c70', roughness: 0.7 })
  for (const h of t.def.hazards) {
    if (h.kind !== 'roller') continue
    const s = h.at * t.length
    const hw = hwAt(t, s)
    for (const d of [-13, 13]) decal(s + d, 0, hw * 2 - 2, 4.4, zebraMat, 0.09)
    const p = pointAt(t, s, 0)
    for (const side of [-1, 1]) {
      const c = pointAt(t, s, side * (hw + 60))
      const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 18), lane)
      m.rotation.order = 'YXZ'
      m.rotation.set(-Math.PI / 2, p.yaw + Math.PI / 2, 0)
      m.position.set(c.x, p.y + 0.29, c.z)
      m.receiveShadow = true
      g.add(m)
    }
  }
}

// ---------------------------------------------------------------------------

/** hewan berkaki empat berjalan menyeberang: kaki melangkah bergantian, kepala mengangguk, ekor berkibas */
function animateWalker(hz: World['hazards'][number], sec: number) {
  const step = sec * 6
  const legs: [string, number][] = [['leg_F_L', 0], ['leg_B_R', 0], ['leg_F_R', Math.PI], ['leg_B_L', Math.PI]]
  for (const [n, ph] of legs) if (hz.parts[n]) hz.parts[n].rotation.x = Math.sin(step + ph) * 0.45
  if (hz.parts.head) hz.parts.head.rotation.x = Math.sin(step * 2) * 0.06
  if (hz.parts.tail) hz.parts.tail.rotation.z = Math.sin(sec * 5) * 0.5
}

/** perbesaran tampilan rintangan supaya terbaca di jalan selebar 30 m */
const HAZARD_SCALE: Record<string, number> = { kepiting: 1.5, kerang: 1.6, 'kelapa-ayun': 1.4 }

/** kepiting jalan menyamping menghadap kart yang datang: kaki bergantian, capit mengatup, mata bergoyang */
function animateCrab(hz: World['hazards'][number], t: Track, at: number, sec: number) {
  hz.mesh.rotation.y = pointAt(t, at * t.length, 0).yaw + Math.PI
  for (let k = 1; k <= 3; k++) {
    for (const [side, s] of [['L', 1], ['R', -1]] as const) {
      const leg = hz.parts[`leg_${side}${k}`]
      if (leg) leg.rotation.z = s * Math.sin(sec * 14 + k * 2.1 + (side === 'L' ? 0 : Math.PI)) * 0.35
    }
  }
  for (const [side, s] of [['L', 1], ['R', -1]] as const) {
    const claw = hz.parts[`claw_${side}`]
    if (claw) claw.rotation.x = Math.sin(sec * 3 + s) * 0.25 - 0.1
    const pin = hz.parts[`pincer_${side}`]
    if (pin) pin.rotation.x = Math.max(0, Math.sin(sec * 6 + s)) * 0.6
  }
  const eyes = hz.parts.eyes
  if (eyes) eyes.rotation.z = Math.sin(sec * 2.3) * 0.25
}

export type World = {
  scene: THREE.Scene
  sun: THREE.DirectionalLight
  boxes: { id: number; x: number; y: number; z: number; hiddenUntil: number }[]
  hazards: { mesh: THREE.Object3D; shadow?: THREE.Mesh; index: number; parts: Record<string, THREE.Object3D> }[]
  /** 0..5 lampu merah menyala, 6 = hijau (GO) */
  setLights: (n: number) => void
  update: (time: number, now: number, view: THREE.Vector3) => void
  setTier: (tier: Tier) => void
  /** buat ulang pencahayaan langit setelah context WebGL kembali */
  restore: (renderer: THREE.WebGLRenderer) => void
  dispose: () => void
  /** titik asap landmark (cerobong pabrik, kawah gunung) */
  smoke: THREE.Vector3[]
}

export async function buildWorld(t: Track, tier: Tier, renderer: THREE.WebGLRenderer): Promise<World> {
  const th = t.def.theme
  const look = th.look
  const recipe = recipeOf(t.def)
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(th.fog, th.fogNear * 2 * tier.far, th.fogFar * 2.4 * tier.far)
  const sunDir = new THREE.Vector3(120, 220, 80).normalize()

  // langit digambar sendiri lalu di-bake, jadi latar + cahaya lingkungan (pantulan PBR)
  let cube: THREE.WebGLCubeRenderTarget | null = null
  const bakeEnv = (r: THREE.WebGLRenderer) => {
    const pmrem = new THREE.PMREMGenerator(r)
    scene.environment?.dispose()
    cube?.dispose()
    cube = bakeSky(r, recipe.sky, sunDir, tier.q === 'low' ? 256 : 512, tier.post)
    scene.background = cube.texture
    scene.environment = pmrem.fromCubemap(cube.texture).texture
    pmrem.dispose()
  }
  bakeEnv(renderer)
  scene.environmentIntensity = recipe.env

  scene.add(new THREE.HemisphereLight(th.ambient, th.ground, look.dark ? 0.45 : th.night ? 1.0 : 0.35))
  const sun = new THREE.DirectionalLight(th.sun, th.sunPower * (th.night ? 1 : 1.5))
  sun.position.set(120, 220, 80)
  if (tier.shadow) {
    sun.castShadow = true
    sun.shadow.mapSize.set(tier.shadow, tier.shadow)
    const c = sun.shadow.camera
    c.left = c.bottom = -70
    c.right = c.top = 70
    c.near = 10
    c.far = 600
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.6
  }
  scene.add(sun, sun.target)

  const height = groundOf(t, recipe.ground)
  const sea = Boolean(look.water)
  const propGroup = props(t, th, tier, height, sea, recipe.scatter ?? 1)
  const detailGroup = details(t, th, tier, height, sea)
  scene.add(terrain(t, th, recipe, tier, height), ...road(t, th, recipe, tier), trackside(t, th, recipe, tier), propGroup, detailGroup)
  if (recipe.clouds) scene.add(clouds(t, th.night))
  // daun bergoyang hanya di grafis Tinggi
  if (tier.q === 'high') {
    for (const [name, h, push] of recipe.wind) for (const v of withVariants([name])) for (const m of modelMaterials(v)) patchWind(m, h, push)
  }
  const mk = markings(t, th, recipe)
  scene.add(mk.group)
  const gate = gantry(t, th, recipe, tier)
  scene.add(gate.group)
  const stands = recipe.stands ? grandstands(t, th, tier) : null
  if (stands) scene.add(stands.group)

  if (look.water) {
    const permen = t.def.id === 'permen'
    scene.add(water(look.water, WATER_Y, 9000, permen ? '#ffd0a0' : recipe.sky.horizon, permen ? 0.35 : 1, sunDir, th.sun))
  }
  const marks = landmarks(t, height)
  scene.add(marks.group)
  const flock = recipe.birds && variants('camar').length ? birds(t, 'camar', 7) : null
  if (flock) scene.add(flock.group)

  // kotak item: kubus kaca berbingkai pelangi + "?" 3D (scripts/blender/kart_items.py),
  // semua kotak dalam satu set InstancedMesh; matriksnya diperbarui tiap bingkai (putar, melayang, muncul lagi)
  const spots = boxSpots(t)
  const boxGroup = instanced('item-box', spots.map(() => new THREE.Matrix4()), false)
  // batas InstancedMesh dihitung sekali dari matriks awal; kotak yang bergerak tidak boleh di-cull dengannya
  boxGroup.traverse((o) => (o.frustumCulled = false))
  scene.add(boxGroup)
  const boxes = spots.map((b) => ({ ...b, hiddenUntil: 0 }))
  const boxMx = new THREE.Matrix4()
  const boxQ = new THREE.Quaternion()
  const boxE = new THREE.Euler()
  const boxPos = new THREE.Vector3()
  const boxScale = new THREE.Vector3()

  // rintangan
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#121212', transparent: true, opacity: 0.4, depthWrite: false })
  const hazards: World['hazards'] = []
  t.def.hazards.forEach((h, index) => {
    if (h.kind === 'grip') return
    const name = h.kind === 'bounce' ? 'jamur-pantul' : h.kind === 'drop' ? 'batu-jatuh' : h.model
    const mesh = placed(name)
    mesh.scale.setScalar(HAZARD_SCALE[name] ?? 1)
    if (h.kind === 'swing') {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 14, 6), new THREE.MeshStandardMaterial({ color: '#5a3e24', roughness: 0.9 }))
      rope.position.y = 7
      mesh.add(rope)
      const p = pointAt(t, h.at * t.length, 0)
      const steel = new THREE.MeshStandardMaterial({ color: th.wall, roughness: 0.5, metalness: 0.3 })
      const beam = new THREE.Mesh(new THREE.BoxGeometry(hwAt(t, h.at * t.length) * 2 + 8, 1, 1), steel)
      beam.position.set(p.x, p.y + 17, p.z)
      beam.rotation.y = p.yaw + Math.PI / 2
      beam.castShadow = true
      scene.add(beam)
      for (const side of [-1, 1]) {
        const pp = pointAt(t, h.at * t.length, side * (hwAt(t, h.at * t.length) + 4))
        const post = new THREE.Mesh(new THREE.BoxGeometry(1, 17, 1), steel)
        post.position.set(pp.x, pp.y + 8.5, pp.z)
        post.castShadow = true
        scene.add(post)
      }
    }
    scene.add(mesh)
    let shadow: THREE.Mesh | undefined
    if (h.kind === 'drop') {
      shadow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), shadowMat)
      shadow.rotation.x = -Math.PI / 2
      scene.add(shadow)
    }
    // bagian bernama untuk animasi (kaki & capit kepiting, dsb.)
    const parts: Record<string, THREE.Object3D> = {}
    mesh.traverse((o) => {
      if (/^(leg_|claw_|pincer_|eyes|tail|head|wing_)/.test(o.name)) parts[o.name] = o
    })
    hazards.push({ mesh, shadow, index, parts })
  })

  const setLights = (n: number) => {
    gate.lights.forEach((m, k) => {
      if (n >= 6) {
        m.emissive.set('#3aff6a')
        m.emissiveIntensity = 3
      } else {
        m.emissive.set('#ff2a2a')
        m.emissiveIntensity = k < n ? 3 : 0
      }
    })
  }

  const update = (time: number, now: number, view: THREE.Vector3) => {
    const sec = now / 1000
    worldClock.value = sec
    if (stands) stands.time.value = sec
    if (lavaTexture) lavaTexture.offset.set(Math.sin(sec * 0.05) * 0.2, sec * 0.01)
    for (const b of marks.spin) b.rotation.y = sec * 2.5
    for (const b of marks.blink) b.visible = Math.sin(sec * 4) > 0
    marks.screens.forEach((m, k) => (m.material as THREE.MeshStandardMaterial).emissive?.setHSL((sec * 0.12 + k * 0.3) % 1, 0.9, 0.5))
    for (const [k, o] of marks.floating.entries()) {
      o.position.y = (o.userData.baseY as number) + Math.sin(sec * 1.3 + k) * 0.35
      o.rotation.z = Math.sin(sec * 0.9 + k * 2) * 0.05
    }
    if (flock) {
      flock.list.forEach((b, k) => {
        const a = sec * 0.25 + (k / flock.list.length) * Math.PI * 2
        const r = 45 + (k % 3) * 12
        b.position.set(flock.cx + Math.cos(a) * r, flock.cy + Math.sin(sec * 1.7 + k) * 3 + k, flock.cz + Math.sin(a) * r)
        b.rotation.set(0, -a, Math.sin(sec * 6 + k) * 0.25)
      })
    }
    mk.pad.offset.y = -sec * 1.6
    // hanya kotak dekat kamera yang digambar: slot instance diisi berurutan
    let shown = 0
    boxes.forEach((b) => {
      if ((b.x - view.x) ** 2 + (b.z - view.z) ** 2 > BOX_VIEW ** 2) return
      // tumbuh lagi dengan efek "pop" setelah diambil
      const back = (now - b.hiddenUntil) / 350
      const s = now < b.hiddenUntil ? 0 : back >= 1 ? 1 : Math.sin(back * Math.PI * 0.75) * 1.25
      boxE.set(Math.sin(sec * 1.1 + b.id) * 0.35, sec * 1.4 + b.id, Math.cos(sec * 0.9 + b.id) * 0.2)
      boxMx.compose(boxPos.set(b.x, b.y + Math.sin(sec * 2 + b.id) * 0.3, b.z), boxQ.setFromEuler(boxE), boxScale.setScalar(Math.max(0.0001, s)))
      for (const im of boxGroup.children as THREE.InstancedMesh[]) im.setMatrixAt(shown, boxMx)
      shown++
    })
    for (const im of boxGroup.children as THREE.InstancedMesh[]) im.count = shown
    for (const im of boxGroup.children as THREE.InstancedMesh[]) im.instanceMatrix.needsUpdate = true
    for (const hz of hazards) {
      const h = t.def.hazards[hz.index]
      const p = hazardPose(t, h, time)
      if (!p) continue
      if (h.kind === 'swing') {
        hz.mesh.position.set(p.x, p.y + 3 + p.lift, p.z)
        hz.mesh.rotation.set(0, pointAt(t, h.at * t.length, 0).yaw, -p.yaw)
      } else if (h.kind === 'drop') {
        hz.mesh.visible = p.lift > -50
        hz.mesh.position.set(p.x, p.y + 2.6 + Math.max(0, p.lift), p.z)
        hz.mesh.rotation.set(time * 2, time, 0)
        if (hz.shadow) {
          hz.shadow.position.set(p.x, p.y + 0.2, p.z)
          const ph = (time % h.period) / h.period
          hz.shadow.visible = ph > 0.35 && ph < 0.86
          hz.shadow.scale.setScalar(0.4 + Math.min(1, (ph - 0.35) / 0.4) * 0.6)
        }
      } else if (h.kind === 'bounce') {
        hz.mesh.position.set(p.x, p.y, p.z)
        hz.mesh.scale.set(1, 1 + Math.sin(sec * 5) * 0.08, 1)
      } else {
        hz.mesh.position.set(p.x, p.y, p.z)
        hz.mesh.rotation.y = p.yaw
        if (h.kind === 'roller' && (h.model.startsWith('bola') || h.model === 'gulungan-semak')) hz.mesh.rotation.z = time * 3
        if (h.kind === 'roller' && h.model === 'kepiting') animateCrab(hz, t, h.at, sec)
        if (h.kind === 'roller' && h.model === 'kerbau') animateWalker(hz, sec)
        if (h.kind === 'roller' && h.model === 'kumbang') for (const w of ['wing_L', 'wing_R']) if (hz.parts[w]) hz.parts[w].rotation.y = Math.sin(sec * 40) * 0.5 * (w === 'wing_L' ? 1 : -1)
      }
    }
  }
  // turun tingkat grafis saat balapan: prop dikurangi dari yang sudah dibangun, jarak pandang ikut pendek
  const setTier = (next: Tier) => {
    thin(propGroup, next.props / tier.props)
    thin(detailGroup, next.detail / tier.detail)
    const fog = scene.fog as THREE.Fog
    fog.near = th.fogNear * 2 * next.far
    fog.far = th.fogFar * 2.4 * next.far
  }

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry?.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mt of mats) {
        for (const v of Object.values(mt ?? {})) if (v instanceof THREE.Texture) v.dispose()
        mt?.dispose()
      }
    })
    scene.environment?.dispose()
    cube?.dispose()
  }

  return { scene, sun, boxes, hazards, setLights, update, setTier, restore: bakeEnv, dispose, smoke: marks.smoke }
}

/** tampilkan sebagian salinan saja; urutan matriksnya acak, jadi penjarangannya merata */
function thin(group: THREE.Group, share: number) {
  group.traverse((o) => {
    const m = o as THREE.InstancedMesh
    if (m.isInstancedMesh) m.count = Math.ceil((m.userData.full as number) * Math.min(1, share))
  })
}
