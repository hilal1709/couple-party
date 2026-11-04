import * as THREE from 'three'
import { texIndex } from '../mountains'
import { CELL, gradAt, heightAt, layersOf, type Terrain } from '../sim/terrain'
import type { TerrainTex } from './textures'

/** sel per sisi satu potongan medan (32 m) */
const CHUNK = 64
/** jarak ganti tingkat detail (m): 0,5 m → 1 m → 2 m → 4 m per sel */
const LOD_DIST = [45, 95, 190]

/** AO dari horizon: lembah & kaki tebing lebih gelap (diganti lightmap Blender, dihitung sekali saat muat) */
export function bakeAO(t: Terrain, step = 1): Float32Array {
  const n = t.n
  const out = new Float32Array(n * n)
  const dirs = 6
  const dist = [1.5, 3, 5, 8, 12, 18, 26]
  for (let j = 0; j < n; j += step) {
    for (let i = 0; i < n; i += step) {
      const x = i * CELL - t.half
      const z = j * CELL - t.half
      const h = t.h[j * n + i]
      let occ = 0
      for (let d = 0; d < dirs; d++) {
        const a = (d / dirs) * Math.PI * 2 + 0.3
        const dx = Math.cos(a)
        const dz = Math.sin(a)
        let best = 0
        for (const r of dist) {
          const s = (heightAt(t, x + dx * r, z + dz * r) - h) / r
          if (s > best) best = s
        }
        occ += best / Math.sqrt(1 + best * best)
      }
      const v = 1 - (occ / dirs) * 0.85
      for (let jj = j; jj < Math.min(n, j + step); jj++) for (let ii = i; ii < Math.min(n, i + step); ii++) out[jj * n + ii] = v
    }
  }
  return out
}

function chunkGeometry(t: Terrain, ao: Float32Array, ci: number, cj: number, s: number) {
  const n = t.n
  const cells = CHUNK / s
  const verts = (cells + 1) * (cells + 1)
  // tepi turun (skirt) menutupi celah antar tingkat detail
  const skirt = cells * 4 + 4
  const total = verts + skirt
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  const w = new Float32Array(total * 4)
  const snow = new Float32Array(total)
  const zone = new Float32Array(total)
  const aoA = new Float32Array(total)
  const put = (k: number, gi: number, gj: number, drop: number) => {
    const i = Math.min(n - 1, gi)
    const j = Math.min(n - 1, gj)
    const idx = j * n + i
    const x = i * CELL - t.half
    const z = j * CELL - t.half
    pos[k * 3] = x
    pos[k * 3 + 1] = t.h[idx] - drop
    pos[k * 3 + 2] = z
    const [gx, gz] = gradAt(t, x, z)
    const l = Math.hypot(gx, 1, gz)
    nor[k * 3] = -gx / l
    nor[k * 3 + 1] = 1 / l
    nor[k * 3 + 2] = -gz / l
    for (let c = 0; c < 4; c++) w[k * 4 + c] = t.w[idx * 4 + c] / 255
    snow[k] = t.snow[idx] / 255
    zone[k] = t.zone[idx]
    aoA[k] = ao[idx]
  }
  const i0 = ci * CHUNK
  const j0 = cj * CHUNK
  for (let b = 0; b <= cells; b++) for (let a = 0; a <= cells; a++) put(b * (cells + 1) + a, i0 + a * s, j0 + b * s, 0)
  const idx: number[] = []
  for (let b = 0; b < cells; b++) {
    for (let a = 0; a < cells; a++) {
      const p = b * (cells + 1) + a
      idx.push(p, p + cells + 1, p + 1, p + 1, p + cells + 1, p + cells + 2)
    }
  }
  // skirt: keliling potongan
  let k = verts
  const ring: number[] = []
  for (let a = 0; a <= cells; a++) ring.push(a)
  for (let b = 1; b <= cells; b++) ring.push(b * (cells + 1) + cells)
  for (let a = cells - 1; a >= 0; a--) ring.push(cells * (cells + 1) + a)
  for (let b = cells - 1; b >= 1; b--) ring.push(b * (cells + 1))
  const first = k
  for (const p of ring) {
    const gi = i0 + (p % (cells + 1)) * s
    const gj = j0 + Math.floor(p / (cells + 1)) * s
    put(k++, gi, gj, 3)
  }
  for (let r = 0; r < ring.length; r++) {
    const a = ring[r]
    const b = ring[(r + 1) % ring.length]
    const sa = first + r
    const sb = first + ((r + 1) % ring.length)
    idx.push(a, sa, b, b, sa, sb)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, k * 3), 3))
  g.setAttribute('aW', new THREE.BufferAttribute(w.subarray(0, k * 4), 4))
  g.setAttribute('aSnow', new THREE.BufferAttribute(snow.subarray(0, k), 1))
  g.setAttribute('aZone', new THREE.BufferAttribute(zone.subarray(0, k), 1))
  g.setAttribute('aAO', new THREE.BufferAttribute(aoA.subarray(0, k), 1))
  g.setIndex(idx)
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

const NOISE = `
  float tHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float tNoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(tHash(i), tHash(i + vec2(1, 0)), f.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), f.x), f.y);
  }`

export type TerrainUniforms = {
  uDiff: { value: THREE.DataArrayTexture }
  uNrm: { value: THREE.DataArrayTexture | null }
  uGround: { value: THREE.Vector4[] }
  uCliff: { value: number[] }
  uSnowL: { value: number }
  uScale: { value: number }
  uCliffScale: { value: number }
  uWet: { value: number }
}

/**
 * Shader medan: 4 bahan tanah dicampur per titik dengan height-blend (sambungan mengikuti tonjolan tekstur,
 * bukan gradasi buram), tebing triplanar (tanpa tekstur melar di dinding), dan salju yang menumpuk di
 * permukaan menghadap ke atas. AO horizon dari medan meredupkan cahaya langit di lembah.
 */
export function terrainMaterial(t: Terrain, tex: TerrainTex, high: boolean) {
  const layers = layersOf(t)
  while (layers.length < 4) layers.push(layers[layers.length - 1])
  const u: TerrainUniforms = {
    uDiff: { value: tex.diff },
    uNrm: { value: tex.nrm },
    uGround: { value: layers.map((l) => new THREE.Vector4(l[0], l[1], l[2], l[3])) },
    uCliff: { value: layers.map((l) => l[4]) },
    uSnowL: { value: texIndex('salju') },
    uScale: { value: 3.4 },
    uCliffScale: { value: 7 },
    uWet: { value: t.m.id === 'rimba' || t.m.id === 'teh' ? 1 : 0 },
  }
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 })
  const nrm = !!tex.nrm
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec4 aW; attribute float aSnow; attribute float aZone; attribute float aAO;
         varying vec3 vTW; varying vec3 vTN; varying vec4 vW; varying float vSnow; flat varying int vZone; varying float vAO;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vTN = normalize(mat3(modelMatrix) * objectNormal);
         vW = aW; vSnow = aSnow; vZone = int(aZone + 0.5); vAO = aAO;`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform highp sampler2DArray uDiff;
         ${nrm ? 'uniform highp sampler2DArray uNrm;' : ''}
         uniform vec4 uGround[4]; uniform float uCliff[4]; uniform float uSnowL; uniform float uScale; uniform float uCliffScale; uniform float uWet;
         varying vec3 vTW; varying vec3 vTN; varying vec4 vW; varying float vSnow; flat varying int vZone; varying float vAO;
         ${NOISE}
         float lum(vec3 c){ return dot(c, vec3(0.3, 0.55, 0.15)); }
         vec4 sampD(vec2 uv, float l, vec2 dx, vec2 dy){ vec3 c = textureGrad(uDiff, vec3(uv, l), dx, dy).rgb; return vec4(c, lum(c)); }
         ${nrm ? 'vec3 sampN(vec2 uv, float l, vec2 dx, vec2 dy){ return textureGrad(uNrm, vec3(uv, l), dx, dy).rgb; }' : ''}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 wn = normalize(vTN);
         int zi = clamp(vZone, 0, 3);
         vec4 L = uGround[zi];
         float macro = tNoise(vTW.xz * 0.013) * 0.6 + tNoise(vTW.xz * 0.061) * 0.4;
         // tanah: 4 slot, height-blend
         vec2 uvg = vTW.xz / uScale;
         vec2 gdx = dFdx(uvg); vec2 gdy = dFdy(uvg);
         vec4 w = vW;
         vec4 d0 = sampD(uvg, L.x, gdx, gdy);
         vec4 d1 = w.y > 0.02 ? sampD(uvg * 0.93 + 0.37, L.y, gdx, gdy) : vec4(0.0);
         vec4 d2 = w.z > 0.02 ? sampD(uvg * 1.07 + 0.71, L.z, gdx, gdy) : vec4(0.0);
         vec4 d3 = w.w > 0.02 ? sampD(uvg * 0.81 + 0.19, L.w, gdx, gdy) : vec4(0.0);
         vec4 a = w + vec4(d0.a, d1.a, d2.a, d3.a) * 0.55;
         float am = max(max(a.x, a.y), max(a.z, a.w)) - 0.18;
         vec4 bw = max(a - am, 0.0); bw /= max(dot(bw, vec4(1.0)), 1e-4);
         vec3 groundC = d0.rgb * bw.x + d1.rgb * bw.y + d2.rgb * bw.z + d3.rgb * bw.w;
         // tebing: triplanar
         float cl = uCliff[zi];
         vec3 tw = pow(abs(wn), vec3(4.0)); tw /= dot(tw, vec3(1.0));
         vec2 ux = vTW.zy / uCliffScale; vec2 uz = vTW.xy / uCliffScale; vec2 uy = vTW.xz / uCliffScale;
         vec2 xdx = dFdx(ux); vec2 xdy = dFdy(ux); vec2 zdx = dFdx(uz); vec2 zdy = dFdy(uz); vec2 ydx = dFdx(uy); vec2 ydy = dFdy(uy);
         vec4 cx = tw.x > 0.02 ? sampD(ux, cl, xdx, xdy) : vec4(0.0);
         vec4 cz = tw.z > 0.02 ? sampD(uz, cl, zdx, zdy) : vec4(0.0);
         vec4 cy = tw.y > 0.02 ? sampD(uy, cl, ydx, ydy) : vec4(0.0);
         vec4 cliffD = cx * tw.x + cy * tw.y + cz * tw.z;
         float cliffW = smoothstep(0.86, 0.6, wn.y + (cliffD.a - 0.45) * 0.1 + (macro - 0.5) * 0.06);
         // salju di permukaan menghadap atas, tepinya mengikuti tonjolan tanah
         float snowW = 0.0; vec4 snowD = vec4(0.0);
         if (vSnow > 0.02) {
           snowD = sampD(uvg * 0.6, uSnowL, gdx * 0.6, gdy * 0.6);
           float lift = mix(dot(vec4(d0.a, d1.a, d2.a, d3.a), bw), cliffD.a, cliffW);
           snowW = smoothstep(0.42, 0.62, vSnow + (macro - 0.5) * 0.35 - lift * 0.25) * smoothstep(0.42, 0.72, wn.y);
         }
         vec3 albedo = mix(mix(groundC, cliffD.rgb, cliffW), snowD.rgb, snowW);
         albedo *= 0.86 + macro * 0.28;
         diffuseColor.rgb *= albedo;
         float tRough = 0.92;
         vec3 tWN = wn;
         ${
           nrm
             ? `{
           vec3 n0 = sampN(uvg, L.x, gdx, gdy);
           vec3 n1 = bw.y > 0.01 ? sampN(uvg * 0.93 + 0.37, L.y, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 n2 = bw.z > 0.01 ? sampN(uvg * 1.07 + 0.71, L.z, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 n3 = bw.w > 0.01 ? sampN(uvg * 0.81 + 0.19, L.w, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 gN = n0 * bw.x + n1 * bw.y + n2 * bw.z + n3 * bw.w;
           vec2 gt = (gN.xy * 2.0 - 1.0) * 1.1;
           vec3 groundW = normalize(vec3(gt.x + wn.x, wn.y, gt.y + wn.z));
           vec3 nx = tw.x > 0.02 ? sampN(ux, cl, xdx, xdy) : vec3(0.5, 0.5, 0.9);
           vec3 nz = tw.z > 0.02 ? sampN(uz, cl, zdx, zdy) : vec3(0.5, 0.5, 0.9);
           vec3 ny = tw.y > 0.02 ? sampN(uy, cl, ydx, ydy) : vec3(0.5, 0.5, 0.9);
           vec2 tx = (nx.xy * 2.0 - 1.0) * 1.3; vec2 tz = (nz.xy * 2.0 - 1.0) * 1.3; vec2 ty = (ny.xy * 2.0 - 1.0) * 1.3;
           vec3 cW = normalize(
             vec3(0.0, tx.y, tx.x) * tw.x + vec3(tz.x, tz.y, 0.0) * tw.z + vec3(ty.x, 0.0, ty.y) * tw.y + wn);
           tWN = normalize(mix(groundW, cW, cliffW));
           tWN = normalize(mix(tWN, wn, snowW * 0.7));
           float gR = gN.z;
           float cR = nx.z * tw.x + ny.z * tw.y + nz.z * tw.z;
           tRough = mix(mix(gR, cR, cliffW), 0.62, snowW);
         }`
             : ''
         }
         // lumut & daun basah: kilap tipis
         tRough = mix(tRough, tRough * 0.6, uWet * (1.0 - snowW) * smoothstep(0.4, 0.8, macro));`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', nrm ? 'normal = normalize((viewMatrix * vec4(tWN, 0.0)).xyz);' : '')
      .replace(
        '#include <aomap_fragment>',
        `float tAO = vAO;
         reflectedLight.indirectDiffuse *= tAO;
         reflectedLight.indirectSpecular *= tAO;
         reflectedLight.directDiffuse *= mix(1.0, tAO, 0.35);`,
      )
  }
  m.customProgramCacheKey = () => `terrain${nrm ? 'n' : ''}${high ? 'h' : ''}`
  return m
}

export type TerrainMesh = { group: THREE.Group; lods: THREE.LOD[]; material: THREE.MeshStandardMaterial }

/** potongan-potongan medan, masing-masing dengan 3 tingkat detail */
export function buildTerrainMesh(t: Terrain, ao: Float32Array, mat: THREE.MeshStandardMaterial, shadows: boolean, far: number): TerrainMesh {
  const group = new THREE.Group()
  const count = Math.ceil((t.n - 1) / CHUNK)
  const lods: THREE.LOD[] = []
  for (let cj = 0; cj < count; cj++) {
    for (let ci = 0; ci < count; ci++) {
      // potongan yang seluruhnya jauh di bawah laut/awan dilewati
      let top = -Infinity
      for (let j = cj * CHUNK; j <= Math.min(t.n - 1, (cj + 1) * CHUNK); j += 4) for (let i = ci * CHUNK; i <= Math.min(t.n - 1, (ci + 1) * CHUNK); i += 4) top = Math.max(top, t.h[j * t.n + i])
      if (t.m.sea && top < t.m.sea.y - (t.m.sea.kind === 'awan' ? 4 : 6)) continue
      const lod = new THREE.LOD()
      ;[1, 2, 4, 8].forEach((s, k) => {
        const mesh = new THREE.Mesh(chunkGeometry(t, ao, ci, cj, s), mat)
        mesh.receiveShadow = shadows
        mesh.castShadow = shadows && k === 0
        lod.addLevel(mesh, k === 0 ? 0 : LOD_DIST[k - 1] * far)
      })
      lod.autoUpdate = true
      group.add(lod)
      lods.push(lod)
    }
  }
  return { group, lods, material: mat }
}
