import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { boxSpots, hazardPose } from '../sim/hazards'
import { STEP, curvature, pointAt, type Track } from '../sim/track'
import type { Ground, Theme } from '../tracks'
import { instanced, placed, variants } from './models'
import type { Tier } from './quality'

/** angka acak dengan seed untuk penempatan (sama di semua HP) */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const TEX = import.meta.glob('/src/assets/kart/tex/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const texUrl = (name: string) => TEX[`/src/assets/kart/tex/${name}`]
const texLoader = new THREE.TextureLoader()
const texCache = new Map<string, THREE.Texture>()

/** tekstur berulang (diffuse sRGB, normal linear) */
function tex(name: string, color = true): THREE.Texture | null {
  const url = texUrl(name)
  if (!url) return null
  let t = texCache.get(name)
  if (!t) {
    t = texLoader.load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    if (color) t.colorSpace = THREE.SRGBColorSpace
    texCache.set(name, t)
  }
  return t
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

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

/** pita mengikuti lintasan dari offset samping a ke b (meter), dengan UV dunia */
function ribbon(t: Track, a: number, b: number, lift: number, uvScale: number, every = 1, ramp = true) {
  const n = t.n
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  let k = 0
  for (let i = 0; i <= n; i += every) {
    const s = i % n
    const rx = -t.tz[s]
    const rz = t.tx[s]
    const y = t.py[s] + (ramp ? t.ramp[s] : 0) + lift
    pos.push(t.px[s] + rx * a, y, t.pz[s] + rz * a, t.px[s] + rx * b, y, t.pz[s] + rz * b)
    const v = (i * STEP) / uvScale
    uv.push(a / uvScale, v, b / uvScale, v)
    if (i + every <= n) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2)
    k++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function road(t: Track, theme: Theme, tier: Tier): THREE.Object3D[] {
  const look = theme.look
  const asphalt = new THREE.Mesh(
    ribbon(t, -t.half, t.half, 0.05, 9),
    new THREE.MeshStandardMaterial({
      map: tex('aspal_diff.webp'),
      normalMap: tier.pbr ? tex('aspal_nor.webp', false) : null,
      // tekstur aspal Poly Haven sangat gelap: dicerahkan lewat warna > 1
      color: new THREE.Color(look.road).multiplyScalar(3.6),
      roughness: 0.82,
    }),
  )
  asphalt.receiveShadow = true

  // marka: garis tepi putih + garis tengah putus-putus
  const line = new THREE.MeshStandardMaterial({ color: theme.roadLine, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })
  const edgeL = new THREE.Mesh(ribbon(t, -t.half + 0.6, -t.half + 1.1, 0.07, 9), line)
  const edgeR = new THREE.Mesh(ribbon(t, t.half - 1.1, t.half - 0.6, 0.07, 9), line)
  const dash: number[] = []
  const dashIdx: number[] = []
  let q = 0
  for (let i = 0; i < t.n; i += 5) {
    for (const j of [i, i + 2]) {
      const s = j % t.n
      const rx = -t.tz[s]
      const rz = t.tx[s]
      const y = t.py[s] + t.ramp[s] + 0.07
      dash.push(t.px[s] - rx * 0.25, y, t.pz[s] - rz * 0.25, t.px[s] + rx * 0.25, y, t.pz[s] + rz * 0.25)
    }
    dashIdx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2)
    q += 4
  }
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dash, 3))
  dg.setIndex(dashIdx)
  dg.computeVertexNormals()
  const center = new THREE.Mesh(dg, line)
  for (const m of [edgeL, edgeR, center]) m.receiveShadow = true

  // kerb timbul belang-belang di kedua tepi
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
        [t.half, 0.06],
        [t.half + 1.1, 0.24],
        [t.half + 2.4, 0.04],
      ]
      for (let p = 0; p < 2; p++) {
        const quad = [i, i2].flatMap((s) => {
          const rx = -t.tz[s] * side
          const rz = t.tx[s] * side
          const y = t.py[s] + t.ramp[s]
          return [prof[p], prof[p + 1]].map(([l, h]) => [t.px[s] + rx * l, y + h, t.pz[s] + rz * l])
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

  // runoff kerikil/pasir di luar kerb
  const runMat = groundMat(look.runoff, look.runoff === look.ground ? look.tint : '#d8d0c8', tier)
  const runL = new THREE.Mesh(ribbon(t, -t.half - 9, -t.half - 2.3, 0.0, 7, 2, false), runMat)
  const runR = new THREE.Mesh(ribbon(t, t.half + 2.3, t.half + 9, 0.0, 7, 2, false), runMat)
  runL.receiveShadow = runR.receiveShadow = true
  return [asphalt, edgeL, edgeR, center, curb, runL, runR]
}

// ---------------------------------------------------------------------------
// Tanah & langit

/** tinggi tanah di (x, z): bahu jalan rata, lalu bukit / turun ke laut / ke lava menjauhi jalan */
export function heightAt(t: Track, theme: Theme, x: number, z: number): number {
  let bd = Infinity
  let by = 0
  for (let i = 0; i < t.n; i += 3) {
    const dd = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
    if (dd < bd) {
      bd = dd
      by = t.py[i]
    }
  }
  const lava = theme.offroad === 'lava'
  const sea = Boolean(theme.look.water) && t.def.id === 'pantai'
  const off = Math.max(0, Math.sqrt(bd) - (t.half + (lava ? 3 : 9)))
  let h: number
  if (lava) h = -Math.min(off, 1.5) * 4
  else if (sea) h = -Math.min(off * 0.06, 9) + Math.sin(x * 0.02) * Math.min(off * 0.02, 2)
  else h = Math.sin(x * 0.011) * Math.cos(z * 0.013) * Math.min(off * 0.14, 26) + Math.sin(x * 0.031 + z * 0.02) * Math.min(off * 0.04, 5)
  return by - 0.15 + h
}

const WATER_Y = -2.6

/** landmark tema di posisi tetap, menghadap jalan; yang mengapung ikut ombak */
function landmarks(t: Track, theme: Theme) {
  const g = new THREE.Group()
  const floating: THREE.Object3D[] = []
  for (const l of t.def.landmarks ?? []) {
    const p = pointAt(t, l.at * t.length, l.side * (t.half + l.dist))
    const o = placed(l.model)
    const y = l.float ? WATER_Y + 0.2 : heightAt(t, theme, p.x, p.z)
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
  return { group: g, floating }
}

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

function terrain(t: Track, theme: Theme, tier: Tier) {
  const look = theme.look
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < t.n; i++) {
    minX = Math.min(minX, t.px[i]); maxX = Math.max(maxX, t.px[i])
    minZ = Math.min(minZ, t.pz[i]); maxZ = Math.max(maxZ, t.pz[i])
  }
  const pad = 420
  const w = maxX - minX + pad * 2
  const d = maxZ - minZ + pad * 2
  const seg = tier.q === 'low' ? 90 : 140
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
    p.setY(v, heightAt(t, theme, x, z))
    // dunia: UV mengikuti meter supaya tekstur tidak melar
    uv.setXY(v, x / 9, z / 9)
    const n = 0.85 + 0.15 * Math.sin(x * 0.05 + z * 0.03) * Math.cos(z * 0.07)
    col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = n
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  const mat = groundMat(look.ground, look.tint, tier, {
    vertexColors: true,
    emissive: lava ? new THREE.Color('#ff3a0a') : new THREE.Color('#000000'),
    emissiveIntensity: lava ? 0.9 : 0,
  })
  const m = new THREE.Mesh(g, mat)
  m.receiveShadow = true
  return m
}

/** laut / sungai: gelombang di shader + pantulan langit (fresnel) + kilau */
function water(color: string, y: number, size: number) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      deep: { value: new THREE.Color(color).multiplyScalar(0.55) },
      shallow: { value: new THREE.Color(color).lerp(new THREE.Color('#bff6ff'), 0.45) },
      sky: { value: new THREE.Color('#e8f8ff') },
    },
    vertexShader: `
      uniform float time; varying vec3 wp; varying float wave;
      void main(){
        vec3 p = position;
        vec4 w = modelMatrix * vec4(p,1.0);
        wave = sin(w.x*0.06 + time*1.3)*0.5 + sin(w.z*0.05 - time*1.1)*0.5;
        w.y += wave * 0.6;
        wp = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sky;
      varying vec3 wp; varying float wave;
      void main(){
        vec3 v = normalize(cameraPosition - wp);
        float fres = pow(1.0 - max(v.y, 0.0), 3.0);
        float ripple = sin(wp.x*0.35 + time*2.0) * sin(wp.z*0.31 - time*1.7);
        vec3 c = mix(deep, shallow, 0.5 + 0.5*wave);
        c = mix(c, sky, fres*0.55);
        c += smoothstep(0.82, 1.0, ripple) * 0.35;
        gl_FragColor = vec4(c, 0.92);
        #include <colorspace_fragment>
      }`,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 80, 80), mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = y
  return { mesh: m, mat }
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
// Perlengkapan sirkuit: pembatas, ban, chevron, gerbang, tribun, spanduk

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

function trackside(t: Track, theme: Theme) {
  const g = new THREE.Group()
  const lava = theme.offroad === 'lava'
  const off = t.half + (lava ? 8 : 14)
  const r = seeded(t.n * 13)

  // pembatas beton bergaris di garis dinding fisik
  const every = 3
  const wallGeo = new THREE.BoxGeometry(1.1, 1.3, STEP * every + 0.2)
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f4f4f8', roughness: 0.7 })
  const stripeGeo = new THREE.BoxGeometry(1.14, 0.42, STEP * every + 0.22)
  const stripeMat = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.5 })
  const mats: THREE.Matrix4[] = []
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < t.n; i += every) {
    q.setFromAxisAngle(up, Math.atan2(t.tx[i], t.tz[i]))
    for (const side of [-1, 1]) {
      const p = pointAt(t, i * STEP, side * off)
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + 0.5, p.z), q.clone(), new THREE.Vector3(1, 1, 1)))
    }
  }
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, mats.length)
  const stripes = new THREE.InstancedMesh(stripeGeo, stripeMat, mats.length)
  mats.forEach((m, i) => {
    walls.setMatrixAt(i, m)
    stripes.setMatrixAt(i, m)
  })
  walls.castShadow = walls.receiveShadow = true
  g.add(walls, stripes)

  // tumpukan ban & papan chevron di sisi luar tikungan tajam
  const tireMats: THREE.Matrix4[] = []
  const signL: THREE.Matrix4[] = []
  const signR: THREE.Matrix4[] = []
  let lastSign = -999
  for (let i = 0; i < t.n; i += 2) {
    const c = curvature(t, i, 6)
    if (Math.abs(c) < 0.02) continue
    // sisi luar: belok kanan (c > 0) → luar di kiri
    const side = c > 0 ? -1 : 1
    for (let k = 0; k < 3; k++) {
      const p = pointAt(t, i * STEP + k * 0.9, side * (off - 1.2))
      tireMats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + 0.3 + (k % 2) * 0.55, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)))
    }
    if (i - lastSign > 25) {
      lastSign = i
      // papan menghadap pengemudi yang datang, sedikit sebelum tikungan
      const p = pointAt(t, i * STEP - 30, side * (t.half + 6))
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(up, p.yaw + Math.PI), new THREE.Vector3(3, 3, 3))
      ;(c > 0 ? signR : signL).push(m)
    }
  }
  if (tireMats.length) {
    const tire = new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.25, 8, 14), new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.9 }), tireMats.length)
    tireMats.forEach((m, i) => tire.setMatrixAt(i, m))
    tire.castShadow = true
    g.add(tire)
  }
  if (signL.length && variants('kit-arah-kiri').length) g.add(instanced('kit-arah-kiri', signL))
  if (signR.length && variants('kit-arah-kanan').length) g.add(instanced('kit-arah-kanan', signR))

  // spanduk sponsor menempel di dinding sepanjang lurusan
  const bannerMats = SPONSORS.map((s, i) => new THREE.MeshStandardMaterial({ map: banner(s, [theme.curb[0], '#121212', theme.wall, '#2f7bff'][i % 4], '#fff4fa'), roughness: 0.6 }))
  const bannerGeo = new THREE.PlaneGeometry(10, 1.9)
  let lastBanner = -999
  for (let i = 0; i < t.n; i += 4) {
    if (Math.abs(curvature(t, i, 10)) > 0.006 || i - lastBanner < 30) continue
    lastBanner = i
    for (const side of [-1, 1]) {
      const p = pointAt(t, i * STEP, side * (off - 0.6))
      const b = new THREE.Mesh(bannerGeo, bannerMats[Math.floor(r() * bannerMats.length)])
      b.position.set(p.x, p.y + 1.6, p.z)
      b.rotation.y = p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2)
      g.add(b)
    }
  }

  // bendera warna-warni di tiang sepanjang dinding
  if (variants('kit-bendera').length) {
    const flags: THREE.Matrix4[] = []
    for (let i = 10; i < t.n; i += 22) {
      for (const side of [-1, 1]) {
        const p = pointAt(t, i * STEP, side * (off + 2))
        flags.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(up, r() * Math.PI * 2), new THREE.Vector3(2.4, 2.4, 2.4)))
      }
    }
    g.add(instanced('kit-bendera', flags))
  }
  return g
}

/** gerbang start/finish dengan 5 lampu hitung mundur */
function gantry(t: Track, theme: Theme) {
  const g = new THREE.Group()
  const p = pointAt(t, 0, 0)
  g.position.set(p.x, p.y, p.z)
  g.rotation.y = p.yaw
  const W = t.half * 2 + 6
  const steel = new THREE.MeshStandardMaterial({ color: '#2a2a34', metalness: 0.6, roughness: 0.35 })
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 12, 1.4), steel)
    leg.position.set((s * W) / 2, 6, 0)
    leg.castShadow = true
    g.add(leg)
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 3, 1.6), steel)
  beam.position.y = 12.5
  beam.castShadow = true
  g.add(beam)
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
  const line = new THREE.Mesh(new THREE.PlaneGeometry(t.half * 2, 4), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 }))
  line.rotation.x = -Math.PI / 2
  line.position.y = 0.09
  line.receiveShadow = true
  g.add(line)
  return { group: g, lights }
}

/** tribun di kedua sisi lurusan start, berisi penonton yang bergoyang */
function grandstands(t: Track, theme: Theme, tier: Tier) {
  const g = new THREE.Group()
  const off = t.half + 20
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

// ---------------------------------------------------------------------------
// Prop tema, tersebar dan dipecah per wilayah supaya bisa di-cull

function props(t: Track, theme: Theme, tier: Tier) {
  const r = seeded(t.def.id.length * 97 + t.n)
  const group = new THREE.Group()
  const total = Math.round((t.length / 7) * (0.55 + tier.detail * 0.45))
  const weights = theme.props
  const sum = weights.reduce((a, [, w]) => a + w, 0)
  const CH = 8
  // nama model (varian) → wilayah → matriks
  const spots = new Map<string, THREE.Matrix4[][]>()
  const minGap = (t.half + 16) ** 2
  for (let k = 0; k < total; k++) {
    const i = Math.floor(r() * t.n)
    const side = r() > 0.5 ? 1 : -1
    const lat = side * (t.half + 20 + r() ** 1.6 * 160)
    const p = pointAt(t, i * STEP, lat)
    let ok = true
    for (let j = 0; j < t.n && ok; j += 4) ok = (t.px[j] - p.x) ** 2 + (t.pz[j] - p.z) ** 2 >= minGap
    if (!ok) continue
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
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.3 - Math.max(0, Math.abs(lat) - t.half - 9) * 0.02, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2), new THREE.Vector3(s, s, s))
    const chunk = Math.floor((i / t.n) * CH)
    const list = spots.get(model) ?? Array.from({ length: CH }, () => [])
    list[chunk].push(m)
    spots.set(model, list)
  }
  for (const [name, chunks] of spots) for (const list of chunks) if (list.length) group.add(instanced(name, list))
  return group
}

/** rumput, bunga, kerikil kecil di dekat jalan (dikurangi di grafis Hemat) */
function details(t: Track, theme: Theme, tier: Tier) {
  const g = new THREE.Group()
  const kinds = theme.look.ground === 'rumput' ? ['rumput-kecil', 'bunga', 'pakis'] : theme.look.ground === 'pasir' ? ['kerikil-kecil'] : theme.look.ground === 'salju' ? ['kerikil-kecil'] : []
  const avail = kinds.filter((k) => variants(k).length)
  if (!avail.length || tier.detail <= 0) return g
  const r = seeded(4242)
  const count = Math.round((t.length / 2.2) * tier.detail)
  const CH = 8
  const buckets = new Map<string, THREE.Matrix4[][]>()
  for (let k = 0; k < count; k++) {
    const i = Math.floor(r() * t.n)
    const side = r() > 0.5 ? 1 : -1
    const lat = side * (t.half + 10 + r() * 40)
    const p = pointAt(t, i * STEP, lat)
    const vs = variants(avail[Math.floor(r() * avail.length)])
    const model = vs[Math.floor(r() * vs.length)]
    const s = 0.8 + r() * 0.8
    const list = buckets.get(model) ?? Array.from({ length: CH }, () => [])
    list[Math.floor((i / t.n) * CH)].push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.2, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(s, s, s)))
    buckets.set(model, list)
  }
  for (const [name, chunks] of buckets) for (const list of chunks) if (list.length) g.add(instanced(name, list, false))
  return g
}

/** panel turbo (panah bergulir), zona grip, tanjakan */
function markings(t: Track, theme: Theme) {
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
  for (const [at, lane] of t.def.pads) decal(at * t.length, lane * t.half * 0.6, 7, 9, padMat)
  for (const h of t.def.hazards) {
    if (h.kind !== 'grip') continue
    const mat = new THREE.MeshStandardMaterial({ color: h.color, transparent: true, opacity: 0.85, roughness: h.grip < 0.6 ? 0.1 : 0.9, metalness: h.grip < 0.6 ? 0.2 : 0, polygonOffset: true, polygonOffsetFactor: -2 })
    for (let s = h.from * t.length; s < h.to * t.length; s += 8) decal(s, 0, t.half * 2 - 1, 8.4, mat, 0.08)
  }
  const rampMat = new THREE.MeshStandardMaterial({ color: theme.curb[0], roughness: 0.5 })
  const rampStripe = new THREE.MeshStandardMaterial({ color: theme.curb[1], roughness: 0.5 })
  for (const end of t.rampAt) {
    decal(end * STEP - 2, 0, t.half * 1.4, 4, rampMat, 0.1)
    decal(end * STEP - 7, 0, t.half * 1.4, 2, rampStripe, 0.1)
  }
  return { group: g, pad: arrow }
}

// ---------------------------------------------------------------------------

export type World = {
  scene: THREE.Scene
  sun: THREE.DirectionalLight
  boxes: { id: number; x: number; y: number; z: number; mesh: THREE.Object3D; hiddenUntil: number }[]
  hazards: { mesh: THREE.Object3D; shadow?: THREE.Mesh; index: number }[]
  /** 0..5 lampu merah menyala, 6 = hijau (GO) */
  setLights: (n: number) => void
  update: (time: number, now: number) => void
}

const hdrLoader = new HDRLoader()

export async function buildWorld(t: Track, tier: Tier, renderer: THREE.WebGLRenderer): Promise<World> {
  const th = t.def.theme
  const look = th.look
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(th.fog, th.fogNear * 2 * tier.far, th.fogFar * 2.4 * tier.far)

  // langit HDRI: latar + cahaya lingkungan (pantulan PBR)
  try {
    const hdr = await hdrLoader.loadAsync(texUrl(`langit-${look.sky}.hdr`))
    hdr.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromEquirectangular(hdr).texture
    pmrem.dispose()
    scene.background = hdr
    scene.backgroundIntensity = look.sky === 'malam' ? 2.2 : 1
    scene.environmentIntensity = look.sky === 'malam' ? 1.2 : 0.55
  } catch {
    scene.background = new THREE.Color(th.sky[1])
  }

  scene.add(new THREE.HemisphereLight(th.ambient, th.ground, th.night ? 1.0 : 0.35))
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

  scene.add(terrain(t, th, tier), ...road(t, th, tier), trackside(t, th), props(t, th, tier), details(t, th, tier), clouds(t, th.night))
  const mk = markings(t, th)
  scene.add(mk.group)
  const gate = gantry(t, th)
  scene.add(gate.group)
  const stands = grandstands(t, th, tier)
  scene.add(stands.group)

  let waterMat: THREE.ShaderMaterial | null = null
  if (look.water && t.def.id === 'pantai') {
    const w = water(look.water, WATER_Y, 9000)
    waterMat = w.mat
    scene.add(w.mesh)
  }
  const marks = landmarks(t, th)
  scene.add(marks.group)
  const flock = variants('camar').length ? birds(t, 'camar', 7) : null
  if (flock) scene.add(flock.group)

  // kotak item: kubus kaca berkilau pelangi + "?" di dalam
  const q = canvasTex(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128)
    c.fillStyle = '#fff4fa'
    c.strokeStyle = '#121212'
    c.lineWidth = 8
    c.font = '900 100px "Dela Gothic One", sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.strokeText('?', 64, 70)
    c.fillText('?', 64, 70)
  }, false)
  const glass = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3, emissive: new THREE.Color('#ff37a6'), emissiveIntensity: 0.6 })
  const qMat = new THREE.SpriteMaterial({ map: q, depthWrite: false })
  const boxGeo = new THREE.BoxGeometry(2.3, 2.3, 2.3)
  const boxes = boxSpots(t).map((b) => {
    const mesh = new THREE.Group()
    const cube = new THREE.Mesh(boxGeo, glass)
    cube.castShadow = true
    const s = new THREE.Sprite(qMat)
    s.scale.setScalar(1.7)
    mesh.add(cube, s)
    mesh.position.set(b.x, b.y, b.z)
    scene.add(mesh)
    return { ...b, mesh, hiddenUntil: 0 }
  })

  // rintangan
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#121212', transparent: true, opacity: 0.4, depthWrite: false })
  const hazards: World['hazards'] = []
  t.def.hazards.forEach((h, index) => {
    if (h.kind === 'grip') return
    const name = h.kind === 'bounce' ? 'jamur-pantul' : h.kind === 'drop' ? 'batu-jatuh' : h.model
    const mesh = placed(name)
    if (h.kind === 'swing') {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 14, 6), new THREE.MeshStandardMaterial({ color: '#5a3e24', roughness: 0.9 }))
      rope.position.y = 7
      mesh.add(rope)
      const p = pointAt(t, h.at * t.length, 0)
      const steel = new THREE.MeshStandardMaterial({ color: th.wall, roughness: 0.5, metalness: 0.3 })
      const beam = new THREE.Mesh(new THREE.BoxGeometry(t.half * 2 + 8, 1, 1), steel)
      beam.position.set(p.x, p.y + 17, p.z)
      beam.rotation.y = p.yaw + Math.PI / 2
      beam.castShadow = true
      scene.add(beam)
      for (const side of [-1, 1]) {
        const pp = pointAt(t, h.at * t.length, side * (t.half + 4))
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
    hazards.push({ mesh, shadow, index })
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

  const update = (time: number, now: number) => {
    const sec = now / 1000
    stands.time.value = sec
    if (waterMat) waterMat.uniforms.time.value = sec
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
    glass.emissive.setHSL((sec * 0.25) % 1, 0.9, 0.55)
    for (const b of boxes) {
      const show = now >= b.hiddenUntil
      b.mesh.visible = show
      if (show) {
        b.mesh.children[0].rotation.set(Math.sin(sec * 1.1 + b.id) * 0.4, sec * 1.4 + b.id, 0)
        b.mesh.position.y = b.y + Math.sin(sec * 2 + b.id) * 0.3
      }
    }
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
      }
    }
  }
  return { scene, sun, boxes, hazards, setLights, update }
}
