import * as THREE from 'three'
import type { ItemKind } from '../types'
import { glimmer, hairSway, shroud } from './shaders'
import { flame, hairStrands, oldPhoto, puff } from './textures'

const brass = () => new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.32 })
const steel = () => new THREE.MeshStandardMaterial({ color: 0x8c8f94, metalness: 1, roughness: 0.28 })
const wood = () => new THREE.MeshStandardMaterial({ color: 0x4a2f1f, roughness: 0.7 })
const clay = () => new THREE.MeshStandardMaterial({ color: 0x9c5a3a, roughness: 0.8 })
const lathe = (pts: [number, number][], seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg)

/** semua bahan di satu benda ikut berkilau samar */
function shine(o: THREE.Object3D, color: THREE.ColorRepresentation) {
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if (m.isMesh && m.material instanceof THREE.MeshStandardMaterial) glimmer(m.material, color)
  })
  return o
}

/** teplok: lampu minyak kaca. `lit` = menyala dengan nyala api billboard */
export function teplok(lit = true) {
  const g = new THREE.Group()
  const base = new THREE.Mesh(lathe([[0.001, 0], [0.07, 0], [0.08, 0.04], [0.05, 0.09], [0.06, 0.12], [0.02, 0.13]]), brass())
  g.add(base)
  const glass = new THREE.Mesh(
    lathe([[0.03, 0.13], [0.055, 0.17], [0.06, 0.22], [0.035, 0.3], [0.032, 0.34]]),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  )
  g.add(glass)
  if (lit) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flame(), blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc070 }))
    f.scale.set(0.05, 0.1, 1)
    f.position.y = 0.2
    f.name = 'api'
    g.add(f)
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), blending: THREE.AdditiveBlending, depthWrite: false, color: 0xff9a40, opacity: 0.35 }))
    glow.scale.setScalar(0.7)
    glow.position.y = 0.2
    glow.name = 'cahaya'
    g.add(glow)
  }
  return g
}

/** model pusaka; semuanya sekitar 20-30 cm supaya cukup terlihat dengan senter */
export function itemModel(kind: ItemKind): THREE.Object3D {
  const g = new THREE.Group()
  switch (kind) {
    case 'kunci': {
      const m = brass()
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), m)
      ring.position.x = -0.08
      g.add(ring)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2).rotateZ(Math.PI / 2), m)
      shaft.position.x = 0.06
      g.add(shaft)
      for (const [x, h] of [[0.12, 0.045], [0.145, 0.03]]) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, 0.01), m)
        tooth.position.set(x, -h / 2, 0)
        g.add(tooth)
      }
      g.rotation.x = -Math.PI / 2
      g.position.y = 0.015
      g.scale.setScalar(1.5)
      return shine(wrap(g), 0xd8a050)
    }
    case 'teplok':
      return shine(wrap(teplok(false)), 0xd8a050)
    case 'keris': {
      const s = new THREE.Shape()
      s.moveTo(0, 0)
      for (let i = 0; i <= 7; i++) s.lineTo(0.018 + Math.sin(i * 1.4) * 0.008, 0.04 * i)
      s.lineTo(0, 0.32)
      for (let i = 7; i >= 0; i--) s.lineTo(-0.018 + Math.sin(i * 1.4) * 0.008, 0.04 * i)
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }), steel())
      g.add(blade)
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.09, 10), wood())
      hilt.position.y = -0.045
      g.add(hilt)
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.025), wood())
      g.add(guard)
      g.rotation.set(-Math.PI / 2, 0, 0.4)
      g.position.y = 0.02
      return shine(wrap(g), 0x9ab0c0)
    }
    case 'foto': {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.02), wood())
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.21), new THREE.MeshStandardMaterial({ map: oldPhoto() }))
      pic.position.z = 0.011
      frame.add(pic)
      frame.rotation.x = -0.35
      frame.position.y = 0.12
      g.add(frame)
      return shine(wrap(g), 0xc0a070)
    }
    case 'kendi': {
      const body = new THREE.Mesh(lathe([[0.001, 0], [0.06, 0.005], [0.1, 0.07], [0.09, 0.13], [0.03, 0.17], [0.025, 0.24], [0.035, 0.25]]), clay())
      g.add(body)
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1).rotateZ(-0.9), clay())
      spout.position.set(0.1, 0.12, 0)
      g.add(spout)
      return shine(wrap(g), 0xc07040)
    }
    case 'cermin': {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 24), brass())
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshStandardMaterial({ color: 0xcfd6da, metalness: 1, roughness: 0.04 }))
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.12), brass())
      handle.position.y = -0.14
      const face = new THREE.Group()
      face.add(rim, glass, handle)
      face.rotation.x = -Math.PI / 2 + 0.2
      face.position.y = 0.02
      g.add(face)
      return shine(wrap(g), 0xc8d8e0)
    }
    case 'kemenyan': {
      const bowl = new THREE.Mesh(lathe([[0.001, 0], [0.05, 0], [0.09, 0.05], [0.1, 0.07], [0.09, 0.07], [0.04, 0.02]]), clay())
      g.add(bowl)
      const smoke = new THREE.Group()
      smoke.name = 'asap'
      const tex = puff()
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9a9a9a, opacity: 0.35, depthWrite: false }))
        s.userData.phase = i / 6
        smoke.add(s)
      }
      g.add(smoke)
      return shine(wrap(g), 0xb0a090)
    }
  }
}

/** bungkus supaya animasi melayang di render tidak merusak orientasi model */
function wrap(inner: THREE.Object3D) {
  const o = new THREE.Group()
  o.add(inner)
  return o
}

/** asap kemenyan naik pelan */
export function animateSmoke(o: THREE.Object3D, t: number) {
  const smoke = o.getObjectByName('asap')
  if (!smoke) return
  for (const s of smoke.children as THREE.Sprite[]) {
    const p = (t * 0.25 + (s.userData.phase as number)) % 1
    s.position.set(Math.sin(p * 9 + s.userData.phase * 20) * 0.04 * p, 0.06 + p * 0.6, Math.cos(p * 7) * 0.03 * p)
    s.scale.setScalar(0.06 + p * 0.25)
    s.material.opacity = 0.4 * (1 - p)
  }
}

/* ---------- Penunggu ---------- */

export type GhostRig = {
  root: THREE.Group
  body: THREE.Group
  head: THREE.Object3D
  arms: THREE.Object3D[]
  eyes: THREE.MeshBasicMaterial
  lunge: { value: number }
}

/**
 * Sosok tinggi berkain lusuh, rambut hitam panjang menutupi wajah, tangan kurus menjuntai.
 * Melayang sedikit di atas tanah; kain bawahnya robek-robek (shader).
 */
export function ghostModel(): GhostRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const H = 2.35
  const cloth = new THREE.MeshStandardMaterial({ color: 0x9e988c, roughness: 0.95, emissive: 0x121418, emissiveIntensity: 1 })
  const sleeve = cloth.clone()
  const lunge = { value: 0 }
  shroud(cloth, H, lunge)
  const robe = new THREE.Mesh(
    lathe([[0.62, 0], [0.55, 0.3], [0.42, 0.8], [0.32, 1.3], [0.26, 1.7], [0.22, 1.85], [0.13, 1.95], [0.08, 2.0]], 28),
    cloth,
  )
  robe.castShadow = true
  body.add(robe)

  const skin = new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 0.7, emissive: 0x101214 })
  const head = new THREE.Group()
  head.position.y = 2.12
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin)
  skull.scale.set(1, 1.2, 1.05)
  head.add(skull)
  // rambut: lembaran helai yang menjuntai sampai pinggang, juga di depan wajah
  const hairMat = new THREE.MeshStandardMaterial({ map: hairStrands(), alphaTest: 0.35, side: THREE.DoubleSide, color: 0x1a1614, roughness: 0.6 })
  hairSway(hairMat, 1.2)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.2, 1, 8).translate(0, -0.6, 0), hairMat)
    sheet.position.set(Math.sin(a) * 0.11, 0.14, Math.cos(a) * 0.11)
    sheet.rotation.y = a
    sheet.rotation.x = Math.cos(a) > 0 ? -0.08 : 0.08
    head.add(sheet)
  }
  const eyes = new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyes)
    e.position.set(s * 0.045, 0.01, 0.13)
    head.add(e)
  }
  body.add(head)

  const arms: THREE.Object3D[] = []
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(s * 0.24, 1.86, 0.02)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.95, 8).translate(0, -0.47, 0), sleeve)
    shoulder.add(arm)
    const hand = new THREE.Group()
    hand.position.y = -0.98
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.03), skin)
    palm.position.y = -0.04
    hand.add(palm)
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.16).translate(0, -0.08, 0), skin)
      finger.position.set(-0.022 + f * 0.015, -0.09, 0)
      finger.rotation.x = 0.15
      hand.add(finger)
    }
    shoulder.add(hand)
    shoulder.rotation.z = s * 0.06
    body.add(shoulder)
    arms.push(shoulder)
  }
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })
  return { root, body, head, arms, eyes, lunge }
}

/** pose Penunggu per frame: melayang, kepala miring saat mendengarkan, condong saat memburu */
export function poseGhost(r: GhostRig, t: number, mode: string, speed: number, dt: number) {
  const hunt = mode === 'buru' ? 1 : 0
  const listen = mode === 'curiga' || (mode === 'jalan' && speed < 0.1) ? 1 : 0
  const k = 1 - Math.exp(-dt * 4)
  r.body.position.y = 0.12 + Math.sin(t * 1.3) * 0.06
  r.body.rotation.x += ((hunt ? 0.28 : 0.04) - r.body.rotation.x) * k
  r.head.rotation.z += ((listen ? 0.5 * Math.sin(t * 0.7) : hunt ? 0.15 : 0.05) - r.head.rotation.z) * k
  r.head.rotation.x += ((hunt ? 0.3 : 0.1) - r.head.rotation.x) * k
  r.arms.forEach((a, i) => {
    const want = hunt ? -1.15 + Math.sin(t * 8 + i) * 0.1 : -0.05 + Math.sin(t * 1.1 + i * 2) * 0.05
    a.rotation.x += (want - a.rotation.x) * k
  })
  r.lunge.value += (hunt - r.lunge.value) * k
  r.eyes.opacity += ((hunt ? 1 : listen ? 0.35 : 0.05) - r.eyes.opacity) * k
}
