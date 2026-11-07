// Uji multipemain Puncak: 1 host + (n-1) klien sebagai tab di SATU Chrome headless (BroadcastChannel
// hanya tersambung antar-tab di profil yang sama), throttling latar dimatikan.
// Pakai: node scripts/net-test.mjs <n 2..4> "<query tambahan, mis. lag=150&jitter=40&loss=0.05>" <skenario.js>
// skenario.js mengekspor default async ({ tabs, evalIn, wait }) => hasil; dicetak sebagai JSON.
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [nArg = '2', extra = '', scenarioPath] = process.argv.slice(2)
const n = Math.max(2, Math.min(4, Number(nArg)))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'net-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--use-angle=d3d11',
  '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect(ws) {
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
  return (method, params = {}) =>
    new Promise((r) => {
      const k = ++id
      pending.set(k, r)
      ws.send(JSON.stringify({ id: k, method, params }))
    })
}

let version
for (let i = 0; i < 50 && !version; i++) {
  await sleep(200)
  try {
    version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  } catch {}
}
// tab di latar tidak menjalankan requestAnimationFrame walau throttling dimatikan:
// tiap pemain dibuka di JENDELA sendiri lewat CDP tingkat browser
const browser = await connect(new WebSocket(version.webSocketDebuggerUrl))

const base = 'http://localhost:5173/?demo=puncak&duo=1&q=low'
const tabs = []
for (let seat = 0; seat < n; seat++) {
  const url = `${base}&n=${n}&total=4&seat=${seat}&p=${seat + 1}${extra ? '&' + extra : ''}`
  const made = await browser('Target.createTarget', { url: 'about:blank', newWindow: true })
  const targetId = made.result.targetId
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const t = list.find((x) => x.id === targetId)
  const send = await connect(new WebSocket(t.webSocketDebuggerUrl))
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true })
  await send('Page.enable')
  await send('Page.navigate', { url })
  tabs.push({ seat, send })
  // host dulu, supaya klien menemukan host saat tersambung
  await sleep(seat === 0 ? 2500 : 800)
}

const evalIn = async (seat, expr) => {
  const r = await tabs[seat].send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(`tab ${seat}: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`)
  return r.result?.result?.value
}

// tunggu semua ronde termuat
for (let i = 0; i < 60; i++) {
  const ready = await Promise.all(tabs.map((t) => evalIn(t.seat, 'return !!(window.__puncak && window.__puncak.chibis.every(Boolean))').catch(() => false)))
  if (ready.every(Boolean)) break
  await sleep(1000)
}

try {
  const mod = await import(pathToFileURL(resolve(scenarioPath)).href)
  const out = await mod.default({ tabs, evalIn, wait: sleep, n })
  console.log(JSON.stringify(out, null, 1))
} catch (e) {
  console.error('GAGAL', e.message)
  process.exitCode = 1
} finally {
  chrome.kill()
}
