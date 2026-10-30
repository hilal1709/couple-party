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
import { squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import diceRoll from '@/assets/lottie/dice-roll.json'
import fxBankrupt from '@/assets/lottie/monopoly-bankrupt.json'
import fxBuild from '@/assets/lottie/monopoly-build.json'
import fxCard from '@/assets/lottie/monopoly-card.json'
import fxJackpot from '@/assets/lottie/monopoly-jackpot.json'
import fxJail from '@/assets/lottie/monopoly-jail.json'
import fxRent from '@/assets/lottie/monopoly-rent.json'
import fxSold from '@/assets/lottie/monopoly-sold.json'
import winArt from '@/assets/monopoly/monopoly-win.webp'
import loseArt from '@/assets/monopoly/monopoly-lose.webp'
import type { GameProps, Seat } from '../../types'
import { ownable, squareName } from '../board'
import { DECK_TITLE } from '../cards'
import { actorOf, netWorth } from '../engine'
import { cuesFor, isTense, STEP_MS, type FxCue, type FxName } from '../sounds'
import { JAIL_FINE, type MonopolyAction, type MonopolyState } from '../types'
import { cellCenter, Die, PAWN_HEX, SeatDot, sprite, Squares } from './art'
import { eventText, lastCard, money, who } from './copy'
import { PropertyCard } from './PropertyCard'
import { ManageSheet, TradeSheet, TradeSummary } from './Sheets'

gsap.registerPlugin(useGSAP)

type Props = GameProps<MonopolyState, MonopolyAction>
type LottieDoc = { w: number; h: number }

const FX: Record<FxName, LottieDoc> = {
  'monopoly-sold': fxSold,
  'monopoly-rent': fxRent,
  'monopoly-build': fxBuild,
  'monopoly-jail': fxJail,
  'monopoly-card': fxCard,
  'monopoly-bankrupt': fxBankrupt,
  'monopoly-jackpot': fxJackpot,
}

type Fx = FxCue & { id: number }
let fxSeq = 0

function FxBurst({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const [on, setOn] = useState(fx.delay === 0)
  useEffect(() => {
    if (on) return
    const t = setTimeout(() => setOn(true), fx.delay)
    return () => clearTimeout(t)
  }, [on, fx.delay])
  if (!on) return null
  const anim = FX[fx.anim]
  const c = fx.sq === null ? { x: 500, y: 500 } : cellCenter(fx.sq)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${((c.x + 8) / 1016) * 100}%`, top: `${((c.y + 8) / 1016) * 100}%`, width: `${fx.size}%`, aspectRatio: `${anim.w} / ${anim.h}` }}
    >
      <Lottie src={anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}

/** Bidak yang berbagi petak digeser supaya semuanya kelihatan. */
const SPREAD: [number, number][] = [
  [0, 0],
  [-24, -22],
  [24, 22],
  [24, -22],
  [-24, 22],
  [0, -32],
  [0, 32],
  [-30, 0],
]

function pawnSpots(s: MonopolyState) {
  const seen = new Map<number, number>()
  return s.pos.map((p, i) => {
    const c = cellCenter(p)
    if (s.bankrupt[i]) return c
    const k = seen.get(p) ?? 0
    seen.set(p, k + 1)
    const [ox, oy] = SPREAD[k % SPREAD.length]
    // yang dipenjara duduk di dalam sel (pojok kanan atas petak penjara)
    const jailed = p === 10 && s.jail[i] >= 0 ? { x: 22, y: -22 } : { x: 0, y: 0 }
    return { x: c.x + (k ? ox : 0) + jailed.x, y: c.y + (k ? oy : 0) + jailed.y }
  })
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function MonopolyBoard({ state: s, seat, names, online, act, exit }: Props) {
  const actor = actorOf(s)
  const myTurn = s.turn === seat && s.phase !== 'end'
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmBankrupt, setConfirmBankrupt] = useState(false)
  const [manage, setManage] = useState(false)
  const [trading, setTrading] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [cardSeen, setCardSeen] = useState<number | null>(null)
  const [fx, setFx] = useState<Fx[]>([])
  const [diceFx, setDiceFx] = useState(0)
  const pawnRefs = useRef(new Map<Seat, SVGGElement>())
  const diceRef = useRef<HTMLDivElement>(null)
  const prev = useRef<MonopolyState | null>(null)

  useMusic(isTense(s) ? 'monopoly-tense' : 'monopoly')

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

  // ---- animasi bidak menyusuri jalurnya ----
  const spots = pawnSpots(s)
  const animated = useRef<number | null>(null)
  useLayoutEffect(() => {
    const e = s.event
    const fresh = animated.current !== null && animated.current !== s.eventId
    animated.current = s.eventId
    const calm = reduced()
    spots.forEach((pt, i) => {
      const el = pawnRefs.current.get(i)
      if (!el) return
      const mover = fresh && e && e.by === i && e.path.length > 1 && !calm
      if (!mover) {
        gsap.to(el, { x: pt.x, y: pt.y, duration: fresh && !calm ? 0.3 : 0, ease: 'power2.out' })
        return
      }
      const tl = gsap.timeline({ delay: e.dice ? 0.5 : 0 })
      const start = cellCenter(e.path[0])
      tl.set(el, { x: start.x, y: start.y })
      let at = e.path[0]
      for (const step of e.path.slice(1)) {
        const c = cellCenter(step)
        const far = Math.abs(step - at) !== 1 && Math.abs(step - at) !== 39
        tl.to(el, { x: c.x, y: c.y, duration: far ? 0.6 : STEP_MS / 1000, ease: far ? 'power2.inOut' : 'power1.out' })
        if (!far) tl.to(el, { y: c.y - 16, duration: STEP_MS / 2000, yoyo: true, repeat: 1, ease: 'sine.out' }, '<')
        at = step
      }
      tl.to(el, { x: pt.x, y: pt.y, duration: 0.15 })
    })
  })

  useGSAP(() => {
    if (!s.event?.dice || !diceRef.current) return
    gsap.fromTo(diceRef.current.children, { rotation: -220, scale: 0.5 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.06 })
  }, [s.eventId])

  const card = lastCard(s)
  const showCard = card && cardSeen !== s.eventId
  const turnName = names[s.turn] ?? '?'
  const actorName = actor !== null ? (names[actor] ?? '?') : ''
  let turnLabel = myTurn ? 'Giliranmu' : `Giliran ${turnName}`
  if (s.phase === 'auction') turnLabel = actor === seat ? 'Giliranmu menawar' : `${actorName} menawar`
  if (s.phase === 'debt') turnLabel = actor === seat ? 'Kamu berutang!' : `${actorName} berutang`
  const floor = { backgroundImage: terrazzo(14, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#2f4bff'], 180, 30) }
  const dice = s.event?.dice ?? null
  const alive = !s.bankrupt[seat]

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-3 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- papan ---- */}
        <section className="relative aspect-square h-full max-w-[58vw] shrink-0" aria-label="Papan Monopoli">
          <svg viewBox="-8 -8 1016 1016" className="h-full w-full drop-shadow-[6px_8px_0_#121212]">
            <defs>
              <pattern id="mono-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="14" height="14" fill="#121212" opacity="0.08" />
                <line x1="0" y1="0" x2="0" y2="14" stroke="#121212" strokeWidth="5" opacity="0.35" />
              </pattern>
            </defs>
            <rect x={-6} y={-6} width={1012} height={1012} fill="#121212" />
            <rect x={130} y={130} width={740} height={740} fill="#e6ffd9" />
            <Squares s={s} highlight={picked ?? (s.phase === 'buy' || s.phase === 'auction' ? (s.auction?.sq ?? s.pos[s.turn]) : null)} onPick={(sq) => setPicked(sq === picked ? null : sq)} />
            {s.pos.map((_, i) =>
              s.bankrupt[i] ? null : (
                <g
                  key={i}
                  ref={(el) => {
                    if (el) pawnRefs.current.set(i, el)
                    else pawnRefs.current.delete(i)
                  }}
                >
                  <Pawn seatNo={i} name={names[i] ?? '?'} me={i === seat} turn={i === s.turn && s.phase !== 'end'} jailed={s.jail[i] >= 0} />
                </g>
              ),
            )}
          </svg>
          {fx.map((f) => (
            <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
          ))}

          {/* tengah papan */}
          <div className="absolute inset-[14.5%] flex items-center justify-center">
            {s.phase === 'auction' ? (
              <AuctionPanel s={s} seat={seat} names={names} act={act} />
            ) : s.phase === 'buy' ? (
              <BuyPanel s={s} seat={seat} names={names} act={act} />
            ) : s.trade && (s.trade.to === seat || s.trade.from === seat) ? (
              <TradePanel s={s} seat={seat} names={names} act={act} />
            ) : picked !== null ? (
              <div className="w-[82%]">
                <PropertyCard s={s} sq={picked} names={names} seat={seat} />
                <button onClick={() => setPicked(null)} className="mt-1 w-full border-[3px] border-ink bg-paper py-0.5 text-[11px] font-bold shadow-slab-sm">
                  Tutup
                </button>
              </div>
            ) : showCard ? (
              <button
                onClick={() => setCardSeen(s.eventId)}
                className={cn('w-[78%] -rotate-2 border-[3px] border-ink p-3 text-left shadow-lift', card.deck === 'chance' ? 'bg-rose' : 'bg-electric')}
                aria-label="Tutup kartu"
              >
                <span className="flex items-center gap-2">
                  <img src={sprite(`card-${card.deck}`)} alt="" className="size-9 object-contain" draggable={false} />
                  <span className="font-display text-base uppercase">{DECK_TITLE[card.deck]}</span>
                </span>
                <span className="mt-1 block text-[13px] font-bold leading-snug">{card.text}</span>
              </button>
            ) : (
              <Center s={s} />
            )}
          </div>
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
              tone={actor === seat ? 'rose' : 'paper'}
              tilt={actor === seat ? 'l' : 'r'}
              className="ml-auto truncate text-base leading-tight"
              style={actor === seat ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#43b929', '#121212'], 90, 18) }}
            >
              {turnLabel}
            </Tape>
          </header>

          <ol className={cn('grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1', s.pos.length > 4 && 'grid-cols-2')} aria-label="Pemain">
            {s.pos.map((pos, i) => (
              <li
                key={i}
                data-seat={i}
                className={cn(
                  'flex items-center gap-1.5 border-[3px] border-ink px-1.5 py-0.5',
                  s.bankrupt[i] ? 'bg-paper/60 opacity-60' : i === actor ? 'bg-rose shadow-slab-sm' : 'bg-paper/90',
                )}
              >
                <SeatDot seat={i} size={14} />
                <span className={cn('size-2 shrink-0 rounded-full border-2 border-ink', online[i] ? 'bg-electric' : 'bg-paper')} aria-label={online[i] ? 'online' : 'offline'} />
                <span className="min-w-0 flex-1 truncate font-display text-[11px] uppercase leading-tight">
                  {names[i] ?? '?'}
                  {i === seat && <span className="ml-1 font-sans text-[10px] font-semibold normal-case">(kamu)</span>}
                  <span className="block truncate font-sans text-[10px] font-semibold normal-case text-ink/70">
                    {s.bankrupt[i] ? 'bangkrut' : s.jail[i] >= 0 ? 'di penjara' : squareName(pos)}
                  </span>
                </span>
                {s.jailCards[i].length > 0 && <span className="border-2 border-ink bg-electric px-0.5 font-display text-[8px]">BEBAS</span>}
                <span className={cn('text-right font-display text-[12px]', s.cash[i] < 150 && !s.bankrupt[i] && 'text-[#d0213f]')}>{money(s.cash[i])}</span>
              </li>
            ))}
          </ol>

          <p className="min-h-9 border-[3px] border-ink bg-paper px-2 py-1 text-[11px] font-semibold leading-snug">{eventText(s, seat, names)}</p>

          {alive && s.phase !== 'end' && (
            <div className="flex gap-2">
              <Slab tone="paper" size="sm" className="flex-1" onClick={() => setManage(true)}>
                Kelola
              </Slab>
              {s.opts.trade && (
                <Slab tone="paper" size="sm" className="flex-1" disabled={!!s.trade || !['roll', 'done', 'debt'].includes(s.phase)} onClick={() => setTrading(true)}>
                  {s.trade ? 'Ada tawaran' : 'Tukar'}
                </Slab>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div ref={diceRef} className="relative flex gap-1">
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
              <Die key={`a${s.eventId}`} value={dice?.[0] ?? 3} size={40} />
              <Die key={`b${s.eventId}`} value={dice?.[1] ?? 4} size={40} alt />
            </div>
            <MainAction s={s} seat={seat} names={names} act={act} onManage={() => setManage(true)} onBankrupt={() => setConfirmBankrupt(true)} />
          </div>
        </aside>
      </div>

      {s.phase === 'end' && <GameEnd s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ManageSheet open={manage} onOpenChange={setManage} s={s} seat={seat} act={act} />
      {s.opts.trade && <TradeSheet open={trading} onOpenChange={setTrading} s={s} seat={seat} names={names} act={act} />}
      <ConfirmModal
        open={confirmBankrupt}
        onOpenChange={setConfirmBankrupt}
        title="Nyerah & bangkrut?"
        description="Semua uang dan propertimu diserahkan ke yang kamu utangi. Kamu keluar dari permainan."
        confirmLabel="Bangkrut"
        onConfirm={() => act({ type: 'bankrupt' })}
      />
      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Papan, uang, dan properti semua pemain hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

function Pawn({ seatNo, name, me, turn, jailed }: { seatNo: Seat; name: string; me: boolean; turn: boolean; jailed: boolean }) {
  return (
    <g transform="scale(1.45)">
      {turn && <ellipse cy={18} rx={30} ry={11} fill="none" stroke="#121212" strokeWidth={4} strokeDasharray="8 6" />}
      <ellipse cx={3} cy={20} rx={18} ry={7} fill="#121212" opacity={0.35} />
      <circle cy={-4} r={21} fill={PAWN_HEX[seatNo % 8]} stroke="#121212" strokeWidth={4} />
      <image href={sprite(`pawn-${seatNo % 8}`)} x={-22} y={-30} width={44} height={44} />
      {jailed && <path d="M-16 -24v36M-6 -26v38M4 -26v38M14 -24v36" stroke="#121212" strokeWidth={4} />}
      <g transform="translate(18 12)">
        <circle r={me ? 12 : 10} fill={me ? '#5cf64a' : '#fff4fa'} stroke="#121212" strokeWidth={3} />
        <text y={5} textAnchor="middle" fontSize={me ? 14 : 12} fontFamily="Dela Gothic One, sans-serif" fill="#121212">
          {(name.trim()[0] ?? '?').toUpperCase()}
        </text>
      </g>
    </g>
  )
}

function Center({ s }: { s: MonopolyState }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img src={sprite('tile-monopoly')} alt="" className="h-[38%] max-h-36 w-auto" draggable={false} />
      <Tape tone="rose" className="text-xl">
        Monopoli
      </Tape>
      <p className="font-display text-[12px] uppercase">
        {s.opts.end === 'rounds' ? `Putaran ${Math.min(s.round, s.opts.rounds)} / ${s.opts.rounds}` : `Putaran ${s.round} · sampai bangkrut`}
      </p>
      {s.opts.freeParking && (
        <p className="border-[3px] border-ink bg-electric px-2 py-0.5 text-[12px] font-bold shadow-slab-sm">Jackpot Parkir Bebas {money(s.pot)}</p>
      )}
    </div>
  )
}

function Panel({ children, tone = 'paper' }: { children: React.ReactNode; tone?: 'paper' | 'electric' }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      gsap.from(box.current, { scale: 0.7, rotation: -6, opacity: 0, duration: 0.3, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  return (
    <div ref={box} role="dialog" className={cn('relative flex w-[86%] flex-col gap-2 border-[3px] border-ink p-2.5 shadow-lift', tone === 'electric' ? 'bg-electric' : 'bg-paper')}>
      <div aria-hidden className="absolute -top-3 right-4 h-6 w-16 rotate-6 border-[3px] border-ink bg-rose" style={{ backgroundImage: squiggles('#121212', 40, 2.6) }} />
      {children}
    </div>
  )
}

function BuyPanel({ s, seat, names, act }: { s: MonopolyState; seat: Seat; names: string[]; act: (a: MonopolyAction) => void }) {
  const sq = s.pos[s.turn]
  const price = ownable(sq)?.price ?? 0
  const mine = s.turn === seat
  return (
    <Panel>
      <PropertyCard s={s} sq={sq} names={names} seat={seat} className="shadow-none" />
      {mine ? (
        <div className="flex gap-2">
          <Slab tone="grass" size="sm" className="flex-1" disabled={s.cash[seat] < price} onClick={() => act({ type: 'buy' })}>
            Beli {money(price)}
          </Slab>
          <Slab tone="paper" size="sm" className="flex-1" onClick={() => act({ type: 'decline' })}>
            {s.opts.auction ? 'Lelang' : 'Lewati'}
          </Slab>
        </div>
      ) : (
        <p className="text-[12px] font-semibold">{names[s.turn]} lagi mikir mau beli atau nggak…</p>
      )}
    </Panel>
  )
}

function AuctionPanel({ s, seat, names, act }: { s: MonopolyState; seat: Seat; names: string[]; act: (a: MonopolyAction) => void }) {
  const a = s.auction!
  const mine = a.turn === seat
  const cash = s.cash[seat]
  return (
    <Panel tone="electric">
      <div className="flex items-center justify-between gap-2">
        <Tape tone="rose" className="text-base">
          Lelang!
        </Tape>
        <span className="truncate font-display text-[13px] uppercase">{squareName(a.sq)}</span>
      </div>
      <p className="text-[13px] font-bold">
        {a.bidder === null ? `Belum ada tawaran · harga asli ${money(ownable(a.sq)?.price ?? 0)}` : `Tertinggi ${money(a.bid)} oleh ${who(a.bidder, seat, names)}`}
      </p>
      <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
        {s.pos.map((_, i) =>
          s.bankrupt[i] ? null : (
            <span key={i} className={cn('flex items-center gap-1 border-2 border-ink px-1', a.active[i] ? 'bg-paper' : 'bg-paper/40 line-through')}>
              <SeatDot seat={i} size={9} /> {names[i]}
            </span>
          ),
        )}
      </div>
      {mine ? (
        <div className="flex flex-wrap gap-1.5">
          {[10, 50, 100].map((inc) => (
            <Slab key={inc} tone="rose" size="sm" className="flex-1 px-1" disabled={a.bid + inc > cash} onClick={() => act({ type: 'bid', amount: a.bid + inc })}>
              +{inc}
            </Slab>
          ))}
          <Slab tone="paper" size="sm" className="flex-1 px-1" onClick={() => act({ type: 'passBid' })}>
            Mundur
          </Slab>
        </div>
      ) : (
        <p className="text-[12px] font-semibold">Tunggu {names[a.turn]} menawar…</p>
      )}
    </Panel>
  )
}

function TradePanel({ s, seat, names, act }: { s: MonopolyState; seat: Seat; names: string[]; act: (a: MonopolyAction) => void }) {
  const t = s.trade!
  return (
    <Panel>
      <Tape tone="rose" className="self-start text-base">
        {t.to === seat ? `Tawaran dari ${names[t.from]}` : `Tawaranmu ke ${names[t.to]}`}
      </Tape>
      <TradeSummary s={s} names={names} seat={seat} />
      {t.to === seat ? (
        <div className="flex gap-2">
          <Slab tone="grass" size="sm" className="flex-1" disabled={s.phase !== 'roll' && s.phase !== 'done' && s.phase !== 'debt'} onClick={() => act({ type: 'accept' })}>
            Deal
          </Slab>
          <Slab tone="paper" size="sm" className="flex-1" onClick={() => act({ type: 'reject' })}>
            Tolak
          </Slab>
        </div>
      ) : (
        <Slab tone="paper" size="sm" onClick={() => act({ type: 'cancel' })}>
          Batalkan tawaran
        </Slab>
      )}
    </Panel>
  )
}

function MainAction({
  s,
  seat,
  names,
  act,
  onManage,
  onBankrupt,
}: {
  s: MonopolyState
  seat: Seat
  names: string[]
  act: (a: MonopolyAction) => void
  onManage: () => void
  onBankrupt: () => void
}) {
  const mine = s.turn === seat
  if (s.bankrupt[seat]) return <p className="flex-1 text-[12px] font-semibold">Kamu sudah bangkrut. Nonton sambil ngemil.</p>
  if (s.phase === 'debt' && s.debts[0]?.who === seat)
    return (
      <div className="flex flex-1 gap-2">
        <Slab tone="rose" size="md" className="flex-1 px-2" onClick={onManage}>
          Cari dana
        </Slab>
        <Slab tone="ink" size="md" className="px-3" onClick={onBankrupt}>
          Bangkrut
        </Slab>
      </div>
    )
  if (mine && s.phase === 'roll' && s.jail[seat] >= 0)
    return (
      <div className="flex flex-1 gap-1.5">
        <Slab tone="rose" size="md" className="flex-1 px-2 text-[13px]" onClick={() => act({ type: 'roll' })}>
          Coba dobel
        </Slab>
        {s.jailCards[seat].length > 0 ? (
          <Slab tone="electric" size="md" className="px-2 text-[13px]" onClick={() => act({ type: 'jailCard' })}>
            Pakai kartu
          </Slab>
        ) : (
          <Slab tone="paper" size="md" className="px-2 text-[13px]" disabled={s.cash[seat] < JAIL_FINE} onClick={() => act({ type: 'payJail' })}>
            Bayar $50
          </Slab>
        )}
      </div>
    )
  if (mine && s.phase === 'roll')
    return (
      <Slab tone="rose" size="md" className="flex-1" onClick={() => act({ type: 'roll' })}>
        {s.doubles > 0 ? 'Lempar lagi' : 'Lempar dadu'}
      </Slab>
    )
  if (mine && s.phase === 'done')
    return (
      <Slab tone="grass" size="md" className="flex-1" onClick={() => act({ type: 'endTurn' })}>
        Akhiri giliran
      </Slab>
    )
  const a = actorOf(s)
  return (
    <Slab tone="rose" size="md" className="flex-1" disabled>
      {a === null ? 'Selesai' : a === seat ? 'Giliranmu' : `Tunggu ${names[a]}`}
    </Slab>
  )
}

function GameEnd({ s, seat, names, act, exit }: { s: MonopolyState; seat: Seat; names: string[]; act: (a: MonopolyAction) => void; exit: () => void }) {
  const w = s.winner ?? 0
  const happy = w === seat
  const box = useRef<HTMLDivElement>(null)
  const worth = s.pos.map((_, i) => netWorth(s, i))
  const ranking = s.pos.map((_, i) => i).sort((a, b) => worth[b] - worth[a] || Number(s.bankrupt[a]) - Number(s.bankrupt[b]))
  const top = Math.max(1, ...worth)
  useGSAP(
    () => {
      gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.6, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const headline = happy ? 'Kamu taipan dunia!' : `${names[w]} paling tajir`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={happy ? winArt : loseArt}
            alt={happy ? 'Maskot bermahkota di atas tumpukan uang dan hotel' : 'Maskot pink cemberut memeluk celengan kosong'}
            className="-mb-6 h-32 w-auto"
            draggable={false}
          />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">
              {happy ? 'Semua kota bayar sewa ke kamu. Traktiran malam ini jelas dari siapa.' : 'Dompet tipis, tapi gengsi jangan. Revans?'}
            </p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-1.5 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Peringkat kekayaan">
            {ranking.map((i, rank) => (
              <li key={i}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className={cn(i === seat && 'font-bold')}>
                    {rank + 1}. {i === seat ? 'Kamu' : names[i]}
                  </span>
                  <span>{s.bankrupt[i] ? 'bangkrut' : money(worth[i])}</span>
                </div>
                <div className="mt-0.5 h-3 -skew-x-12 border-2 border-ink bg-petal">
                  <div className="h-full" style={{ width: `${(worth[i] / top) * 100}%`, background: PAWN_HEX[i % PAWN_HEX.length] }} />
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
