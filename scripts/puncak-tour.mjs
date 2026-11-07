// Tur visual Punggung Hijau: pindahkan pendaki ke tiap zona, putar kamera, potret, dan catat statistik render.
// Pakai: node scripts/puncak-tour.mjs <folder-keluar> [query tambahan, mis. "q=low&mountain=hijau"]
// Butuh server Vite di :5173. Satu Chrome headless (ANGLE D3D11), viewport 844×390.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [outDir = '.', extra = 'q=med'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'tour-'))
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=d3d11', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
})
const send = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id
    pending.set(n, r)
    ws.send(JSON.stringify({ id: n, method, params }))
  })
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)
  return r.result?.result?.value
}

await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true })
await send('Page.enable')
const t0 = Date.now()
await send('Page.navigate', { url: `http://localhost:5173/?demo=puncak&mountain=hijau&seed=42&${extra}` })
let loadMs = 0
for (let i = 0; i < 120; i++) {
  await sleep(250)
  const ok = await evalJs('return !!(window.__puncak && window.__puncak.chibis && window.__puncak.chibis.every(Boolean))').catch(() => false)
  if (ok) {
    loadMs = Date.now() - t0
    break
  }
}
await sleep(2500)

// titik tur: [nama, x, z, yaw kamera (rad), pitch, jarak kamera opsional]; posisi dihitung dari isi medan di halaman
const stops = await evalJs(`
  const r = window.__puncak, t = r.t
  const c = t.camps, s = t.summit
  const mid = (a, b) => (a + b) / 2
  return [
    ['kemah', t.start.x, t.start.z, 0, 0.3],
    ['kemah-belakang', t.start.x, t.start.z + 4, Math.PI, 0.25],
    ['hutan', c[1].x - 3, mid(c[1].z, c[2].z) - 12, 0, 0.35],
    ['batu', c[2].x, mid(c[2].z, c[3].z) - 6, 0, 0.45],
    ['tebing', c[3].x - 2, c[3].z + 10, 0, 0.75],
    ['punggung', c[4].x, mid(c[4].z, c[5].z), 0.35, 0.3],
    ['punggung-samping', c[4].x, mid(c[4].z, c[5].z), Math.PI / 2, 0.15],
    // jangan tepat di puncak (memicu akhir ronde): di bibir dataran puncak, menghadap ke bawah
    ['puncak', s.x, s.z - 9, Math.PI, 0.35],
  ]
`)
const report = { loadMs, stops: [] }
for (const [name, x, z, yaw, pitch] of stops) {
  await evalJs(`
    const r = window.__puncak, b = r.body
    // tinggi medan bilinear (jangan impor modul dari halaman: Vite memuat ulang & objek jadi basi)
    const t = r.t, fx = (${x} + t.hx) / 0.5, fz = (${z} + t.hz) / 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j
    const H = (a, c) => t.h[c * t.nx + a]
    const y = H(i, j) * (1 - u) * (1 - v) + H(i + 1, j) * u * (1 - v) + H(i, j + 1) * (1 - u) * v + H(i + 1, j + 1) * u * v
    Object.assign(b, { x: ${x}, y: y + 0.05, z: ${z}, vx: 0, vy: 0, vz: 0, mode: 'ground' })
    r.camYaw = ${yaw}; r.camPitch = ${pitch}; b.yaw = ${yaw}
    return true`)
  // beri waktu potongan medan & rumput di sekitarnya dibangun
  await sleep(2500)
  // FPS per detik selama 3 dtk: lonjakan sesaat (membangun potongan) terlihat terpisah dari biaya tetap
  const fps = []
  for (let k = 0; k < 3; k++) {
    await sleep(1000)
    fps.push(await evalJs('return window.__puncak.perf().fps'))
  }
  const perf = await evalJs('const p = window.__puncak.perf(); return { calls: p.calls, tris: p.tris, geo: p.geo, chunks: p.chunks, height: p.height, scale: p.scale }')
  perf.fps = fps
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, `tur-${name}.png`), Buffer.from(shot.result.data, 'base64'))
  report.stops.push({ name, ...perf })
}
const mem = await evalJs('return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null')
report.heapMB = mem
console.log(JSON.stringify(report, null, 1))
ws.close()
chrome.kill()
await sleep(800)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}
