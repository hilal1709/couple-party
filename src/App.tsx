import { ArrowLeft01Icon, Copy01Icon, Crown02Icon, Tick02Icon, WifiDisconnected01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { terrazzo } from '@/components/memphis/patterns'
import { LogoMark } from '@/components/memphis/Logo'
import { Banner } from '@/components/feedback/Banner'
import { Loader, LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Toaster } from '@/components/feedback/Toaster'
import { toast } from '@/components/feedback/toast'
import heroArt from '@/assets/illustrations/hero.webp'
import waitingArt from '@/assets/illustrations/waiting.webp'
import { cn } from '@/lib/utils'
import { CATEGORIES, GAMES, entryById, type Category, type GameEntry } from './games/registry'
import { hasOnline, store, type NetStatus, type Peer } from './net/transport'
import { MAX_ROOM, useRoom, type Pick } from './net/useRoom'
import { UpdateBanner } from './update/UpdateBanner'
import { useMusic } from './audio/audio'
import { SoundButton } from './audio/SoundSettings'

type RoomInfo = { code: string; host: boolean; pick?: Pick | null }

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
        <Home
          name={name}
          setName={setName}
          onCreate={(pick) => enter({ code: makeCode(), host: true, pick })}
          onJoin={(code) => enter({ code, host: false })}
        />
      ) : (
        <Room key={room.code} me={me} room={room} onLeave={() => enter(null)} />
      )}
      <Toaster />
      <RotateHint />
    </>
  )
}

/** Game dirancang untuk landscape; di browser portrait tampilkan ajakan memutar HP. */
function RotateHint() {
  return (
    <div className="fixed inset-0 z-[80] hidden flex-col items-center justify-center gap-4 bg-petal p-8 text-center portrait:max-md:flex" style={floor}>
      <LogoMark size={64} />
      <Tape tone="rose" className="text-2xl">
        Putar HP-mu
      </Tape>
      <p className="max-w-[26ch] bg-paper/90 px-2 py-1 text-sm font-semibold">Couple Party dimainkan dalam posisi landscape.</p>
    </div>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-10 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.4} />
    </button>
  )
}

/** Awal app: isi nama, pilih game (room baru dibuat setelah game diatur), atau gabung pakai kode. */
function Home({
  name,
  setName,
  onCreate,
  onJoin,
}: {
  name: string
  setName: (n: string) => void
  onCreate: (pick: Pick) => void
  onJoin: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState<GameEntry | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  useMusic('menu')
  const saveName = (n: string) => {
    setName(n)
    store.setItem('couple-party:name', n)
  }
  const ready = name.trim().length > 0

  const pickGame = (e: GameEntry) => {
    if (!ready) {
      toast('Isi nama kamu dulu, biar teman tahu siapa yang ngajak.', { tone: 'warn' })
      nameRef.current?.focus()
      return
    }
    setSetup(e)
  }

  if (setup) {
    return (
      <GameSetup
        entry={setup}
        cta="Buat room"
        onBack={() => setSetup(null)}
        onSubmit={(options) => onCreate({ gameId: setup.game.id, options })}
      />
    )
  }

  return (
    <main
      className="relative h-dvh overflow-hidden bg-petal px-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))]"
      style={floor}
    >
      <div className="relative mx-auto grid h-full max-w-5xl grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] items-center gap-6">
        {/* kiri: identitas */}
        <div className="flex flex-col items-start gap-2">
          <LogoMark size={44} className="-mb-1" />
          <h1 className="flex flex-col items-start gap-1.5 font-display text-[36px] leading-[0.9]">
            <Tape tone="rose" className="text-[36px]">
              Couple
            </Tape>
            <Tape tone="electric" tilt="r" className="ml-8 text-[36px]">
              Party
            </Tape>
          </h1>
          <img
            src={heroArt}
            alt="Dua maskot Couple Party, bulat pink dan kapsul hijau, saling bersandar di atas alas terrazzo"
            className="mt-1 h-[clamp(90px,30dvh,170px)] w-auto select-none"
            draggable={false}
          />
          <p className="-rotate-1 border-[3px] border-ink bg-paper px-2 py-1 text-[13px] font-semibold leading-snug">
            Main bareng 2–8 orang dari HP masing-masing. Yang kalah traktir.
          </p>
        </div>

        {/* kanan: nama, pilih game, gabung */}
        <div className="flex max-h-full flex-col gap-3 overflow-y-auto overflow-x-hidden py-[max(12px,env(safe-area-inset-top))] pl-1 pr-2">
          <div className="flex items-center justify-between gap-3">
            <UpdateBanner />
            <SoundButton />
          </div>
          {!hasOnline && (
            <Banner tone="warn" icon={WifiDisconnected01Icon} title="Mode lokal">
              Belum ada kunci server, jadi hanya bisa main antar tab di perangkat ini.
            </Banner>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm uppercase">Nama kamu</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => saveName(e.target.value)}
              placeholder="mis. Andi"
              maxLength={16}
              autoComplete="nickname"
              className="h-11 border-[3px] border-ink bg-paper px-4 text-lg font-semibold shadow-slab-sm outline-none placeholder:text-ink/65 focus:shadow-slab"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="font-display text-sm uppercase">Mau main apa?</span>
            <GamePicker onPick={pickGame} compact />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-sm uppercase">Atau gabung pakai kode room</span>
            <div className="flex gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                placeholder="KODE"
                aria-label="Kode room"
                autoCapitalize="characters"
                className="h-12 w-0 flex-1 border-[3px] border-ink bg-paper text-center font-display text-2xl tracking-[0.3em] shadow-slab-sm outline-none placeholder:text-ink/65"
              />
              <Slab tone="grass" disabled={!ready || code.length !== 4} onClick={() => onJoin(code)}>
                Gabung
              </Slab>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/** Atur game sebelum (atau saat ganti) game: memakai layar Lobby milik game itu. */
function GameSetup({
  entry,
  players,
  cta,
  initial,
  onBack,
  onSubmit,
  embedded,
}: {
  entry: GameEntry
  players?: number
  cta: string
  initial?: unknown
  onBack: () => void
  onSubmit: (options: unknown) => void
  embedded?: boolean
}) {
  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} label="Pilih game lain" />
        <span className="text-sm font-semibold">Pilih game lain</span>
        {!embedded && <SoundButton className="ml-auto" />}
      </div>
      <Suspense fallback={<Loader size={120} label="Membuka pengaturan…" className="mt-6 self-center" />}>
        <entry.Lobby players={players} cta={cta} initial={initial} onSubmit={onSubmit} />
      </Suspense>
    </div>
  )
  if (embedded) return body
  return (
    <main
      className="relative h-dvh overflow-y-auto bg-petal px-[max(20px,env(safe-area-inset-left))] pb-4 pr-[max(20px,env(safe-area-inset-right))] pt-[max(10px,env(safe-area-inset-top))]"
      style={floor}
    >
      <div className="mx-auto max-w-4xl">{body}</div>
    </main>
  )
}

function NetBanner({ net, queued }: { net: NetStatus; queued: number }) {
  if (net === 'online' && queued === 0) return null
  if (net === 'offline')
    return (
      <Banner fixed tone="error" icon={WifiDisconnected01Icon}>
        Sinyal putus. Langkahmu disimpan dulu dan dikirim begitu nyambung.
      </Banner>
    )
  return (
    <Banner fixed tone="warn">
      {net === 'connecting' ? 'Menyambung ke room…' : `Mengirim ${queued} langkah…`}
    </Banner>
  )
}

/** Toast saat pemain masuk/keluar, host ganti game, atau sinyal kembali. */
function useRoomToasts(players: Peer[], meId: string, pick: Pick | null | undefined, isHost: boolean, net: NetStatus) {
  const prevPlayers = useRef<Peer[] | null>(null)
  useEffect(() => {
    const prev = prevPlayers.current
    prevPlayers.current = players
    if (!prev || players.length === 0) return
    for (const p of players) if (p.id !== meId && !prev.some((q) => q.id === p.id)) toast(`${p.name} masuk room`, { tone: 'success' })
    for (const p of prev) if (p.id !== meId && !players.some((q) => q.id === p.id)) toast(`${p.name} keluar dari room`)
  }, [players, meId])

  const prevPick = useRef(pick?.gameId)
  useEffect(() => {
    const was = prevPick.current
    prevPick.current = pick?.gameId
    if (isHost || !pick || !was || was === pick.gameId) return
    toast(`Host ganti game ke ${entryById(pick.gameId)?.game.title ?? pick.gameId}`)
  }, [pick, isHost])

  const prevNet = useRef(net)
  useEffect(() => {
    if (prevNet.current === 'offline' && net === 'online') toast('Nyambung lagi. Lanjut main!', { tone: 'success' })
    prevNet.current = net
  }, [net])
}

function Room({ me, room, onLeave }: { me: Peer; room: RoomInfo; onLeave: () => void }) {
  const { session, online, dispatch, seat, net, queued } = useRoom(room.code, me, room.host, room.pick ?? null)
  const players = session?.players ?? []
  const onlineBySeat = players.map((p) => online.some((o) => o.id === p.id))
  const game = entryById(session?.gameId ?? null)?.game ?? null
  const picked = entryById(session?.pick?.gameId ?? null)
  const inGame = Boolean(session && seat !== -1 && game)
  const isHost = seat === 0
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [changing, setChanging] = useState<GameEntry | 'menu' | null>(null)
  const [lost, setLost] = useState(false)
  useMusic(inGame ? null : 'menu')
  useRoomToasts(players, me.id, session?.pick, isHost, net)

  // tamu: kalau room tidak kunjung ditemukan, beri tahu daripada memutar loader selamanya
  useEffect(() => {
    if (session) return
    const t = setTimeout(() => setLost(true), 12000)
    return () => clearTimeout(t)
  }, [session])

  if (session && seat !== -1 && game) {
    return (
      <>
        <NetBanner net={net} queued={queued} />
        <Suspense fallback={<LoadingScreen label={`Menyiapkan ${game.title}…`} />}>
          <game.View
            state={session.game}
            seat={seat}
            names={players.map((p) => p.name)}
            online={onlineBySeat}
            act={(action: unknown) => dispatch({ kind: 'game', action })}
            exit={() => dispatch({ kind: 'exit' })}
          />
        </Suspense>
      </>
    )
  }

  const leave = () => (isHost && players.length > 1 ? setConfirmLeave(true) : onLeave())
  const menu = isHost && (changing !== null || !picked)

  return (
    <main
      className="relative min-h-dvh bg-petal px-[max(16px,env(safe-area-inset-left))] pb-4 pr-[max(16px,env(safe-area-inset-right))] pt-[max(10px,env(safe-area-inset-top))]"
      style={floor}
    >
      <NetBanner net={net} queued={queued} />
      <div className="relative mx-auto grid h-[calc(100dvh-24px)] max-w-5xl grid-cols-[minmax(200px,250px)_1fr] grid-rows-[auto_1fr] gap-x-6 gap-y-3">
        <header className="col-span-2 flex items-center gap-3">
          <BackButton onClick={leave} label="Keluar dari room" />
          <RoomCode code={room.code} />
          <span className="ml-auto text-sm font-semibold">
            {players.length}/{MAX_ROOM} pemain
          </span>
          <SoundButton />
        </header>

        {!session ? (
          <div className="col-span-2 flex flex-col items-center justify-center gap-4">
            {lost ? (
              <Banner
                tone="warn"
                title={`Room ${room.code} belum ketemu`}
                className="max-w-md"
                action={
                  <Slab tone="ink" size="sm" onClick={onLeave}>
                    Kembali
                  </Slab>
                }
              >
                Cek lagi kodenya, dan pastikan host masih membuka room. Loader tetap mencari di belakang.
              </Banner>
            ) : null}
            <Loader size={150} label="Mencari room…" />
          </div>
        ) : seat === -1 ? (
          <div className="col-span-2 flex items-center justify-center">
            <Banner
              tone="error"
              title="Room penuh"
              className="max-w-md"
              action={
                <Slab tone="paper" size="sm" onClick={onLeave}>
                  Kembali
                </Slab>
              }
            >
              Room ini sudah berisi {MAX_ROOM} pemain. Minta host bikin room baru, atau tunggu ada yang keluar.
            </Banner>
          </div>
        ) : (
          <>
            <PlayerList players={players} online={onlineBySeat} meSeat={seat} />
            <div className="min-h-0 overflow-y-auto pb-2 pr-1">
              {menu ? (
                changing && changing !== 'menu' ? (
                  <GameSetup
                    embedded
                    entry={changing}
                    players={players.length}
                    cta="Pakai game ini"
                    initial={session.pick?.gameId === changing.game.id ? session.pick.options : undefined}
                    onBack={() => setChanging('menu')}
                    onSubmit={(options) => {
                      dispatch({ kind: 'pick', gameId: changing.game.id, options })
                      setChanging(null)
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {picked && (
                      <button onClick={() => setChanging(null)} className="self-start text-sm font-semibold underline underline-offset-4">
                        ← Tetap main {picked.game.title}
                      </button>
                    )}
                    <GamePicker players={players.length} onPick={setChanging} />
                  </div>
                )
              ) : picked ? (
                <div className="flex flex-col gap-4">
                  <PickedGame entry={picked} options={session.pick!.options} />
                  {isHost ? (
                    <HostControls
                      entry={picked}
                      players={players.length}
                      onStart={() => dispatch({ kind: 'start' })}
                      onChange={() => setChanging('menu')}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Loader size={80} />
                      <p className="font-display text-lg leading-tight">Menunggu {players[0]?.name} memulai…</p>
                    </div>
                  )}
                  {players.length < 2 && <Waiting code={room.code} />}
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <Loader size={130} />
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

      <ConfirmModal
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Tutup room?"
        art={waitingArt}
        description="Kamu host-nya. Kalau keluar, teman-teman di room ini tidak bisa mulai main sampai kamu kembali."
        confirmLabel="Keluar"
        onConfirm={onLeave}
      />
    </main>
  )
}

function PickedGame({ entry, options }: { entry: GameEntry; options: unknown }) {
  return (
    <div className="flex items-center gap-4 border-[3px] border-ink bg-paper p-3 shadow-slab -rotate-[0.5deg]">
      <img src={entry.art} alt="" className="h-28 w-auto shrink-0" draggable={false} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-ink/70">Game pilihan host</p>
        <Tape tone="electric" className="mt-1 text-2xl">
          {entry.game.title}
        </Tape>
        <p className="mt-2 text-[13px] font-semibold">{entry.summary(options)}</p>
        <p className="text-xs font-semibold text-ink/70">
          {entry.minPlayers}–{entry.maxPlayers} pemain
        </p>
      </div>
    </div>
  )
}

function HostControls({ entry, players, onStart, onChange }: { entry: GameEntry; players: number; onStart: () => void; onChange: () => void }) {
  const fits = players >= entry.minPlayers && players <= entry.maxPlayers
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <Slab tone="rose" size="lg" className="flex-1" disabled={!fits} onClick={onStart}>
          Mulai main
        </Slab>
        <Slab tone="paper" size="lg" onClick={onChange}>
          Ganti game
        </Slab>
      </div>
      {!fits && (
        <p className="text-[13px] font-semibold">
          {players < entry.minPlayers
            ? `Butuh minimal ${entry.minPlayers} pemain. Bagikan kode room di atas.`
            : `${entry.game.title} maksimal ${entry.maxPlayers} pemain.`}
        </p>
      )}
    </div>
  )
}

function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast(`Kode ${code} disalin. Kirim ke temanmu!`, { tone: 'success' })
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
      toast('Gagal menyalin. Sebutkan kodenya langsung saja.', { tone: 'error' })
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

/** Kategori → tile game. `players` diisi di room untuk menandai game yang jumlah pemainnya belum pas. */
function GamePicker({ players, onPick, compact }: { players?: number; onPick: (e: GameEntry) => void; compact?: boolean }) {
  const [cat, setCat] = useState<Category>('kartu')
  const entries = GAMES.filter((g) => g.category === cat)

  return (
    <div className="flex flex-col gap-3">
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
      {!compact && <p className="text-sm font-semibold">{CATEGORIES.find((c) => c.id === cat)?.blurb}</p>}
      {entries.length === 0 ? (
        <div className="flex items-center gap-4 border-[3px] border-dashed border-ink bg-paper/80 p-3">
          <img src={waitingArt} alt="" className="h-20 w-auto" draggable={false} />
          <div>
            <p className="font-display text-lg uppercase">Segera hadir</p>
            <p className="text-sm font-medium">Game di kategori ini sedang dibuat. Sementara, coba Game Kartu atau Game Board.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {entries.map((e) => (
            <GameTile key={e.game.id} entry={e} players={players} onPick={() => onPick(e)} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameTile({ entry, players, onPick }: { entry: GameEntry; players?: number; onPick: () => void }) {
  const fits = players === undefined || (players >= entry.minPlayers && players <= entry.maxPlayers)
  return (
    <button
      onClick={onPick}
      aria-label={`${entry.game.title}: ${entry.blurb}, ${entry.minPlayers}–${entry.maxPlayers} pemain`}
      className="flex w-64 -rotate-1 items-center gap-3 border-[3px] border-ink bg-electric p-3 text-left shadow-slab transition-transform active:translate-x-[3px] active:translate-y-[4px] active:shadow-slab-sm"
    >
      <img src={entry.art} alt="" className="h-20 w-20 shrink-0 object-contain" draggable={false} />
      <span className="flex min-w-0 flex-col items-start gap-1">
        <Tape tone="paper" className="text-xl">
          {entry.game.title}
        </Tape>
        <span className="text-[12px] font-semibold leading-snug">{entry.blurb}</span>
        <span className="text-[11px] font-semibold text-ink/75">
          {entry.minPlayers}–{entry.maxPlayers} pemain{fits ? '' : ' · jumlah pemain belum pas'}
        </span>
      </span>
    </button>
  )
}

function Waiting({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-6">
      <img src={waitingArt} alt="Maskot hijau menunggu sendirian di atas alas terrazzo" className="h-32 w-auto" draggable={false} />
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
