import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import confetti from '@/assets/lottie/confetti.json'
import fxCaught from '@/assets/lottie/petak-ketangkap.json'
import fxSafe from '@/assets/lottie/petak-lolos.json'
import fxSplash from '@/assets/lottie/petak-ciprat.json'
import fxBlind from '@/assets/lottie/petak-tutup.json'
import { useMusic } from '@/audio/audio'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import type { GameProps } from '../../types'
import { actorOf, hiders, isSeeker, ranking } from '../engine'
import { MAP_INFO } from '../maps'
import { ROTATIONS, type PainterView, type Tool } from '../render/painter'
import { POSES, POSE_LABEL } from '../render/poses'
import { MISS_PENALTY, Round, type Hud } from '../round'
import { Ambient, playSound } from '../sounds'
import type { PetakAction, PetakState } from '../types'
import { botName, CAUGHT_LINE, clock, HIDE_TIP, rankLine } from './copy'

type Props = GameProps<PetakState, PetakAction>

export function PetakBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  useMusic(s.phase === 'hunt' ? 'petak-tense' : 'petak')
  const nameOf = (actor: number) => {
    const a = s.actors[actor].seat
    return a === null ? botName(actor) : names[a] ?? '?'
  }
  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      {s.phase === 'end' ? (
        <EndScreen s={s} seat={seat} nameOf={nameOf} exit={exit} />
      ) : (
        <RoundScreen key={s.round} s={s} seat={seat} online={online} act={act} live={live} nameOf={nameOf} back={() => setConfirmExit(true)} />
      )}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Keluar dari permainan?" description="Semua pemain kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

type ScreenProps = Pick<Props, 'seat' | 'online' | 'act' | 'live'> & { s: PetakState; nameOf: (a: number) => string; back: () => void }

function RoundScreen({ s, seat, online, act, live, nameOf, back }: ScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [paintView, setPaintView] = useState<PainterView | null>(null)
  const [posing, setPosing] = useState(false)
  const [flash, setFlash] = useState<'caught' | 'safe' | null>(null)
  const [failed, setFailed] = useState(false)
  const me = actorOf(s, seat)
  const actRef = useRef(act)
  actRef.current = act

  useEffect(() => {
    let r: Round
    try {
      r = new Round({
      canvas: canvas.current!,
      state: s,
      seat,
      act: (a) => actRef.current(a),
      live,
      onHud: setHud,
      onSound: playSound,
      onPainter: () => setPaintView(r.painter ? r.painter.view : null),
      })
    } catch {
      // WebGL tidak tersedia, atau HP kehabisan memori
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV) (window as unknown as { __petak?: Round }).__petak = r
    const amb = new Ambient()
    amb.start(MAP_INFO[s.map].ambient)
    r.start().catch((e) => {
      console.error('Petak Cat gagal memuat map', e)
      setFailed(true)
    })
    return () => {
      amb.stop()
      r.dispose()
      round.current = null
    }
    // ronde baru = komponen baru (key), jadi cukup sekali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    round.current?.setState(s)
  }, [s])

  // tangkapan terakhir: tampilkan efek untuk korbannya
  const lastId = s.lastCatch?.id
  useEffect(() => {
    if (!lastId || s.lastCatch?.target !== me) return
    setFlash('caught')
    const t = setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId])

  useKeyboard(round)

  const painting = !!hud?.painting
  const role = hud?.role ?? (isSeeker(s, me) ? 'seeker' : 'hider')
  const blind = s.phase === 'hide' && isSeeker(s, me)

  return (
    <div className="absolute inset-0">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label="Dunia permainan" />
      <TouchLayer round={round} painting={painting} />
      {!hud && !failed && <LoadingScreen label={`Menuju ${MAP_INFO[s.map].title}`} sub="Warga lagi disuruh minggir" overlay />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-petal text-center text-ink">
          <div>
            <p className="font-display text-xl uppercase">Map gagal dimuat</p>
            <p className="mb-3 text-sm">HP-nya mungkin kehabisan memori. Coba tutup aplikasi lain.</p>
            <Slab tone="rose" size="md" onClick={back}>Keluar</Slab>
          </div>
        </div>
      )}
      {hud && (
        <>
          <TopBar s={s} hud={hud} online={online} nameOf={nameOf} back={back} />
          {!painting && s.phase !== 'reveal' && (
            <button onClick={() => round.current?.cycleZoom()} className="absolute top-10 right-2 border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold text-ink">
              Zoom
            </button>
          )}
          {blind && <BlindScreen secs={hud.secs} />}
          {role === 'seeker' && s.phase === 'hunt' && <SeekerControls hud={hud} onGrab={() => round.current?.grab()} />}
          {role === 'hider' && (s.phase === 'hide' || s.phase === 'hunt') && !painting && (
            <HiderControls hud={hud} posing={posing} setPosing={setPosing} round={round} />
          )}
          {painting && paintView && <PaintPanel view={paintView} round={round} />}
          {painting && !paintView && <PaintPanelBoot round={round} setView={setPaintView} />}
          {s.phase === 'hide' && role === 'hider' && !painting && <HideTip secs={hud.secs} total={s.opts.hideSecs} />}
          {role === 'out' && s.phase === 'hunt' && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-display text-sm text-paper uppercase">Kamu keluar. Nonton pencari dulu.</p>}
          {s.phase === 'reveal' && <RevealPanel s={s} hud={hud} seat={seat} act={act} nameOf={nameOf} />}
          {flash && <Flash kind={flash} line={CAUGHT_LINE[(lastId ?? 0) % CAUGHT_LINE.length]} />}
        </>
      )}
    </div>
  )
}

function useKeyboard(round: React.RefObject<Round | null>) {
  useEffect(() => {
    const held = new Set<string>()
    const apply = () => {
      const x = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0)
      const y = (held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)
      round.current?.setMove(x, y)
    }
    const down = (e: KeyboardEvent) => {
      held.add(e.key.toLowerCase())
      apply()
    }
    const up = (e: KeyboardEvent) => {
      held.delete(e.key.toLowerCase())
      apply()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [round])
}

/** Sisi kiri = stik gerak yang muncul di bawah jari; sisi kanan = geser kamera. Saat mengecat, jari melukis badan. */
function TouchLayer({ round, painting }: { round: React.RefObject<Round | null>; painting: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const touches = useRef(new Map<number, { kind: 'stick' | 'look' | 'paint'; x: number; y: number }>())

  const down = (e: React.PointerEvent) => {
    const r = round.current
    if (!r) return
    el.current!.setPointerCapture(e.pointerId)
    const rect = el.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (painting && r.painter) {
      const tool = r.painter.view.tool
      const used = r.painter.down(px, py)
      if (tool === 'pipet') r.pipetSound()
      touches.current.set(e.pointerId, { kind: used ? 'paint' : 'look', x: e.clientX, y: e.clientY })
      return
    }
    if (px < rect.width * 0.42) {
      touches.current.set(e.pointerId, { kind: 'stick', x: e.clientX, y: e.clientY })
      setStick({ x: px, y: py, dx: 0, dy: 0 })
    } else {
      touches.current.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY })
    }
  }

  const move = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId)
    const r = round.current
    if (!t || !r) return
    const rect = el.current!.getBoundingClientRect()
    if (t.kind === 'paint') r.painter?.move(e.clientX - rect.left, e.clientY - rect.top)
    else if (t.kind === 'look') {
      r.look(e.clientX - t.x, e.clientY - t.y)
      t.x = e.clientX
      t.y = e.clientY
    } else {
      const R = 52
      const dx = e.clientX - t.x
      const dy = e.clientY - t.y
      const len = Math.min(1, Math.hypot(dx, dy) / R)
      const a = Math.atan2(dy, dx)
      r.setMove(Math.cos(a) * len, -Math.sin(a) * len)
      setStick((s) => s && { ...s, dx: Math.cos(a) * len * R, dy: Math.sin(a) * len * R })
    }
  }

  const up = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId)
    touches.current.delete(e.pointerId)
    const r = round.current
    if (!t || !r) return
    if (t.kind === 'paint' && r.painter?.up()) r.paintChanged()
    if (t.kind === 'stick') {
      r.setMove(0, 0)
      setStick(null)
    }
  }

  return (
    <div ref={el} data-testid="petak-touch" className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {stick && (
        <span className="pointer-events-none absolute size-[104px] rounded-full border-[3px] border-paper/70 bg-ink/25" style={{ left: stick.x - 52, top: stick.y - 52 }}>
          <span className="absolute top-1/2 left-1/2 size-12 rounded-full border-[3px] border-ink bg-electric" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
        </span>
      )}
    </div>
  )
}

function TopBar({ s, hud, online, nameOf, back }: { s: PetakState; hud: Hud; online: boolean[]; nameOf: (a: number) => string; back: () => void }) {
  const label = s.phase === 'hide' ? 'Sembunyi' : s.phase === 'hunt' ? 'Berburu' : 'Buka kartu'
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <button onClick={back} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold text-ink">
        Keluar
      </button>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 border-[3px] border-ink bg-paper px-2 py-0.5 text-ink shadow-slab-sm">
          <span className="font-display text-[11px] uppercase">{label}</span>
          <span className={cn('font-display text-xl leading-none tabular-nums', hud.secs <= 10 && s.phase !== 'reveal' && 'text-rose')}>{clock(hud.secs)}</span>
        </div>
        <ul className="flex flex-wrap justify-center gap-1">
          {s.actors.map((a, i) => (
            <li
              key={i}
              data-seat={a.seat ?? undefined}
              className={cn(
                'border-2 border-ink px-1 text-[10px] leading-4 font-bold text-ink',
                isSeeker(s, i) ? 'bg-rose' : s.caught[i] !== null ? 'bg-ink text-paper/60 line-through' : 'bg-paper',
                a.seat !== null && !online[a.seat] && 'opacity-50',
              )}
            >
              {nameOf(i)}
            </li>
          ))}
        </ul>
      </div>
      <span className="border-[3px] border-ink bg-electric px-2 py-1 text-xs font-bold text-ink">
        {s.round + 1}/{s.opts.rounds} · {hud.free}/{hud.total} lolos
      </span>
    </div>
  )
}

function BlindScreen({ secs }: { secs: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink text-center text-paper">
      <div>
        <Lottie src={fxBlind} loop className="mx-auto size-36" />
        <p className="font-display text-xl uppercase">Tutup mata!</p>
        <p className="text-sm">Yang lain lagi sembunyi. Kamu lepas dari pos ronda sebentar lagi.</p>
        <p className="mt-1 font-display text-4xl tabular-nums">{clock(secs)}</p>
      </div>
    </div>
  )
}

function HideTip({ secs, total }: { secs: number; total: number }) {
  const line = HIDE_TIP[Math.min(HIDE_TIP.length - 1, Math.floor(((total - secs) / total) * HIDE_TIP.length))]
  return <p className="pointer-events-none absolute bottom-2 left-2 w-[46%] border-2 border-ink bg-paper/90 px-2 py-0.5 text-center text-[12px] text-ink">{line}</p>
}

function HiderControls({ hud, posing, setPosing, round }: { hud: Hud; posing: boolean; setPosing: (v: boolean) => void; round: React.RefObject<Round | null> }) {
  return (
    <>
      <div className="absolute right-3 bottom-3 flex items-end gap-2.5">
        <Slab tone="paper" size="md" onClick={() => setPosing(!posing)}>Pose</Slab>
        <Slab tone="rose" size="lg" onClick={() => round.current?.setPainting(true)}>Cat</Slab>
      </div>
      {posing && (
        <ul className="absolute right-3 bottom-[88px] grid w-[300px] grid-cols-4 gap-1 border-[3px] border-ink bg-paper p-1.5 shadow-slab-sm">
          {POSES.map((p) => (
            <li key={p}>
              <button
                aria-pressed={hud.pose === p}
                onClick={() => {
                  round.current?.setPose(p)
                  setPosing(false)
                }}
                className={cn('h-8 w-full border-2 border-ink text-[11px] font-bold text-ink', hud.pose === p ? 'bg-electric' : 'bg-petal')}
              >
                {POSE_LABEL[p]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function SeekerControls({ hud, onGrab }: { hud: Hud; onGrab: () => void }) {
  const waiting = hud.penalty > 0
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-paper shadow-[0_0_0_2px_#121212]" />
      <Slab tone="rose" size="lg" className="absolute right-4 bottom-4" disabled={waiting} onClick={onGrab}>
        {waiting ? `Pusing ${Math.ceil(hud.penalty)}` : 'Tangkap!'}
      </Slab>
      {waiting && <p className="pointer-events-none absolute inset-x-0 top-[62%] text-center font-display text-sm text-paper uppercase">Salah tangkap! Tertahan {MISS_PENALTY} detik</p>}
    </>
  )
}

function PaintPanelBoot({ round, setView }: { round: React.RefObject<Round | null>; setView: (v: PainterView) => void }) {
  useEffect(() => {
    if (round.current?.painter) setView(round.current.painter.view)
  }, [round, setView])
  return null
}

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pipet', label: 'Pipet' },
  { id: 'kuas', label: 'Kuas' },
  { id: 'cap', label: 'Cap pola' },
  { id: 'hapus', label: 'Hapus' },
]

/** alat mengecat: kiri alat, kanan pengaturan; tengah layar selalu kosong untuk badan dan latar */
function PaintPanel({ view, round }: { view: PainterView; round: React.RefObject<Round | null> }) {
  const p = round.current?.painter
  const chip = (on: boolean) => cn('h-8 border-[3px] border-ink px-2 text-[12px] font-bold text-ink disabled:opacity-40', on ? 'bg-electric' : 'bg-paper')
  const [zoomed, setZoomed] = useState(false)
  const set = () => round.current?.paintChanged()
  if (!p) return null
  return (
    <>
      <div className="absolute top-14 bottom-2 left-2 flex w-[84px] flex-col gap-1">
        {TOOLS.map((t) => (
          <button key={t.id} className={chip(view.tool === t.id)} disabled={t.id === 'cap' && !view.hasPattern} onClick={() => p.set({ tool: t.id })}>
            {t.label}
          </button>
        ))}
        <button
          className={chip(false)}
          onClick={() => {
            p.fill()
            set()
          }}
        >
          Isi semua
        </button>
        <button
          className={chip(false)}
          disabled={!view.canUndo}
          onClick={() => {
            p.undo()
            set()
          }}
        >
          Urungkan
        </button>
      </div>
      <div className="absolute top-14 right-2 bottom-2 flex w-[104px] flex-col items-stretch gap-1">
        <span className="h-9 border-[3px] border-ink" style={{ background: view.swatch }} aria-label="Warna kuas" />
        <div className="grid grid-cols-3 gap-1">
          {['S', 'M', 'L'].map((l, i) => (
            <button key={l} aria-label={`Kuas ${l}`} className={chip(view.size === i)} onClick={() => p.set({ size: i })}>
              {l}
            </button>
          ))}
        </div>
        <button className={chip(view.mirror)} aria-pressed={view.mirror} onClick={() => p.set({ mirror: !view.mirror })}>
          Simetri
        </button>
        <button className={chip(view.rot !== 0)} disabled={!view.hasPattern} onClick={() => p.set({ rot: (view.rot + 1) % ROTATIONS.length })}>
          Putar pola
        </button>
        <button
          className={chip(zoomed)}
          onClick={() => {
            round.current?.zoom(zoomed ? 2.6 : 5.5)
            setZoomed(!zoomed)
          }}
        >
          {zoomed ? 'Dekatkan' : 'Lihat jauh'}
        </button>
        <Slab tone="electric" size="sm" className="mt-auto" onClick={() => round.current?.setPainting(false)}>
          Selesai
        </Slab>
      </div>
    </>
  )
}

function RevealPanel({ s, hud, seat, act, nameOf }: { s: PetakState; hud: Hud; seat: number; act: (a: PetakAction) => void; nameOf: (a: number) => string }) {
  const me = actorOf(s, seat)
  const shown = hud.showing
  const list = hiders(s)
  const caught = shown !== null && s.caught[shown] !== null
  return (
    <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
      <div className="border-[3px] border-ink bg-paper px-2 py-1 text-ink shadow-slab-sm">
        {shown !== null && (
          <>
            <p className="font-display text-base leading-tight uppercase">{nameOf(shown)}</p>
            <p className="text-[12px]">
              {caught ? `Ketangkap di detik ${s.caught[shown]}` : 'Lolos sampai akhir!'} · +{s.gained[shown]} poin
            </p>
          </>
        )}
      </div>
      {me >= 0 && (
        <div className="flex max-w-[60%] flex-wrap items-center justify-end gap-1">
          <span className="font-display text-[11px] text-paper uppercase">Kamuflase terbaik</span>
          {list
            .filter((i) => i !== me)
            .map((i) => (
              <button key={i} aria-pressed={s.votes[me] === i} onClick={() => act({ type: 'vote', target: i })} className={cn('border-2 border-ink px-1.5 py-0.5 text-[11px] font-bold text-ink', s.votes[me] === i ? 'bg-electric' : 'bg-paper')}>
                {nameOf(i)}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function Flash({ kind, line }: { kind: 'caught' | 'safe'; line: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="text-center">
        <Lottie src={kind === 'caught' ? fxCaught : fxSafe} loop={false} className="mx-auto size-44" />
        <Tape tone="rose" className="font-display text-lg uppercase">{kind === 'caught' ? line : 'Lolos!'}</Tape>
      </div>
    </div>
  )
}

function EndScreen({ s, seat, nameOf, exit }: { s: PetakState; seat: number; nameOf: (a: number) => string; exit: () => void }) {
  const order = ranking(s)
  const me = actorOf(s, seat)
  const myRank = order.indexOf(me)
  useMusic('petak')
  return (
    <div className="absolute inset-0 grid place-items-center bg-petal text-ink">
      <Lottie src={confetti} loop={false} className="pointer-events-none absolute inset-0 size-full" />
      <Lottie src={fxSplash} loop={false} className="pointer-events-none absolute top-2 right-6 size-40" />
      <div className="relative flex w-[min(560px,92vw)] flex-col gap-2">
        <h2 className="font-display text-3xl leading-none uppercase">
          <Tape tone="electric">{rankLine(myRank)}</Tape>
        </h2>
        <ol className="grid grid-cols-2 gap-1.5">
          {order.map((a, i) => (
            <li key={a} data-seat={s.actors[a].seat ?? undefined} className={cn('flex items-center justify-between border-[3px] border-ink px-2 py-1', i === 0 ? 'bg-electric' : 'bg-paper')}>
              <span className="truncate text-sm font-bold">
                {i + 1}. {nameOf(a)}
              </span>
              <span className="font-display text-base tabular-nums">{s.points[a]}</span>
            </li>
          ))}
        </ol>
        {seat === 0 ? (
          <Slab tone="rose" size="md" className="self-end" onClick={exit}>
            Kembali ke room
          </Slab>
        ) : (
          <p className="text-right text-sm">Menunggu host kembali ke room.</p>
        )}
      </div>
    </div>
  )
}
