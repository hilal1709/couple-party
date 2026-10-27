import * as THREE from 'three'
import type { Theme } from '../tracks'
import { boxSpots, hazardPose } from '../sim/hazards'
import { STEP, pointAt, type Track } from '../sim/track'
import { geometry } from './models'

/** angka acak dengan seed untuk penempatan prop (sama di semua HP) */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const vcol = new THREE.MeshLambertMaterial({ vertexColors: true })

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

function skyDome(theme: Theme) {
  const geo = new THREE.SphereGeometry(1800, 24, 12)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(theme.sky[0]) }, bottom: { value: new THREE.Color(theme.sky[1]) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.6, h)), 1.0); }',
  })
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = -1
  return m
}

/** pita jalan (+ tanjakan) dan kerb di kedua tepi */
function roadMesh(t: Track) {
  const th = t.def.theme
  const n = t.n
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const k = i % n
    const rx = -t.tz[k]
    const rz = t.tx[k]
    const y = t.py[k] + t.ramp[k] + 0.05
    pos.push(t.px[k] - rx * t.half, y, t.pz[k] - rz * t.half, t.px[k] + rx * t.half, y, t.pz[k] + rz * t.half)
    const v = (i * STEP) / 12
    uv.push(0, v, 1, v)
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const tex = canvasTex(128, 128, (c) => {
    c.fillStyle = th.road
    c.fillRect(0, 0, 128, 128)
    // bintik aspal
    const r = seeded(7)
    for (let i = 0; i < 500; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
      c.fillRect(r() * 128, r() * 128, 2, 2)
    }
    // garis putus-putus tengah + garis tepi
    c.fillStyle = th.roadLine
    c.fillRect(61, 0, 6, 64)
    c.fillRect(4, 0, 3, 128)
    c.fillRect(121, 0, 3, 128)
  })
  const road = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }))

  // kerb belang-belang
  const cpos: number[] = []
  const ccol: number[] = []
  const a = new THREE.Color(th.curb[0])
  const b = new THREE.Color(th.curb[1])
  for (let i = 0; i < n; i++) {
    const k2 = (i + 1) % n
    const c = Math.floor(i / 2) % 2 ? a : b
    for (const side of [-1, 1]) {
      const quad = [i, k2].flatMap((k) => {
        const rx = -t.tz[k] * side
        const rz = t.tx[k] * side
        const y = t.py[k] + t.ramp[k] + 0.12
        return [
          [t.px[k] + rx * t.half, y, t.pz[k] + rz * t.half],
          [t.px[k] + rx * (t.half + 2.2), y - 0.05, t.pz[k] + rz * (t.half + 2.2)],
        ]
      })
      const [p0, p1, p2, p3] = quad
      for (const p of [p0, p1, p2, p1, p3, p2]) {
        cpos.push(...p)
        ccol.push(c.r, c.g, c.b)
      }
    }
  }
  const cg = new THREE.BufferGeometry()
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3))
  cg.setAttribute('color', new THREE.Float32BufferAttribute(ccol, 3))
  cg.computeVertexNormals()
  const curb = new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))
  return [road, curb]
}

/** tanah mengikuti tinggi lintasan, menurun menjauhi jalan (lava & laut di bawah) */
function groundMesh(t: Track) {
  const th = t.def.theme
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < t.n; i++) {
    minX = Math.min(minX, t.px[i]); maxX = Math.max(maxX, t.px[i])
    minZ = Math.min(minZ, t.pz[i]); maxZ = Math.max(maxZ, t.pz[i])
  }
  const pad = 320
  const w = maxX - minX + pad * 2
  const d = maxZ - minZ + pad * 2
  const seg = 110
  const g = new THREE.PlaneGeometry(w, d, seg, seg)
  g.rotateX(-Math.PI / 2)
  g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  const p = g.getAttribute('position')
  const col = new Float32Array(p.count * 3)
  const c1 = new THREE.Color(th.ground)
  const c2 = new THREE.Color(th.ground2)
  const r = seeded(11)
  const sunk = th.offroad === 'lava' ? 6 : th.offroad === 'pasir' ? 2.5 : 1
  for (let v = 0; v < p.count; v++) {
    const x = p.getX(v)
    const z = p.getZ(v)
    let bd = Infinity
    let by = 0
    for (let i = 0; i < t.n; i += 3) {
      const dd = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
      if (dd < bd) {
        bd = dd
        by = t.py[i]
      }
    }
    const dist = Math.sqrt(bd)
    const edge = t.half + (th.offroad === 'lava' ? 3 : 14)
    // bahu jalan rata, lalu bukit/turunan pelan
    const off = Math.max(0, dist - edge)
    const hill = th.offroad === 'lava' ? -Math.min(off, 1) * sunk : Math.sin(x * 0.013) * Math.cos(z * 0.011) * Math.min(off * 0.12, 18) - Math.min(off * 0.02, 2) * sunk
    p.setY(v, by - 0.25 + hill)
    const c = c1.clone().lerp(c2, r() * 0.8)
    col[v * 3] = c.r
    col[v * 3 + 1] = c.g
    col[v * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  const lava = th.offroad === 'lava'
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: lava ? new THREE.Color('#ff3a0a') : new THREE.Color('#000'), emissiveIntensity: lava ? 0.55 : 0 })
  return new THREE.Mesh(g, mat)
}

/** pagar rendah di batas luar (tempat kart memantul) */
function walls(t: Track) {
  const th = t.def.theme
  const off = t.half + (th.offroad === 'lava' ? 8 : 14)
  const every = 3
  const count = Math.floor(t.n / every) * 2
  const geo = new THREE.BoxGeometry(1.2, 1.4, STEP * every + 0.3)
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: th.wall }), count)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let k = 0
  for (let i = 0; i < t.n - every + 1; i += every) {
    const yaw = Math.atan2(t.tx[i], t.tz[i])
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    for (const side of [-1, 1]) {
      const p = pointAt(t, i * STEP, side * off)
      m.compose(new THREE.Vector3(p.x, p.y + 0.5, p.z), q, new THREE.Vector3(1, 1, 1))
      mesh.setMatrixAt(k++, m)
    }
  }
  mesh.count = k
  return mesh
}

/** sebar prop tema di luar jalan, menjauhi semua bagian lintasan */
function props(t: Track) {
  const th = t.def.theme
  const r = seeded(t.def.id.length * 97 + t.n)
  const group = new THREE.Group()
  const total = Math.round(t.length / 9)
  const weights = th.props
  const sum = weights.reduce((a, [, w]) => a + w, 0)
  const spots = new Map<string, THREE.Matrix4[]>()
  for (let k = 0; k < total; k++) {
    const i = Math.floor(r() * t.n)
    const side = r() > 0.5 ? 1 : -1
    const lat = side * (t.half + 18 + r() * 120)
    const p = pointAt(t, i * STEP, lat)
    // jangan menimpa bagian lintasan lain
    let ok = true
    for (let j = 0; j < t.n && ok; j += 4) ok = (t.px[j] - p.x) ** 2 + (t.pz[j] - p.z) ** 2 >= (t.half + 14) ** 2
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
    const s = 0.8 + r() * 0.9
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(p.x, p.y - 0.3 - Math.max(0, Math.abs(lat) - t.half - 14) * 0.02 * (th.offroad === 'lava' ? 6 : 0), p.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2),
      new THREE.Vector3(s, s, s),
    )
    const list = spots.get(name) ?? []
    list.push(m)
    spots.set(name, list)
  }
  for (const [name, list] of spots) {
    const mesh = new THREE.InstancedMesh(geometry(name), vcol, list.length)
    list.forEach((m, i) => mesh.setMatrixAt(i, m))
    group.add(mesh)
  }
  return group
}

/** garis start kotak-kotak, panel turbo, zona grip, tanjakan berwarna */
function markings(t: Track) {
  const th = t.def.theme
  const g = new THREE.Group()
  const decal = (s: number, lat: number, w: number, len: number, mat: THREE.Material, lift = 0.09) => {
    const p = pointAt(t, s, lat)
    const i = Math.round(s / STEP) % t.n
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat)
    m.rotation.order = 'YXZ'
    m.rotation.set(-Math.PI / 2, p.yaw, 0)
    m.position.set(p.x, p.y + t.ramp[(i + t.n) % t.n] + lift, p.z)
    g.add(m)
    return m
  }
  const checker = canvasTex(64, 16, (c) => {
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 4; y++) {
        c.fillStyle = (x + y) % 2 ? '#121212' : '#fff4fa'
        c.fillRect(x * 4, y * 4, 4, 4)
      }
  }, false)
  checker.magFilter = THREE.NearestFilter
  decal(0, 0, t.half * 2, 4, new THREE.MeshLambertMaterial({ map: checker }))

  const arrow = canvasTex(64, 64, (c) => {
    c.fillStyle = '#ff8a1c'
    c.fillRect(0, 0, 64, 64)
    c.fillStyle = '#ffcc1f'
    for (const y of [6, 30]) {
      c.beginPath()
      c.moveTo(8, y + 22)
      c.lineTo(32, y)
      c.lineTo(56, y + 22)
      c.lineTo(46, y + 22)
      c.lineTo(32, y + 10)
      c.lineTo(18, y + 22)
      c.fill()
    }
  }, false)
  const padMat = new THREE.MeshBasicMaterial({ map: arrow })
  for (const [at, lane] of t.def.pads) decal(at * t.length, lane * t.half * 0.6, 7, 8, padMat)

  for (const h of t.def.hazards) {
    if (h.kind !== 'grip') continue
    const mat = new THREE.MeshLambertMaterial({ color: h.color, transparent: true, opacity: 0.85 })
    for (let s = h.from * t.length; s < h.to * t.length; s += 8) decal(s, 0, t.half * 2 - 1, 8.4, mat, 0.08)
  }
  const rampMat = new THREE.MeshLambertMaterial({ color: th.curb[0] })
  for (const end of t.rampAt) decal(end * STEP - 2, 0, t.half * 1.4, 4, rampMat, 0.1)
  return g
}

export type World = {
  scene: THREE.Scene
  boxes: { id: number; x: number; y: number; z: number; mesh: THREE.Mesh; hiddenUntil: number }[]
  hazards: { mesh: THREE.Object3D; shadow?: THREE.Mesh; index: number }[]
  update: (time: number, now: number) => void
}

export function buildWorld(t: Track): World {
  const th = t.def.theme
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(th.sky[1])
  scene.fog = new THREE.Fog(th.fog, th.fogNear * 1.5, th.fogFar * 1.6)
  scene.add(skyDome(th))
  scene.add(new THREE.HemisphereLight(th.ambient, th.ground, th.night ? 2.2 : 1.3))
  const sun = new THREE.DirectionalLight(th.sun, th.sunPower)
  sun.position.set(200, 400, 120)
  scene.add(sun)
  scene.add(groundMesh(t), ...roadMesh(t), walls(t), props(t), markings(t))

  if (th.offroad === 'pasir' && t.def.id === 'pantai') {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: '#2fb8ff', transparent: true, opacity: 0.85 }))
    sea.rotation.x = -Math.PI / 2
    sea.position.y = -3.2
    scene.add(sea)
  }

  // kotak item "?"
  const q = canvasTex(64, 64, (c) => {
    const grd = c.createLinearGradient(0, 0, 64, 64)
    grd.addColorStop(0, '#ff37a6')
    grd.addColorStop(1, '#8a55ff')
    c.fillStyle = grd
    c.fillRect(0, 0, 64, 64)
    c.strokeStyle = '#fff4fa'
    c.lineWidth = 5
    c.strokeRect(3, 3, 58, 58)
    c.fillStyle = '#fff4fa'
    c.font = 'bold 44px sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('?', 32, 35)
  }, false)
  const boxMat = new THREE.MeshLambertMaterial({ map: q, transparent: true, opacity: 0.92, emissive: new THREE.Color('#ff37a6'), emissiveIntensity: 0.25 })
  const boxGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2)
  const boxes = boxSpots(t).map((b) => {
    const mesh = new THREE.Mesh(boxGeo, boxMat)
    mesh.position.set(b.x, b.y, b.z)
    scene.add(mesh)
    return { ...b, mesh, hiddenUntil: 0 }
  })

  // rintangan
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#121212', transparent: true, opacity: 0.35, depthWrite: false })
  const hazards: World['hazards'] = []
  t.def.hazards.forEach((h, index) => {
    if (h.kind === 'grip') return
    const name = h.kind === 'bounce' ? 'jamur-pantul' : h.kind === 'drop' ? 'batu-jatuh' : h.model
    const mesh = new THREE.Mesh(geometry(name), vcol)
    if (h.kind === 'swing') {
      // bandul: tali dari tiang di atas jalan
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 14, 5), new THREE.MeshLambertMaterial({ color: '#5a3e24' }))
      rope.position.y = 7
      mesh.add(rope)
      const p = pointAt(t, h.at * t.length, 0)
      const beam = new THREE.Mesh(new THREE.BoxGeometry(t.half * 2 + 8, 1, 1), new THREE.MeshLambertMaterial({ color: th.wall }))
      beam.position.set(p.x, p.y + 17, p.z)
      beam.rotation.y = p.yaw + Math.PI / 2
      scene.add(beam)
      for (const side of [-1, 1]) {
        const pp = pointAt(t, h.at * t.length, side * (t.half + 4))
        const post = new THREE.Mesh(new THREE.BoxGeometry(1, 17, 1), beam.material)
        post.position.set(pp.x, pp.y + 8.5, pp.z)
        scene.add(post)
      }
    }
    scene.add(mesh)
    let shadow: THREE.Mesh | undefined
    if (h.kind === 'drop') {
      shadow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), shadowMat)
      shadow.rotation.x = -Math.PI / 2
      scene.add(shadow)
    }
    hazards.push({ mesh, shadow, index })
  })

  const update = (time: number, now: number) => {
    for (const b of boxes) {
      const show = now >= b.hiddenUntil
      b.mesh.visible = show
      if (show) {
        b.mesh.rotation.y = time * 1.4 + b.id
        b.mesh.rotation.x = Math.sin(time * 1.1 + b.id) * 0.3
        b.mesh.position.y = b.y + Math.sin(time * 2 + b.id) * 0.3
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
        hz.mesh.scale.set(1, 1 + Math.sin(time * 5) * 0.08, 1)
      } else {
        hz.mesh.position.set(p.x, p.y, p.z)
        hz.mesh.rotation.y = p.yaw
        if (h.kind === 'roller' && (h.model.startsWith('bola') || h.model === 'gulungan-semak')) hz.mesh.rotation.z = time * 3
      }
    }
  }
  return { scene, boxes, hazards, update }
}
