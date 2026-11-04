import * as THREE from 'three'

/** waktu bersama untuk semua shader yang bergerak */
export const uTime = { value: 0 }
/** 0..1: seberapa dekat Penunggu (layar & cahaya ikut gelisah) */
export const uFear = { value: 0 }

const NOISE = /* glsl */ `
float sn_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sn_noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sn_hash(i), sn_hash(i + vec2(1.0, 0.0)), u.x), mix(sn_hash(i + vec2(0.0, 1.0)), sn_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float sn_fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * sn_noise(p); p *= 2.03; a *= 0.5; } return s; }
`

type Patch = {
  uniforms?: Record<string, THREE.IUniform>
  vertexHead?: string
  /** disisipkan setelah #include <begin_vertex>; `transformed` = posisi lokal */
  vertex?: string
  fragHead?: string
  /** pasangan [cari, ganti] di fragment shader */
  frag?: [string, string][]
  key: string
}

/** tambal shader bawaan MeshStandardMaterial tanpa menulis ulang pencahayaannya */
export function patch(mat: THREE.Material, p: Patch) {
  const prev = mat.onBeforeCompile
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r)
    Object.assign(sh.uniforms, { uTime, uFear }, p.uniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uFear;\nvarying vec3 vWp;\n${NOISE}\n${p.vertexHead ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${p.vertex ?? ''}`)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>\n{ vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWp = (modelMatrix * wp4).xyz; }`,
      )
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uFear;\nvarying vec3 vWp;\n${NOISE}\n${p.fragHead ?? ''}`)
    for (const [a, b] of p.frag ?? []) f = f.replace(a, b)
    sh.fragmentShader = f
  }
  const prevKey = mat.customProgramCacheKey.bind(mat)
  mat.customProgramCacheKey = () => prevKey() + p.key
  mat.needsUpdate = true
}

/** daun & kain bergoyang angin; makin tinggi dari pangkal (`base` m) makin goyang */
export function windSway(mat: THREE.Material, amount = 0.08, base = 0.5) {
  patch(mat, {
    key: `sway${amount}${base}`,
    vertex: /* glsl */ `{
      vec3 root = vec3(0.0);
      #ifdef USE_INSTANCING
        root = instanceMatrix[3].xyz;
      #endif
      float h = max(0.0, position.y - ${base.toFixed(2)});
      float gust = 0.6 + 0.4 * sin(uTime * 0.37 + root.x * 0.05);
      float w = sin(uTime * 1.6 + root.x * 0.7 + root.z * 0.5 + position.x * 0.8) + 0.5 * sin(uTime * 3.1 + position.z * 1.7 + root.x);
      transformed.x += w * ${amount.toFixed(3)} * h * gust;
      transformed.z += cos(uTime * 1.3 + root.z * 0.6 + position.y) * ${(amount * 0.6).toFixed(3)} * h * gust;
    }`,
  })
}

/**
 * Tanah: campuran tanah, rumput, dan jalan batu menurut peta topeng (R = jalan, G = rumput),
 * ditambah noda gelap acak supaya pengulangan tekstur tidak kelihatan.
 */
export function groundBlend(mat: THREE.MeshStandardMaterial, mask: THREE.Texture, grass: THREE.Texture, stone: THREE.Texture, size: number) {
  patch(mat, {
    key: 'ground',
    uniforms: { uMask: { value: mask }, uGrass: { value: grass }, uStone: { value: stone }, uSize: { value: size } },
    fragHead: 'uniform sampler2D uMask; uniform sampler2D uGrass; uniform sampler2D uStone; uniform float uSize;',
    frag: [
      [
        '#include <map_fragment>',
        /* glsl */ `
        vec2 wuv = vWp.xz;
        vec4 mk = texture2D(uMask, wuv / uSize + 0.5);
        float breakup = sn_fbm(wuv * 0.08);
        vec3 dirt = texture2D(map, wuv / 3.2).rgb * mix(0.75, 1.1, breakup);
        vec3 grass = texture2D(uGrass, wuv / 2.6 + vec2(breakup)).rgb * 0.8;
        vec3 stone = texture2D(uStone, wuv / 2.2).rgb;
        float g = smoothstep(0.35, 0.65, mk.g + (breakup - 0.5) * 0.5);
        float s = smoothstep(0.3, 0.7, mk.r + (sn_noise(wuv * 1.3) - 0.5) * 0.35);
        diffuseColor.rgb *= mix(mix(dirt, grass, g), stone, s);
        diffuseColor.rgb *= 0.85 + 0.3 * sn_noise(wuv * 0.5);
        `,
      ],
    ],
  })
}

/** pusaka berkilau samar supaya tertangkap senter, berdenyut pelan */
export function glimmer(mat: THREE.MeshStandardMaterial, color: THREE.ColorRepresentation) {
  mat.emissive = new THREE.Color(color)
  patch(mat, {
    key: 'glimmer',
    frag: [
      [
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        float pulse = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 2.2 + vWp.x * 3.0), 3.0);
        float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.0);
        totalEmissiveRadiance *= (0.15 + rim * 1.4) * pulse;`,
      ],
    ],
  })
}

/** kain lusuh Penunggu: berkibar, ujung bawah robek-robek, sedikit tembus pandang */
export function shroud(mat: THREE.MeshStandardMaterial, height: number, lunge: THREE.IUniform<number>) {
  mat.transparent = true
  mat.side = THREE.DoubleSide
  patch(mat, {
    key: 'shroud',
    uniforms: { uH: { value: height }, uLunge: lunge },
    vertexHead: 'uniform float uH; uniform float uLunge; varying float vY;',
    vertex: /* glsl */ `
      vY = position.y / uH;
      float low = 1.0 - vY;
      float wave = sin(uTime * 2.4 + position.y * 3.0 + atan(position.z, position.x) * 3.0);
      transformed.xz *= 1.0 + low * 0.12 * wave;
      transformed.x += low * low * (0.18 * sin(uTime * 1.7 + position.z * 4.0));
      transformed.z += low * low * (0.12 * cos(uTime * 1.3 + position.x * 5.0)) - low * low * uLunge * 0.6;
    `,
    fragHead: 'varying float vY;',
    frag: [
      [
        '#include <alphatest_fragment>',
        /* glsl */ `
        float tear = sn_fbm(vec2(atan(vWp.z, vWp.x) * 2.0 + vWp.x * 3.0, vY * 4.0 + uTime * 0.05));
        if (vY < 0.18 * tear + 0.02) discard;
        diffuseColor.a *= mix(0.55, 0.95, smoothstep(0.0, 0.5, vY));
        #include <alphatest_fragment>`,
      ],
    ],
  })
}

/** rambut panjang: helai bergoyang lebih kuat di ujung */
export function hairSway(mat: THREE.Material, len: number) {
  patch(mat, {
    key: 'hair',
    uniforms: { uLen: { value: len } },
    vertexHead: 'uniform float uLen;',
    vertex: /* glsl */ `
      float t = clamp(-position.y / uLen, 0.0, 1.0);
      transformed.x += sin(uTime * 1.9 + position.x * 7.0) * 0.05 * t * t;
      transformed.z += cos(uTime * 1.4 + position.x * 5.0) * 0.06 * t * t;
    `,
  })
}

/** cincin gelombang suara di tanah: menunjukkan seberapa jauh suaramu terdengar */
export function ringMaterial(color: THREE.ColorRepresentation) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime, uColor: { value: new THREE.Color(color) }, uAmp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uAmp; varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float waves = 0.0;
        for (int i = 0; i < 3; i++) {
          float p = fract(uTime * 0.9 + float(i) / 3.0);
          waves += smoothstep(0.06, 0.0, abs(r - p)) * (1.0 - p);
        }
        float edge = smoothstep(0.035, 0.0, abs(r - 0.985));
        gl_FragColor = vec4(uColor * (waves * 0.6 + edge * 0.5) * uAmp, 1.0);
      }`,
  })
}

/** kabut tanah yang bergeser pelan; dipasang di beberapa lapis bidang datar */
export function groundFogMaterial(color: THREE.ColorRepresentation, size: number) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uLayer: { value: 0 } }])
  // merge menyalin nilai: waktu bersama dipasang sesudahnya
  uniforms.uTime = uTime
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWp2;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp2 = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uColor; uniform float uSize; uniform float uLayer; uniform float uTime;
      varying vec3 vWp2;
      ${NOISE.replaceAll('sn_', 'gf_')}
      void main() {
        vec2 p = vWp2.xz * 0.06 + vec2(uTime * 0.012 * (1.0 + uLayer), uTime * 0.007);
        float n = gf_fbm(p + uLayer * 7.3);
        float d = smoothstep(0.5, 0.9, n);
        float edge = 1.0 - smoothstep(uSize * 0.42, uSize * 0.5, max(abs(vWp2.x), abs(vWp2.z)));
        gl_FragColor = vec4(uColor, d * 0.14 * edge);
        #include <fog_fragment>
      }`,
  })
}

/** kerucut cahaya senter yang tampak di udara berkabut */
export function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime, uStrength: { value: 0.12 } },
    vertexShader: /* glsl */ `
      varying float vT; varying vec3 vN; varying vec3 vV; varying vec3 vWp2;
      void main() {
        vT = 1.0 - uv.y;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp2 = wp.xyz;
        vN = normalize(normalMatrix * normal);
        vec4 mv = viewMatrix * wp;
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uStrength;
      varying float vT; varying vec3 vN; varying vec3 vV; varying vec3 vWp2;
      ${NOISE.replaceAll('sn_', 'bm_')}
      void main() {
        float side = pow(abs(dot(vN, vV)), 1.6);
        float dust = 0.6 + 0.6 * bm_fbm(vWp2.xz * 1.5 + vWp2.y + uTime * 0.15);
        float a = side * (1.0 - vT) * (1.0 - vT) * uStrength * dust;
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * a, 1.0);
      }`,
  })
}

/**
 * Efek layar horor: vinyet, butir film, aberasi kromatik & guncangan saat Penunggu dekat,
 * kilatan merah saat disergap, dan desaturasi saat pingsan.
 */
export const HORROR_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime,
    uFear,
    uHit: { value: 0 },
    uDown: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uFear; uniform float uHit; uniform float uDown; uniform vec2 uRes;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float f = uFear;
      // guncangan halus saat dekat
      uv += vec2(sin(uTime * 37.0), cos(uTime * 29.0)) * 0.0016 * f * f;
      float ab = (0.0015 + 0.006 * f + 0.01 * uHit) * length(c) * 2.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(lum), clamp(0.25 + f * 0.35 + uDown * 0.6, 0.0, 1.0));
      // sedikit hijau-biru dingin ala malam kampung
      col *= vec3(0.92, 1.0, 1.06);
      float vig = smoothstep(0.85, 0.2 + 0.12 * (1.0 - f), length(c * vec2(1.0, 0.85)));
      col *= mix(0.25, 1.0, vig);
      col = mix(col, vec3(0.5, 0.0, 0.02) * (0.4 + lum), uHit * 0.65);
      col *= 1.0 - uDown * 0.45;
      float grain = h(uv * uRes + fract(uTime * 13.7)) - 0.5;
      col += grain * (0.05 + 0.05 * f);
      gl_FragColor = vec4(col, 1.0);
    }`,
}
