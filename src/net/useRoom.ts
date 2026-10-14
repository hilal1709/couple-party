import { useCallback, useEffect, useRef, useState } from 'react'
import { gameById } from '../games/registry'
import type { Seat } from '../games/types'
import { openTransport, store, type NetStatus, type Peer, type Transport } from './transport'

export type Session = {
  players: Peer[] // [host, tamu]
  gameId: string | null
  game: unknown
  rev: number
  /** nomor aksi terakhir yang sudah diterapkan per pemain (anti dobel saat kirim ulang) */
  acked?: Record<string, number>
}

export type SessionAction =
  | { kind: 'start'; gameId: string; options?: unknown }
  | { kind: 'exit' }
  | { kind: 'game'; action: unknown }

type Msg =
  | { t: 'hello'; from: Peer }
  | { t: 'sync'; session: Session }
  | { t: 'act'; from: string; n: number; action: SessionAction }

/** jumlah kursi maksimum dalam satu room */
export const MAX_ROOM = 8

const storeKey = (code: string) => `couple-party:session:${code}`

function applyAction(s: Session, a: SessionAction, byId: string): Session {
  const seat = s.players.findIndex((p) => p.id === byId) as Seat | -1
  if (seat === -1) return s
  if (a.kind === 'exit') return { ...s, gameId: null, game: null, rev: s.rev + 1 }
  if (a.kind === 'start') {
    const g = gameById(a.gameId)
    if (!g || s.players.length < 2) return s
    const options = { ...(a.options as object), players: s.players.length }
    return { ...s, gameId: g.id, game: g.init(Math.floor(Math.random() * 2 ** 31), options), rev: s.rev + 1 }
  }
  const g = gameById(s.gameId)
  if (!g) return s
  const game = g.reduce(s.game, a.action, seat)
  return game === s.game ? s : { ...s, game, rev: s.rev + 1 }
}

/**
 * Host menyimpan "kebenaran" (session) dan menjalankan reducer.
 * Tamu hanya mengirim aksi dan menampilkan session terakhir dari host.
 */
export function useRoom(code: string, me: Peer, isHost: boolean) {
  const [session, setSession] = useState<Session | null>(() => {
    if (!isHost) return null
    const saved = store.getItem(storeKey(code))
    return saved ? (JSON.parse(saved) as Session) : { players: [me], gameId: null, game: null, rev: 0 }
  })
  const [online, setOnline] = useState<Peer[]>([])
  const [net, setNet] = useState<NetStatus>('connecting')
  const [queued, setQueued] = useState(0)
  const tRef = useRef<Transport | null>(null)
  const sessionRef = useRef(session)
  /** aksi tamu yang belum dikonfirmasi host; dikirim ulang sampai masuk */
  const outbox = useRef<{ n: number; action: SessionAction }[]>([])
  const counter = useRef(Number(store.getItem(`couple-party:actn:${code}`) ?? 0))

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
      } else if (m.t === 'sync' && m.session.rev >= (sessionRef.current?.rev ?? -1)) {
        sessionRef.current = m.session
        setSession(m.session)
        const done = m.session.acked?.[me.id] ?? 0
        outbox.current = outbox.current.filter((o) => o.n > done)
        setQueued(outbox.current.length)
      }
    })

    if (!isHost) {
      hello()
      const id = setInterval(() => {
        if (!sessionRef.current) hello()
        if (outbox.current.length) flush()
      }, 2000)
      return () => {
        clearInterval(id)
        t.close()
      }
    }
    return () => t.close()
  }, [code, me, isHost, commit, flush])

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

  const seat = (session?.players.findIndex((p) => p.id === me.id) ?? -1) as Seat | -1
  return { session, online, dispatch, seat, net, queued }
}
