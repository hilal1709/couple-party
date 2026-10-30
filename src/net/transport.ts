import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

/** `bot` = kursi yang dikendalikan HP host */
export type Peer = { id: string; name: string; bot?: boolean }

/** Pipa pesan antar 2 HP. Semua pesan dikirim ke semua anggota room kecuali pengirim. */
export interface Transport {
  send(msg: unknown): void
  onMessage(cb: (msg: unknown) => void): void
  onPeers(cb: (peers: Peer[]) => void): void
  onStatus(cb: (status: NetStatus) => void): void
  close(): void
}

export type NetStatus = 'connecting' | 'online' | 'offline'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasOnline = Boolean(SUPABASE_URL && SUPABASE_KEY)

export function openTransport(code: string, me: Peer): Transport {
  return hasOnline ? supabaseTransport(code, me) : localTransport(code, me)
}

let client: ReturnType<typeof createClient> | null = null

function supabaseTransport(code: string, me: Peer): Transport {
  client ??= createClient(SUPABASE_URL!, SUPABASE_KEY!)
  let msgCb: (m: unknown) => void = () => {}
  let peerCb: (p: Peer[]) => void = () => {}
  let statusCb: (s: NetStatus) => void = () => {}
  let status: NetStatus = 'connecting'
  const setStatus = (s: NetStatus) => {
    status = s
    statusCb(s)
  }

  const ch: RealtimeChannel = client.channel(`couple-party:${code}`, {
    config: { broadcast: { self: false }, presence: { key: me.id } },
  })
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => msgCb(payload))
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState<{ name: string }>()
    peerCb(Object.entries(state).map(([id, metas]) => ({ id, name: metas[0]?.name ?? '?' })))
  })
  // realtime-js otomatis join ulang setelah koneksi pulih; tiap kali tersambung, umumkan diri lagi
  ch.subscribe(async (st) => {
    if (st === 'SUBSCRIBED') {
      setStatus('online')
      await ch.track({ name: me.name })
    } else {
      setStatus(navigator.onLine ? 'connecting' : 'offline')
    }
  })
  const goOffline = () => setStatus('offline')
  window.addEventListener('offline', goOffline)

  return {
    send: (msg) => void ch.send({ type: 'broadcast', event: 'msg', payload: msg }).catch(() => {}), // offline: pesan hilang, sync berikutnya menyusul
    onMessage: (cb) => (msgCb = cb),
    onPeers: (cb) => (peerCb = cb),
    onStatus: (cb) => {
      statusCb = cb
      cb(status)
    },
    close: () => {
      window.removeEventListener('offline', goOffline)
      void client!.removeChannel(ch)
    },
  }
}

/** Mode tanpa internet: 2 tab di browser yang sama (untuk testing di laptop). */
function localTransport(code: string, me: Peer): Transport {
  const bc = new BroadcastChannel(`couple-party:${code}`)
  let msgCb: (m: unknown) => void = () => {}
  let peerCb: (p: Peer[]) => void = () => {}
  const seen = new Map<string, { name: string; at: number }>()

  const emitPeers = () =>
    peerCb([me, ...[...seen].map(([id, v]) => ({ id, name: v.name }))])

  bc.onmessage = (e) => {
    const d = e.data as { kind: 'ping' | 'bye' | 'msg'; from: Peer; msg?: unknown }
    if (d.kind === 'msg') return msgCb(d.msg)
    if (d.kind === 'bye') seen.delete(d.from.id)
    else {
      const isNew = !seen.has(d.from.id)
      seen.set(d.from.id, { name: d.from.name, at: Date.now() })
      if (!isNew) return
    }
    emitPeers()
  }
  const ping = () => bc.postMessage({ kind: 'ping', from: me })
  const timer = setInterval(() => {
    ping()
    let changed = false
    for (const [id, v] of seen) {
      if (Date.now() - v.at > 3500) {
        seen.delete(id)
        changed = true
      }
    }
    if (changed) emitPeers()
  }, 1000)
  setTimeout(() => (ping(), emitPeers()), 0)

  return {
    send: (msg) => bc.postMessage({ kind: 'msg', from: me, msg }),
    onMessage: (cb) => (msgCb = cb),
    onPeers: (cb) => (peerCb = cb),
    onStatus: (cb) => cb('online'),
    close: () => {
      clearInterval(timer)
      bc.postMessage({ kind: 'bye', from: me })
      bc.close()
    },
  }
}

/**
 * Online: simpan permanen. Mode lokal: per tab, supaya 2 tab = 2 pemain berbeda.
 * Untuk tes 2 pemain di satu browser saat online, buka tab kedua dengan `?p=2`.
 */
const profile = new URLSearchParams(location.search).get('p')
const base: Storage = hasOnline ? localStorage : sessionStorage
export const store: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: (k) => base.getItem(profile ? `${k}@${profile}` : k),
  setItem: (k, v) => base.setItem(profile ? `${k}@${profile}` : k, v),
}
