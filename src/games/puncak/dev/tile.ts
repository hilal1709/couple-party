import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { Chibi, loadChibi } from '@/games/sport/render/chibi'
import { randomLook } from '@/games/sport/look'
import { fbm } from '../sim/noise'

/**
 * Ilustrasi tile Puncak Berdua (dev): gunung kartun bertingkat bersalju, tebing berlapis, bendera pink,
 * dua pendaki saling tarik di tali. Dirender three.js dengan garis tinta OutlineEffect, latar transparan.
 * Buka ?demo=puncak-tile lalu `window.__tile()` mengembalikan PNG data URL.
 */
export async function renderTile(canvas: HTMLCanvasElement) {
  const W = 1440
  const H = 1046
  canvas.width = W
  canvas.height = H
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setSize(W, H, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 200)
  cam.position.set(0, 13, 50)
  cam.lookAt(0, 7.4, 0)
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffcae9', 1.6))
  const sun = new THREE.DirectionalLight('#ffffff', 2.2)
  sun.position.set(-8, 16, 12)
  scene.add(sun)

  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c })
  // gunung: tiga tingkat cincin dengan tebing curam, dilekuk noise
  const tiers = [
    { r0: 13, r1: 10, y: 0, h: 3.4, top: '#43b929', side: '#8a6a4a' },
    { r0: 9.6, r1: 7, y: 3.4, h: 3.2, top: '#87e752', side: '#9a8670' },
    { r0: 6.6, r1: 4.2, y: 6.6, h: 3, top: '#5cf64a', side: '#7d6a58' },
    { r0: 4, r1: 0.4, y: 9.6, h: 4.2, top: '#ffffff', side: '#e9f0f8' },
  ]
  tiers.forEach((t, i) => {
    const g = new THREE.CylinderGeometry(t.r1, t.r0, t.h, 48, 6)
    const p = g.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k)
      const z = p.getZ(k)
      const a = Math.atan2(z, x)
      const n = 1 + fbm(Math.cos(a) * 2 + i, Math.sin(a) * 2, 7 + i, 3) * 0.12
      p.setX(k, x * n)
      p.setZ(k, z * n)
    }
    g.computeVertexNormals()
    const side = new THREE.Mesh(g, toon(t.side))
    side.position.y = t.y + t.h / 2
    scene.add(side)
    if (i < 3) {
      // rumput di dataran cincin
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(t.r1 * 1.02, t.r1 * 1.02, 0.35, 48), toon(t.top))
      cap.position.y = t.y + t.h + 0.1
      scene.add(cap)
    }
  })
  // pohon kartun di cincin bawah
  const tree = (x: number, z: number, y: number, s: number) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1 * s, 8), toon('#6b4a2e'))
    trunk.position.set(x, y + 0.5 * s, z)
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.8 * s, 1.8 * s, 10), toon('#2f7a2a'))
    top.position.set(x, y + 1.7 * s, z)
    scene.add(trunk, top)
  }
  ;[
    [-9, 6, 3.5],
    [-6.5, 8.2, 3.5],
    [8.5, 6.5, 3.5],
    [6, 8.5, 3.5],
    [-5, 4.5, 6.75],
    [5.4, 4.2, 6.75],
  ].forEach(([x, z, y]) => tree(x, z, y, 1.3))
  // bendera puncak
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), toon('#f4f1ea'))
  pole.position.set(0.2, 15.2, 0.4)
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3, 8, 2).translate(1.1, 0, 0), new THREE.MeshToonMaterial({ color: '#ff37a6', side: THREE.DoubleSide }))
  const fp = flag.geometry.attributes.position as THREE.BufferAttribute
  for (let k = 0; k < fp.count; k++) fp.setZ(k, Math.sin(fp.getX(k) * 2.2) * 0.25)
  flag.geometry.computeVertexNormals()
  flag.position.set(0.25, 16.2, 0.4)
  scene.add(pole, flag)
  // tali di tebing tengah
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.6, 9.7, 6.6), new THREE.Vector3(1.9, 8.2, 7.4), new THREE.Vector3(2.1, 6.8, 7.8)]), 16, 0.07, 6), toon('#d9b778'))
  scene.add(rope)
  // dua pendaki: satu di atas menarik, satu memanjat
  const gltf = await loadChibi()
  const a = new Chibi(gltf, { ...randomLook(3)[0], shirt: 0, pants: 0, hair: 0, style: 1, acc: 0 }, false)
  const b = new Chibi(gltf, { ...randomLook(9)[0], shirt: 1, pants: 1, hair: 4, style: 2, acc: 0 }, false)
  a.root.scale.setScalar(1.5)
  b.root.scale.setScalar(1.5)
  a.root.position.set(1.3, 9.75, 5.9)
  a.root.rotation.y = 0.2
  b.root.position.set(2.2, 6.85, 7.9)
  b.root.rotation.y = Math.PI + 0.2
  a.play('cheer')
  b.play('walk', { speed: 0.001 })
  a.update(0.6)
  b.update(0.3)
  // lengan pemanjat ke atas
  const Q = new THREE.Quaternion()
  for (const n of ['upper_L', 'upper_R']) b.bone(n)?.quaternion.multiply(Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -2.6))
  scene.add(a.root, b.root)
  // awan kecil
  const cloud = (x: number, y: number, z: number, s: number) => {
    const g = new THREE.Group()
    ;[
      [0, 0, 1],
      [0.9, -0.1, 0.75],
      [-0.9, -0.15, 0.7],
    ].forEach(([dx, dy, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 16, 12), toon('#fff4fa'))
      m.position.set(dx * s, dy * s, 0)
      g.add(m)
    })
    g.position.set(x, y, z)
    scene.add(g)
  }
  cloud(-10.5, 12.5, 2, 1.3)
  cloud(11, 10, 1, 1.1)

  const fx = new OutlineEffect(renderer, { defaultThickness: 0.0055, defaultColor: [0.07, 0.07, 0.07] })
  fx.render(scene, cam)
  return canvas.toDataURL('image/png')
}
