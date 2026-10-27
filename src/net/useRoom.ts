export type { Pick, Session, SessionAction } from './session'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyAction, type Pick, type Session, type SessionAction } from './session'
import type { LiveChannel, Seat } from '../games/types'
import { openTransport, store, type NetStatus, type Peer, type Transport } from './transport'

type Msg =
  | { t: 'hello'; from: Peer }
  | { t: 'sync'; session: Session }
  | { t: 'act'; from: string; n: number; action: SessionAction }
  /** pesan game real-time (mis. posisi kart): tidak disimpan, tidak di-ack, tidak dikirim ulang */
  | { t: 'live'; from: string; d: unknown }

/** jumlah kursi maksimum dalam satu room */
export const MAX_ROOM = 8

const storeKey = (code: string) => `couple-party:session:${code}`

/**
 * Host menyimpan "kebenaran" (session) dan menjalankan reducer.
 * Tamu hanya mengirim aksi dan menampilkan session terakhir dari host.
 */
export function useRoom(code: string, me: Peer, isHost: boolean, initialPick: Pick | null = null) {
  const [session, setSession] = useState<Session | null>(() => {
    if (!isHost) return null
    const saved = store.getItem(storeKey(code))
    const s = saved ? (JSON.parse(saved) as Session) : null
    if (s) return s.epoch ? s : { ...s, epoch: Math.random().toString(36).slice(2) }
    return { players: [me], pick: initialPick, gameId: null, game: null, rev: 0, epoch: Math.random().toString(36).slice(2) }
  })
  const [online, setOnline] = useState<Peer[]>([])
  const [net, setNet] = useState<NetStatus>('connecting')
  const [queued, setQueued] = useState(0)
  const tRef = useRef<Transport | null>(null)
  const sessionRef = useRef(session)
  /** aksi tamu yang belum dikonfirmasi host; dikirim ulang sampai masuk */
  const outbox = useRef<{ n: number; action: SessionAction }[]>([])
  const counter = useRef(Number(store.getItem(`couple-party:actn:${code}`) ?? 0))
  const liveCbs = useRef(new Set<(d: unknown, from: string) => void>())

  const commit = useCallback(
    (next: Session) => {
      sessionRef.current = next
      setSession(next)
      store.setItem(storeKey(code), JSON.stringify(next))
      tRef.current?.send({ t: 'sync', session: next } satisfies Msg)
    },
    [code],
  )

  const flush = useCallback(() => {
    for (const m of outbox.current) tRef.current?.send({ t: 'act', from: me.id, n: m.n, action: m.action } satisfies Msg)
  }, [me.id])

  // Jaga layar tetap menyala selama di room: layar redup/mati menidurkan koneksi realtime.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let closed = false
    const acquire = () => {
      if (closed || lock || document.visibilityState !== 'visible') return
      navigator.wakeLock
        ?.request('screen')
        .then((l) => {
          if (closed) return void l.release()
          lock = l
          l.addEventListener('release', () => (lock = null))
        })
        .catch(() => {}) // tidak didukung / ditolak: abaikan, game tetap jalan
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      closed = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [])

  /** naik setiap koneksi perlu dibangun ulang (kembali dari background / internet pulih) */
  const [conn, setConn] = useState(0)
  useEffect(() => {
    // Android menidurkan WebSocket saat app di background: saluran mati diam-diam padahal
    // status masih 'online', jadi aksi terkirim ke ruang kosong. Bangun ulang saat kembali.
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 2000) {
        hiddenAt = 0
        setConn((c) => c + 1)
      }
    }
    const onNet = () => setConn((c) => c + 1)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onNet)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onNet)
    }
  }, [])

  useEffect(() => {
    const t = openTransport(code, me)
    tRef.current = t
    const hello = () => t.send({ t: 'hello', from: me } satisfies Msg)

    t.onStatus((st) => {
      setNet(st)
      // tersambung lagi: minta state terbaru & kirim ulang aksi yang tertunda
      if (st === 'online' && !isHost) {
        hello()
        flush()
      }
    })

    t.onPeers((peers) => {
      setOnline(peers)
      if (!isHost) return
      const s = sessionRef.current!
      const guests = peers.filter((p) => p.id !== me.id)
      if (!s.gameId) {
        // di lobby: daftar pemain = host + tamu yang sedang online (urutan bergabung), maks 8
        const kept = s.players.slice(1).filter((p) => guests.some((g) => g.id === p.id))
        const fresh = guests.filter((g) => !kept.some((p) => p.id === g.id))
        const players = [s.players[0], ...kept, ...fresh].slice(0, MAX_ROOM)
        const changed =
          players.length !== s.players.length || players.some((p, i) => p.id !== s.players[i]?.id || p.name !== s.players[i]?.name)
        if (changed) return commit({ ...s, players, rev: s.rev + 1 })
      }
      // saat game berjalan daftar pemain dikunci; yang reconnect cukup dikirimi state terbaru
      if (guests.length) t.send({ t: 'sync', session: s } satisfies Msg)
    })

    t.onMessage((raw) => {
      const m = raw as Msg
      if (m.t === 'live') {
        liveCbs.current.forEach((cb) => cb(m.d, m.from))
        return
      }
      if (isHost) {
        if (m.t === 'hello') t.send({ t: 'sync', session: sessionRef.current! } satisfies Msg)
        if (m.t === 'act') {
          const cur = sessionRef.current!
          if (m.n <= (cur.acked?.[m.from] ?? 0)) {
            t.send({ t: 'sync', session: cur } satisfies Msg) // dobel: cukup konfirmasi ulang
            return
          }
          const applied = applyAction(cur, m.action, m.from)
          commit({ ...applied, rev: cur.rev + 1, acked: { ...cur.acked, [m.from]: m.n } })
        }
      } else if (m.t === 'sync') {
        const cur = sessionRef.current
        // epoch berbeda = host membuat room/sesi baru (rev mulai dari 0 lagi); tanpa ini
        // tamu menolak semua sync karena revnya "lebih lama" dan antrean macet selamanya
        const fresh = cur !== null && m.session.epoch !== cur.epoch
        if (cur && !fresh && m.session.rev < cur.rev) return
        if (fresh) outbox.current = []
        sessionRef.current = m.session
        setSession(m.session)
        const done = m.session.acked?.[me.id] ?? 0
        if (done > counter.current) counter.current = done // nomor aksi tidak boleh di bawah yang sudah diterima host
        outbox.current = outbox.current.filter((o) => o.n > done)
        setQueued(outbox.current.length)
      }
    })

    if (!isHost) {
      hello()
      // aksi yang belum dikonfirmasi dikirim ulang cepat (paket broadcast bisa hilang);
      // hello berkala menjemput state terbaru kalau 'sync' dari host sempat hilang
      let tick = 0
      const id = setInterval(() => {
        tick++
        if (outbox.current.length) flush()
        if (!sessionRef.current || tick % 6 === 0) hello()
      }, 500)
      return () => {
        clearInterval(id)
        t.close()
      }
    }
    return () => t.close()
  }, [code, me, isHost, commit, flush, conn])

  const dispatch = useCallback(
    (action: SessionAction) => {
      if (isHost) {
        const next = applyAction(sessionRef.current!, action, me.id)
        if (next !== sessionRef.current) commit(next)
      } else {
        const n = ++counter.current
        store.setItem(`couple-party:actn:${code}`, String(n))
        outbox.current.push({ n, action })
        setQueued(outbox.current.length)
        tRef.current?.send({ t: 'act', from: me.id, n, action } satisfies Msg)
      }
    },
    [isHost, me.id, commit, code],
  )

  // Tamu: langsung tampilkan hasil aksinya sendiri (optimistis) selagi menunggu konfirmasi host;
  // begitu 'sync' dari host tiba, state resmi menggantikannya.
  const shown = useMemo(() => {
    if (isHost || !session || !outbox.current.length) return session
    const done = session.acked?.[me.id] ?? 0
    let s = session
    for (const o of outbox.current) {
      if (o.n > done && o.action.kind === 'game') s = applyAction(s, o.action, me.id)
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, queued, isHost, me.id])

  const live = useMemo<LiveChannel>(
    () => ({
      send: (d) => tRef.current?.send({ t: 'live', from: me.id, d } satisfies Msg),
      on: (cb) => {
        const players = () => sessionRef.current?.players ?? []
        const wrapped = (d: unknown, from: string) => {
          const seat = players().findIndex((p) => p.id === from)
          if (seat !== -1) cb(d, seat)
        }
        liveCbs.current.add(wrapped)
        return () => void liveCbs.current.delete(wrapped)
      },
    }),
    [me.id],
  )

  const seat = (session?.players.findIndex((p) => p.id === me.id) ?? -1) as Seat | -1
  return { session: shown, online, dispatch, seat, net, queued, live }
}
