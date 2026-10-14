import { ArrowLeft01Icon, Copy01Icon, Crown02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { terrazzo } from '@/components/memphis/patterns'
import { LogoMark } from '@/components/memphis/Logo'
import heroArt from '@/assets/illustrations/hero.webp'
import waitingArt from '@/assets/illustrations/waiting.webp'
import { cn } from '@/lib/utils'
import { CATEGORIES, GAMES, gameById, type Category, type GameEntry } from './games/registry'
import type { UnoOptions } from './games/uno/types'
import { Lobby } from './games/uno/ui/Lobby'
import type { SnakesOptions } from './games/snakes/types'
import { Lobby as SnakesLobby } from './games/snakes/ui/Lobby'
import { hasOnline, store, type NetStatus, type Peer } from './net/transport'
import { MAX_ROOM, useRoom } from './net/useRoom'
import { UpdateBanner } from './update/UpdateBanner'
import { useMusic } from './audio/audio'
import { SoundButton } from './audio/SoundSettings'

type RoomInfo = { code: string; host: boolean }

const load = <T,>(k: string): T | null => {
  try {
    return JSON.parse(store.getItem(k) ?? 'null') as T | null
  } catch {
    return null
  }
}

function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')
}

const floor = { backgroundImage: terrazzo(5, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }

export default function App() {
  const [id] = useState(() => {
    const saved = store.getItem('couple-party:id') ?? crypto.randomUUID()
    store.setItem('couple-party:id', saved)
    return saved
  })
  const [name, setName] = useState(() => store.getItem('couple-party:name') ?? '')
  const [room, setRoom] = useState<RoomInfo | null>(() => load<RoomInfo>('couple-party:room'))
  const me = useMemo<Peer>(() => ({ id, name: name.trim() || 'Pemain' }), [id, name])

  const enter = (r: RoomInfo | null) => {
    store.setItem('couple-party:room', JSON.stringify(r))
    setRoom(r)
  }

  return (
    <>
      {!room ? (
        <Home name={name} setName={setName} onEnter={enter} />
      ) : (
        <Room key={room.code} me={me} room={room} onLeave={() => enter(null)} />
      )}
      <RotateHint />
    </>
  )
}

/** Game dirancang untuk landscape; di browser portrait tampilkan ajakan memutar HP. */
function RotateHint() {
  return (
    <div className="fixed inset-0 z-[60] hidden flex-col items-center justify-center gap-4 bg-petal p-8 text-center portrait:max-md:flex" style={floor}>
      <LogoMark size={64} />
      <Tape tone="rose" className="text-2xl">
        Putar HP-mu
      </Tape>
      <p className="max-w-[26ch] bg-paper/90 px-2 py-1 text-sm font-semibold">Couple Party dimainkan dalam posisi landscape.</p>
    </div>
  )
}

function Home({ name, setName, onEnter }: { name: string; setName: (n: string) => void; onEnter: (r: RoomInfo) => void }) {
  const [code, setCode] = useState('')
  useMusic('menu')
  const saveName = (n: string) => {
    setName(n)
    store.setItem('couple-party:name', n)
  }
  const ready = name.trim().length > 0

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-petal px-[max(20px,env(safe-area-inset-left))] py-[max(12px,env(safe-area-inset-top))]"
      style={floor}
    >
      <div className="relative mx-auto grid min-h-[calc(100dvh-24px)] max-w-4xl grid-cols-[1.1fr_1fr] items-center gap-8">
        {/* kiri: identitas */}
        <div className="flex flex-col items-start gap-2">
          <LogoMark size={48} className="-mb-1" />
          <h1 className="flex flex-col items-start gap-1.5 font-display text-[40px] leading-[0.9]">
            <Tape tone="rose" className="text-[40px]">
              Couple
            </Tape>
            <Tape tone="electric" tilt="r" className="ml-8 text-[40px]">
              Party
            </Tape>
          </h1>
          <img
            src={heroArt}
            alt="Dua maskot Couple Party, bulat pink dan kapsul hijau, saling bersandar di atas alas terrazzo"
            className="mt-1 h-[clamp(110px,34dvh,190px)] w-auto select-none"
            draggable={false}
          />
        </div>

        {/* kanan: masuk */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <UpdateBanner />
            <SoundButton />
          </div>
          <p className="-rotate-1 self-start border-[3px] border-ink bg-paper px-2 py-1 text-[14px] font-semibold leading-snug">
            Main bareng 2–8 orang dari HP masing-masing. Yang kalah traktir.
          </p>
          {!hasOnline && (
            <p className="border-[3px] border-ink bg-paper px-3 py-2 text-[13px] font-semibold">
              Mode lokal: belum ada kunci server, hanya bisa main antar tab di perangkat ini.
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm uppercase">Nama kamu</span>
            <input
              value={name}
              onChange={(e) => saveName(e.target.value)}
              placeholder="mis. Andi"
              maxLength={16}
              autoComplete="nickname"
              className="h-12 border-[3px] border-ink bg-paper px-4 text-lg font-semibold shadow-slab-sm outline-none placeholder:text-ink/65 focus:shadow-slab"
            />
          </label>
          <Slab tone="rose" size="md" disabled={!ready} onClick={() => onEnter({ code: makeCode(), host: true })}>
            Buat room
          </Slab>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-sm uppercase">Punya kode room?</span>
            <div className="flex gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                placeholder="KODE"
                aria-label="Kode room"
                autoCapitalize="characters"
                className="h-12 w-0 flex-1 border-[3px] border-ink bg-paper text-center font-display text-2xl tracking-[0.3em] shadow-slab-sm outline-none placeholder:text-ink/65"
              />
              <Slab tone="grass" disabled={!ready || code.length !== 4} onClick={() => onEnter({ code, host: false })}>
                Gabung
              </Slab>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function NetBanner({ net, queued }: { net: NetStatus; queued: number }) {
  if (net === 'online' && queued === 0) return null
  const text =
    net === 'offline'
      ? 'Sinyal putus. Langkahmu disimpan dulu dan dikirim begitu nyambung.'
      : net === 'connecting'
        ? 'Menyambung ke room…'
        : `Mengirim ${queued} langkah…`
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[max(4px,env(safe-area-inset-top))]">
      <span className="-skew-x-6 border-[3px] border-ink bg-ink px-3 py-0.5 text-[12px] font-semibold text-petal">{text}</span>
    </div>
  )
}

function Room({ me, room, onLeave }: { me: Peer; room: RoomInfo; onLeave: () => void }) {
  const { session, online, dispatch, seat, net, queued } = useRoom(room.code, me, room.host)
  const players = session?.players ?? []
  const onlineBySeat = players.map((p) => online.some((o) => o.id === p.id))
  const game = gameById(session?.gameId ?? null)
  const inGame = Boolean(session && seat !== -1 && game)
  useMusic(inGame ? null : 'menu')

  if (session && seat !== -1 && game) {
    return (
      <>
        <NetBanner net={net} queued={queued} />
        <game.View
          state={session.game}
          seat={seat}
          names={players.map((p) => p.name)}
          online={onlineBySeat}
          act={(action: unknown) => dispatch({ kind: 'game', action })}
          exit={() => dispatch({ kind: 'exit' })}
        />
      </>
    )
  }

  const isHost = seat === 0
  return (
    <main
      className="relative min-h-dvh bg-petal px-[max(16px,env(safe-area-inset-left))] pb-4 pt-[max(10px,env(safe-area-inset-top))]"
      style={floor}
    >
      <NetBanner net={net} queued={queued} />
      <div className="relative mx-auto grid h-[calc(100dvh-24px)] max-w-5xl grid-cols-[minmax(200px,260px)_1fr] grid-rows-[auto_1fr] gap-x-6 gap-y-3">
        <header className="col-span-2 flex items-center gap-3">
          <button
            onClick={onLeave}
            aria-label="Keluar dari room"
            className="grid size-10 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.4} />
          </button>
          <RoomCode code={room.code} />
          <span className="ml-auto text-sm font-semibold">
            {players.length}/{MAX_ROOM} pemain
          </span>
          <SoundButton />
        </header>

        {!session || seat === -1 ? (
          <p className="col-span-2 mt-16 text-center font-display text-xl">
            {session ? 'Room ini sudah penuh (8 pemain).' : 'Mencari room…'}
          </p>
        ) : (
          <>
            <PlayerList players={players} online={onlineBySeat} meSeat={seat} />
            <div className="min-h-0 overflow-y-auto pb-2 pr-1">
              {players.length < 2 ? (
                <Waiting code={room.code} />
              ) : isHost ? (
                <GameMenu
                  players={players.length}
                  onStart={(gameId, options) => dispatch({ kind: 'start', gameId, options })}
                />
              ) : (
                <div className="mt-6 flex flex-col items-center gap-4 text-center">
                  <img src={waitingArt} alt="Maskot hijau menunggu" className="h-36 w-auto" draggable={false} />
                  <p className="font-display text-xl">Menunggu {players[0]?.name} memilih game…</p>
                  <p className="max-w-[34ch] bg-paper/90 px-2 py-1 text-sm font-semibold">
                    Host yang memilih game & aturannya. Kamu langsung masuk begitu dia menekan mulai.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 border-[3px] border-ink bg-paper px-3 py-1 shadow-slab-sm active:translate-y-0.5 active:shadow-none"
      aria-label={`Salin kode room ${code}`}
    >
      <span className="font-display text-sm uppercase">Room</span>
      <span className="font-display text-lg tracking-[0.2em]">{code}</span>
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={16} strokeWidth={2.4} />
    </button>
  )
}

const SEAT_TONES = ['bg-rose', 'bg-electric', 'bg-grass', 'bg-paper']

function PlayerList({ players, online, meSeat }: { players: Peer[]; online: boolean[]; meSeat: number }) {
  return (
    <ol className="flex min-h-0 flex-col gap-2 overflow-y-auto pb-2" aria-label="Pemain di room">
      {players.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            'flex items-center gap-2 border-[3px] border-ink px-3 py-1.5 shadow-slab-sm',
            SEAT_TONES[i % SEAT_TONES.length],
            i % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]',
          )}
        >
          <span className={cn('size-3 shrink-0 rounded-full border-2 border-ink', online[i] ? 'bg-electric' : 'bg-paper')} />
          <span className="truncate font-display text-sm uppercase">{p.name}</span>
          {i === meSeat && <span className="text-xs font-semibold">(kamu)</span>}
          {i === 0 && <HugeiconsIcon icon={Crown02Icon} size={16} strokeWidth={2.4} className="ml-auto shrink-0" aria-label="host" />}
        </li>
      ))}
    </ol>
  )
}

/** Menu host: pilih kategori → game → pengaturan → mulai. */
function GameMenu({ players, onStart }: { players: number; onStart: (gameId: string, options: unknown) => void }) {
  const [cat, setCat] = useState<Category>('kartu')
  const [picked, setPicked] = useState<string | null>(null)
  const entries = GAMES.filter((g) => g.category === cat)

  if (picked === 'uno' || picked === 'snakes') {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setPicked(null)} className="self-start text-sm font-semibold underline underline-offset-4">
          ← Pilih game lain
        </button>
        {picked === 'uno' ? (
          <Lobby players={players} onStart={(o: UnoOptions) => onStart('uno', o)} />
        ) : (
          <SnakesLobby players={players} onStart={(o: SnakesOptions) => onStart('snakes', o)} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Kategori game" className="flex flex-wrap gap-3">
        {CATEGORIES.map((c) => (
          <Slab
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            tone={cat === c.id ? 'rose' : 'paper'}
            active={cat === c.id}
            size="sm"
            onClick={() => setCat(c.id)}
          >
            {c.title}
          </Slab>
        ))}
      </div>
      <p className="text-sm font-semibold">{CATEGORIES.find((c) => c.id === cat)?.blurb}</p>
      {entries.length === 0 ? (
        <div className="flex items-center gap-4 border-[3px] border-dashed border-ink bg-paper/80 p-4">
          <img src={waitingArt} alt="" className="h-24 w-auto" draggable={false} />
          <div>
            <p className="font-display text-lg uppercase">Segera hadir</p>
            <p className="text-sm font-medium">Game di kategori ini sedang dibuat. Sementara, main UNO dulu di Game Kartu.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {entries.map((e) => (
            <GameTile key={e.game.id} entry={e} players={players} onPick={() => setPicked(e.game.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameTile({ entry, players, onPick }: { entry: GameEntry; players: number; onPick: () => void }) {
  const fits = players >= entry.minPlayers && players <= entry.maxPlayers
  return (
    <button
      onClick={onPick}
      disabled={!fits}
      aria-label={`${entry.game.title}: ${entry.blurb}, ${entry.minPlayers}–${entry.maxPlayers} pemain`}
      className="flex w-60 -rotate-1 flex-col items-start gap-1 border-[3px] border-ink bg-electric p-4 text-left shadow-slab transition-transform active:translate-x-[3px] active:translate-y-[4px] active:shadow-slab-sm disabled:opacity-60"
    >
      <Tape tone="paper" className="text-2xl">
        {entry.game.title}
      </Tape>
      <span className="mt-1 text-[13px] font-semibold">{entry.blurb}</span>
      <span className="text-xs font-semibold text-ink/75">
        {entry.minPlayers}–{entry.maxPlayers} pemain{fits ? '' : ' · jumlah pemain belum pas'}
      </span>
    </button>
  )
}

function Waiting({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-6">
      <img src={waitingArt} alt="Maskot hijau menunggu sendirian di atas alas terrazzo" className="h-40 w-auto" draggable={false} />
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl leading-tight">Ajak teman gabung</h2>
        <p className="max-w-[30ch] text-sm font-semibold">Bagikan kode ini. Bisa sampai 8 orang dalam satu room.</p>
        <div className="flex gap-2" aria-label={`Kode room ${code.split('').join(' ')}`}>
          {code.split('').map((ch, i) => (
            <span
              key={i}
              className={cn(
                'grid h-14 w-12 place-items-center border-[3px] border-ink font-display text-3xl shadow-slab',
                ['bg-rose', 'bg-electric', 'bg-grass', 'bg-paper'][i],
                i % 2 ? 'rotate-3' : '-rotate-3',
              )}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
