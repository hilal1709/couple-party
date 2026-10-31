import * as THREE from 'three'

/**
 * Tambalan shader di atas MeshStandardMaterial lewat onBeforeCompile, supaya kabut, bayangan,
 * dan PBR bawaan tetap jalan. Grafis Hemat tidak memakai satu pun tambalan ini.
 */

/** jam bersama semua tambalan; bahan model dipakai ulang antar balapan, jadi jamnya tidak boleh per dunia */
export const worldClock = { value: 0 }

const NOISE = /* glsl */ `
  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p){
    float a = 0.5; float s = 0.0;
    for (int k = 0; k < 3; k++) { s += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return s / 0.875;
  }`

/** varying posisi dunia untuk bahan tanpa instancing */
function worldVarying(vs: string) {
  return vs
    .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
}

export type RoadLook = {
  /** kekuatan jalur aus di dua lajur ban (0..1) */
  wear: number
  /** warna yang menumpuk di tepi jalan (pasir, debu) */
  edge: string
  edgeAmount: number
  /** genangan basah (0 = kering) */
  wet: number
  /** tiga warna pantulan papan neon di genangan */
  glow?: [string, string, string]
  /** retak menyala di sela permukaan */
  crack?: string
  /** bias mip tekstur jalan: butir kerikil yang berbintik di aspal gelap jadi halus */
  soften?: number
}

/** jalan: bercak besar anti-tiling, jalur aus, tumpukan tepi, genangan dengan pantulan */
export function patchRoad(mat: THREE.MeshStandardMaterial, o: RoadLook, wet: boolean) {
  const glow = (o.glow ?? ['#000000', '#000000', '#000000']).map((c) => new THREE.Color(c))
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uWear: { value: o.wear },
      uEdge: { value: new THREE.Color(o.edge) },
      uEdgeK: { value: o.edgeAmount },
      uWet: { value: wet ? o.wet : 0 },
      uGlow: { value: glow },
      uCrack: { value: new THREE.Color(o.crack ?? '#000000') },
      uTime: worldClock,
    })
    sh.vertexShader = worldVarying(sh.vertexShader)
      .replace('#include <common>', '#include <common>\nattribute float side;\nvarying float vSide;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSide = side;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uWear; uniform vec3 uEdge; uniform float uEdgeK; uniform float uWet; uniform vec3 uGlow[3]; uniform vec3 uCrack; uniform float uTime;
         varying vec3 vW; varying float vSide; ${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `${o.soften ? `diffuseColor.rgb *= texture2D(map, vMapUv, ${o.soften.toFixed(1)}).rgb;` : '#include <map_fragment>'}
         float patchN = fbm(vW.xz * 0.05);
         float fineN = vnoise(vW.xz * 0.9);
         diffuseColor.rgb *= 0.82 + 0.36 * patchN;
         float lane = smoothstep(0.2, 0.02, abs(abs(vSide) - 0.42));
         diffuseColor.rgb *= 1.0 - uWear * lane * (0.55 + 0.45 * fineN);
         float rim = smoothstep(0.62, 1.0, abs(vSide) + (patchN - 0.5) * 0.5 + (fineN - 0.5) * 0.08);
         diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, rim * uEdgeK);
         float wetK = uWet > 0.0 ? uWet * smoothstep(0.42, 0.56, fbm(vW.xz * 0.028 + 3.0)) : 0.0;
         diffuseColor.rgb *= 1.0 - wetK * 0.55;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.08, wetK);')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         if (wetK > 0.0) {
           // pantulan papan neon: garis memanjang ke arah kamera, warnanya berganti menurut sudut
           vec2 fromCam = vW.xz - cameraPosition.xz;
           float a = atan(fromCam.y, fromCam.x);
           float view = pow(1.0 - clamp(normalize(cameraPosition - vW).y, 0.0, 1.0), 3.0);
           float streak = pow(0.5 + 0.5 * sin(a * 37.0), 5.0) * (0.45 + 0.55 * fbm(vec2(a * 9.0, length(fromCam) * 0.02)));
           float pick = fract(a * 2.4);
           vec3 col = pick < 0.34 ? uGlow[0] : pick < 0.67 ? uGlow[1] : uGlow[2];
           totalEmissiveRadiance += col * streak * view * wetK * 0.6;
         }
         ${o.crack ? `float vein = abs(fbm(vW.xz * 0.075) - 0.5) + abs(vSide) * 0.012;
         totalEmissiveRadiance += uCrack * smoothstep(0.022, 0.0, vein) * (2.1 + 0.7 * sin(uTime * 1.6 + vW.x * 0.03));` : ''}`,
      )
  }
  mat.customProgramCacheKey = () => `road${wet}${o.crack ? 1 : 0}${o.soften ?? 0}`
}

export type TerrainLook = {
  /** tekstur pengganti di bagian rendah (pasir basah di tepi laut) */
  low?: { map: THREE.Texture; from: number; to: number; roughness: number }
  /** tinggi garis air: buih bergerak di garis pantai */
  foamY?: number
  /** warna celup menurut ketinggian */
  tint?: { low: string; high: string; from: number; to: number }
  /** tekstur di lereng curam */
  steep?: THREE.Texture
  /** petak sawah per undakan: air memantulkan langit atau padi, dipisah pematang */
  paddy?: { step: number; water: string; rice: string }
  /** lapisan batuan berselang menurut ketinggian */
  strata?: { step: number; dark: string; light: string }
  /** bercak lumut menyala */
  glow?: string
  /** aliran lava: dasar kawah menyala, dinding kawah gelap */
  lava?: boolean
}

/** tanah: dua skala sampel + warna makro menghilangkan pola berulang, bagian rendah diganti tekstur lain */
export function patchTerrain(mat: THREE.MeshStandardMaterial, o: TerrainLook) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uTime: worldClock,
      uLow: { value: o.low?.map ?? null },
      uLowR: { value: new THREE.Vector3(o.low?.from ?? 0, o.low?.to ?? 0, o.low?.roughness ?? 1) },
      uFoam: { value: o.foamY ?? -1e4 },
      uTintA: { value: new THREE.Color(o.tint?.low ?? '#ffffff') },
      uTintB: { value: new THREE.Color(o.tint?.high ?? '#ffffff') },
      uTintR: { value: new THREE.Vector2(o.tint?.from ?? 0, o.tint?.to ?? 1) },
      uSteep: { value: o.steep ?? null },
      uPaddyW: { value: new THREE.Color(o.paddy?.water ?? '#ffffff') },
      uPaddyR: { value: new THREE.Color(o.paddy?.rice ?? '#ffffff') },
      uStep: { value: o.paddy?.step ?? o.strata?.step ?? 1 },
      uStrA: { value: new THREE.Color(o.strata?.dark ?? '#ffffff') },
      uStrB: { value: new THREE.Color(o.strata?.light ?? '#ffffff') },
      uGlowC: { value: new THREE.Color(o.glow ?? '#000000') },
    })
    sh.vertexShader = worldVarying(sh.vertexShader)
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime; uniform vec3 uLowR; uniform float uFoam;
         uniform vec3 uTintA; uniform vec3 uTintB; uniform vec2 uTintR; uniform vec3 uPaddyW; uniform vec3 uPaddyR;
         uniform float uStep; uniform vec3 uStrA; uniform vec3 uStrB; uniform vec3 uGlowC;
         ${o.low ? 'uniform sampler2D uLow;' : ''}
         ${o.steep ? 'uniform sampler2D uSteep;' : ''}
         varying vec3 vW; ${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 near = texture2D(map, vMapUv).rgb;
         vec3 far = texture2D(map, vMapUv * 0.17 + 0.31).rgb;
         vec3 ground = mix(near, far, 0.45);
         float macro = fbm(vW.xz * 0.009);
         float wetK = 0.0;
         ${
           o.low
             ? `float lowK = smoothstep(uLowR.y, uLowR.x, vW.y + (fbm(vW.xz * 0.05) - 0.5) * 1.1);
                ground = mix(ground, texture2D(uLow, vMapUv * 0.6).rgb, lowK);
                wetK = lowK;`
             : ''
         }
         ${
           o.steep
             ? `vec3 faceN = normalize(cross(dFdx(vW), dFdy(vW)));
                float cliff = smoothstep(0.1, 0.3, 1.0 - abs(faceN.y) + (macro - 0.5) * 0.12);
                ground = mix(ground, texture2D(uSteep, vMapUv * 0.4).rgb * 1.5, cliff);`
             : ''
         }
         ${o.tint ? `ground *= mix(uTintA, uTintB, smoothstep(uTintR.x, uTintR.y, vW.y + (macro - 0.5) * 8.0));` : ''}
         ${
           o.strata
             ? `float layer = vW.y / uStep + (fbm(vW.xz * 0.02) - 0.5) * 0.9;
                float bandK = 0.5 + 0.5 * sin(layer * 6.283);
                ground *= mix(uStrA, uStrB, bandK * bandK) * 1.5;`
             : ''
         }
         ${
           o.paddy
             ? `float tier = vW.y / uStep;
                float bandId = floor(tier);
                float bandF = fract(tier);
                float bund = smoothstep(0.1, 0.02, min(bandF, 1.0 - bandF));
                float plot = step(0.42, hash21(vec2(bandId, floor((vW.x + vW.z * 0.6) / 95.0))));
                vec3 rice = uPaddyR * (0.7 + 0.5 * vnoise(vW.xz * 0.7));
                float pondK = plot * (1.0 - bund);
                ground = mix(mix(ground, rice, 1.0 - bund), uPaddyW * 0.5, pondK);
                wetK = max(wetK, pondK);`
             : ''
         }
         ${o.lava ? `ground *= 0.32;` : ''}
         diffuseColor.rgb *= ground * (0.74 + 0.52 * macro);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uLowR.z, wetK);')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         if (uFoam > -1e3) {
           float tide = uFoam + 0.34 * sin(uTime * 0.7 + vW.x * 0.02 + vW.z * 0.015);
           float lace = 0.5 + 0.5 * sin(vW.x * 0.6 + vnoise(vW.xz * 0.14) * 9.0 + uTime * 0.5);
           float foam = smoothstep(0.34, 0.0, abs(vW.y - tide)) * (0.45 + 0.55 * lace);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.85);
           totalEmissiveRadiance += foam * 0.16;
         }
         ${
           o.glow
             ? `float moss = smoothstep(0.7, 0.73, fbm(vW.xz * 0.16 + 7.0));
                totalEmissiveRadiance += uGlowC * moss * (0.2 + 0.1 * sin(uTime * 1.3 + vW.x * 0.05));`
             : ''
         }
         ${
           o.lava
             ? `vec2 flowP = vW.xz * 0.018 + vec2(uTime * 0.012, uTime * 0.02);
                float crust = fbm(flowP + fbm(flowP * 1.7));
                float hot = smoothstep(0.62, 0.34, crust) * smoothstep(34.0, 12.0, vW.y);
                vec3 lavaC = mix(vec3(1.0, 0.16, 0.03), vec3(1.0, 0.66, 0.14), smoothstep(0.42, 0.26, crust));
                totalEmissiveRadiance += lavaC * hot * 1.7;`
             : ''
         }`,
      )
  }
  mat.customProgramCacheKey = () => `terrain${[o.low, o.foamY !== undefined, o.tint, o.steep, o.paddy, o.strata, o.glow, o.lava].map((v) => (v ? 1 : 0)).join('')}`
}

/** goyangan angin di vertex shader: ujung atas model bergerak, pangkal diam */
export function patchWind(mat: THREE.Material, height: number, push: number) {
  const m = mat as THREE.MeshStandardMaterial
  if (m.userData.wind) return
  m.userData.wind = true
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = worldClock
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float windP = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.17;
       #else
         float windP = 0.0;
       #endif
       float windH = clamp(position.y / ${height.toFixed(1)}, 0.0, 1.0);
       windH *= windH;
       transformed.x += (sin(uTime * 1.5 + windP) + 0.4 * sin(uTime * 3.7 + windP * 2.0)) * windH * ${push.toFixed(2)};
       transformed.z += cos(uTime * 1.2 + windP) * windH * ${(push * 0.6).toFixed(2)};`,
    )
  }
  m.customProgramCacheKey = () => `wind${height}`
}

/** jendela gedung menyala malam hari: kisi di koordinat model, sebagian kamar gelap */
export function patchWindows(mat: THREE.Material) {
  const m = mat as THREE.MeshStandardMaterial
  if (m.userData.windows) return
  m.userData.windows = true
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vL; varying float vWall; varying float vSeed;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vL = position;
         vWall = 1.0 - abs(normal.y);
         #ifdef USE_INSTANCING
           vSeed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.71;
         #else
           vSeed = 0.0;
         #endif`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vL; varying float vWall; varying float vSeed; ${NOISE}`)
      .replace(
        '#include <map_fragment>',
        // bata asli model merah semua: warnanya diganti palet malam per gedung, coraknya tetap
        `#include <map_fragment>
         float bldg = fract(vSeed * 0.0731);
         vec3 bldgCol = bldg < 0.3 ? vec3(0.2, 0.2, 0.42) : bldg < 0.55 ? vec3(0.13, 0.3, 0.42) : bldg < 0.8 ? vec3(0.32, 0.19, 0.42) : vec3(0.36, 0.32, 0.44);
         diffuseColor.rgb = bldgCol * (0.55 + 0.9 * dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec2 winUv = vec2((vL.x + vL.z) / 1.5, vL.y / 1.9);
         vec2 winCell = floor(winUv);
         vec2 winF = fract(winUv);
         float winShape = step(0.22, winF.x) * step(winF.x, 0.78) * step(0.28, winF.y) * step(winF.y, 0.72);
         float winLit = step(0.68, hash21(winCell + vec2(vSeed, vSeed * 0.5)));
         float winTint = hash21(winCell * 1.7 + vSeed);
         vec3 winCol = winTint < 0.6 ? vec3(1.0, 0.72, 0.38) : winTint < 0.8 ? vec3(0.4, 0.9, 1.0) : vec3(1.0, 0.32, 0.7);
         totalEmissiveRadiance += winCol * winShape * winLit * smoothstep(0.7, 0.95, vWall) * 0.55;`,
      )
  }
  m.customProgramCacheKey = () => 'windows'
}

export const WATER_VERT = /* glsl */ `
  uniform float time; uniform float waveK; varying vec3 wp; varying float wave;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    wave = sin(w.x*0.06 + time*1.3)*0.5 + sin(w.z*0.05 - time*1.1)*0.5;
    w.y += wave * 0.6 * waveK;
    wp = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`

/** air: normal dari noise berjalan, pantulan langit (fresnel), kilau matahari, bercak dangkal-dalam */
export const WATER_FRAG = /* glsl */ `
  uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sky; uniform vec3 sunDir; uniform vec3 sunCol;
  varying vec3 wp; varying float wave;
  ${NOISE}
  float ripple(vec2 p){ return fbm(p * 0.11 + vec2(time * 0.13, time * 0.09)) + 0.5 * vnoise(p * 0.42 - vec2(time * 0.3, -time * 0.2)); }
  void main(){
    float e = 0.7;
    float h0 = ripple(wp.xz);
    vec3 n = normalize(vec3((h0 - ripple(wp.xz + vec2(e, 0.0))) * 1.7, 1.0, (h0 - ripple(wp.xz + vec2(0.0, e))) * 1.7));
    vec3 v = normalize(cameraPosition - wp);
    float fres = pow(1.0 - max(dot(v, n), 0.0), 3.0);
    float patches = fbm(wp.xz * 0.006 + 4.0);
    vec3 c = mix(deep, shallow, clamp(patches * 1.1 + wave * 0.12, 0.0, 1.0));
    c = mix(c, sky, min(1.0, fres * 0.9));
    float spec = pow(max(dot(reflect(-sunDir, n), v), 0.0), 220.0);
    c += sunCol * spec * 2.4;
    gl_FragColor = vec4(c, 0.93);
    #include <colorspace_fragment>
  }`
