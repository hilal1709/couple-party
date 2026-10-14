import { ArrowLeft01Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { terrazzo } from '@/components/memphis/patterns'
import { LogoMark } from '@/components/memphis/Logo'
import { Shapes } from '@/components/memphis/Shapes'
import heroArt from '@/assets/illustrations/hero.webp'
import waitingArt from '@/assets/illustrations/waiting.webp'
import { cn } from '@/lib/utils'
import { gameById } from './games/registry'
import type { UnoOptions } from './games/uno/types'
import { Lobby } from './games/uno/ui/Lobby'
import { hasOnline, store, type NetStatus, type Peer } from './net/transport'
import { useRoom } from './net/useRoom'

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

  if (!room) return <Home name={name} setName={setName} onEnter={enter} />
  return <Room key={room.code} me={me} room={room} onLeave={() => enter(null)} />
}

function Home({ name, setName, onEnter }: { name: string; setName: (n: string) => void; onEnter: (r: RoomInfo) => void }) {
  const [code, setCode] = useState('')
  const saveName = (n: string) => {
    setName(n)
    store.setItem('couple-party:name', n)
  }
  const ready = name.trim().length > 0

  return (
    <main className="relative min-h-dvh overflow-hidden bg-petal px-5 pb-6 pt-[max(16px,env(safe-area-inset-top))]" style={floor}>
      <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto max-w-[560px]">
        <Shapes />
      </div>
      <div className="relative mx-auto flex max-w-sm flex-col gap-5">
        <LogoMark size={56} className="mt-1 -mb-3" />
        <h1 className="flex flex-col items-start gap-2 font-display text-[46px] leading-[0.9]">
          <Tape tone="rose" className="text-[46px]">
            Couple
          </Tape>
          <Tape tone="electric" tilt="r" className="ml-10 text-[46px]">
            Party
          </Tape>
        </h1>
        <div className="-mt-3 flex flex-col items-center gap-3">
          <img
            src={heroArt}
            alt="Dua maskot Couple Party, bulat pink dan kapsul hijau, saling bersandar di atas alas terrazzo"
            className="h-36 w-auto select-none"
            draggable={false}
          />
          <p className="max-w-[30ch] -rotate-1 border-[3px] border-ink bg-paper px-2 py-1 text-center text-[14px] font-semibold leading-snug">
            Main UNO berdua dari HP masing-masing. Yang kalah traktir.
          </p>
        </div>

        {!hasOnline && (
          <p className="border-[3px] border-ink bg-paper px-3 py-2 text-[13px] font-semibold">
            Mode lokal: belum ada kunci server, hanya bisa main antar tab di perangkat ini.
          </p>
        )}

        <label className="flex flex-col gap-2">
          <span className="font-display text-sm uppercase">Nama kamu</span>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="mis. Andi"
            maxLength={16}
            autoComplete="nickname"
            className="h-14 border-[3px] border-ink bg-paper px-4 text-lg font-semibold shadow-slab-sm outline-none placeholder:text-ink/65 focus:shadow-slab"
          />
        </label>

        <Slab tone="rose" size="lg" disabled={!ready} onClick={() => onEnter({ code: makeCode(), host: true })}>
          Buat room
        </Slab>

        <div className="flex flex-col gap-2">
          <span className="font-display text-sm uppercase">Punya kode dari pasangan?</span>
          <div className="flex gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              placeholder="KODE"
              aria-label="Kode room"
              inputMode="text"
              autoCapitalize="characters"
              className="h-12 w-0 flex-1 border-[3px] border-ink bg-paper text-center font-display text-2xl tracking-[0.3em] shadow-slab-sm outline-none placeholder:text-ink/65"
            />
            <Slab tone="grass" disabled={!ready || code.length !== 4} onClick={() => onEnter({ code, host: false })}>
              Gabung
            </Slab>
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
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex justify-center pt-[max(6px,env(safe-area-inset-top))]">
      <span className="-skew-x-6 border-[3px] border-ink bg-ink px-3 py-1 text-[13px] font-semibold text-petal">{text}</span>
    </div>
  )
}

function Room({ me, room, onLeave }: { me: Peer; room: RoomInfo; onLeave: () => void }) {
  const { session, online, dispatch, seat, net, queued } = useRoom(room.code, me, room.host)
  const partner = session?.players.find((p) => p.id !== me.id)
  const partnerOnline = Boolean(partner && online.some((p) => p.id === partner.id))
  const game = gameById(session?.gameId ?? null)

  if (session && seat !== -1 && game) {
    const names = [session.players[0]?.name ?? '?', session.players[1]?.name ?? '?'] as [string, string]
    return (
      <>
        <NetBanner net={net} queued={queued} />
        <game.View
          state={session.game}
          seat={seat}
          names={names}
          partnerOnline={partnerOnline}
          act={(action: unknown) => dispatch({ kind: 'game', action })}
          exit={() => dispatch({ kind: 'exit' })}
        />
      </>
    )
  }

  return (
    <main className="relative min-h-dvh bg-petal px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))]" style={floor}>
      <NetBanner net={net} queued={queued} />
      <header className="relative mx-auto flex max-w-sm items-center gap-3">
        <button
          onClick={onLeave}
          aria-label="Keluar dari room"
          className="grid size-10 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.4} />
        </button>
        <span className="font-display text-sm uppercase">Room {room.code}</span>
        <span className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <span className={cn('size-3 rounded-full border-2 border-ink', partnerOnline ? 'bg-electric' : 'bg-paper')} />
          {partner ? partner.name : 'belum ada'}
        </span>
      </header>

      <div className="relative mx-auto mt-6 max-w-sm">
        {!session || seat === -1 ? (
          <p className="mt-24 text-center font-display text-xl">
            {session ? 'Room ini sudah penuh.' : 'Mencari room…'}
          </p>
        ) : !partner ? (
          <Waiting code={room.code} />
        ) : (
          <Lobby onStart={(options: UnoOptions) => dispatch({ kind: 'start', gameId: 'uno', options })} />
        )}
      </div>
    </main>
  )
}

const CODE_TONES = ['bg-rose', 'bg-electric', 'bg-grass', 'bg-paper']

function Waiting({ code }: { code: string }) {
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
    <div className="mt-6 flex flex-col items-center gap-6 text-center">
      <img src={waitingArt} alt="Maskot hijau menunggu sendirian di atas alas terrazzo" className="h-40 w-auto" draggable={false} />
      <h2 className="font-display text-3xl leading-tight">
        Kirim kode ini
        <br />
        ke pasanganmu
      </h2>
      <div className="flex gap-2" aria-label={`Kode room ${code.split('').join(' ')}`}>
        {code.split('').map((ch, i) => (
          <span
            key={i}
            className={cn(
              'grid h-20 w-16 place-items-center border-[3px] border-ink font-display text-5xl shadow-slab',
              CODE_TONES[i],
              i % 2 ? 'rotate-3' : '-rotate-3',
            )}
          >
            {ch}
          </span>
        ))}
      </div>
      <Slab tone="paper" onClick={copy}>
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={18} strokeWidth={2.4} />
        {copied ? 'Tersalin' : 'Salin kode'}
      </Slab>
      <p className="max-w-[28ch] bg-paper/90 px-2 py-1 text-sm font-semibold">
        Begitu dia gabung, kalian langsung pilih mau main UNO versi apa.
      </p>
    </div>
  )
}
