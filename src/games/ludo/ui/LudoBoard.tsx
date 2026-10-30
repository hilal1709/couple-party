import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import diceRoll from '@/assets/lottie/dice-roll.json'
import fxBomb from '@/assets/lottie/ludo-bomb.json'
import fxBoost from '@/assets/lottie/ludo-boost.json'
import fxCapture from '@/assets/lottie/ludo-capture.json'
import fxHome from '@/assets/lottie/ludo-home.json'
import fxPortal from '@/assets/lottie/ludo-portal.json'
import fxSix from '@/assets/lottie/ludo-six.json'
import fxSlip from '@/assets/lottie/ludo-slip.json'
import winArt from '@/assets/ludo/ludo-win.webp'
import loseArt from '@/assets/ludo/ludo-lose.webp'
import type { GameProps, Seat } from '../../types'
import { progPt, type Pt } from '../board'
import { finish, legalMovesAll, standings } from '../engine'
import { cuesFor, isTense, JUMP_MS, STEP_MS, timeline, type FxCue, type FxName } from '../sounds'
import type { LudoAction, LudoState, Special } from '../types'
import { BoardArt, Die, extent, PAWN_HEX, SeatDot, sprite } from './art'
import { eventText, SPECIAL_INFO, TEAM_NAME } from './copy'

gsap.registerPlugin(useGSAP)

type Props = GameProps<LudoState, LudoAction>
type LottieDoc = { w: number; h: number }

const FX: Record<FxName, LottieDoc> = {
  'ludo-capture': fxCapture,
  'ludo-home': fxHome,
  'ludo-six': fxSix,
  'ludo-boost': fxBoost,
  'ludo-portal': fxPortal,
  'ludo-bomb': fxBomb,
  'ludo-slip': fxSlip,
}

type Fx = FxCue & { id: number }
let fxSeq = 0

function FxBurst({ fx, ext, onDone }: { fx: Fx; ext: number; onDone: () => void }) {
  const [on, setOn] = useState(fx.delay <= 0)
  useEffect(() => {
    if (on) return
    const t = setTimeout(() => setOn(true), fx.delay)
    return () => clearTimeout(t)
  }, [on, fx.delay])
  if (!on) return null
  const anim = FX[fx.anim]
  const c = fx.at ?? { x: 0, y: 0 }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${((c.x + ext) / (2 * ext)) * 100}%`, top: `${((c.y + ext) / (2 * ext)) * 100}%`, width: `${fx.size}%`, aspectRatio: `${anim.w} / ${anim.h}` }}
    >
      <Lottie src={anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}

/** Bidak yang berbagi petak digeser supaya semuanya kelihatan. */
const SPREAD: [number, number][] = [
  [0, 0],
  [-0.24, -0.18],
  [0.24, 0.18],
  [0.24, -0.18],
  [-0.24, 0.18],
  [0, -0.3],
  [0, 0.3],
  [-0.3, 0],
]

const key = (seat: Seat, piece: number) => `${seat}-${piece}`

function pawnSpots(s: LudoState): Map<string, Pt> {
  const seen = new Map<string, number>()
  const out = new Map<string, Pt>()
  s.prog.forEach((ps, seat) =>
    ps.forEach((p, piece) => {
      const c = progPt(s.opts.arms, s.arm[seat], piece, p)
      const cell = `${c.x.toFixed(2)},${c.y.toFixed(2)}`
      const k = seen.get(cell) ?? 0
      seen.set(cell, k + 1)
      const [ox, oy] = SPREAD[k % SPREAD.length]
      out.set(key(seat, piece), { x: c.x + ox, y: c.y + oy })
    }),
  )
  return out
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function LudoBoard({ state: s, seat, names, online, act, exit }: Props) {
  const myTurn = s.turn === seat && s.phase !== 'end'
  const [confirmExit, setConfirmExit] = useState(false)
  const [fx, setFx] = useState<Fx[]>([])
  const [diceFx, setDiceFx] = useState(0)
  const pawnRefs = useRef(new Map<string, SVGGElement>())
  const diceRef = useRef<HTMLDivElement>(null)
  const prev = useRef<LudoState | null>(null)
  const arms = s.opts.arms
  const ext = extent(arms)
  const F = finish(s)

  useMusic(isTense(s) ? 'ludo-tense' : 'ludo')

  // ---- suara & efek dari tiap kejadian baru ----
  useEffect(() => {
    const p = prev.current
    prev.current = s
    if (!p) return
    const { sounds, fx: bursts } = cuesFor(p, s, seat)
    for (const c of sounds) sfx(c.sfx, { delay: c.delay, volume: c.volume, rate: c.rate })
    if (!reduced()) {
      if (bursts.length) setFx((cur) => [...cur, ...bursts.map((b) => ({ ...b, id: ++fxSeq }))])
      if (s.event?.dice && p.eventId !== s.eventId) setDiceFx(s.eventId)
    }
  }, [s, seat])

  // ---- animasi bidak menyusuri jalurnya, gerakan dalam satu event berurutan ----
  const spots = pawnSpots(s)
  const animated = useRef<number | null>(null)
  useLayoutEffect(() => {
    const e = s.event
    const fresh = animated.current !== null && animated.current !== s.eventId
    animated.current = s.eventId
    const calm = reduced()
    const plan = new Map<string, gsap.core.Timeline>()
    if (fresh && e && !calm) {
      const { starts } = timeline(e)
      e.moves.forEach((m, i) => {
        const k = key(m.seat, m.piece)
        const el = pawnRefs.current.get(k)
        if (!el) return
        let tl = plan.get(k)
        if (!tl) {
          tl = gsap.timeline()
          const p0 = progPt(arms, s.arm[m.seat], m.piece, m.path[0])
          tl.set(el, { x: p0.x, y: p0.y }, 0)
          plan.set(k, tl)
        }
        const t0 = starts[i] / 1000
        const pt = (p: number) => progPt(arms, s.arm[m.seat], m.piece, p)
        if (m.jump || m.path[0] < 0) {
          const to = pt(m.path.at(-1)!)
          tl.to(el, { x: to.x, y: to.y, duration: JUMP_MS / 1000, ease: 'power2.inOut' }, t0)
          tl.to(el, { scale: 1.35, duration: JUMP_MS / 2000, yoyo: true, repeat: 1, ease: 'sine.out' }, t0)
          return
        }
        m.path.slice(1).forEach((p, j) => {
          const c = pt(p)
          const at = t0 + (j * STEP_MS) / 1000
          tl.to(el, { x: c.x, y: c.y, duration: STEP_MS / 1000, ease: 'power1.out' }, at)
          tl.to(el, { y: c.y - 0.35, duration: STEP_MS / 2000, yoyo: true, repeat: 1, ease: 'sine.out' }, at)
        })
      })
    }
    spots.forEach((pt, k) => {
      const el = pawnRefs.current.get(k)
      if (!el) return
      const tl = plan.get(k)
      if (tl) tl.to(el, { x: pt.x, y: pt.y, scale: 1, duration: 0.15 })
      else gsap.to(el, { x: pt.x, y: pt.y, duration: fresh && !calm ? 0.25 : 0, ease: 'power2.out' })
    })
  })

  useGSAP(() => {
    if (!s.event?.dice || !diceRef.current) return
    gsap.fromTo(diceRef.current.children, { rotation: -260, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)' })
  }, [s.eventId])

  const movable = myTurn && s.phase === 'move' ? legalMovesAll(s) : []
  const canMove = (owner: Seat, piece: number) => movable.some((m) => m.owner === owner && m.piece === piece)
  const turnName = names[s.turn] ?? '?'
  const turnLabel = s.phase === 'end' ? 'Selesai' : myTurn ? (s.phase === 'move' ? 'Pilih bidakmu' : 'Giliranmu') : `Giliran ${turnName}`
  const floor = { backgroundImage: terrazzo(23, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#2f4bff'], 180, 30) }
  const die = s.event?.dice ?? s.die ?? null
  // urutan gambar: yang bisa dipilih paling atas supaya gampang disentuh
  const order = s.prog.flatMap((ps, seatNo) => ps.map((_, piece) => ({ seatNo, piece }))).sort((a, b) => Number(canMove(a.seatNo, a.piece)) - Number(canMove(b.seatNo, b.piece)))

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-3 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- papan ---- */}
        <section className="relative aspect-square h-full max-w-[58vw] shrink-0" aria-label="Papan Ludo">
          <svg viewBox={`${-ext} ${-ext} ${2 * ext} ${2 * ext}`} className="h-full w-full drop-shadow-[5px_7px_0_#121212]">
            <BoardArt s={s} />
            {order.map(({ seatNo, piece }) => {
              const k = key(seatNo, piece)
              const pick = canMove(seatNo, piece)
              return (
                <g
                  key={k}
                  ref={(el) => {
                    if (el) pawnRefs.current.set(k, el)
                    else pawnRefs.current.delete(k)
                  }}
                  onClick={pick ? () => act({ type: 'move', owner: seatNo, piece }) : undefined}
                  className={pick ? 'cursor-pointer' : undefined}
                  role={pick ? 'button' : undefined}
                  aria-label={pick ? `Jalankan bidak ${piece + 1} ${names[seatNo] ?? ''}` : undefined}
                >
                  <Pawn seatNo={seatNo} pick={pick} done={s.prog[seatNo][piece] === F} />
                </g>
              )
            })}
          </svg>
          {fx.map((f) => (
            <FxBurst key={f.id} fx={f} ext={ext} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
          ))}
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="flex min-w-0 flex-1 flex-col gap-1.5 pb-[max(4px,env(safe-area-inset-bottom))]" aria-live="polite">
          <header className="flex items-center gap-2">
            <button
              onClick={() => setConfirmExit(true)}
              aria-label="Kembali ke menu"
              className="grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
            </button>
            <SoundButton />
            <Tape
              tone={myTurn ? 'rose' : 'paper'}
              tilt={myTurn ? 'l' : 'r'}
              className="ml-auto truncate text-base leading-tight"
              style={myTurn ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#43b929', '#121212'], 90, 18) }}
            >
              {turnLabel}
            </Tape>
          </header>

          <ol className={cn('grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1', s.prog.length > 4 && 'grid-cols-2')} aria-label="Pemain">
            {s.prog.map((ps, i) => {
              const home = ps.filter((p) => p === F).length
              const out = ps.filter((p) => p >= 0 && p < F).length
              return (
                <li key={i} data-seat={i} className={cn('flex items-center gap-1.5 border-[3px] border-ink px-1.5 py-0.5', i === s.turn && s.phase !== 'end' ? 'bg-rose shadow-slab-sm' : 'bg-paper/90')}>
                  <SeatDot seat={i} size={14} />
                  <span className={cn('size-2 shrink-0 rounded-full border-2 border-ink', online[i] ? 'bg-electric' : 'bg-paper')} aria-label={online[i] ? 'online' : 'offline'} />
                  <span className="min-w-0 flex-1 truncate font-display text-[11px] uppercase leading-tight">
                    {names[i] ?? '?'}
                    {i === seat && <span className="ml-1 font-sans text-[10px] font-semibold normal-case">(kamu)</span>}
                    <span className="block truncate font-sans text-[10px] font-semibold normal-case text-ink/70">
                      {s.opts.teams && `${TEAM_NAME[s.team[i]]} · `}
                      {home === ps.length ? 'semua finis' : `${out} jalan · ${ps.length - home - out} kandang`}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 font-display text-[12px]" aria-label={`${home} bidak finis`}>
                    <img src={sprite('icon-crown')} alt="" className="size-4 object-contain" draggable={false} />
                    {home}/{ps.length}
                  </span>
                </li>
              )
            })}
          </ol>

          <p className="min-h-9 border-[3px] border-ink bg-paper px-2 py-1 text-[11px] font-semibold leading-snug">{eventText(s, seat, names)}</p>

          {s.opts.specials && (
            <ul className="grid grid-cols-4 gap-1" aria-label="Petak jahil">
              {(Object.keys(SPECIAL_INFO) as Special[]).map((k) => (
                <li key={k} className="flex items-center gap-0.5 border-2 border-ink bg-paper/90 px-0.5 text-[9px] font-semibold leading-tight" title={SPECIAL_INFO[k].line}>
                  <img src={sprite(`icon-${k}`)} alt="" className="size-5 shrink-0 object-contain" draggable={false} />
                  <span className="min-w-0 truncate">{SPECIAL_INFO[k].title}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <div ref={diceRef} className="relative">
              {diceFx > 0 && (
                <Lottie
                  key={`fx-${diceFx}`}
                  src={diceRoll}
                  autoplay
                  loop={false}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2"
                />
              )}
              <Die key={s.eventId} value={die ?? 6} size={46} />
            </div>
            <MainAction s={s} seat={seat} names={names} act={act} />
          </div>
        </aside>
      </div>

      {s.phase === 'end' && <GameEnd s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Semua bidak di papan hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

function Pawn({ seatNo, pick, done }: { seatNo: Seat; pick: boolean; done: boolean }) {
  return (
    <g>
      {pick && (
        <circle r={0.5} cy={0.12} fill="#5cf64a" fillOpacity={0.35} stroke="#121212" strokeWidth={0.07} strokeDasharray="0.16 0.1">
          <animate attributeName="r" values="0.42;0.56;0.42" dur="0.9s" repeatCount="indefinite" />
        </circle>
      )}
      <ellipse cx={0.05} cy={0.2} rx={0.3} ry={0.11} fill="#121212" opacity={0.3} />
      <image href={sprite(`pawn-${seatNo % 8}`)} x={-0.33} y={-0.92} width={0.66} height={1.12} opacity={done ? 0.85 : 1} />
      {/* area sentuh lebih besar dari gambarnya */}
      <circle r={0.6} cy={-0.3} fill="transparent" />
    </g>
  )
}

function MainAction({ s, seat, names, act }: { s: LudoState; seat: Seat; names: string[]; act: (a: LudoAction) => void }) {
  const mine = s.turn === seat
  if (mine && s.phase === 'roll')
    return (
      <Slab tone="rose" size="md" className="flex-1" onClick={() => act({ type: 'roll' })}>
        {s.event && s.event.by === seat && s.event.log.some((n) => n.t === 'bonus') ? 'Lempar lagi!' : 'Lempar dadu'}
      </Slab>
    )
  if (mine && s.phase === 'move')
    return (
      <Slab tone="electric" size="md" className="flex-1" disabled>
        Ketuk bidak yang berkedip
      </Slab>
    )
  return (
    <Slab tone="rose" size="md" className="flex-1" disabled>
      {s.phase === 'end' ? 'Selesai' : `Tunggu ${names[s.turn] ?? '?'}`}
    </Slab>
  )
}

function GameEnd({ s, seat, names, act, exit }: { s: LudoState; seat: Seat; names: string[]; act: (a: LudoAction) => void; exit: () => void }) {
  const team = s.winner ?? 0
  const happy = s.team[seat] === team
  const box = useRef<HTMLDivElement>(null)
  const F = finish(s)
  const ranking = standings(s)
  const total = s.opts.pieces * (F + 1)
  useGSAP(
    () => {
      gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.6, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const winners = s.team.map((t, i) => (t === team ? i : -1)).filter((i) => i >= 0)
  const headline = s.opts.teams ? (happy ? `${TEAM_NAME[team]} menang, termasuk kamu!` : `${TEAM_NAME[team]} menang`) : happy ? 'Kamu juara Ludo!' : `${names[winners[0]] ?? '?'} juara`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={happy ? winArt : loseArt}
            alt={happy ? 'Bidak pink bermahkota di atas podium' : 'Bidak kuning terjungkal kepleset kulit pisang'}
            className="-mb-6 h-32 w-auto"
            draggable={false}
          />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">
              {happy ? 'Semua bidak pulang dengan selamat. Yang kalah wajib pijitin pundak.' : 'Bidakmu masih nyasar di jalan. Revans biar impas?'}
            </p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-1.5 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Peringkat">
            {ranking.map((i, rank) => {
              const done = s.prog[i].reduce((a, p) => a + Math.max(0, p) + 1, 0)
              return (
                <li key={i}>
                  <div className="flex justify-between text-[13px] font-semibold">
                    <span className={cn(i === seat && 'font-bold')}>
                      {rank + 1}. {i === seat ? 'Kamu' : names[i]}
                      {s.opts.teams && <span className="ml-1 text-[11px] text-ink/60">{TEAM_NAME[s.team[i]]}</span>}
                    </span>
                    <span>
                      {s.prog[i].filter((p) => p === F).length}/{s.opts.pieces} finis
                    </span>
                  </div>
                  <div className="mt-0.5 h-3 -skew-x-12 border-2 border-ink bg-petal">
                    <div className="h-full" style={{ width: `${(done / total) * 100}%`, background: PAWN_HEX[i % PAWN_HEX.length] }} />
                  </div>
                </li>
              )
            })}
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
