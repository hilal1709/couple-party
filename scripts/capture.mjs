// Tangkapan layar review: emulasi perangkat lewat Chrome DevTools Protocol, tunggu font siap.
// Pakai: node scripts/capture.mjs <url> <out.png> [width] [height] [scale] [tunggu-ms]
// (tunggu-ms untuk adegan 3D yang perlu memuat model dulu, mis. Kart Kacau)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, out, w = '390', h = '844', scale = '2', wait = '0'] = process.argv.slice(2)
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'cap-'))
const chrome = spawn(CHROME, ['--headless=new', ...(+wait ? ['--use-angle=d3d11', '--enable-unsafe-swiftshader'] : ['--disable-gpu']), `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    target = list.find((t) => t.type === 'page')
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

await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: +scale, mobile: +w < 768 })
await send('Page.enable')
await send('Page.navigate', { url })
const ready = `new Promise(async (res) => {
  for (let i = 0; i < 100 && !document.getElementById('root')?.children.length; i++) await new Promise(r => setTimeout(r, 100))
  await document.fonts.ready
  await new Promise(r => setTimeout(r, 1200))
  res([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(','))
})`
const fonts = await send('Runtime.evaluate', { expression: ready, awaitPromise: true, returnByValue: true })
if (+wait) await sleep(+wait)
const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
console.log(out, 'fonts:', fonts.result?.result?.value)
ws.close()
chrome.kill()
