import * as THREE from 'three'

/** sisi kanvas cat di HP pemiliknya */
export const PAINT_SIZE = 512
/** sisi cat yang dikirim ke HP lain */
export const NET_SIZE = 192
/**
 * Cat disimpan 8-bit sebagai sRGB(warna linear / PAINT_RANGE), jadi permukaan terang (> 1 sebelum tone mapping)
 * tidak terpotong. Pipet membaca warna linear, shader badan mengembalikannya, lalu tone mapping yang sama
 * dengan dunia dipakai: warna cocok di semua tingkat grafis.
 */
export const PAINT_RANGE = 2

const UNDO = 6
const WHITE = 0.9

export function encodeLinear(v: number): number {
  const c = Math.min(1, Math.max(0, v / PAINT_RANGE))
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

export const DECODE_GLSL = /* glsl */ `
vec3 decodePaint(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(0.04045, c)) * ${PAINT_RANGE.toFixed(1)};
}`

const ENCODE_GLSL = /* glsl */ `
vec3 encodePaint(vec3 v) {
  vec3 c = clamp(v / ${PAINT_RANGE.toFixed(1)}, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}`

export type Pattern = {
  map: THREE.Texture
  /** rata-rata warna tekstur (linear), supaya pola bisa dikalikan warna hasil pipet */
  avg: THREE.Vector3
  /** satuan UV per meter di permukaan asal: ukuran pola di badan sama dengan di dunia */
  uvPerMeter: number
}

/** satu ruas goresan dalam ruang pose istirahat badan */
export type Dab = { a: THREE.Vector3; b: THREE.Vector3; n: THREE.Vector3 }

const UV_VERT = /* glsl */ `
varying vec3 vRest;
varying vec3 vNormal;
void main() {
  vRest = position;
  vNormal = normal;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}`

const BRUSH_FRAG = /* glsl */ `
#define MAX_SEG 2
uniform vec3 uA[MAX_SEG];
uniform vec3 uB[MAX_SEG];
uniform vec3 uN[MAX_SEG];
uniform int uCount;
uniform float uRadius;
uniform float uOpacity;
uniform bool uAll;
uniform vec3 uColor;
uniform bool uUsePattern;
uniform sampler2D uPattern;
uniform float uPatScale;
uniform float uPatRot;
uniform vec3 uAvg;
varying vec3 vRest;
varying vec3 vNormal;
${ENCODE_GLSL}

float seg(vec3 p, vec3 a, vec3 b) {
  vec3 ab = b - a;
  float d = dot(ab, ab);
  float t = d < 1e-8 ? 0.0 : clamp(dot(p - a, ab) / d, 0.0, 1.0);
  return length(a + ab * t - p);
}

vec3 samplePat(vec2 p) {
  float c = cos(uPatRot), s = sin(uPatRot);
  return texture2D(uPattern, mat2(c, -s, s, c) * p * uPatScale).rgb;
}

void main() {
  vec3 n = normalize(vNormal);
  float a = uAll ? 1.0 : 0.0;
  for (int i = 0; i < uCount && !uAll; i++) {
    float f = 1.0 - smoothstep(uRadius * 0.6, uRadius, seg(vRest, uA[i], uB[i]));
    // jangan menembus ke sisi seberang (lengan ke perut)
    a = max(a, f * smoothstep(-0.15, 0.3, dot(n, uN[i])));
  }
  if (a <= 0.001) discard;
  vec3 col = uColor;
  if (uUsePattern) {
    vec3 w = pow(abs(n), vec3(4.0));
    w /= w.x + w.y + w.z;
    vec3 tex = samplePat(vRest.zy) * w.x + samplePat(vRest.xz) * w.y + samplePat(vRest.xy) * w.z;
    col = tex / max(uAvg, vec3(0.02)) * uColor;
  }
  gl_FragColor = vec4(encodePaint(col), a * uOpacity);
}`

const DILATE_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uPx;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uSrc, vUv);
  if (c.a > 0.5) { gl_FragColor = vec4(c.rgb, 1.0); return; }
  // gutter antar pulau UV diisi warna tetangga, supaya tepi sambungan tidak tampak putih
  vec3 sum = vec3(0.0);
  float n = 0.0;
  for (int y = -3; y <= 3; y++) for (int x = -3; x <= 3; x++) {
    vec4 s = texture2D(uSrc, vUv + vec2(float(x), float(y)) * uPx);
    if (s.a > 0.5) { sum += s.rgb; n += 1.0; }
  }
  gl_FragColor = vec4(n > 0.0 ? sum / n : vec3(0.0), 1.0);
}`

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const COPY_FRAG = /* glsl */ `
uniform sampler2D uSrc;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uSrc, vUv); }`

function target(size: number, filter: THREE.TextureFilter) {
  return new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: filter as THREE.MinificationTextureFilter,
    magFilter: filter as THREE.MagnificationTextureFilter,
    depthBuffer: false,
    colorSpace: THREE.NoColorSpace,
  })
}

/**
 * Kanvas cat satu badan. Kuas digambar dengan merender mesh di ruang UV: tiap texel tahu posisi 3D-nya
 * (posisi istirahat), jadi jarak ke kuas dihitung di badan, bukan di UV. Hasilnya goresan menyambung
 * melewati sambungan UV dan tidak melar, dan simetri cukup dengan mencerminkan titik kuas.
 */
export class PaintSurface {
  private paint = target(PAINT_SIZE, THREE.NearestFilter)
  private shown = target(PAINT_SIZE, THREE.LinearFilter)
  private net = target(NET_SIZE, THREE.LinearFilter)
  private undo: THREE.WebGLRenderTarget[] = []
  private undoHead = 0
  private undoLen = 0
  private cam = new THREE.Camera()
  private uvScene = new THREE.Scene()
  private quadScene = new THREE.Scene()
  private quad: THREE.Mesh
  private uvMesh: THREE.Mesh
  private brush: THREE.ShaderMaterial
  private cover: THREE.ShaderMaterial
  private dilate: THREE.ShaderMaterial
  private copy: THREE.ShaderMaterial
  private renderer: THREE.WebGLRenderer

  constructor(renderer: THREE.WebGLRenderer, geometry: THREE.BufferGeometry) {
    this.renderer = renderer
    const empty = new THREE.Vector3()
    this.brush = new THREE.ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: BRUSH_FRAG,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      uniforms: {
        uA: { value: [empty, empty] },
        uB: { value: [empty, empty] },
        uN: { value: [empty, empty] },
        uCount: { value: 0 },
        uRadius: { value: 0.1 },
        uOpacity: { value: 1 },
        uAll: { value: false },
        uColor: { value: new THREE.Vector3(1, 1, 1) },
        uUsePattern: { value: false },
        uPattern: { value: null },
        uPatScale: { value: 1 },
        uPatRot: { value: 0 },
        uAvg: { value: new THREE.Vector3(1, 1, 1) },
      },
    })
    const fillColor = encodeLinear(WHITE)
    this.cover = new THREE.ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: `void main() { gl_FragColor = vec4(vec3(${fillColor.toFixed(4)}), 1.0); }`,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })
    this.dilate = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: DILATE_FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      uniforms: { uSrc: { value: this.paint.texture }, uPx: { value: new THREE.Vector2(1 / PAINT_SIZE, 1 / PAINT_SIZE) } },
    })
    this.copy = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COPY_FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      uniforms: { uSrc: { value: null } },
    })
    this.uvMesh = new THREE.Mesh(geometry, this.brush)
    this.uvMesh.frustumCulled = false
    this.uvScene.add(this.uvMesh)
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copy)
    this.quad.frustumCulled = false
    this.quadScene.add(this.quad)
    for (let i = 0; i < UNDO; i++) this.undo.push(target(PAINT_SIZE, THREE.NearestFilter))
    this.reset()
  }

  /** tekstur yang ditempel ke badan */
  get texture() {
    return this.shown.texture
  }

  private pass(to: THREE.WebGLRenderTarget, scene: THREE.Scene) {
    const r = this.renderer
    const prevTarget = r.getRenderTarget()
    const prevAuto = r.autoClear
    r.autoClear = false
    r.setRenderTarget(to)
    r.render(scene, this.cam)
    r.setRenderTarget(prevTarget)
    r.autoClear = prevAuto
  }

  private blit(src: THREE.Texture, to: THREE.WebGLRenderTarget) {
    this.quad.material = this.copy
    this.copy.uniforms.uSrc.value = src
    this.pass(to, this.quadScene)
  }

  private refresh() {
    this.quad.material = this.dilate
    this.pass(this.shown, this.quadScene)
  }

  /** kembali putih polos */
  reset() {
    const r = this.renderer
    const prev = r.getRenderTarget()
    r.setRenderTarget(this.paint)
    r.setClearColor(0xffffff, 0)
    r.clear(true, false, false)
    r.setRenderTarget(prev)
    this.uvMesh.material = this.cover
    this.pass(this.paint, this.uvScene)
    this.uvMesh.material = this.brush
    this.refresh()
  }

  /** dipanggil sekali di awal tiap goresan */
  snapshot() {
    this.blit(this.paint.texture, this.undo[this.undoHead])
    this.undoHead = (this.undoHead + 1) % UNDO
    this.undoLen = Math.min(UNDO, this.undoLen + 1)
  }

  undoLast(): boolean {
    if (!this.undoLen) return false
    this.undoHead = (this.undoHead + UNDO - 1) % UNDO
    this.undoLen--
    this.blit(this.undo[this.undoHead].texture, this.paint)
    this.refresh()
    return true
  }

  get canUndo() {
    return this.undoLen > 0
  }

  /** `color` = warna linear; `pattern` kosong = warna rata */
  setBrush(o: { radius: number; color: THREE.Vector3; pattern?: Pattern | null; rotation?: number; opacity?: number }) {
    const u = this.brush.uniforms
    u.uRadius.value = o.radius
    u.uColor.value.copy(o.color)
    u.uOpacity.value = o.opacity ?? 1
    u.uUsePattern.value = !!o.pattern
    if (o.pattern) {
      u.uPattern.value = o.pattern.map
      u.uPatScale.value = o.pattern.uvPerMeter
      u.uAvg.value.copy(o.pattern.avg)
      u.uPatRot.value = o.rotation ?? 0
    }
  }

  /** satu atau dua ruas (dua = simetri) */
  stroke(dabs: Dab[]) {
    const u = this.brush.uniforms
    u.uCount.value = Math.min(2, dabs.length)
    u.uA.value = dabs.map((d) => d.a).concat(dabs[0].a).slice(0, 2)
    u.uB.value = dabs.map((d) => d.b).concat(dabs[0].b).slice(0, 2)
    u.uN.value = dabs.map((d) => d.n).concat(dabs[0].n).slice(0, 2)
    this.pass(this.paint, this.uvScene)
    this.refresh()
  }

  /** isi seluruh badan dengan warna/pola kuas sekarang */
  fill() {
    const u = this.brush.uniforms
    u.uAll.value = true
    this.pass(this.paint, this.uvScene)
    u.uAll.value = false
    this.refresh()
  }

  /** cat diperkecil untuk dikirim: WebP, baris 0 = v 0 (sama dengan urutan tekstur) */
  async encode(quality = 0.8): Promise<Uint8Array> {
    this.blit(this.shown.texture, this.net)
    const px = new Uint8Array(NET_SIZE * NET_SIZE * 4)
    this.renderer.readRenderTargetPixels(this.net, 0, 0, NET_SIZE, NET_SIZE, px)
    for (let i = 3; i < px.length; i += 4) px[i] = 255
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = NET_SIZE
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), NET_SIZE, NET_SIZE), 0, 0)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', quality))
    if (!blob) throw new Error('kanvas gagal mengompres cat')
    return new Uint8Array(await blob.arrayBuffer())
  }

  dispose() {
    for (const t of [this.paint, this.shown, this.net, ...this.undo]) t.dispose()
    for (const m of [this.brush, this.cover, this.dilate, this.copy]) m.dispose()
    this.quad.geometry.dispose()
  }
}

/** ubah cat kiriman HP lain jadi tekstur badan */
export async function decodePaint(bytes: Uint8Array): Promise<THREE.Texture> {
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/webp' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const tex = new THREE.Texture(bmp)
  tex.flipY = false
  tex.colorSpace = THREE.NoColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

const PROJECT_FRAG = /* glsl */ `
uniform sampler2D uShot;
uniform mat4 uVP;
uniform mat4 uModel;
uniform vec3 uAvg;
uniform float uMix;
varying vec3 vRest;
${ENCODE_GLSL}
void main() {
  vec4 clip = uVP * uModel * vec4(vRest, 1.0);
  vec2 st = clip.xy / clip.w * 0.5 + 0.5;
  gl_FragColor = vec4(encodePaint(mix(uAvg, texture2D(uShot, st).rgb, uMix)), 1.0);
}`

/**
 * Cat bot: gambar latar dari depan badan diproyeksikan ke kulit. Semua HP membuatnya sendiri
 * dari titik sembunyi yang sama, jadi tidak perlu dikirim. `sharp` 0..1 = kerapian menurut level bot.
 */
export function projectPaint(
  renderer: THREE.WebGLRenderer,
  geometry: THREE.BufferGeometry,
  shot: { texture: THREE.Texture; vp: THREE.Matrix4; avg: THREE.Vector3 },
  model: THREE.Matrix4,
  sharp: number,
): THREE.WebGLRenderTarget {
  const raw = target(256, THREE.NearestFilter)
  const rt = target(256, THREE.LinearFilter)
  const mat = new THREE.ShaderMaterial({
    vertexShader: UV_VERT,
    fragmentShader: PROJECT_FRAG,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    uniforms: { uShot: { value: shot.texture }, uVP: { value: shot.vp }, uModel: { value: model }, uAvg: { value: shot.avg }, uMix: { value: sharp } },
  })
  const dilate = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: DILATE_FRAG,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    uniforms: { uSrc: { value: raw.texture }, uPx: { value: new THREE.Vector2(1 / 256, 1 / 256) } },
  })
  const scene = new THREE.Scene()
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.frustumCulled = false
  scene.add(mesh)
  const quadScene = new THREE.Scene()
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dilate)
  quad.frustumCulled = false
  quadScene.add(quad)
  const cam = new THREE.Camera()
  const prev = renderer.getRenderTarget()
  const auto = renderer.autoClear
  renderer.setRenderTarget(raw)
  renderer.setClearColor(0x000000, 0)
  renderer.clear(true, false, false)
  renderer.autoClear = false
  renderer.render(scene, cam)
  // gutter antar pulau UV diisi warna tetangga, sama seperti cat pemain
  renderer.setRenderTarget(rt)
  renderer.render(quadScene, cam)
  renderer.autoClear = auto
  renderer.setRenderTarget(prev)
  mat.dispose()
  dilate.dispose()
  quad.geometry.dispose()
  raw.dispose()
  return rt
}
