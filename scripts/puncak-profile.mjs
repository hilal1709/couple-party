// Profil satu frame Puncak: draw call & segitiga per sumber (kelompok objek), per profil grafis.
// Pakai: node scripts/puncak-profile.mjs "q=low" [titik: kemah|puncak|hutan]
// Butuh server Vite di :5173. Menghitung lewat renderer.renderBufferDirect (termasuk pass bayangan).
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [extra = 'q=low', spot = 'kemah'] = process.argv.slice(2)
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'prof-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=d3d11', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 50 && !t; i++) {
  await sleep(200)
  try {
    t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page')
  } catch {}
}
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m)
    pend.delete(m.id)
  }
})
const send = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id
    pend.set(n, r)
    ws.send(JSON.stringify({ id: n, method, params }))
  })
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)
  return r.result?.result?.value
}
await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true })
await send('Page.enable')
await send('Page.navigate', { url: `http://localhost:5173/?demo=puncak&mountain=hijau&seed=42&${extra}` })
for (let i = 0; i < 120; i++) {
  await sleep(250)
  if (await evalJs('return !!(window.__puncak && window.__puncak.chibis && window.__puncak.chibis.every(Boolean))').catch(() => false)) break
}
await evalJs(`const r = window.__puncak, t = r.t, b = r.body
  const at = { kemah: [t.start.x, t.start.z, 0, 0.3], hutan: [t.camps[1].x, (t.camps[1].z + t.camps[2].z) / 2 - 12, 0, 0.35], puncak: [t.summit.x, t.summit.z - 9, Math.PI, 0.35] }['${spot}']
  const fx = (at[0] + t.hx) / 0.5, fz = (at[1] + t.hz) / 0.5, i = Math.floor(fx), j = Math.floor(fz)
  Object.assign(b, { x: at[0], z: at[1], y: t.h[j * t.nx + i] + 0.05, mode: 'ground', vx: 0, vy: 0, vz: 0 })
  r.camYaw = at[2]; r.camPitch = at[3]; return true`)
await sleep(6000)
const out = await evalJs(`
  const r = window.__puncak, R = r.scene.renderer
  const tally = {}
  let calls = 0, tris = 0
  const name = (o) => {
    if (o.parent?.name === 'medan') return 'medan'
    let p = o; while (p && !p.name && p.parent && p.parent.type !== 'Scene') p = p.parent
    if (o.isSkinnedMesh || o.parent?.type === 'Bone' || p?.name === 'body') return 'pendaki'
    const m = Array.isArray(o.material) ? o.material[0] : o.material
    return (o.isInstancedMesh ? 'I:' : o.isPoints ? 'P:' : 'M:') + (p?.name || m?.name || m?.type)
  }
  const orig = R.renderBufferDirect.bind(R)
  R.renderBufferDirect = (cam, scene, geo, mat, obj, group) => {
    const k = name(obj)
    const n = (group ? group.count : geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (obj.isInstancedMesh ? obj.count : 1)
    tally[k] = tally[k] ?? [0, 0]
    tally[k][0]++; tally[k][1] += Math.round(n)
    calls++; tris += n
    return orig(cam, scene, geo, mat, obj, group)
  }
  // hitung selama 1 dtk lalu bagi dengan jumlah frame yang benar-benar digambar
  let frames = 0
  const sc = r.scene
  const origRender = sc.render.bind(sc)
  sc.render = (dt) => (frames++, origRender(dt))
  await new Promise((q) => setTimeout(q, 1000))
  R.renderBufferDirect = orig
  sc.render = origRender
  const f = Math.max(1, frames)
  for (const k in tally) tally[k] = [Math.round(tally[k][0] / f), Math.round(tally[k][1] / f)]
  calls /= f
  tris /= f
  const mem = R.info.memory
  return { frames: f, calls: Math.round(calls), tris: Math.round(tris), geo: mem.geometries, tex: mem.textures, top: Object.entries(tally).sort((a, b) => b[1][0] - a[1][0]).slice(0, 22) }
`)
console.log(JSON.stringify(out))
chrome.kill()
await sleep(600)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}
