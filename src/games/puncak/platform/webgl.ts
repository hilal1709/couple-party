/** hasil pemeriksaan WebGL 2 sebelum gunung dibangun */
export type GlCheck =
  | { ok: true; gpu: string; maxTexture: number; maxSamples: number }
  | { ok: false; reason: 'nowebgl2' | 'small'; gpu: string }

let cached: GlCheck | null = null

/**
 * Puncak butuh WebGL 2 (texture array medan, MSAA di render target).
 * Diperiksa sekali di kanvas sementara yang langsung dilepas, supaya HP lama mendapat pesan yang jelas
 * alih-alih layar hitam.
 */
export function checkWebGL2(): GlCheck {
  if (cached) return cached
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) {
      const old = c.getContext('webgl')
      return (cached = { ok: false, reason: 'nowebgl2', gpu: old ? gpuName(old) : '' })
    }
    const gpu = gpuName(gl)
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    const maxSamples = gl.getParameter(gl.MAX_SAMPLES) as number
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    // tekstur medan 1024 + bayangan 2048: di bawah 2048 berarti GPU sangat tua
    if (maxTexture < 2048) return (cached = { ok: false, reason: 'small', gpu })
    return (cached = { ok: true, gpu, maxTexture, maxSamples })
  } catch {
    return (cached = { ok: false, reason: 'nowebgl2', gpu: '' })
  }
}

function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
}
