import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon, SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import fxClose from '@/assets/lottie/draw-close.json'
import fxCorrect from '@/assets/lottie/draw-correct.json'
import fxPick from '@/assets/lottie/draw-pick.json'
import fxReveal from '@/assets/lottie/draw-reveal.json'
import fxTimeup from '@/assets/lottie/draw-timeup.json'
import type { GameProps, Seat } from '../../types'
import { CANVAS, CHOOSE_SECONDS, INKS, REVEAL_SECONDS, WIDTHS, canGuess, hintCount, maskWord, totalTurns, turnNo } from '../engine'
import type { DrawAction, DrawState, Stroke } from '../types'
import { INK_NAMES, PAPER, SEAT_HEX, paintAll, sprite, strokeStyle } from './art'
import { LEVEL_INFO, feedLine, guessPlaceholder, revealLine } from './copy'

gsap.registerPlugin(useGSAP)

type Props = GameProps<DrawState, DrawAction>
type LottieDoc = { w: number; h: number }
type Fx = { id: number; anim: LottieDoc; size: number }
let fxSeq = 0

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Detik tersisa di fase sekarang, dihitung lokal sejak phaseId berubah. */
function usePhaseClock(phaseId: number, total: number) {
  const [clock, setClock] = useState(() => ({ id: phaseId, at: Date.now(), now: Date.now() }))
  useEffect(() => {
    // fase baru: mulai hitung dari detak berikutnya
    const t = setInterval(() => setClock((c) => (c.id === phaseId ? { ...c, now: Date.now() } : { id: phaseId, at: Date.now(), now: Date.now() })), 250)
    return () => clearInterval(t)
  }, [phaseId])
  const spent = clock.id === phaseId ? (clock.now - clock.at) / 1000 : 0
  return { left: Math.max(0, Math.ceil(total - spent)), elapsed: Math.min(1, spent / total), fresh: clock.id === phaseId }
}

export function DrawBoard({ state: s, seat, names, online, act, exit }: Props) {
  const isDrawer = s.drawer === seat
  const drawerName = names[s.drawer] ?? '?'
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [color, setColor] = useState(0)
  const [width, setWidth] = useState(1)
  const [eraser, setEraser] = useState(false)
  const [fx, setFx] = useState<Fx[]>([])

  const total = s.phase === 'choose' ? CHOOSE_SECONDS : s.phase === 'draw' ? s.opts.seconds : REVEAL_SECONDS
  const { left, elapsed, fresh } = usePhaseClock(s.phaseId, total)

  useMusic(s.phase === 'draw' && left <= 15 ? 'draw-tense' : 'draw')

  // ---- coretan milik drawer: disimpan lokal supaya langsung terlihat tanpa menunggu host ----
  const [mine, setMine] = useState<Stroke[]>(s.strokes)
  const [minePhase, setMinePhase] = useState(s.phaseId)
  if (minePhase !== s.phaseId) {
    setMinePhase(s.phaseId)
    setMine(s.strokes)
  }
  const shown = isDrawer && s.phase === 'draw' ? mine : s.strokes

  const sendStroke = useCallback(
    (chunk: Stroke) => {
      setMine((m) => [...m, chunk])
      act({ type: 'stroke', s: chunk })
    },
    [act],
  )
  const undo = () => {
    if (!mine.length) return
    const last = mine[mine.length - 1].g
    setMine((m) => m.filter((x) => x.g !== last))
    act({ type: 'undo' })
    sfx('draw-scratch', { volume: 0.6 })
  }
  const clear = () => {
    setMine([])
    act({ type: 'clear' })
    sfx('draw-scratch', { rate: 0.8 })
  }

  // ---- jam dipegang host: waktu habis → timeUp, reveal selesai → next ----
  const fired = useRef(0)
  useEffect(() => {
    if (seat !== 0 || !fresh || left > 0 || fired.current === s.phaseId || s.phase === 'end') return
    fired.current = s.phaseId
    act({ type: s.phase === 'reveal' ? 'next' : 'timeUp' })
  }, [seat, fresh, left, s.phaseId, s.phase, act])

  // detak di 5 detik terakhir menggambar
  useEffect(() => {
    if (s.phase === 'draw' && fresh && left > 0 && left <= 5) sfx('draw-tick', { volume: 0.7 })
  }, [left, s.phase, fresh])

  // ---- suara & efek dari feed dan pergantian fase ----
  const lastFeed = useRef(s.feedId)
  const lastPhase = useRef(s.phaseId)
  useEffect(() => {
    const burst: Omit<Fx, 'id'>[] = []
    for (const f of s.feed) {
      if (f.id <= lastFeed.current) continue
      if (f.t === 'correct') {
        sfx('draw-correct', { volume: f.by === seat ? 1 : 0.6 })
        if (f.by === seat || isDrawer) burst.push({ anim: fxCorrect, size: 46 })
      }
      if (f.t === 'close' && f.by === seat) {
        sfx('draw-close')
        burst.push({ anim: fxClose, size: 34 })
      }
      if (f.t === 'guess') sfx('draw-guess', { volume: 0.4, rate: 0.9 + Math.random() * 0.3 })
    }
    lastFeed.current = s.feedId
    if (lastPhase.current !== s.phaseId) {
      lastPhase.current = s.phaseId
      if (s.phase === 'choose') {
        sfx('draw-turn', { volume: isDrawer ? 1 : 0.6 })
        burst.push({ anim: fxPick, size: 60 })
      }
      if (s.phase === 'draw' && !isDrawer) sfx('ui-open', { volume: 0.6 })
      if (s.phase === 'reveal') {
        if (s.reason === 'time') {
          sfx('draw-timeup')
          burst.push({ anim: fxTimeup, size: 44 })
        } else sfx('draw-reveal')
        burst.push({ anim: fxReveal, size: 70 })
      }
      if (s.phase === 'end') sfx(s.winners?.includes(seat) ? 'draw-champion' : 'draw-lose')
    }
    if (burst.length && !reduceMotion()) setFx((cur) => [...cur, ...burst.map((b) => ({ ...b, id: ++fxSeq }))])
  }, [s.feed, s.feedId, s.phaseId, s.phase, s.reason, s.winners, seat, isDrawer])

  // ---- petunjuk kata ----
  const open = s.phase === 'draw' ? hintCount(s, elapsed) : 0
  const masked = s.phase === 'draw' && !isDrawer && !s.guessed.includes(seat) ? maskWord(s.word, s.hintOrder, open) : null

  const floor = { backgroundImage: terrazzo(14, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  const canDraw = isDrawer && s.phase === 'draw'

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-2.5 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- alat gambar (hanya drawer) ---- */}
        {canDraw && (
          <Toolbar
            color={color}
            width={width}
            eraser={eraser}
            canUndo={mine.length > 0}
            onColor={(c) => {
              setColor(c)
              setEraser(false)
            }}
            onWidth={setWidth}
            onEraser={setEraser}
            onUndo={undo}
            onClear={() => mine.length && setConfirmClear(true)}
          />
        )}

        {/* ---- kanvas ---- */}
        <section className="relative flex h-full min-w-0 flex-[1.7] items-center justify-center [container-type:size]" aria-label="Kanvas gambar">
          {/* selalu 4:3, sebesar mungkin di dalam ruang yang ada */}
          <div
            className="relative aspect-[4/3] border-[3px] border-ink shadow-[5px_6px_0_#121212]"
            style={{ width: 'min(calc(100cqw - 8px), calc((100cqh - 8px) * 4 / 3))' }}
          >
            <Canvas strokes={shown} canDraw={canDraw} c={eraser ? -1 : color} w={width} onStroke={sendStroke} />
            {fx.map((f) => (
              <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
            ))}
            {s.phase === 'choose' && <ChoosePanel s={s} seat={seat} drawerName={drawerName} left={left} act={act} />}
            {s.phase === 'reveal' && <RevealPanel s={s} seat={seat} names={names} left={left} act={act} />}
          </div>
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="flex min-w-[220px] flex-1 flex-col gap-1.5 pb-[max(4px,env(safe-area-inset-bottom))]">
          <header className="flex items-center gap-2">
            <button
              onClick={() => setConfirmExit(true)}
              aria-label="Kembali ke menu"
              className="grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
            </button>
            <SoundButton />
            <span className="font-display text-[12px] uppercase leading-tight">
              Giliran {Math.min(turnNo(s), totalTurns(s))}/{totalTurns(s)}
            </span>
            <Timer left={left} phase={s.phase} total={total} />
          </header>

          <WordLine s={s} isDrawer={isDrawer} masked={masked} drawerName={drawerName} seat={seat} />

          <ol className="flex flex-wrap gap-1" aria-label="Skor pemain">
            {s.scores.map((pts, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center gap-1 border-2 border-ink px-1.5 py-px text-[11px] font-bold',
                  s.guessed.includes(i) ? 'bg-electric' : i === s.drawer ? 'bg-rose' : 'bg-paper',
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full border-2 border-ink" style={{ background: online[i] ? SEAT_HEX[i % SEAT_HEX.length] : PAPER }} aria-label={online[i] ? 'online' : 'offline'} />
                <span className="max-w-[72px] truncate">{i === seat ? 'Kamu' : (names[i] ?? '?')}</span>
                {i === s.drawer && s.phase !== 'end' && <img src={sprite('tool-pencil')} alt="menggambar" className="h-3 w-auto" />}
                <span className="font-display">{pts}</span>
              </li>
            ))}
          </ol>

          <Feed s={s} seat={seat} names={names} />

          <GuessBox s={s} seat={seat} act={act} />
          {canDraw && (
            <button onClick={() => act({ type: 'skip' })} className="self-end text-[11px] font-bold underline decoration-2 underline-offset-2">
              Nyerah, ganti giliran
            </button>
          )}
        </aside>
      </div>

      {s.phase === 'end' && <EndScreen s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Gambar dan skor semua pemain hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
      <ConfirmModal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Hapus semua coretan?"
        description="Kanvas jadi bersih lagi untuk semua pemain."
        confirmLabel="Hapus"
        onConfirm={clear}
      />
    </div>
  )
}

/* ---------- kanvas ---------- */

const SEND_MS = 180
const MIN_STEP = 4

function Canvas({ strokes, canDraw, c, w, onStroke }: { strokes: Stroke[]; canDraw: boolean; c: number; w: number; onStroke: (s: Stroke) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const scale = useRef(1)
  /** tarikan yang sedang berjalan & belum terkirim */
  const live = useRef<{ g: number; c: number; w: number; pts: number[]; sent: boolean } | null>(null)
  const nextG = useRef(0)
  const strokesRef = useRef(strokes)

  const repaint = useCallback(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    paintAll(ctx, strokesRef.current, scale.current)
    const l = live.current
    if (l && l.pts.length >= 2) {
      // ekor tarikan yang belum terkirim
      strokeStyle(ctx, l, scale.current)
      ctx.beginPath()
      ctx.moveTo(l.pts[0] * scale.current, l.pts[1] * scale.current)
      for (let i = 2; i < l.pts.length; i += 2) ctx.lineTo(l.pts[i] * scale.current, l.pts[i + 1] * scale.current)
      ctx.stroke()
    }
  }, [])

  useLayoutEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.max(1, Math.round(r.width * dpr))
      cv.height = Math.max(1, Math.round(r.height * dpr))
      scale.current = cv.width / CANVAS.w
      repaint()
    })
    ro.observe(cv)
    return () => ro.disconnect()
  }, [repaint])

  useLayoutEffect(() => {
    strokesRef.current = strokes
    repaint()
  }, [strokes, repaint])

  const flush = useCallback(
    (final: boolean) => {
      const l = live.current
      if (!l) return
      const need = l.pts.length > 2 || (final && !l.sent)
      if (need) {
        onStroke({ g: l.g, c: l.c, w: l.w, pts: l.pts })
        l.sent = true
        // potongan berikutnya mulai dari titik terakhir supaya garis tersambung
        l.pts = l.pts.slice(-2)
      }
      if (final) live.current = null
    },
    [onStroke],
  )

  useEffect(() => {
    if (!canDraw) {
      live.current = null
      return
    }
    const t = setInterval(() => flush(false), SEND_MS)
    return () => clearInterval(t)
  }, [canDraw, flush])

  const point = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * CANVAS.w)
    const y = Math.round(((e.clientY - r.top) / r.height) * CANVAS.h)
    return [Math.min(CANVAS.w, Math.max(0, x)), Math.min(CANVAS.h, Math.max(0, y))] as const
  }

  const down = (e: React.PointerEvent) => {
    if (!canDraw) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const maxG = strokesRef.current.reduce((m, x) => Math.max(m, x.g), 0)
    nextG.current = Math.max(nextG.current, maxG) + 1
    const [x, y] = point(e)
    live.current = { g: nextG.current, c, w, pts: [x, y], sent: false }
    const ctx = ref.current!.getContext('2d')!
    strokeStyle(ctx, { c, w }, scale.current)
    ctx.beginPath()
    ctx.arc(x * scale.current, y * scale.current, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const move = (e: React.PointerEvent) => {
    const l = live.current
    if (!l) return
    const events = 'getCoalescedEvents' in e.nativeEvent ? e.nativeEvent.getCoalescedEvents() : []
    const ctx = ref.current!.getContext('2d')!
    strokeStyle(ctx, l, scale.current)
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y] = point(ev)
      const px = l.pts[l.pts.length - 2]
      const py = l.pts[l.pts.length - 1]
      if (Math.hypot(x - px, y - py) < MIN_STEP) continue
      l.pts.push(x, y)
      ctx.beginPath()
      ctx.moveTo(px * scale.current, py * scale.current)
      ctx.lineTo(x * scale.current, y * scale.current)
      ctx.stroke()
      // potongan terlalu panjang: kirim sekarang
      if (l.pts.length >= 560) flush(false)
    }
  }

  const up = () => flush(true)

  return (
    <canvas
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={cn('absolute inset-0 h-full w-full touch-none bg-paper', canDraw && 'cursor-crosshair')}
      role="img"
      aria-label={canDraw ? 'Kanvas, gambar di sini' : 'Gambar dari pemain yang sedang menggambar'}
    />
  )
}

function FxBurst({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ width: `${fx.size}%`, aspectRatio: `${fx.anim.w} / ${fx.anim.h}` }}
    >
      <Lottie src={fx.anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}

/* ---------- alat gambar ---------- */

function ToolButton({ label, on, onClick, children, className }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cn(
        'grid h-9 place-items-center border-[3px] border-ink transition-transform active:translate-y-0.5',
        on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm',
        className,
      )}
      style={on ? { backgroundImage: squiggles('#121212', 30, 2) } : undefined}
    >
      {children}
    </button>
  )
}

function Toolbar(p: {
  color: number
  width: number
  eraser: boolean
  canUndo: boolean
  onColor: (c: number) => void
  onWidth: (w: number) => void
  onEraser: (on: boolean) => void
  onUndo: () => void
  onClear: () => void
}) {
  return (
    <nav aria-label="Alat gambar" className="flex w-[96px] shrink-0 flex-col justify-center gap-1.5">
      <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Warna krayon">
        {INKS.map((hex, i) => {
          const on = !p.eraser && p.color === i
          return (
            <button
              key={hex}
              role="radio"
              aria-checked={on}
              aria-label={INK_NAMES[i]}
              onClick={() => p.onColor(i)}
              className={cn('relative grid h-8 place-items-center border-[3px] border-ink', on ? 'bg-ink' : 'bg-paper shadow-slab-sm')}
            >
              <img src={sprite(`crayon-${i}`)} alt="" draggable={false} className={cn('h-6 w-auto transition-transform', on && 'scale-125 -rotate-12')} />
            </button>
          )
        })}
      </div>
      <div className="flex justify-between gap-1" role="radiogroup" aria-label="Ukuran">
        {WIDTHS.map((px, i) => (
          <button
            key={px}
            role="radio"
            aria-checked={p.width === i}
            aria-label={['Tipis', 'Sedang', 'Tebal'][i]}
            onClick={() => p.onWidth(i)}
            className={cn('grid h-8 flex-1 place-items-center border-[3px] border-ink', p.width === i ? 'bg-electric' : 'bg-paper shadow-slab-sm')}
          >
            <span className="rounded-full bg-ink" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <ToolButton label="Pensil" on={!p.eraser} onClick={() => p.onEraser(false)}>
          <img src={sprite('tool-pencil')} alt="" draggable={false} className="h-5 w-auto" />
        </ToolButton>
        <ToolButton label="Penghapus" on={p.eraser} onClick={() => p.onEraser(true)}>
          <img src={sprite('tool-eraser')} alt="" draggable={false} className="h-5 w-auto" />
        </ToolButton>
        <ToolButton label="Batalkan coretan terakhir" onClick={p.onUndo} className={cn(!p.canUndo && 'opacity-50')}>
          <img src={sprite('tool-undo')} alt="" draggable={false} className="h-6 w-auto" />
        </ToolButton>
        <ToolButton label="Hapus semua" onClick={p.onClear} className={cn(!p.canUndo && 'opacity-50')}>
          <img src={sprite('tool-bin')} alt="" draggable={false} className="h-6 w-auto" />
        </ToolButton>
      </div>
    </nav>
  )
}

/* ---------- panel kanan ---------- */

function Timer({ left, phase, total }: { left: number; phase: DrawState['phase']; total: number }) {
  const urgent = phase === 'draw' && left <= 10
  const box = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (urgent && !reduceMotion()) gsap.fromTo(box.current, { rotation: -10, scale: 1.12 }, { rotation: 0, scale: 1, duration: 0.3, ease: 'back.out(2)' })
  }, [left, urgent])
  if (phase === 'end') return null
  return (
    <div
      ref={box}
      role="timer"
      aria-label={`${left} detik lagi`}
      className={cn('ml-auto flex items-center gap-1 border-[3px] border-ink px-1.5 py-0.5', urgent ? 'bg-rose' : 'bg-paper')}
    >
      <img src={sprite('stopwatch')} alt="" className="h-6 w-auto" draggable={false} />
      <span className="w-7 text-right font-display text-lg leading-none tabular-nums">{left}</span>
      <span className="sr-only">dari {total} detik</span>
    </div>
  )
}

function WordLine({ s, isDrawer, masked, drawerName, seat }: { s: DrawState; isDrawer: boolean; masked: string[] | null; drawerName: string; seat: Seat }) {
  if (s.phase === 'choose') {
    return <p className="border-[3px] border-ink bg-paper px-2 py-1 text-[13px] font-bold">{isDrawer ? 'Pilih kata yang mau kamu gambar.' : `${drawerName} lagi milih kata…`}</p>
  }
  if (s.phase === 'draw' && masked) {
    return (
      <div className="flex flex-wrap items-end gap-x-1 border-[3px] border-ink bg-paper px-2 py-1" aria-label={`Kata: ${masked.filter((c) => c === '_').length} huruf tersembunyi`}>
        {masked.map((ch, i) =>
          ch === ' ' ? (
            <span key={i} className="w-2" />
          ) : (
            <span key={i} className={cn('font-display text-xl leading-none', ch === '_' ? 'text-ink/60' : 'text-ink')}>
              {ch === '_' ? '_' : ch.toUpperCase()}
            </span>
          ),
        )}
        <span className="ml-auto text-[11px] font-semibold text-ink/70">{s.word.replace(/[^a-z0-9]/gi, '').length} huruf</span>
      </div>
    )
  }
  const solved = s.guessed.includes(seat)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase">{isDrawer ? 'Gambar:' : solved ? 'Kamu benar:' : 'Katanya:'}</span>
      <Tape tone={isDrawer ? 'rose' : 'electric'} className="truncate text-lg leading-tight">
        {s.word}
      </Tape>
      {isDrawer && s.phase === 'draw' && <span className="text-[11px] font-semibold">{LEVEL_INFO[s.level].title}</span>}
    </div>
  )
}

function Feed({ s, seat, names }: { s: DrawState; seat: Seat; names: string[] }) {
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [s.feedId])
  return (
    <ol
      ref={list}
      aria-label="Tebakan"
      aria-live="polite"
      className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto border-[3px] border-ink bg-paper/95 px-2 py-1"
    >
      {s.feed.map((f) => {
        const l = feedLine(f, seat, names)
        return (
          <li
            key={f.id}
            className={cn(
              'text-[12px] leading-snug',
              l.tone === 'good' && '-mx-1 bg-electric px-1 font-bold',
              l.tone === 'close' && '-mx-1 bg-[#ffcc1f] px-1 font-semibold',
              l.tone === 'turn' && 'font-display text-[11px] uppercase text-ink/70',
            )}
          >
            {l.name && <span className="font-bold">{l.name}: </span>}
            {l.text}
          </li>
        )
      })}
    </ol>
  )
}

function GuessBox({ s, seat, act }: { s: DrawState; seat: Seat; act: (a: DrawAction) => void }) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState(s.phaseId)
  // giliran baru: buang ketikan yang tertinggal
  if (phase !== s.phaseId) {
    setPhase(s.phaseId)
    setText('')
  }
  const can = canGuess(s, seat)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || !can) return
    act({ type: 'guess', text: t })
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex gap-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 40))}
        disabled={!can}
        placeholder={guessPlaceholder(s, seat)}
        aria-label="Tebakan"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 border-[3px] border-ink bg-paper px-2 text-sm font-semibold shadow-slab-sm outline-none placeholder:text-ink/50 focus:bg-white disabled:shadow-none"
        style={can ? undefined : { backgroundImage: hatch('#121212', 7, 0.12) }}
      />
      <button
        type="submit"
        disabled={!can || !text.trim()}
        aria-label="Kirim tebakan"
        className="grid size-10 shrink-0 place-items-center border-[3px] border-ink bg-rose shadow-slab-sm active:translate-y-0.5 active:shadow-none disabled:bg-paper disabled:shadow-none"
      >
        <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={2.4} />
      </button>
    </form>
  )
}

/* ---------- panel di atas kanvas ---------- */

function Overlay({ children, label }: { children: React.ReactNode; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (!reduceMotion()) gsap.from(box.current, { scale: 0.7, rotation: -6, opacity: 0, duration: 0.35, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-[5%]">
      <div ref={box} role="dialog" aria-label={label} className="relative flex w-full max-w-[420px] flex-col gap-2 border-[3px] border-ink bg-paper p-3 shadow-lift">
        <div aria-hidden className="absolute -top-3 right-4 h-6 w-16 rotate-6 border-[3px] border-ink bg-rose" style={{ backgroundImage: squiggles('#121212', 40, 2.6) }} />
        {children}
      </div>
    </div>
  )
}

function ChoosePanel({ s, seat, drawerName, left, act }: { s: DrawState; seat: Seat; drawerName: string; left: number; act: (a: DrawAction) => void }) {
  const mine = s.drawer === seat
  return (
    <Overlay label={mine ? 'Pilih kata' : 'Menunggu pilihan kata'}>
      <div className="flex items-center gap-3">
        <img src={sprite('wordcard')} alt="" className="h-14 w-auto" draggable={false} />
        <div className="min-w-0">
          <Tape tone="electric" className="text-lg leading-tight">
            {mine ? 'Giliranmu gambar!' : `${drawerName} gambar`}
          </Tape>
          <p className="mt-1 text-[12px] font-semibold">
            {mine ? `Pilih satu kata. ${left} detik lagi dipilihkan otomatis.` : 'Siap-siap nebak. Jangan kedip.'}
          </p>
        </div>
      </div>
      {mine && (
        <div className="grid grid-cols-3 gap-2">
          {s.choices.map((c, i) => (
            <button
              key={c.word}
              onClick={() => act({ type: 'pick', i })}
              className="flex flex-col items-center gap-0.5 border-[3px] border-ink bg-paper px-1.5 py-2 shadow-slab-sm active:translate-y-0.5 active:shadow-none"
              style={{ background: ['#5cf64a', '#fff4fa', '#ff37a6'][i] }}
            >
              <span className="text-center text-[14px] font-bold leading-tight">{c.word}</span>
              <span className="font-display text-[10px] uppercase">
                {LEVEL_INFO[c.level].title} {LEVEL_INFO[c.level].bonus}
              </span>
            </button>
          ))}
        </div>
      )}
    </Overlay>
  )
}

function RevealPanel({ s, seat, names, left, act }: { s: DrawState; seat: Seat; names: string[]; left: number; act: (a: DrawAction) => void }) {
  const gained = s.gained.map((p, i) => ({ i, p })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p)
  const last = turnNo(s) >= totalTurns(s)
  return (
    <Overlay label="Kata dibuka">
      <p className="text-[11px] font-bold uppercase">Katanya adalah</p>
      <Tape tone="rose" className="self-start text-2xl leading-tight">
        {s.word}
      </Tape>
      <p className="text-[12px] font-semibold">{revealLine(s, seat, names)}</p>
      {gained.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {gained.map(({ i, p }) => (
            <li key={i} className="border-2 border-ink bg-electric px-1.5 text-[12px] font-bold">
              {i === seat ? 'Kamu' : names[i]} +{p}
            </li>
          ))}
        </ul>
      )}
      {seat === 0 ? (
        <Slab tone="rose" size="sm" className="self-end" onClick={() => act({ type: 'next' })}>
          {last ? 'Lihat juara' : 'Lanjut'} ({left})
        </Slab>
      ) : (
        <p className="self-end text-[11px] font-semibold text-ink/70">Lanjut otomatis {left} detik lagi…</p>
      )}
    </Overlay>
  )
}

function EndScreen({ s, seat, names, act, exit }: { s: DrawState; seat: Seat; names: string[]; act: (a: DrawAction) => void; exit: () => void }) {
  const winners = s.winners ?? []
  const happy = winners.includes(seat)
  const box = useRef<HTMLDivElement>(null)
  const ranking = s.scores.map((_, i) => i).sort((a, b) => s.scores[b] - s.scores[a])
  const top = Math.max(1, ...s.scores)
  useGSAP(
    () => {
      if (!reduceMotion()) gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.4, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const headline = winners.length > 1 ? (happy ? 'Juara bareng!' : 'Juaranya seri') : happy ? 'Kamu pelukis & penebak terbaik!' : `${names[winners[0]] ?? '?'} juara`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={sprite(happy ? 'draw-win' : 'draw-lose')}
            alt={happy ? 'Maskot bermahkota di podium memegang pensil raksasa' : 'Maskot hijau sedih di samping pensil patah'}
            className="-mb-6 h-32 w-auto"
            draggable={false}
          />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">
              {Math.max(...s.scores) === 0
                ? 'Nol semua. Nggak ada yang bisa gambar, nggak ada yang bisa nebak. Serasi.'
                : happy
                  ? 'Picasso minder. Pajang gambarnya di kulkas.'
                  : 'Gambarnya abstrak, tebakannya lebih abstrak. Revans?'}
            </p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-2 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Skor akhir">
            {ranking.map((i, rank) => (
              <li key={i}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className={cn(i === seat && 'font-bold')}>
                    {rank + 1}. {i === seat ? 'Kamu' : names[i]}
                  </span>
                  <span>{s.scores[i]}</span>
                </div>
                <div className="mt-0.5 h-3.5 -skew-x-12 border-2 border-ink bg-petal">
                  <div className="h-full" style={{ width: `${(s.scores[i] / top) * 100}%`, background: SEAT_HEX[i % SEAT_HEX.length] }} />
                </div>
              </li>
            ))}
          </ol>
          <div data-pop className="flex flex-wrap justify-center gap-3">
            <Slab tone="rose" onClick={() => act({ type: 'again' })}>
              Main lagi
            </Slab>
            <Slab tone="paper" onClick={exit}>
              Ke menu
            </Slab>
          </div>
        </div>
      </div>
    </div>
  )
}
