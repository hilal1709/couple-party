import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { Climber, loadClimber } from '../render/climber'

/**
 * Ilustrasi tile Puncak Berdua v3 (dev): Punggung Hijau — padang kemah dengan tenda di kaki, hutan pinus,
 * tebing berundak dengan air terjun, punggung sempit menuju bendera puncak. Tiga pendaki gendut:
 * satu di bibir tebing mengulurkan tangan, satu menggantung di bawahnya, satu bersorak di kemah.
 * Dirender three.js dengan garis tinta OutlineEffect, latar transparan.
 * Buka ?demo=puncak&tile=1 lalu `window.__tile()` mengembalikan PNG data URL.
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
  cam.position.set(0, 13, 56)
  cam.lookAt(0, 9, 0)
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfe8c4', 1.5))
  const sun = new THREE.DirectionalLight('#fff4e0', 2.3)
  sun.position.set(-9, 16, 12)
  scene.add(sun)

  const toon = (c: string) => new THREE.MeshToonMaterial({ color: c })
  const rnd = (() => {
    let v = 11
    return () => (v = (v * 16807) % 2147483647) / 2147483647
  })()
  const add = (m: THREE.Object3D) => (scene.add(m), m)

  // padang kemah: piringan rumput lebar di kaki
  add(new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 1, 48), toon('#8fc65a'))).position.y = 0.5
  // gunung: undakan batu abu dengan topi rumput hijau; menyempit ke atas jadi punggung
  const rockCols = ['#8d988c', '#7f8b82', '#949c98', '#a0a6a6']
  const tiers = [
    { y: 1.6, r: 10, n: 12, s: 3.4 },
    { y: 4.4, r: 7.6, n: 10, s: 3.0 },
    { y: 7.6, r: 5.6, n: 8, s: 2.8 },
    { y: 10.8, r: 3.8, n: 6, s: 2.5 },
    { y: 13.6, r: 2.2, n: 4, s: 2.1 },
  ]
  tiers.forEach((t, ti) => {
    for (let i = 0; i < t.n; i++) {
      const a = (i / t.n) * Math.PI * 2 + ti * 0.4
      const size = t.s * (0.8 + rnd() * 0.4)
      const rock = add(new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), toon(rockCols[(i + ti) % 4])))
      rock.position.set(Math.cos(a) * t.r * (0.6 + rnd() * 0.4), t.y, Math.sin(a) * t.r * 0.7)
      rock.scale.set(1.1, 0.8, 1)
      rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
      // topi rumput di atas bongkahan
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(size * 0.9, size * 0.95, 0.4, 8), toon(ti < 3 ? '#93b866' : '#b6c88a')))
      cap.position.set(rock.position.x, t.y + size * 0.6, rock.position.z)
    }
  })
  // air terjun di tebing tengah, kolam kecil di kakinya
  const fall = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6.5), new THREE.MeshToonMaterial({ color: '#8fd3f4', side: THREE.DoubleSide })))
  fall.position.set(-4.6, 6.2, 6.4)
  fall.rotation.y = 0.35
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 20), toon('#7ec8ef'))).position.set(-4.9, 2.6, 7.4)
  // pinus kartun: hutan di kaki & lereng bawah
  const pine = (x: number, z: number, y: number, s: number) => {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 0.9 * s, 8), toon('#6b4a2e'))).position.set(x, y + 0.45 * s, z)
    for (let k = 0; k < 3; k++) add(new THREE.Mesh(new THREE.ConeGeometry((0.85 - k * 0.2) * s, 1.1 * s, 10), toon(k % 2 ? '#3f8f3a' : '#2f7a2a'))).position.set(x, y + (1.1 + k * 0.6) * s, z)
  }
  ;[
    [-12.5, 5, 1, 1.4],
    [-10.5, 8.5, 1, 1.2],
    [-13, 1.5, 1, 1.5],
    [11.5, 5.5, 1, 1.4],
    [9.5, 9, 1, 1.1],
    [13, 2, 1, 1.5],
    [-8, 3, 4.2, 1.1],
    [7.5, 2.5, 4.4, 1.1],
    [-6.2, 3.2, 7.6, 0.9],
    [5.8, 3.6, 7.8, 0.9],
    [-3.6, 2.6, 11, 0.75],
  ].forEach(([x, z, y, s]) => pine(x, z, y, s))
  // tenda oranye & api unggun di padang kemah
  const tent = add(new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.1, 4), toon('#e2683c')))
  tent.position.set(7.6, 2.05, 11)
  tent.rotation.y = Math.PI / 4 + 0.3
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), toon('#9aa09c'))).position.set(4.4 + Math.cos(a) * 0.6, 1.15, 12 + Math.sin(a) * 0.6)
  }
  const flame = add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 8), toon('#ffb347')))
  flame.position.set(4.4, 1.6, 12)
  // tumpukan batu & bendera di puncak
  for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 - i * 0.1, 0), toon('#a0a6a6'))).position.set(1.6, 15.4 + i * 0.6, 0.6)
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), toon('#f4f1ea'))).position.set(0.1, 16.6, 0.4)
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3, 8, 2).translate(1.1, 0, 0), new THREE.MeshToonMaterial({ color: '#ff37a6', side: THREE.DoubleSide }))
  const fp = flag.geometry.attributes.position as THREE.BufferAttribute
  for (let k = 0; k < fp.count; k++) fp.setZ(k, Math.sin(fp.getX(k) * 2.2) * 0.25)
  flag.geometry.computeVertexNormals()
  flag.position.set(0.15, 17.6, 0.4)
  add(flag)

  // tiga pendaki: tarik tangan di bibir tebing kanan, satu bersorak di kemah
  const gltf = await loadClimber()
  const top = new Climber(gltf, { skin: 1, jacket: 0, pants: 0, hat: 0, cap: 0, face: 0 }, false)
  const hang = new Climber(gltf, { skin: 3, jacket: 1, pants: 1, hat: 1, cap: 1, face: 1 }, false)
  const camp = new Climber(gltf, { skin: 2, jacket: 2, pants: 2, hat: 3, cap: 2, face: 3 }, false)
  for (const c of [top, hang, camp]) c.root.scale.setScalar(1.5)
  top.root.position.set(3.2, 9.2, 7.6)
  // menghadap ke bawah (ke kamera), tangan menarik teman yang menggantung
  top.root.rotation.y = 0.15
  hang.root.position.set(3.6, 5.8, 8.9)
  hang.root.rotation.y = Math.PI + 0.15
  camp.root.position.set(5.6, 1.1, 13.2)
  camp.root.rotation.y = -0.5
  top.play('pull')
  hang.play('hang')
  camp.play('cheer')
  top.update(0.5)
  hang.update(0.3)
  camp.update(0.6)
  scene.add(top.root, hang.root, camp.root)
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
  cloud(-10.5, 13, 2, 1.3)
  cloud(11, 11, 1, 1.1)

  const fx = new OutlineEffect(renderer, { defaultThickness: 0.0055, defaultColor: [0.07, 0.07, 0.07] })
  fx.render(scene, cam)
  return canvas.toDataURL('image/png')
}
