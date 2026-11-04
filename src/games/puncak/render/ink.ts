import * as THREE from 'three'

/**
 * Garis tinta "inverted hull": salinan mesh yang sedikit menggembung, hanya sisi belakangnya yang
 * digambar hitam. Murah (satu draw call tambahan per mesh), tanpa post-processing, jalan di semua tier.
 */
const cache = new Map<string, THREE.MeshBasicMaterial>()

export function inkMaterial(width: number) {
  const key = width.toFixed(4)
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: '#121212', side: THREE.BackSide })
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${width.toFixed(4)};`)
    }
    m.customProgramCacheKey = () => `ink${key}`
    cache.set(key, m)
  }
  return m
}

/** garis tinta untuk karakter bertulang: anak mesh berbagi geometri & kerangka (ikut sembunyi/tampil) */
export function inkSkinned(root: THREE.Object3D, width: number) {
  const meshes: THREE.SkinnedMesh[] = []
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (m.isSkinnedMesh && !m.userData.ink) meshes.push(m)
  })
  for (const m of meshes) {
    const ink = new THREE.SkinnedMesh(m.geometry, inkMaterial(width))
    ink.userData.ink = true
    ink.bind(m.skeleton, m.bindMatrix)
    ink.frustumCulled = false
    ink.castShadow = false
    m.add(ink)
  }
}

/** garis tinta untuk prop yang di-instance (batang pohon, batu) */
export function inkInstanced(im: THREE.InstancedMesh, width: number) {
  const ink = new THREE.InstancedMesh(im.geometry, inkMaterial(width), im.count)
  ink.instanceMatrix = im.instanceMatrix
  ink.castShadow = false
  ink.receiveShadow = false
  ink.userData = { ...im.userData, ink: true }
  return ink
}
