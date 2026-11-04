// Tambalan shader Tali Jodoh di atas MeshStandardMaterial (onBeforeCompile), supaya PBR, kabut,
// dan bayangan bawaan three tetap jalan: tanah triplanar berbibir rumput, tanaman bergoyang angin,
// permukaan air/lava/setrum, cahaya tepi karakter, dan tali berpilin.
import * as THREE from 'three'

/** jam bersama semua tambalan (detik) */
export const clock = { value: 0 }

export const NOISE = /* glsl */ `
  float th21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float tnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(th21(i), th21(i + vec2(1.0, 0.0)), f.x), mix(th21(i + vec2(0.0, 1.0)), th21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float tfbm(vec2 p){
    float a = 0.5; float s = 0.0;
    for (int k = 0; k < 4; k++) { s += a * tnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return s / 0.9375;
  }`

export type GroundLook = {
  map: THREE.Texture
  normal: THREE.Texture
  /** meter per ulangan tekstur */
  scale: number
  tint: string
  gain?: number
  /** bibir atas (rumput, lumut, pasir); kosong = tanpa bibir */
  cap?: { map: THREE.Texture; normal: THREE.Texture; scale: number; tint: string; depth: number; gain?: number }
  /** gelapkan bagian bawah supaya terasa dalam */
  deep: number
  /** retak menyala (kawah) */
  glow?: string
}

/**
 * Tanah/batu/kayu triplanar: tekstur mengikuti posisi dunia jadi tidak ada sambungan UV.
 * Atribut `aTop` = tinggi permukaan atas pijakan, dipakai untuk bibir rumput yang tepinya acak.
 */
export function groundMaterial(o: GroundLook): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.tint).multiplyScalar(o.gain ?? 1), roughness: 0.9, metalness: 0 })
  // warna bibir dibagi warna dasar karena diffuseColor sudah dikali warna bahan
  const capTint = new THREE.Color(o.cap?.tint ?? '#ffffff').multiplyScalar(o.cap?.gain ?? 1)
  const base = m.color
  capTint.setRGB(capTint.r / Math.max(0.05, base.r), capTint.g / Math.max(0.05, base.g), capTint.b / Math.max(0.05, base.b))
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      tMap: { value: o.map },
      tNor: { value: o.normal },
      tScale: { value: 1 / o.scale },
      cMap: { value: o.cap?.map ?? o.map },
      cNor: { value: o.cap?.normal ?? o.normal },
      cScale: { value: 1 / (o.cap?.scale ?? o.scale) },
      cTint: { value: capTint },
      cDepth: { value: o.cap ? o.cap.depth : -1 },
      uDeep: { value: o.deep },
      uGlow: { value: new THREE.Color(o.glow ?? '#000000') },
      uTime: clock,
    })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTop;\nvarying float vTop;\nvarying vec3 vW;\nvarying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);\nvTop = aTop;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D tMap; uniform sampler2D tNor; uniform float tScale;
         uniform sampler2D cMap; uniform sampler2D cNor; uniform float cScale; uniform vec3 cTint; uniform float cDepth;
         uniform float uDeep; uniform vec3 uGlow; uniform float uTime;
         varying float vTop; varying vec3 vW; varying vec3 vWN;
         ${NOISE}
         vec3 triW(vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }
         vec4 tri(sampler2D t, vec3 p, vec3 w, float s){
           return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
         }
         // normal triplanar (whiteout) ke ruang dunia
         vec3 triN(sampler2D t, vec3 p, vec3 n, vec3 w, float s){
           vec3 tx = texture2D(t, p.zy * s).xyz * 2.0 - 1.0;
           vec3 ty = texture2D(t, p.xz * s).xyz * 2.0 - 1.0;
           vec3 tz = texture2D(t, p.xy * s).xyz * 2.0 - 1.0;
           vec3 nx = vec3(tx.xy + n.zy, abs(tx.z) * n.x).zyx;
           vec3 ny = vec3(ty.xy + n.xz, abs(ty.z) * n.y).xzy;
           vec3 nz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
           return normalize(nx * w.x + ny * w.y + nz * w.z);
         }
         float capK;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 tw = triW(vWN);
         float edgeN = tfbm(vec2(vW.x * 1.3, vW.z * 1.3));
         capK = cDepth < 0.0 ? 0.0 : smoothstep(vTop - cDepth - 0.08, vTop - cDepth + 0.04, vW.y + (edgeN - 0.5) * cDepth * 1.2) * step(-0.6, vWN.y);
         vec4 baseC = tri(tMap, vW, tw, tScale);
         vec4 capC = tri(cMap, vW, tw, cScale) * vec4(cTint, 1.0);
         // bercak besar anti pola berulang
         float big = tfbm(vW.xy * 0.11 + vW.z * 0.07);
         baseC.rgb *= 0.78 + 0.44 * big;
         capC.rgb *= 0.85 + 0.3 * tnoise(vW.xz * 0.7);
         diffuseColor *= mix(baseC, capC, capK);
         // makin dalam makin gelap
         diffuseColor.rgb *= mix(1.0, clamp(1.0 - (vTop - vW.y) * uDeep, 0.35, 1.0), 1.0 - capK);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
           vec3 nW = normalize(vWN);
           vec3 nb = triN(tNor, vW, nW, tw, tScale);
           vec3 nc = triN(cNor, vW, nW, tw, cScale);
           vec3 nn = normalize(mix(nb, nc, capK));
           normal = normalize((viewMatrix * vec4(nn, 0.0)).xyz);
         }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float vein = abs(tfbm(vW.xy * 0.35) - 0.5);
         totalEmissiveRadiance += uGlow * smoothstep(0.03, 0.0, vein) * (1.0 - capK) * (1.6 + 0.6 * sin(uTime * 2.0 + vW.x));`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.75, capK);')
  }
  m.customProgramCacheKey = () => `tali-ground-${o.cap ? 1 : 0}-${o.glow ? 1 : 0}`
  return m
}

/** tanaman dan kain bergoyang: makin tinggi dari kaki objek makin besar ayunannya */
export function patchSway(m: THREE.MeshStandardMaterial, amp = 0.08, speed = 1.6) {
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r)
    sh.uniforms.uTime = clock
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           vec4 wp = modelMatrix * vec4(position, 1.0);
           #ifdef USE_INSTANCING
             wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
           #endif
           float h = max(0.0, position.y);
           float ph = wp.x * 0.45 + wp.z * 0.3;
           float s = sin(uTime * ${speed.toFixed(2)} + ph) + 0.4 * sin(uTime * ${(speed * 2.3).toFixed(2)} + ph * 1.7);
           transformed.x += s * ${amp.toFixed(3)} * h * h;
           transformed.z += cos(uTime * ${(speed * 0.8).toFixed(2)} + ph) * ${(amp * 0.5).toFixed(3)} * h * h;
         }`,
      )
  }
  m.customProgramCacheKey = () => `tali-sway-${amp}-${speed}`
}

/** berpendar berdenyut pelan (lampu, kristal, lava di kit) */
export function patchGlow(m: THREE.MeshStandardMaterial, pulse = 0.25) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 + ${pulse.toFixed(2)} * sin(uTime * 2.4 + vViewPosition.x * 0.8);`)
  }
  m.customProgramCacheKey = () => `tali-glow-${pulse}`
}

/** cahaya tepi lembut supaya karakter menonjol dari latar */
export function patchRim(m: THREE.MeshStandardMaterial, color: string, k = 0.55) {
  const c = new THREE.Color(color)
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: c }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
         totalEmissiveRadiance += uRim * rim * ${k.toFixed(2)};`,
      )
  }
  m.customProgramCacheKey = () => `tali-rim-${color}-${k}`
}

export type HazardLook = 'air' | 'lava' | 'listrik' | 'duri'

/** permukaan bahaya beranimasi: air beriak bening, lava mengalir, lantai setrum berkedip */
export function hazardMaterial(kind: Exclude<HazardLook, 'duri'>, tint: string): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: tint,
    roughness: kind === 'air' ? 0.05 : 0.6,
    metalness: kind === 'listrik' ? 0.6 : 0,
    transparent: kind === 'air',
    opacity: kind === 'air' ? 0.82 : 1,
    emissive: kind === 'lava' ? '#ff5a10' : kind === 'listrik' ? '#3aa8ff' : '#000000',
  })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vW;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
         ${kind === 'air' ? 'if (position.y > -0.01) transformed.y += sin(wp0.x * 1.7 + uTime * 1.8) * 0.05 + sin(wp0.z * 2.3 - uTime * 1.3) * 0.035;' : ''}
         ${kind === 'lava' ? 'if (position.y > -0.01) transformed.y += sin(wp0.x * 0.9 + uTime * 0.8) * 0.06;' : ''}`,
      )
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vW;\n${NOISE}`)
      .replace(
        '#include <map_fragment>',
        kind === 'air'
          ? `float rip = tfbm(vW.xz * 1.2 + vec2(uTime * 0.25, uTime * 0.1));
             float foam = smoothstep(0.62, 0.8, tfbm(vW.xz * 3.0 - uTime * 0.2));
             diffuseColor.rgb = mix(diffuseColor.rgb * (0.75 + 0.5 * rip), vec3(0.95), foam * 0.45);`
          : kind === 'lava'
            ? `float flow = tfbm(vW.xz * 0.6 + vec2(uTime * 0.12, 0.0)) + tfbm(vW.xy * 0.8 - uTime * 0.05) * 0.5;
               float crust = smoothstep(0.55, 0.85, flow);
               diffuseColor.rgb = mix(vec3(1.0, 0.45, 0.08), vec3(0.12, 0.05, 0.04), crust);`
            : `float tile = step(0.94, fract(vW.x * 1.0)) + step(0.94, fract(vW.z * 1.0));
               diffuseColor.rgb = mix(vec3(0.18, 0.2, 0.24), vec3(0.5, 0.55, 0.6), tile);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        kind === 'air'
          ? '#include <emissivemap_fragment>'
          : kind === 'lava'
            ? `#include <emissivemap_fragment>
               totalEmissiveRadiance *= (1.0 - crust) * (1.4 + 0.5 * sin(uTime * 1.5 + vW.x));`
            : `#include <emissivemap_fragment>
               float arc = abs(tfbm(vec2(vW.x * 2.0 + uTime * 3.0, vW.z * 4.0 + floor(uTime * 8.0))) - 0.5);
               float flick = step(0.35, fract(sin(floor(uTime * 12.0) * 12.9898) * 43758.5453));
               totalEmissiveRadiance *= smoothstep(0.035, 0.0, arc) * 3.5 * flick + tile * 0.3;`,
      )
  }
  m.customProgramCacheKey = () => `tali-hazard-${kind}`
  return m
}

/** tali berpilin: garis serat miring mengikuti UV tabung; makin tegang makin kemerahan */
export function ropeMaterial(): THREE.MeshStandardMaterial & { userData: { tension: { value: number } } } {
  const m = new THREE.MeshStandardMaterial({ color: '#d9a65b', roughness: 0.85, metalness: 0 }) as THREE.MeshStandardMaterial & { userData: { tension: { value: number } } }
  m.userData.tension = { value: 0 }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTension = m.userData.tension
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRopeUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvRopeUv = uv;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTension;\nvarying vec2 vRopeUv;')
      .replace(
        '#include <map_fragment>',
        `float twist = fract(vRopeUv.x * 46.0 + vRopeUv.y * 3.0);
         float fiber = smoothstep(0.0, 0.18, twist) * smoothstep(1.0, 0.7, twist);
         diffuseColor.rgb *= 0.62 + 0.45 * fiber;
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.35, 0.3), uTension * 0.45);`,
      )
  }
  m.customProgramCacheKey = () => 'tali-rope'
  return m
}

/** langit gradasi untuk tema tanpa HDR (gua): warna atas, bawah */
export function gradientSky(top: string, bottom: string): THREE.Mesh {
  const g = new THREE.SphereGeometry(400, 24, 12)
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 vP; void main(){ float h = normalize(vP).y * 0.5 + 0.5; gl_FragColor = vec4(mix(b, a, smoothstep(0.3, 0.9, h)), 1.0); }',
  })
  const s = new THREE.Mesh(g, m)
  s.renderOrder = -10
  return s
}

/** permukaan ban berjalan: garis karet bergulir searah kecepatan sabuk */
export function beltMaterial(speed: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: '#2b2d33', roughness: 0.7, metalness: 0.2 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vW;')
      .replace(
        '#include <map_fragment>',
        `float st = fract((vW.x - uTime * ${speed.toFixed(2)}) * 1.6);
         float ridge = smoothstep(0.0, 0.08, st) * smoothstep(0.35, 0.27, st);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.75, 0.15), ridge * 0.85);`,
      )
  }
  m.customProgramCacheKey = () => `tali-belt-${speed}`
  return m
}
