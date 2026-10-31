// Ukur batas pesan broadcast Supabase untuk cat Petak Cat: dua klien di satu channel sementara,
// kirim isi makin besar dan makin rapat, lalu catat mana yang sampai.
// Jalankan: npx tsx scripts/petak-probe.mts
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_KEY
if (!url || !key) throw new Error('.env tidak punya URL/kunci Supabase')

const name = `petak-probe-${Date.now()}`
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const join = (ch: ReturnType<ReturnType<typeof createClient>['channel']>) =>
  new Promise<void>((ok, no) => ch.subscribe((s) => (s === 'SUBSCRIBED' ? ok() : s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' ? no(new Error(s)) : undefined)))

const a = createClient(url, key)
const b = createClient(url, key)
const tx = a.channel(name, { config: { broadcast: { self: false, ack: true } } })
const rx = b.channel(name, { config: { broadcast: { self: false } } })
const seen = new Map<string, number>()
rx.on('broadcast', { event: 'x' }, ({ payload }) => seen.set(payload.tag, (seen.get(payload.tag) ?? 0) + 1))
await join(rx)
await join(tx)
await sleep(500)

console.log('ukuran satu pesan (isi base64)')
for (const kb of [4, 8, 12, 16, 24, 32, 64, 128, 200, 256, 400, 1024]) {
  const tag = `s${kb}`
  const started = performance.now()
  const res = await tx.send({ type: 'broadcast', event: 'x', payload: { tag, d: 'A'.repeat(kb * 1024) } })
  await sleep(700)
  console.log(`  ${String(kb).padStart(5)} KB  jawaban=${res}  sampai=${seen.get(tag) ?? 0}  ${Math.round(performance.now() - started - 700)} ms`)
}

console.log('rentetan 20 potongan 16 KB')
for (const gap of [0, 20, 40, 80]) {
  const tag = `g${gap}`
  for (let i = 0; i < 20; i++) {
    void tx.send({ type: 'broadcast', event: 'x', payload: { tag, d: 'A'.repeat(16 * 1024) } })
    if (gap) await sleep(gap)
  }
  await sleep(1500)
  console.log(`  jeda ${String(gap).padStart(2)} ms  sampai=${seen.get(tag) ?? 0}/20`)
}

await a.removeAllChannels()
await b.removeAllChannels()
process.exit(0)
