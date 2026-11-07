// Ukur Puncak di HP/emulator Android lewat adb + debug WebView (hanya APK QA: node scripts/qa-apk.mjs).
// Pakai: node scripts/puncak-device.mjs <serial> <menit> <keluar.json> [mode]
//   mode "main" (bawaan): app sudah dibuka & dimainkan manusia; skrip hanya mencatat.
//   mode "tur:<query>": skrip membuka ?demo=puncak&<query> lalu memindah pendaki ke tiap zona bergantian.
// Tiap 10 dtk: FPS/p95/1%/5% (FrameStats), draw call, segitiga, profil & skala, heap JS, PSS app,
// suhu (thermalservice & baterai). Ringkasan dicetak di akhir dan disimpan bersama sampel.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [serial, minArg = '15', out = 'puncak-device.json', mode = 'main'] = process.argv.slice(2)
if (!serial) throw new Error('serial adb wajib (lihat `adb devices`)')
const adb = (cmd) => execSync(`adb -s ${serial} ${cmd}`, { encoding: 'utf8' }).trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PKG = 'com.couple.party'

// pidof keluar dengan kode 1 kalau app belum berjalan
const pidOf = () => {
  try {
    return adb(`shell pidof ${PKG}`).split(/\s+/)[0]
  } catch {
    return ''
  }
}
let pid = pidOf()
if (!pid) {
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`)
  await sleep(6000)
  pid = pidOf()
}
const port = 9500 + Math.floor(Math.random() * 300)
adb(`forward tcp:${port} localabstract:webview_devtools_remote_${pid}`)
let page
for (let i = 0; i < 30 && !page; i++) {
  try {
    page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((p) => p.type === 'page')
  } catch {}
  if (!page) await sleep(500)
}
if (!page) throw new Error('WebView tidak bisa di-debug: pastikan APK QA (scripts/qa-apk.mjs) yang terpasang')
const ws = new WebSocket(page.webSocketDebuggerUrl)
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
  return r.result?.result?.value
}

const tour = mode.startsWith('tur:')
if (tour) {
  const origin = new URL(page.url).origin
  await send('Page.navigate', { url: `${origin}/?demo=puncak&mountain=hijau&seed=42&${mode.slice(4)}` })
  for (let i = 0; i < 240; i++) {
    await sleep(500)
    if (await evalJs('return !!(window.__puncak && window.__puncak.chibis && window.__puncak.chibis.every(Boolean))').catch(() => false)) break
  }
}
// titik tur (dipakai hanya di mode tur): kemah, hutan, batu, tebing, punggung, dekat puncak
const STOPS = `const t = window.__puncak.t, c = t.camps, s = t.summit, mid = (a, b) => (a + b) / 2
  return [[t.start.x, t.start.z, 0], [c[1].x - 3, mid(c[1].z, c[2].z) - 12, 0], [c[2].x, mid(c[2].z, c[3].z) - 6, 0], [c[3].x - 2, c[3].z + 10, 0], [c[4].x, mid(c[4].z, c[5].z), 0.35], [s.x, s.z - 9, Math.PI]]`
const stops = tour ? await evalJs(STOPS) : []
const goto = (p) =>
  evalJs(`const r = window.__puncak, t = r.t, b = r.body
    const fx = (${p[0]} + t.hx) / 0.5, fz = (${p[1]} + t.hz) / 0.5, i = Math.floor(fx), j = Math.floor(fz)
    Object.assign(b, { x: ${p[0]}, z: ${p[1]}, y: t.h[j * t.nx + i] + 0.05, mode: 'ground', vx: 0, vy: 0, vz: 0 })
    r.camYaw = ${p[2]}; r.camPitch = 0.32; return true`)

const temps = () => {
  const out = {}
  try {
    const th = adb('shell dumpsys thermalservice')
    const cur = th.split('Current temperatures from HAL:')[1]?.split('Current cooling devices')[0] ?? ''
    for (const m of cur.matchAll(/mValue=([\d.]+), mType=(\d+), mName=([^,]+)/g)) {
      const name = m[3].trim()
      // tipe 0 = CPU, 1 = GPU, 2 = baterai, 3 = kulit HP
      if (['0', '1', '2', '3'].includes(m[2])) out[name] = Math.max(out[name] ?? 0, +m[1])
    }
    out.status = +(th.match(/Thermal Status: (\d+)/)?.[1] ?? -1)
  } catch {}
  try {
    out.baterai = +adb('shell dumpsys battery').match(/temperature: (\d+)/)[1] / 10
  } catch {}
  return out
}
/** PSS (MB) proses app & proses render WebView terbesar (WebView menggambar di proses terpisah) */
const pss = () => {
  try {
    const all = adb('shell dumpsys meminfo')
    const head = all.split('Total PSS by OOM adjustment')[0]
    const kb = (re) => Math.max(0, ...[...head.matchAll(re)].map((m) => +m[1].replace(/,/g, '')))
    return { app: Math.round(kb(/([\d,]+)K: com\.couple\.party \(pid/g) / 1024), render: Math.round(kb(/([\d,]+)K: com\.google\.android\.webview:sandboxed_process/g) / 1024) }
  } catch {
    return null
  }
}

const samples = []
const t0 = Date.now()
const end = t0 + +minArg * 60000
let stop = 0
let nextStop = 0
console.log(`Mengukur ${minArg} menit di ${serial} (${mode})…`)
while (Date.now() < end) {
  if (tour && Date.now() >= nextStop) {
    await goto(stops[stop % stops.length])
    stop++
    nextStop = Date.now() + 60000
  }
  await sleep(10000)
  const p = await evalJs(`const r = window.__puncak; if (!r) return null; const p = r.perf(); return { fps: p.fps, avg: +p.avgMs.toFixed(1), p95: +p.p95Ms.toFixed(1), low1: p.low1, low5: p.low5, calls: p.calls, tris: p.tris, q: p.q, scale: +p.scale.toFixed(2), height: p.height, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, alt: Math.round(r.body?.y ?? 0) }`).catch(() => null)
  const row = { t: Math.round((Date.now() - t0) / 1000), ...p, pss: pss(), temp: temps() }
  samples.push(row)
  console.log(JSON.stringify(row))
}
const live = samples.filter((s) => s.fps)
const avg = (k) => Math.round((live.reduce((a, s) => a + (s[k] ?? 0), 0) / Math.max(1, live.length)) * 10) / 10
const maxOf = (f) => Math.max(...samples.map(f).filter((v) => typeof v === 'number' && !Number.isNaN(v)))
const fpsSorted = live.map((s) => s.fps).sort((a, b) => a - b)
const summary = {
  serial,
  mode,
  menit: +minArg,
  sampel: samples.length,
  fpsRata: avg('fps'),
  fpsTerendah: fpsSorted[0] ?? null,
  fpsP5Sampel: fpsSorted[Math.floor(fpsSorted.length * 0.05)] ?? null,
  low1Rata: avg('low1'),
  low5Rata: avg('low5'),
  p95MsRata: avg('p95'),
  drawCallRata: avg('calls'),
  segitigaRata: Math.round(avg('tris')),
  skalaAkhir: live.at(-1)?.scale ?? null,
  heapMaksMB: maxOf((s) => s.heap),
  pssAppMaksMB: maxOf((s) => s.pss?.app),
  pssRenderMaksMB: maxOf((s) => s.pss?.render),
  suhuMaks: Object.fromEntries([...new Set(samples.flatMap((s) => Object.keys(s.temp ?? {})))].map((k) => [k, maxOf((s) => s.temp?.[k])])),
}
writeFileSync(out, JSON.stringify({ summary, samples }, null, 1))
console.log('\nRINGKASAN', JSON.stringify(summary, null, 1))
ws.close()
adb(`forward --remove tcp:${port}`)
