// Ukur beban tiap map Petak Cat: waktu muat, draw call, segitiga, tekstur, waktu render, dan tiga ronde berturut-turut.
// Pakai: node scripts/petak-perf.mjs [port-dev] [tingkat]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dev = process.argv[2] ?? '5174'
const q = process.argv[3] ?? 'low'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'perf-'))
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let info
for (let i = 0; i < 50 && !info; i++) {
  await sleep(200)
  try {
    info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  } catch {}
}
const ws = new WebSocket(info.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 160))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(String(m.params.args[0]?.value).slice(0, 160))
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
const js = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
await send('Page.enable')
await send('Runtime.enable')

const ready = async (ms = 90000) => {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await js('!!(window.__petak && window.__petak.lastT > 0 && window.__petak.bodies.length)')) return Date.now() - start
    await sleep(100)
  }
  console.log('galat', errors)
  chrome.kill()
  throw new Error('waktu habis memuat')
}

console.log('map      muat(s) panggil segitiga tekstur geometri')
for (const map of ['gang', 'pasar', 'museum', 'stasiun', 'pabrik', 'dapur', 'kota', 'kapal']) {
  await send('Page.navigate', { url: `http://localhost:${dev}/?demo=petak&q=${q}&total=5&map=${map}` })
  await sleep(300)
  const ms = await ready()
  // autoReset dimatikan sesaat supaya semua pass satu frame terhitung, bukan hanya pass terakhir
  const res = await send('Runtime.evaluate', { expression: `(async () => { const r = window.__petak; r.debugPlace(0, 0, 0.5, 0.2); await new Promise(o => setTimeout(o, 1500)); const w = r.world, i = w.renderer.info; i.autoReset = false; i.reset(); r.frame(performance.now()); const o = { c: i.render.calls, t: i.render.triangles, x: i.memory.textures, g: i.memory.geometries }; i.autoReset = true; return o })()`, awaitPromise: true, returnByValue: true })
  const m = res.result?.result?.value
  if (!m) {
    console.log('galat ukur', map, JSON.stringify(res.result?.exceptionDetails ?? res).slice(0, 300), errors)
    continue
  }
  console.log(map.padEnd(8), (ms / 1000).toFixed(1).padStart(6), String(m.c).padStart(7), String(m.t).padStart(8), String(m.x).padStart(7), String(m.g).padStart(8))
}

// tiga ronde berturut-turut di map acak: context lama harus lepas, tak ada galat
await send('Page.navigate', { url: `http://localhost:${dev}/?demo=petak&q=${q}&total=3&map=acak&hide=2&hunt=3&rounds=3&seed=7` })
await sleep(300)
const maps = []
for (let round = 0; round < 3; round++) {
  await ready()
  const s = await js('window.__petak.s.round + ":" + window.__petak.s.map')
  maps.push(s)
  const end = Date.now() + 60000
  while (Date.now() < end) {
    const p = await js(`(() => { const r = window.__petak; return r ? r.s.phase + ':' + r.s.round : 'x' })()`)
    if (p === 'reveal:' + round) break
    await sleep(300)
  }
  await js('window.__petak.phaseAt = performance.now() - 999000')
  await sleep(1500)
}
await sleep(1500)
console.log('ronde:', maps.join(' '))
console.log('fase akhir:', await js(`document.body.innerText.slice(0, 40).replace(/\\n/g, ' ')`))
console.log('galat:', errors.length ? errors.slice(0, 4) : 'tidak ada')
chrome.kill()
await sleep(400)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}
process.exit(0)
