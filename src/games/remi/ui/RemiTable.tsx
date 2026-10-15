import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Tape } from '@/components/memphis/Slab'
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import bomb from '@/assets/lottie/remi-bomb.json'
import bust from '@/assets/lottie/remi-bust.json'
import chips from '@/assets/lottie/remi-chips.json'
import deal from '@/assets/lottie/remi-deal.json'
import joker from '@/assets/lottie/remi-joker.json'
import liar from '@/assets/lottie/remi-liar.json'
import type { GameProps, Seat } from '../../types'
import { cardLabel } from '../cards'
import { MODE_INFO } from '../modes'
import { effectFor, isTense, soundsFor, turnOf, type Effect } from '../sounds'
import type { Card, RemiAction, RemiState } from '../types'
import { CardBack, CardFace } from './CardFace'
import { eventText } from './copy'
import { RoundEnd } from './RoundEnd'
import { viewFor } from './views'
import type { ViewProps } from './views/types'

gsap.registerPlugin(useGSAP)

type Props = GameProps<RemiState, RemiAction>

const ANIMS: Record<Effect['anim'], object> = {
  'remi-bomb': bomb,
  'remi-bust': bust,
  'remi-chips': chips,
  'remi-deal': deal,
  'remi-joker': joker,
  'remi-liar': liar,
}

function opponentOrder(players: number, seat: Seat): Seat[] {
  return Array.from({ length: players - 1 }, (_, i) => (seat + 1 + i) % players)
}

export function RemiTable({ state: s, seat, names, online, act, exit }: Props) {
  const m = s.m
  const V = viewFor(m)
  const chipsMode = MODE_INFO[s.opts.mode].chips
  const [sel, setSel] = useState<string[]>([])
  const [confirmExit, setConfirmExit] = useState(false)
  const [effect, setEffect] = useState<(Effect & { key: number }) | null>(null)
  const n = s.scores.length
  const opponents = opponentOrder(n, seat)
  const turn = turnOf(s)
  const myTurn = turn === seat
  const hand: Card[] = 'hands' in m ? V.sort(m.hands[seat]) : []
  const playable = s.phase === 'play' ? V.playable(m, seat) : []

  // ---- suara & efek dari setiap perubahan state ----
  useMusic(isTense(s) ? 'remi-tense' : 'remi')
  const prev = useRef<RemiState | null>(null)
  useEffect(() => {
    for (const cue of soundsFor(prev.current, s, seat)) sfx(cue.sfx, cue)
    const fx = effectFor(prev.current, s, seat)
    if (fx && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setEffect({ ...fx, key: s.eventId })
    prev.current = s
  }, [s, seat])

  // pilihan kartu yang sudah tidak ada di tangan dibuang
  useEffect(() => {
    setSel((cur) => cur.filter((id) => playable.includes(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.eventId, s.phase])

  // ---- animasi kartu baru masuk tangan ----
  const handRefs = useRef(new Map<string, HTMLDivElement>())
  const known = useRef(new Set<string>())
  const knownSeat = useRef(seat)
  useLayoutEffect(() => {
    const fresh = hand.filter((c) => !known.current.has(c.id))
    const sameSeat = knownSeat.current === seat
    knownSeat.current = seat
    if (sameSeat && known.current.size && fresh.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fresh.forEach((c, i) => {
        const el = handRefs.current.get(c.id)
        if (el) gsap.from(el, { y: -90, rotation: -20, opacity: 0, duration: 0.38, delay: Math.min(i, 10) * 0.04, ease: 'power2.out' })
      })
    }
    known.current = new Set(hand.map((c) => c.id))
  })

  const onCard = (c: Card) => {
    if (!playable.includes(c.id)) return
    if (V.pick === 'tap') V.tap?.(m, c.id, act, seat)
    else if (V.pick === 'select') {
      if (sel.includes(c.id)) setSel(sel.filter((x) => x !== c.id))
      else if (sel.length < (V.maxSelect ?? 1)) setSel([...sel, c.id])
      else setSel([...sel.slice(1), c.id])
    }
  }

  const vp: ViewProps<typeof m> = { s, m, seat, names, act, sel, setSel }
  const label = s.phase === 'play' ? V.status(m, seat, names) : s.phase === 'end' ? 'Game selesai' : 'Ronde selesai'
  const floor = { backgroundImage: terrazzo(5, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  // mode chip: tampilkan chip yang masih di depan pemain (belum termasuk taruhan di meja)
  const scoreText = (x: Seat) => (m.kind === 'poker' || m.kind === 'blackjack' ? `${s.phase === 'play' ? m.stack[x] : s.scores[x]} chip` : `${s.scores[x]} poin`)

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="relative mx-auto grid h-full max-w-[1100px] grid-cols-[1fr_minmax(150px,200px)] grid-rows-[auto_1fr_auto] gap-x-3 px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))]">
        {/* ---- atas: kembali + lawan ---- */}
        <header className="col-span-2 flex items-start gap-2 pt-[max(6px,env(safe-area-inset-top))]">
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Kembali ke menu"
            className="mt-1 grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
          </button>
          <SoundButton className="mt-1" />
          <div className="flex min-w-0 flex-1 items-start gap-2 overflow-x-auto pb-1" aria-label="Pemain lain">
            {opponents.map((o) => {
              const cards = 'hands' in m ? m.hands[o] : []
              const isTurn = turn === o
              return (
                <div
                  key={o}
                  className={cn(
                    'relative mt-1 flex min-w-[104px] shrink-0 flex-col gap-0.5 border-[3px] border-ink px-2 pb-1 pt-1',
                    isTurn ? 'bg-rose shadow-slab' : 'bg-paper/90 shadow-slab-sm',
                  )}
                  aria-label={`${names[o]}: ${cards.length} kartu, ${scoreText(o)}${isTurn ? ', sedang giliran' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn('size-2.5 shrink-0 rounded-full border-2 border-ink', online[o] ? 'bg-electric' : 'bg-paper')} />
                    <span className="max-w-[9ch] truncate font-display text-[12px] uppercase">{names[o] ?? '?'}</span>
                    {s.opts.mode !== 'poker' && s.opts.mode !== 'blackjack' && <span className="ml-auto text-[12px] font-bold">{cards.length}</span>}
                  </div>
                  {s.opts.mode !== 'poker' && s.opts.mode !== 'blackjack' && (
                    <div className="relative h-[24px]" aria-hidden>
                      {cards.slice(0, 12).map((c, i, arr) => (
                        <span key={c.id} className="absolute top-0" style={{ left: i * (arr.length <= 1 ? 0 : Math.min(6, 60 / (arr.length - 1))) }}>
                          <CardBack width={17} />
                        </span>
                      ))}
                    </div>
                  )}
                  {V.SeatInfo && <V.SeatInfo {...vp} who={o} />}
                  <span className="text-[11px] font-semibold">{scoreText(o)}</span>
                </div>
              )
            })}
          </div>
        </header>

        {/* ---- meja tengah ---- */}
        <section className="relative flex min-h-0 items-center justify-center">
          <div
            aria-hidden
            className="absolute h-[86%] max-h-52 w-[min(96%,30rem)] -skew-x-6 border-[3px] border-ink bg-fern shadow-lift"
            style={{ backgroundImage: squiggles('#12121230', 64, 2.4) }}
          />
          <div className="relative">
            <V.Center {...vp} />
          </div>
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="row-span-2 flex min-h-0 flex-col items-stretch justify-center gap-2 pb-[max(8px,env(safe-area-inset-bottom))]" aria-live="polite">
          <Tape
            tone={myTurn ? 'rose' : 'paper'}
            tilt={myTurn ? 'l' : 'r'}
            className="self-center text-center text-base leading-tight"
            style={myTurn ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#43b929', '#121212'], 90, 18) }}
          >
            {label}
          </Tape>
          <p className="min-h-8 text-center text-[12px] font-semibold leading-snug">{eventText(s, seat, names)}</p>
          <span className="text-center font-display text-[10px] uppercase text-ink/70">
            {MODE_INFO[s.opts.mode].title} · {chipsMode ? 'tangan' : 'ronde'} {s.round}/{chipsMode ? s.opts.hands : s.opts.rounds}
          </span>
          {s.phase === 'play' && (
            <div className="flex flex-col items-stretch gap-2">
              <V.Actions {...vp} />
            </div>
          )}
        </aside>

        {/* ---- tanganku ---- */}
        <section
          aria-label="Kartumu"
          className="relative min-w-0 border-[3px] border-b-0 border-ink bg-grass pb-[max(4px,env(safe-area-inset-bottom))] pt-1.5"
          style={{ backgroundImage: squiggles('#12121230', 64, 2.4) }}
        >
          <div className="flex items-center gap-2 px-3">
            <Tape tone="paper" tilt="r" className="text-sm">
              {names[seat]}
            </Tape>
            <span className="truncate text-[12px] font-semibold">
              {hand.length} kartu · {scoreText(seat)}
              {V.me && s.phase === 'play' ? ` · ${V.me(m, seat)}` : ''}
            </span>
          </div>
          <Hand cards={hand} playable={playable} sel={sel} onCard={onCard} refs={handRefs} dimOthers={myTurn && V.pick !== 'none'} empty={m.kind === 'blackjack' && m.step === 'bet' ? 'Pasang taruhan dulu, kartu dibagi setelah semua siap' : 'Tanganmu kosong'} />
        </section>
      </div>

      {effect && <FxOverlay key={effect.key} fx={effect} onDone={() => setEffect(null)} />}

      {s.phase !== 'play' && <RoundEnd s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Game ini berhenti untuk semua pemain dan kartu di tangan hilang."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

const CARD_W = 58
const MIN_STEP = 22

function Hand({
  cards,
  playable,
  sel,
  onCard,
  refs,
  dimOthers,
  empty,
}: {
  empty: string
  cards: Card[]
  playable: string[]
  sel: string[]
  onCard: (c: Card) => void
  refs: React.RefObject<Map<string, HTMLDivElement>>
  dimOthers: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = cards.length
  const fit = n <= 1 ? CARD_W : (width - CARD_W - 16) / (n - 1)
  const step = Math.max(MIN_STEP, Math.min(CARD_W + 6, fit))
  const scrolls = fit < MIN_STEP
  const spread = scrolls ? 0 : Math.min(2.5, 24 / Math.max(n, 1))
  const mid = (n - 1) / 2
  return (
    <div ref={box} className={cn('px-3 pt-2.5', scrolls && 'overflow-x-auto [scrollbar-width:thin]')}>
      <div className="relative mx-auto h-[92px]" style={{ width: Math.max(0, n - 1) * step + CARD_W }}>
        {!n && <span className="absolute inset-x-0 top-6 text-center text-[12px] font-bold">{empty}</span>}
        {cards.map((c, i) => {
          const ok = playable.includes(c.id)
          const picked = sel.includes(c.id)
          return (
            <div
              key={c.id}
              ref={(el) => {
                if (el) refs.current.set(c.id, el)
                else refs.current.delete(c.id)
              }}
              className="absolute top-0"
              style={{ left: i * step, zIndex: i, transform: `translateY(${Math.abs(i - mid) * spread * 0.8}px) rotate(${(i - mid) * spread}deg)`, transformOrigin: '50% 120%' }}
            >
              <button
                onClick={() => onCard(c)}
                aria-disabled={!ok}
                aria-pressed={picked || undefined}
                aria-label={cardLabel(c) + (ok ? '' : ' (belum bisa dimainkan)')}
                className={cn(
                  'relative block transition-transform duration-150 ease-out',
                  ok ? '-translate-y-2 active:-translate-y-1' : 'cursor-default',
                  picked && '-translate-y-6',
                )}
              >
                <CardFace card={c} width={CARD_W} />
                {picked && <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-2 border-ink bg-electric" />}
                {ok && !picked && <span aria-hidden className="absolute -bottom-2 left-1.5 right-1.5 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
                {!ok && dimOthers && <span aria-hidden className="absolute inset-0 rounded-[8px]" style={{ backgroundImage: hatch('#121212', 7, 0.3) }} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FxOverlay({ fx, onDone }: { fx: Effect; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (fx.text) gsap.from('[data-fx-text]', { scale: 2.4, rotation: -14, opacity: 0, duration: 0.3, delay: 0.08, ease: 'back.out(2)' })
  }, { scope: box })
  const small = fx.anim === 'remi-deal'
  return (
    <div ref={box} aria-hidden className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className={cn('relative', small ? 'h-40 w-60' : 'size-72')}>
        <Lottie src={ANIMS[fx.anim]} autoplay loop={false} subscriptions={{ complete: onDone }} className="absolute inset-0" />
        {fx.text && (
          <span data-fx-text className="absolute inset-0 grid -rotate-[10deg] place-items-center font-display text-5xl text-ink [text-shadow:3px_3px_0_#fff4fa]">
            {fx.text}
          </span>
        )}
      </div>
    </div>
  )
}
