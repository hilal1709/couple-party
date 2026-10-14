import { entryById, gameById } from '../games/registry'
import type { Seat } from '../games/types'
import type { Peer } from './transport'

/** game & pengaturan yang dipilih host; tetap ada setelah game selesai supaya bisa main lagi */
export type Pick = { gameId: string; options: unknown }

export type Session = {
  players: Peer[] // [host, tamu]
  pick?: Pick | null
  gameId: string | null
  game: unknown
  rev: number
  /** nomor aksi terakhir yang sudah diterapkan per pemain (anti dobel saat kirim ulang) */
  acked?: Record<string, number>
}

export type SessionAction =
  | { kind: 'pick'; gameId: string; options: unknown }
  | { kind: 'start' }
  | { kind: 'exit' }
  | { kind: 'game'; action: unknown }

export function applyAction(s: Session, a: SessionAction, byId: string, seed = Math.floor(Math.random() * 2 ** 31)): Session {
  const seat = s.players.findIndex((p) => p.id === byId) as Seat | -1
  if (seat === -1) return s
  if (a.kind === 'exit') return { ...s, gameId: null, game: null, rev: s.rev + 1 }
  if (a.kind === 'pick') {
    // hanya host yang memilih game, dan tidak saat game berjalan
    if (seat !== 0 || s.gameId || !gameById(a.gameId)) return s
    return { ...s, pick: { gameId: a.gameId, options: a.options }, rev: s.rev + 1 }
  }
  if (a.kind === 'start') {
    const entry = entryById(s.pick?.gameId ?? null)
    const n = s.players.length
    if (seat !== 0 || s.gameId || !entry || n < entry.minPlayers || n > entry.maxPlayers) return s
    const options = { ...(s.pick!.options as object), players: n }
    return { ...s, gameId: entry.game.id, game: entry.game.init(seed, options), rev: s.rev + 1 }
  }
  const g = gameById(s.gameId)
  if (!g) return s
  const game = g.reduce(s.game, a.action, seat)
  return game === s.game ? s : { ...s, game, rev: s.rev + 1 }
}

