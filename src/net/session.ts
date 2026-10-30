import { entryById, gameById, playerRange } from '../games/registry'
import type { BotLevel, Seat } from '../games/types'
import type { Peer } from './transport'

/** jumlah kursi maksimum dalam satu room */
export const MAX_ROOM = 8

const BOT_NAMES = ['Bot Cilok', 'Bot Seblak', 'Bot Klepon', 'Bot Cimol', 'Bot Bakwan', 'Bot Lumpia', 'Bot Onde', 'Bot Kerupuk']

/** game & pengaturan yang dipilih host; tetap ada setelah game selesai supaya bisa main lagi */
export type Pick = { gameId: string; options: unknown }

export type Session = {
  players: Peer[] // [host, tamu]
  pick?: Pick | null
  gameId: string | null
  game: unknown
  rev: number
  /** id sesi dari host; berganti kalau host membuat sesi baru (rev mulai dari 0 lagi) */
  epoch?: string
  /** nomor aksi terakhir yang sudah diterapkan per pemain (anti dobel saat kirim ulang) */
  acked?: Record<string, number>
  /** tingkat semua bot di room ini; kosong = sedang */
  botLevel?: BotLevel
}

export type SessionAction =
  | { kind: 'pick'; gameId: string; options: unknown }
  | { kind: 'start' }
  | { kind: 'exit' }
  | { kind: 'game'; action: unknown }
  | { kind: 'addBot' }
  | { kind: 'removeBot' }
  | { kind: 'botLevel'; level: BotLevel }

export function applyAction(s: Session, a: SessionAction, byId: string, seed = Math.floor(Math.random() * 2 ** 31)): Session {
  const seat = s.players.findIndex((p) => p.id === byId) as Seat | -1
  if (seat === -1) return s
  if (a.kind === 'exit') return { ...s, gameId: null, game: null, rev: s.rev + 1 }
  if (a.kind === 'pick') {
    // hanya host yang memilih game, dan tidak saat game berjalan
    if (seat !== 0 || s.gameId || !gameById(a.gameId)) return s
    const players = entryById(a.gameId)?.nativeBots ? s.players.filter((p) => !p.bot) : s.players
    return { ...s, players, pick: { gameId: a.gameId, options: a.options }, rev: s.rev + 1 }
  }
  if (a.kind === 'addBot') {
    const entry = entryById(s.pick?.gameId ?? null)
    const name = BOT_NAMES.find((n) => !s.players.some((p) => p.name === n))
    if (seat !== 0 || s.gameId || !entry?.game.bot || !name) return s
    if (s.players.length >= Math.min(MAX_ROOM, playerRange(entry, s.pick!.options)[1])) return s
    return { ...s, players: [...s.players, { id: `bot:${name}`, name, bot: true }], rev: s.rev + 1 }
  }
  if (a.kind === 'removeBot') {
    const last = s.players.findLastIndex((p) => p.bot)
    if (seat !== 0 || s.gameId || last === -1) return s
    return { ...s, players: s.players.filter((_, i) => i !== last), rev: s.rev + 1 }
  }
  if (a.kind === 'botLevel') {
    if (seat !== 0 || s.gameId) return s
    return { ...s, botLevel: a.level, rev: s.rev + 1 }
  }
  if (a.kind === 'start') {
    const entry = entryById(s.pick?.gameId ?? null)
    const n = s.players.length
    if (seat !== 0 || s.gameId || !entry) return s
    const [min, max] = playerRange(entry, s.pick!.options)
    if (n < min || n > max) return s
    const botSeats = s.players.flatMap((p, i) => (p.bot ? [i] : []))
    const options = { ...(s.pick!.options as object), players: n, botSeats }
    return { ...s, gameId: entry.game.id, game: entry.game.init(seed, options), rev: s.rev + 1 }
  }
  const g = gameById(s.gameId)
  if (!g) return s
  const game = g.reduce(s.game, a.action, seat)
  return game === s.game ? s : { ...s, game, rev: s.rev + 1 }
}

