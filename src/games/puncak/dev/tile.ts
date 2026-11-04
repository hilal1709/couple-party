import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { Chibi, loadChibi } from '@/games/sport/render/chibi'
import { randomLook } from '@/games/sport/look'

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
  cam.position.set(0, 14, 54)
  cam.lookAt(0, 8.6, 0)
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffcae9', 1.6))
  const sun = new THREE.DirectionalLight('#ffffff', 2.2)
  sun.position.set(-8, 16, 12)
  scene.add(sun)

  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c })
  // gunung: tumpukan bongkahan batu bersegi (seperti massif di game), pasir di kaki
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 14.5, 1, 40), toon('#e6d3a0'))
  sand.position.y = 0.5
  scene.add(sand)
  const rnd = (() => {
    let v = 7
    return () => ((v = (v * 16807) % 2147483647) / 2147483647)
  })()
  const rockCols = ['#97a7a3', '#8d9f9c', '#83979a', '#a4b2ae']
  for (let i = 0; i < 46; i++) {
    const t = i / 46
    const y = 1 + t * 12.5
    const ring = (1 - t) * 10.5 + 0.8
    const a = i * 2.4
    const r = ring * (0.35 + rnd() * 0.65)
    const size = 2.6 + (1 - t) * 2.2 + rnd() * 1.2
    const g = new THREE.DodecahedronGeometry(size, 0)
    const rock = new THREE.Mesh(g, toon(rockCols[i % 4]))
    rock.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.75)
    rock.scale.set(1, 0.75 + rnd() * 0.35, 1)
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
    scene.add(rock)
    // tepian pasir di atas bongkahan
    if (i % 3 === 0) {
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.6, size * 0.7, 0.3, 7), toon('#e6d3a0'))
      lip.position.set(rock.position.x, y + size * 0.62, rock.position.z)
      scene.add(lip)
    }
  }
  // pohon kartun di cincin bawah
  const tree = (x: number, z: number, y: number, s: number) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1 * s, 8), toon('#6b4a2e'))
    trunk.position.set(x, y + 0.5 * s, z)
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.8 * s, 1.8 * s, 10), toon('#2f7a2a'))
    top.position.set(x, y + 1.7 * s, z)
    scene.add(trunk, top)
  }
  ;[
    [-11, 6, 1],
    [-8.5, 9, 1],
    [10.5, 6.5, 1],
    [8, 9.5, 1],
  ].forEach(([x, z, y]) => tree(x, z, y, 1.3))
  // bendera puncak
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), toon('#f4f1ea'))
  pole.position.set(0.2, 17.6, 0.4)
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3, 8, 2).translate(1.1, 0, 0), new THREE.MeshToonMaterial({ color: '#ff37a6', side: THREE.DoubleSide }))
  const fp = flag.geometry.attributes.position as THREE.BufferAttribute
  for (let k = 0; k < fp.count; k++) fp.setZ(k, Math.sin(fp.getX(k) * 2.2) * 0.25)
  flag.geometry.computeVertexNormals()
  flag.position.set(0.25, 18.6, 0.4)
  scene.add(pole, flag)
  // tali di tebing tengah
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.9, 9.6, 9.2), new THREE.Vector3(2.2, 8.2, 9.9), new THREE.Vector3(2.4, 6.9, 10.3)]), 16, 0.07, 6), toon('#d9b778'))
  scene.add(rope)
  // dua pendaki: satu di atas menarik, satu memanjat
  const gltf = await loadChibi()
  const a = new Chibi(gltf, { ...randomLook(3)[0], shirt: 0, pants: 0, hair: 0, style: 1, acc: 0 }, false)
  const b = new Chibi(gltf, { ...randomLook(9)[0], shirt: 1, pants: 1, hair: 4, style: 2, acc: 0 }, false)
  a.root.scale.setScalar(1.5)
  b.root.scale.setScalar(1.5)
  a.root.position.set(1.6, 9.6, 8.6)
  a.root.rotation.y = 0.2
  b.root.position.set(2.4, 6.2, 10.4)
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
