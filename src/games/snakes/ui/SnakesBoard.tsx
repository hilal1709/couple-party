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
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import cardPop from '@/assets/lottie/card-pop.json'
import diceRoll from '@/assets/lottie/dice-roll.json'
import itemPop from '@/assets/lottie/item-pop.json'
import ladderUp from '@/assets/lottie/ladder-up.json'
import snakeBite from '@/assets/lottie/snake-bite.json'
import winArt from '@/assets/snakes/snakes-win.webp'
import loseArt from '@/assets/snakes/snakes-lose.webp'
import type { GameProps, Seat } from '../../types'
import { QUIZ } from '../challenges'
import { BONUS, canUseItem, deckText } from '../engine'
import { GOAL, type Item, type SnakesAction, type SnakesState } from '../types'
import { center, Cells, Die, ItemIcon, Ladder, PAWN_HEX, Snake, sprite } from './art'
import { eventText, ITEM_INFO } from './copy'

gsap.registerPlugin(useGSAP)

type Props = GameProps<SnakesState, SnakesAction>

/** Bidak yang berbagi kotak digeser sedikit supaya semuanya kelihatan. */
const SPREAD: [number, number][] = [
  [0, 0],
  [-20, -16],
  [20, 16],
  [20, -16],
  [-20, 16],
  [0, -26],
  [0, 26],
  [-26, 0],
]

type LottieDoc = { w: number; h: number }
/** Efek Lottie satu kali di atas papan; `cell` null = tengah papan. */
type Fx = { id: number; anim: LottieDoc; cell: number | null; delay: number; size: number }
let fxSeq = 0

function FxBurst({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const [on, setOn] = useState(fx.delay === 0)
  useEffect(() => {
    if (on) return
    const t = setTimeout(() => setOn(true), fx.delay)
    return () => clearTimeout(t)
  }, [on, fx.delay])
  if (!on) return null
  const c = fx.cell ? center(fx.cell) : { x: 500, y: 500 }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${((c.x + 8) / 1016) * 100}%`, top: `${((c.y + 8) / 1016) * 100}%`, width: `${fx.size}%`, aspectRatio: `${fx.anim.w} / ${fx.anim.h}` }}
    >
      <Lottie src={fx.anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}

function pawnSpots(pos: number[]) {
  const seen = new Map<number, number>()
  return pos.map((p) => {
    const cell = Math.max(1, p)
    const k = seen.get(cell) ?? 0
    seen.set(cell, k + 1)
    const c = center(cell)
    const [ox, oy] = SPREAD[k % SPREAD.length]
    return { x: c.x + (k ? ox : 0), y: c.y + (k ? oy : 0) }
  })
}

export function SnakesBoard({ state: s, seat, names, online, act, exit }: Props) {
  const myTurn = s.turn === seat && s.winner === null
  const p = s.pending
  const [confirmExit, setConfirmExit] = useState(false)
  const pawnRefs = useRef(new Map<Seat, SVGGElement>())
  const diceRef = useRef<HTMLDivElement>(null)
  const lastEvent = useRef<number | null>(null)
  const turnName = names[s.turn] ?? '?'
  const [fx, setFx] = useState<Fx[]>([])
  const [diceFx, setDiceFx] = useState(0)

  useMusic(Math.max(...s.pos) >= 80 ? 'snakes-tense' : 'snakes')

  // ---- suara dari tiap kejadian baru ----
  const prevTurn = useRef(s.turn)
  useEffect(() => {
    const e = s.event
    if (e && lastEvent.current !== null && lastEvent.current !== s.eventId) {
      const walk = Math.min(12, Math.max(0, e.path.length - 1))
      if (e.dice) sfx('dice-shake')
      for (let i = 0; i < walk; i++) sfx('card-slide-1', { delay: 250 + i * 170, volume: 0.35, rate: 1.1 })
      const later = 300 + walk * 170
      const landed = e.path.at(-1) ?? null
      const burst: Omit<Fx, 'id'>[] = []
      for (const n of e.log) {
        if (n.t === 'ladder') burst.push({ anim: ladderUp, cell: n.to, delay: later + 450, size: 20 })
        if (n.t === 'snake') burst.push({ anim: snakeBite, cell: n.from, delay: later, size: 26 })
        if (n.t === 'trap') burst.push({ anim: snakeBite, cell: n.at, delay: later, size: 22 })
        if (n.t === 'shieldBlock') burst.push({ anim: itemPop, cell: n.at, delay: later, size: 24 })
        if (n.t === 'gotItem') burst.push({ anim: itemPop, cell: landed, delay: later, size: 24 })
        if (n.t === 'challenge' || n.t === 'quiz' || n.t === 'card') burst.push({ anim: cardPop, cell: null, delay: n.t === 'card' ? 0 : later, size: 60 })
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (burst.length) setFx((cur) => [...cur, ...burst.map((b) => ({ ...b, id: ++fxSeq }))])
        if (e.dice) setDiceFx(s.eventId)
      }
      for (const n of e.log) {
        if (n.t === 'ladder') sfx('jingle-challenge-win', { delay: later })
        if (n.t === 'snake') sfx('jingle-round-lose', { delay: later })
        if (n.t === 'trap') sfx('jingle-caught', { delay: later })
        if (n.t === 'shieldBlock') sfx('chips-stack', { delay: later })
        if (n.t === 'gotItem') sfx('pack-take', { delay: later })
        if (n.t === 'useItem') sfx('pack-open')
        if (n.t === 'challenge' || n.t === 'quiz' || n.t === 'card') sfx('ui-open', { delay: n.t === 'card' ? 0 : later })
        if (n.t === 'answer' || n.t === 'judged') sfx(n.ok ? 'jingle-challenge-win' : 'jingle-challenge-lose')
        if (n.t === 'refuse') sfx('jingle-challenge-lose')
        if (n.t === 'win') sfx(e.by === seat ? 'jingle-champion' : 'jingle-round-lose', { delay: later })
      }
    }
    if (s.turn === seat && prevTurn.current !== seat && s.winner === null) sfx('turn-ding', { delay: 600 })
    prevTurn.current = s.turn
    lastEvent.current = s.eventId
  }, [s, seat])

  // ---- animasi bidak menyusuri jalurnya ----
  const spots = pawnSpots(s.pos)
  const animated = useRef<number | null>(null)
  useLayoutEffect(() => {
    const e = s.event
    const fresh = animated.current !== null && animated.current !== s.eventId
    animated.current = s.eventId
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    spots.forEach((pt, i) => {
      const el = pawnRefs.current.get(i)
      if (!el) return
      const mover = fresh && e && e.by === i && e.path.length > 1 && !reduce
      if (!mover) {
        gsap.to(el, { x: pt.x, y: pt.y, duration: fresh && !reduce ? 0.35 : 0, delay: fresh ? 0.2 : 0, ease: 'power2.out' })
        return
      }
      const tl = gsap.timeline()
      const start = center(Math.max(1, e.path[0]))
      tl.set(el, { x: start.x, y: start.y })
      let prev = e.path[0]
      for (const step of e.path.slice(1)) {
        const c = center(Math.max(1, step))
        const far = Math.abs(step - prev) > 1
        tl.to(el, { x: c.x, y: c.y, duration: far ? 0.6 : 0.17, ease: far ? 'power2.inOut' : 'power1.out' })
        if (!far) tl.to(el, { y: c.y - 14, duration: 0.07, yoyo: true, repeat: 1, ease: 'sine.out' }, '<')
        prev = step
      }
      tl.to(el, { x: pt.x, y: pt.y, duration: 0.15 })
    })
  })

  useGSAP(() => {
    if (!s.event?.dice || !diceRef.current) return
    gsap.fromTo(diceRef.current.children, { rotation: -200, scale: 0.6 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.06 })
  }, [s.eventId])

  const snakes = Object.entries(s.board.jumps).filter(([f, t]) => t < Number(f))
  const ladders = Object.entries(s.board.jumps).filter(([f, t]) => t > Number(f))

  let turnLabel = myTurn ? 'Giliranmu' : `Giliran ${turnName}`
  if (p?.kind === 'judge') turnLabel = myTurn ? 'Lagi dinilai…' : `Nilai ${turnName}!`
  const floor = { backgroundImage: terrazzo(8, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  const myItems = s.items[seat] ?? []

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-3 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- papan ---- */}
        <section className="relative aspect-square h-full max-w-[58vw] shrink-0" aria-label="Papan ular tangga">
          <svg viewBox="-8 -8 1016 1016" className="h-full w-full drop-shadow-[6px_8px_0_#121212]">
            <rect x={-6} y={-6} width={1012} height={1012} fill="#121212" />
            <Cells tiles={s.board.tiles} traps={s.traps} />
            {ladders.map(([f, t]) => (
              <Ladder key={f} from={Number(f)} to={t} />
            ))}
            {snakes.map(([f, t], i) => (
              <Snake key={f} from={Number(f)} to={t} tone={i} />
            ))}
            {s.pos.map((_, i) => (
              <g
                key={i}
                ref={(el) => {
                  if (el) pawnRefs.current.set(i, el)
                  else pawnRefs.current.delete(i)
                }}
              >
                <Pawn seatNo={i} name={names[i] ?? '?'} me={i === seat} turn={i === s.turn} shield={s.shield[i]} />
              </g>
            ))}
          </svg>
          {fx.map((f) => (
            <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
          ))}
          {p && <PendingCard s={s} seat={seat} names={names} act={act} />}
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="flex min-w-0 flex-1 flex-col gap-2 pb-[max(4px,env(safe-area-inset-bottom))]" aria-live="polite">
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

          <ol className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Pemain">
            {s.pos.map((pos, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center gap-2 border-[3px] border-ink px-2 py-1',
                  i === s.turn && s.winner === null ? 'bg-rose shadow-slab-sm' : 'bg-paper/90',
                )}
              >
                <span className="size-4 shrink-0 rounded-full border-[3px] border-ink" style={{ background: PAWN_HEX[i % PAWN_HEX.length] }} />
                <span className={cn('size-2 shrink-0 rounded-full border-2 border-ink', online[i] ? 'bg-electric' : 'bg-paper')} aria-label={online[i] ? 'online' : 'offline'} />
                <span className="min-w-0 flex-1 truncate font-display text-[12px] uppercase">
                  {names[i] ?? '?'}
                  {i === seat && <span className="ml-1 font-sans text-[11px] font-semibold normal-case">(kamu)</span>}
                </span>
                {s.shield[i] && <ItemIcon item="shield" size={16} />}
                {s.skip[i] && <span className="border-2 border-ink bg-ink px-1 font-display text-[9px] text-petal">SKIP</span>}
                {i !== seat && s.items[i].map((it, k) => <ItemIcon key={k} item={it} size={16} />)}
                <span className="w-8 text-right font-display text-sm">{pos === 0 ? '–' : pos}</span>
              </li>
            ))}
          </ol>

          <p className="min-h-9 border-[3px] border-ink bg-paper px-2 py-1 text-[12px] font-semibold leading-snug">{eventText(s, seat, names)}</p>

          {/* item milikku */}
          <div className="flex items-center gap-2" aria-label="Item kamu">
            <span className="font-display text-[11px] uppercase">Item</span>
            {myItems.length === 0 && <span className="text-[11px] font-medium text-ink/70">Belum punya. Injak kotak kado.</span>}
            {myItems.map((it, k) => (
              <ItemButton key={k} item={it} enabled={canUseItem(s, seat, it)} onUse={() => act({ type: 'useItem', item: it })} />
            ))}
          </div>

          {/* dadu */}
          <div className="flex items-center gap-3">
            <div ref={diceRef} className="relative flex gap-1.5">
              {diceFx > 0 && (
                <Lottie
                  key={`fx-${diceFx}`}
                  src={diceRoll}
                  autoplay
                  loop={false}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2"
                />
              )}
              {(s.event?.dice ?? [1]).map((d, k) => (
                <Die key={`${s.eventId}-${k}`} value={d} size={44} tone={k ? '#ff37a6' : '#fff4fa'} />
              ))}
            </div>
            <Slab tone="rose" size="md" className="flex-1" disabled={!myTurn || !!p} onClick={() => act({ type: 'roll' })}>
              {myTurn && !p ? (s.double ? 'Lempar 2 dadu' : 'Lempar dadu') : myTurn ? 'Selesaikan dulu' : `Tunggu ${turnName}`}
            </Slab>
          </div>
        </aside>
      </div>

      {s.winner !== null && <WinScreen s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Papan dan posisi semua pemain hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

function Pawn({ seatNo, name, me, turn, shield }: { seatNo: Seat; name: string; me: boolean; turn: boolean; shield: boolean }) {
  return (
    <g>
      {turn && <ellipse cy={22} rx={38} ry={15} fill="none" stroke="#121212" strokeWidth={5} strokeDasharray="10 7" />}
      {shield && <circle cy={-6} r={40} fill="#5cf64a" opacity={0.45} stroke="#121212" strokeWidth={3} />}
      <ellipse cx={4} cy={24} rx={24} ry={9} fill="#121212" opacity={0.35} />
      <image href={sprite(`pawn-${seatNo % 8}`)} x={-27} y={-54} width={54} height={80} />
      <g transform="translate(22 14)">
        <circle r={me ? 15 : 13} fill={me ? '#5cf64a' : '#fff4fa'} stroke="#121212" strokeWidth={4} />
        <text y={6} textAnchor="middle" fontSize={me ? 18 : 16} fontFamily="Dela Gothic One, sans-serif" fill="#121212">
          {(name.trim()[0] ?? '?').toUpperCase()}
        </text>
      </g>
    </g>
  )
}

function ItemButton({ item, enabled, onUse }: { item: Item; enabled: boolean; onUse: () => void }) {
  return (
    <button
      onClick={enabled ? onUse : undefined}
      aria-disabled={!enabled}
      title={`${ITEM_INFO[item].title}: ${ITEM_INFO[item].line}`}
      aria-label={`Pakai ${ITEM_INFO[item].title}: ${ITEM_INFO[item].line}`}
      className={cn(
        'relative flex items-center gap-1 border-[3px] border-ink px-1.5 py-0.5 text-[11px] font-semibold',
        enabled ? 'bg-electric shadow-slab-sm active:translate-y-0.5 active:shadow-none' : 'bg-paper',
      )}
      style={enabled ? undefined : { backgroundImage: hatch('#121212', 7, 0.18) }}
    >
      <ItemIcon item={item} size={18} />
      {ITEM_INFO[item].title}
    </button>
  )
}

/** Kartu tantangan / kuis di atas papan, terlihat oleh semua pemain. */
function PendingCard({ s, seat, names, act }: { s: SnakesState; seat: Seat; names: string[]; act: (a: SnakesAction) => void }) {
  const p = s.pending!
  const mine = s.turn === seat
  const who = names[s.turn] ?? '?'
  const box = useRef<HTMLDivElement>(null)
  const hasPass = mine && s.items[seat].includes('pass') && (p.kind === 'card' || p.kind === 'pickDeck')

  useGSAP(
    () => {
      gsap.from(box.current, { scale: 0.6, rotation: -8, opacity: 0, duration: 0.35, ease: 'back.out(1.7)' })
    },
    { dependencies: [p.kind], scope: box },
  )

  const deck = p.kind === 'card' || p.kind === 'judge' ? p.deck : null
  const title = p.kind === 'quiz' ? 'Kuis!' : p.kind === 'pickDeck' ? 'Truth atau Dare?' : deck === 'truth' ? 'Truth' : 'Dare'

  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/40 p-[6%]">
      <div
        ref={box}
        role="dialog"
        aria-label={title}
        className={cn('relative flex w-full flex-col gap-2 border-[3px] border-ink p-3 shadow-lift', p.kind === 'quiz' ? 'bg-electric' : 'bg-paper')}
      >
        <div
          aria-hidden
          className="absolute -top-3 right-4 h-6 w-16 rotate-6 border-[3px] border-ink bg-rose"
          style={{ backgroundImage: squiggles('#121212', 40, 2.6) }}
        />
        <Tape tone={deck === 'truth' ? 'electric' : 'rose'} className="self-start text-lg">
          {title}
        </Tape>
        <p className="text-[11px] font-semibold text-ink/70">{mine ? 'Buat kamu' : `Buat ${who}`}</p>

        {p.kind === 'pickDeck' &&
          (mine ? (
            <div className="flex gap-3">
              <Slab tone="electric" size="sm" className="flex-1" onClick={() => act({ type: 'pickDeck', deck: 'truth' })}>
                Truth
              </Slab>
              <Slab tone="rose" size="sm" className="flex-1" onClick={() => act({ type: 'pickDeck', deck: 'dare' })}>
                Dare
              </Slab>
            </div>
          ) : (
            <p className="text-sm font-semibold">{who} lagi milih…</p>
          ))}

        {(p.kind === 'card' || p.kind === 'judge') && <p className="text-[15px] font-bold leading-snug">{deckText(p.deck, p.i)}</p>}

        {p.kind === 'card' &&
          (mine ? (
            <div className="flex flex-wrap gap-3">
              <Slab tone="grass" size="sm" className="flex-1" onClick={() => act({ type: 'doIt' })}>
                Jalanin
              </Slab>
              <Slab tone="paper" size="sm" className="flex-1" onClick={() => act({ type: 'refuse' })}>
                Tolak (−{s.opts.penalty})
              </Slab>
            </div>
          ) : (
            <p className="text-sm font-semibold">Tunggu {who} memutuskan berani atau nggak.</p>
          ))}

        {p.kind === 'judge' &&
          (mine ? (
            <p className="text-sm font-semibold">Jalanin lewat video call / chat. Lawan yang menentukan lolos atau gagal.</p>
          ) : (
            <div className="flex gap-3">
              <Slab tone="grass" size="sm" className="flex-1" onClick={() => act({ type: 'judge', ok: true })}>
                Lolos (+{BONUS.judge})
              </Slab>
              <Slab tone="ink" size="sm" className="flex-1" onClick={() => act({ type: 'judge', ok: false })}>
                Gagal (−{s.opts.penalty})
              </Slab>
            </div>
          ))}

        {p.kind === 'quiz' && (
          <>
            <p className="text-[15px] font-bold leading-snug">{QUIZ[p.i]?.q}</p>
            <div className="grid grid-cols-3 gap-2">
              {QUIZ[p.i]?.options.map((o, k) => (
                <button
                  key={k}
                  disabled={!mine}
                  onClick={() => act({ type: 'answer', choice: k })}
                  className="border-[3px] border-ink bg-paper px-1.5 py-1.5 text-[12px] font-bold leading-tight shadow-slab-sm active:translate-y-0.5 active:shadow-none disabled:shadow-none"
                >
                  {o}
                </button>
              ))}
            </div>
            {!mine && <p className="text-[12px] font-semibold">{who} lagi mikir…</p>}
          </>
        )}

        {hasPass && (
          <button
            onClick={() => act({ type: 'useItem', item: 'pass' })}
            className="flex items-center gap-1.5 self-start border-[3px] border-ink bg-[#ffcc1f] px-2 py-0.5 text-[12px] font-bold shadow-slab-sm active:translate-y-0.5 active:shadow-none"
          >
            <ItemIcon item="pass" size={18} /> Pakai Bebas Tugas
          </button>
        )}
      </div>
    </div>
  )
}

function WinScreen({ s, seat, names, act, exit }: { s: SnakesState; seat: Seat; names: string[]; act: (a: SnakesAction) => void; exit: () => void }) {
  const w = s.winner!
  const happy = w === seat
  const box = useRef<HTMLDivElement>(null)
  const ranking = s.pos.map((_, i) => i).sort((a, b) => s.pos[b] - s.pos[a])
  useGSAP(
    () => {
      gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.6, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const headline = happy ? 'Kamu sampai duluan!' : `${names[w]} menang`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img data-pop src={happy ? winArt : loseArt} alt={happy ? 'Maskot bermahkota di podium samping tangga' : 'Maskot pink cemberut dililit ular hijau'} className="-mb-6 h-32 w-auto" draggable={false} />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">{happy ? 'Ular pun minder lihat kamu. Saatnya minta traktiran.' : 'Kalah sama dadu. Siapin traktiran ya.'}</p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-2 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Posisi akhir">
            {ranking.map((i, rank) => (
              <li key={i}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className={cn(i === seat && 'font-bold')}>
                    {rank + 1}. {i === seat ? 'Kamu' : names[i]}
                  </span>
                  <span>{s.pos[i]}</span>
                </div>
                <div className="mt-0.5 h-3.5 -skew-x-12 border-2 border-ink bg-petal">
                  <div className="h-full" style={{ width: `${(s.pos[i] / GOAL) * 100}%`, background: PAWN_HEX[i % PAWN_HEX.length] }} />
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
