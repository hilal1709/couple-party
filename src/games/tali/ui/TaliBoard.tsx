import { useEffect, useRef, useState } from 'react'
import { useMusic } from '@/audio/audio'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import type { GameProps } from '../../types'
import { totalStars } from '../engine'
import { LEVELS } from '../levels'
import { Round, type Hud } from '../round'
import type { Input } from '../sim/physics'
import { playSound } from '../sounds'
import type { TaliAction, TaliState } from '../types'
import { CHAR_NAME, clearLine, clock, FALL_LINE, saveStars } from './copy'

type Props = GameProps<TaliState, TaliAction> & { auto?: (s: TaliState) => void }

export function TaliBoard({ state: s, seat, names, online, act, exit, live, auto }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  useMusic('tali')
  useEffect(() => {
    s.results.forEach((r, i) => r && saveStars(i, r.stars))
  }, [s.results])
  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      <LevelScreen key={s.levelId} s={s} seat={seat} names={names} online={online} act={act} live={live} auto={auto} back={() => setConfirmExit(true)} />
      {s.phase === 'clear' && <ClearPanel s={s} seat={seat} act={act} />}
      {s.phase === 'end' && <EndPanel s={s} act={act} exit={exit} />}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Keluar dari permainan?" description="Kalian berdua kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

type ScreenProps = Pick<Props, 'seat' | 'names' | 'online' | 'act' | 'live' | 'auto'> & { s: TaliState; back: () => void }

function LevelScreen({ s, seat, names, online, act, live, auto, back }: ScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [failed, setFailed] = useState(false)
  const [fallMsg, setFallMsg] = useState<string | null>(null)
  const actRef = useRef(act)
  actRef.current = act
  const def = LEVELS[s.level]

  useEffect(() => {
    let r: Round
    try {
      r = new Round({ canvas: canvas.current!, state: s, seat, act: (a) => actRef.current(a), live, onHud: setHud, onSound: playSound, auto })
    } catch {
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV) (window as unknown as { __tali?: Round }).__tali = r
    r.start().catch((e) => {
      console.error('Tali Jodoh gagal memuat level', e)
      setFailed(true)
    })
    return () => {
      r.dispose()
      round.current = null
    }
    // level baru = komponen baru (key), cukup sekali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    round.current?.setState(s)
  }, [s])

  const fallId = s.lastFall?.id
  useEffect(() => {
    if (!fallId) return
    setFallMsg(FALL_LINE[fallId % FALL_LINE.length])
    const t = setTimeout(() => setFallMsg(null), 1800)
    return () => clearTimeout(t)
  }, [fallId])

  useKeyboard(round)
  const partner = 1 - seat

  return (
    <div className="absolute inset-0">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label={`Level ${def.title}`} />
      {!hud && !failed && <LoadingScreen label={`Menuju ${def.title}`} sub="Talinya lagi diikat kencang" overlay />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-petal text-center text-ink">
          <div>
            <p className="font-display text-xl uppercase">Level gagal dimuat</p>
            <p className="mb-3 text-sm">HP-nya mungkin kehabisan memori. Coba tutup aplikasi lain.</p>
            <Slab tone="rose" size="md" onClick={back}>
              Keluar
            </Slab>
          </div>
        </div>
      )}
      {hud && (
        <>
          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start gap-2 text-ink">
            <button onClick={back} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-sm uppercase">
              Keluar
            </button>
            <div className="border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-sm uppercase">
              {s.level + 1}. {def.title}
            </div>
            <div className="border-[3px] border-ink bg-paper px-2 py-0.5 text-sm font-bold tabular-nums">⏱ {clock(hud.secs)}</div>
            <div className="border-[3px] border-ink bg-petal px-2 py-0.5 text-sm font-bold tabular-nums">
              🍭 {hud.candy}/{hud.candyOf}
            </div>
            <div className="ml-auto flex items-center gap-1.5 border-[3px] border-ink bg-paper px-2 py-0.5 text-sm font-bold">
              <span className={cn('size-2.5 rounded-full border-2 border-ink', online[partner] && hud.partner ? 'bg-electric' : 'bg-rose')} />
              {CHAR_NAME[partner]}: {names[partner] ?? '?'}
            </div>
          </div>
          {hud.tip && (
            <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center px-24">
              <Tape tone="electric" className="max-w-md text-center text-sm font-bold">
                {hud.tip}
              </Tape>
            </div>
          )}
          {!hud.partner && !auto && (
            <p className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm font-bold text-paper drop-shadow">Menunggu {names[partner] ?? 'pasangan'} tersambung…</p>
          )}
          {hud.waiting && <p className="pointer-events-none absolute inset-x-0 top-24 text-center font-display text-lg text-paper uppercase drop-shadow">Tunggu {CHAR_NAME[partner]} di gerbang!</p>}
          {fallMsg && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <Tape tone="rose" className="font-display text-lg uppercase">
                {fallMsg}
              </Tape>
            </div>
          )}
          {s.phase === 'play' && !auto && <Controls round={round} hud={hud} />}
          <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-paper/60">
            Kamu {CHAR_NAME[seat]} · {hud.fps} fps
          </p>
        </>
      )}
    </div>
  )
}

/** keyboard: A/D atau panah = jalan, W/Spasi = lompat, J/Shift = pegang, K/E = gulung */
function useKeyboard(round: React.RefObject<Round | null>) {
  useEffect(() => {
    const held = new Set<string>()
    const apply = () => {
      const x = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0)
      round.current?.setInput({
        x,
        jump: held.has('w') || held.has('arrowup') || held.has(' '),
        hold: held.has('j') || held.has('shift'),
        reel: held.has('k') || held.has('e'),
      })
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

/** tombol tahan: aktif selama jari menempel, aman untuk banyak jari sekaligus */
function HoldButton({ label, sub, onChange, className, active }: { label: string; sub?: string; onChange: (on: boolean) => void; className?: string; active?: boolean }) {
  const [on, setOn] = useState(false)
  const set = (v: boolean) => {
    setOn(v)
    onChange(v)
  }
  return (
    <button
      className={cn('grid touch-none place-items-center rounded-full border-[3px] border-ink font-display uppercase shadow-slab-sm transition-transform select-none', on || active ? 'translate-y-0.5 shadow-none brightness-95' : '', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="leading-none">
        {label}
        {sub && <span className="block text-[9px] normal-case opacity-70">{sub}</span>}
      </span>
    </button>
  )
}

function Controls({ round, hud }: { round: React.RefObject<Round | null>; hud: Hud }) {
  const dir = useRef({ l: false, r: false })
  const send = (p: Partial<Input>) => round.current?.setInput(p)
  const move = () => send({ x: (dir.current.r ? 1 : 0) - (dir.current.l ? 1 : 0) })
  return (
    <>
      <div className="absolute bottom-4 left-4 flex gap-3">
        <HoldButton label="◀" className="size-20 bg-paper text-3xl text-ink" onChange={(v) => ((dir.current.l = v), move())} />
        <HoldButton label="▶" className="size-20 bg-paper text-3xl text-ink" onChange={(v) => ((dir.current.r = v), move())} />
      </div>
      <div className="absolute right-4 bottom-4 grid grid-cols-2 gap-2">
        <HoldButton label="Gulung" sub="tarik tali" className="size-16 bg-grass text-xs text-ink" active={hud.reel} onChange={(v) => send({ reel: v })} />
        <HoldButton label="Pegang" sub="kait / tahan" className="size-16 bg-petal text-xs text-ink" active={hud.hold !== 0} onChange={(v) => send({ hold: v })} />
        <HoldButton label="Lompat" className="col-span-2 h-16 w-full rounded-[2rem] bg-rose text-lg text-paper" onChange={(v) => send({ jump: v })} />
      </div>
    </>
  )
}

function Stars({ n, big }: { n: number; big?: boolean }) {
  return (
    <span className={cn('tracking-wider', big ? 'text-4xl' : 'text-lg')} aria-label={`${n} dari 3 bintang`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'text-[#ffcc1f] drop-shadow-[2px_2px_0_#121212]' : 'text-ink/20'}>
          ★
        </span>
      ))}
    </span>
  )
}

function ClearPanel({ s, seat, act }: { s: TaliState; seat: number; act: (a: TaliAction) => void }) {
  const r = s.results[s.level]
  const def = LEVELS[s.level]
  const iReady = (s.ready & (1 << seat)) !== 0
  const last = s.level >= LEVELS.length - 1 || !s.opts.run
  if (!r) return null
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/40 p-4">
      <div className="w-full max-w-sm border-[3px] border-ink bg-paper p-4 text-ink shadow-slab">
        <p className="font-display text-sm uppercase">{def.title} selesai!</p>
        <Stars n={r.stars} big />
        <p className="mb-2 font-display text-lg">{clearLine(r.stars)}</p>
        <ul className="mb-3 space-y-0.5 text-sm">
          <li>⏱ Waktu {clock(r.ms / 1000)} {r.ms <= def.par * 1000 ? '✓' : `(target ${clock(def.par)})`}</li>
          <li>🍭 Permen {r.candy}/{r.of} {r.candy >= r.of ? '✓' : ''}</li>
          <li>💦 Jatuh {r.falls} kali</li>
        </ul>
        <div className="flex gap-2">
          <Slab tone="paper" size="md" onClick={() => act({ type: 'retry' })}>
            Ulang
          </Slab>
          <Slab tone="rose" size="md" className="ml-auto" disabled={iReady} onClick={() => act({ type: 'next' })}>
            {iReady ? 'Menunggu pasangan…' : last ? 'Selesai' : 'Lanjut'}
          </Slab>
        </div>
      </div>
    </div>
  )
}

function EndPanel({ s, act, exit }: { s: TaliState; act: (a: TaliAction) => void; exit: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/50 p-4">
      <div className="w-full max-w-lg border-[3px] border-ink bg-paper p-4 text-ink shadow-slab">
        <p className="font-display text-2xl uppercase">
          <Tape tone="electric">{totalStars(s)} bintang</Tape> dikumpulkan berdua
        </p>
        <ul className="my-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {LEVELS.map((l, i) => (
            <li key={l.id}>
              <button onClick={() => act({ type: 'pick', level: i })} className="w-full border-[3px] border-ink bg-paper px-2 py-1 text-left shadow-slab-sm">
                <span className="block font-display text-xs uppercase">{l.title}</span>
                <Stars n={s.results[i]?.stars ?? 0} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex">
          <Slab tone="rose" size="md" className="ml-auto" onClick={exit}>
            Kembali ke room
          </Slab>
        </div>
      </div>
    </div>
  )
}
