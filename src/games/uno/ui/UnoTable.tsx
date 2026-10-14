import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import burst from '@/assets/lottie/burst.json'
import type { GameProps, Seat } from '../../types'
import { CardBack, CardFace, COLOR_NAME, faceLabel, SUIT_HEX } from '../art/CardArt'
import { canPlay, faceOf, other, sideColors, topCard } from '../engine'
import type { Card, Color, UnoAction, UnoState } from '../types'
import { eventText } from './copy'
import { RoundEnd } from './RoundEnd'

gsap.registerPlugin(useGSAP)

type Props = GameProps<UnoState, UnoAction>

export function UnoTable({ state: s, seat, names, partnerOnline, act, exit }: Props) {
  const opp = other(seat)
  const me = s.hands[seat]
  const theirs = s.hands[opp]
  const top = topCard(s)
  const myTurn = s.turn === seat && s.roundWinner === null
  const p = s.pending
  const [wildFor, setWildFor] = useState<string | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)

  const root = useRef<HTMLDivElement>(null)
  const handRefs = useRef(new Map<string, HTMLDivElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const deckRef = useRef<HTMLButtonElement>(null)
  const discardRef = useRef<HTMLDivElement>(null)
  const oppRef = useRef<HTMLDivElement>(null)
  const handBox = useRef<HTMLDivElement>(null)
  const lastEvent = useRef(s.eventId)

  const snapshot = () => {
    const m = new Map<string, DOMRect>()
    handRefs.current.forEach((el, id) => m.set(id, el.getBoundingClientRect()))
    prevRects.current = m
  }

  // ---- animasi berbasis event (FLIP manual) ----
  useLayoutEffect(() => {
    const e = s.event
    if (s.eventId === lastEvent.current) {
      snapshot()
      return
    }
    lastEvent.current = s.eventId
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!e || reduce) {
      snapshot()
      return
    }
    const discardEl = discardRef.current
    if (e.t === 'play' && discardEl) {
      const from = prevRects.current.get(e.card) ?? oppRef.current?.getBoundingClientRect()
      const to = discardEl.getBoundingClientRect()
      if (from) {
        gsap.from(discardEl, {
          x: from.left + from.width / 2 - (to.left + to.width / 2),
          y: from.top + from.height / 2 - (to.top + to.height / 2),
          rotation: e.by === seat ? -18 : 18,
          scale: 0.8,
          duration: 0.38,
          ease: 'power3.out',
        })
      }
    }
    // kartu baru di tanganku terbang dari deck
    const deck = deckRef.current?.getBoundingClientRect()
    if (deck) {
      const fresh = me.filter((c) => !prevRects.current.has(c.id)).map((c) => handRefs.current.get(c.id))
      fresh.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        gsap.from(el, {
          x: deck.left - r.left,
          y: deck.top - r.top,
          rotation: -25,
          duration: 0.42,
          delay: Math.min(i, 12) * 0.05,
          ease: 'power2.out',
        })
      })
    }
    if (e.t === 'flip' && root.current) {
      gsap.fromTo(
        root.current.querySelectorAll('[data-flippable]'),
        { rotateY: 90 },
        { rotateY: 0, duration: 0.45, stagger: 0.015, ease: 'back.out(1.6)' },
      )
    }
    if (e.t === 'caught' && e.by === seat && handBox.current) {
      gsap.fromTo(handBox.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)' })
    }
    snapshot()
  })

  const play = (c: Card) => {
    const f = faceOf(c, s.side)
    if (f.color === null && f.kind !== 'roulette') setWildFor(c.id)
    else act({ type: 'play', cardId: c.id })
  }

  const colorPick =
    wildFor !== null || (p?.kind === 'chooseColor' && p.by === seat) || (p?.kind === 'roulette' && p.victim === seat)

  const pickColor = (color: Color) => {
    if (wildFor) act({ type: 'play', cardId: wildFor, color })
    else act({ type: 'pickColor', color })
    setWildFor(null)
  }

  const canUno = s.roundWinner === null && ((myTurn && me.length === 2 && !s.unoArmed[seat]) || s.unoVulnerable === seat)
  const canCatch = s.unoVulnerable === opp
  const stackAmt = p?.kind === 'stack' ? p.amount : 0
  const hot = myTurn || (!!p && 'victim' in p && p.victim === seat)

  // label giliran
  let turnLabel = myTurn ? 'Giliranmu' : `Giliran ${names[opp]}`
  if (p?.kind === 'challenge') turnLabel = p.victim === seat ? 'Kamu diserang!' : `Nunggu ${names[opp]}…`
  if (p?.kind === 'stack') turnLabel = p.victim === seat ? `Tumpuk atau +${p.amount}` : `${names[opp]} kena +${p.amount}`
  if (p?.kind === 'roulette') turnLabel = p.victim === seat ? 'Pilih warna roulette' : `${names[opp]} pilih warna…`
  if (p?.kind === 'chooseColor') turnLabel = p.by === seat ? 'Pilih warna dulu' : `${names[opp]} pilih warna…`

  const floor = { backgroundImage: terrazzo(3, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
    <div ref={root} className="relative mx-auto flex h-full max-w-[560px] flex-col">
      {/* bar atas */}
      <header className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          onClick={() => setConfirmExit(true)}
          aria-label="Kembali ke lobby"
          className="grid size-10 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.4} />
        </button>
        {confirmExit ? (
          <div className="flex flex-1 items-center justify-end gap-2" role="alert">
            <span className="text-[13px] font-semibold leading-tight">Keluar? Game ini hilang.</span>
            <Slab tone="ink" size="sm" onClick={exit}>
              Keluar
            </Slab>
            <Slab tone="paper" size="sm" onClick={() => setConfirmExit(false)}>
              Batal
            </Slab>
          </div>
        ) : (
          <>
            <div className="flex-1" />
            <span className="font-display text-xs uppercase tracking-wide">
              Ronde {s.round} · target {s.opts.target}
            </span>
          </>
        )}
      </header>

      {/* lawan */}
      <section ref={oppRef} className="px-4 pt-2" aria-label={`Tangan ${names[opp]}`}>
        <div className="flex items-center gap-2">
          <Tape tone="grass" className="text-lg">
            {names[opp]}
          </Tape>
          <span className={cn('size-3 rounded-full border-2 border-ink', partnerOnline ? 'bg-electric' : 'bg-paper')} />
          <span className="text-sm font-semibold">
            {theirs.length} kartu · {s.scores[opp]} poin
          </span>
          {canCatch && (
            <Slab tone="ink" size="sm" className="ml-auto" onClick={() => act({ type: 'catch' })}>
              Tangkap!
            </Slab>
          )}
        </div>
        <OppFan cards={theirs} s={s} />
      </section>

      {/* meja tengah */}
      <section className="relative flex flex-1 items-center justify-center gap-7">
        {/* podium */}
        <div
          aria-hidden
          className="absolute h-56 w-[19.5rem] -skew-x-12 border-[3px] border-ink bg-electric shadow-lift"
          style={{ backgroundImage: squiggles('#12121238', 64, 2.4) }}
        />
        <button
          ref={deckRef}
          aria-label={myTurn && !p && !s.drawn ? 'Ambil kartu' : 'Tumpukan ambil'}
          disabled={!myTurn || !!p || !!s.drawn}
          onClick={() => act({ type: 'draw' })}
          className="relative transition-transform active:scale-95 disabled:cursor-default"
        >
          <span className="absolute left-1.5 top-1.5" data-flippable>
            {s.opts.variant === 'flip' && s.deck[1] ? (
              <CardFace face={faceOf(s.deck[1], 1 - s.side)} width={68} />
            ) : (
              <CardBack width={68} />
            )}
          </span>
          <span className="relative block" data-flippable>
            {s.opts.variant === 'flip' && s.deck[0] ? (
              <CardFace face={faceOf(s.deck[0], 1 - s.side)} width={68} />
            ) : (
              <CardBack width={68} />
            )}
          </span>
          {myTurn && !p && !s.drawn && (
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-xs uppercase">
              Ambil
            </span>
          )}
        </button>

        {/* tumpukan buang dengan cincin warna aktif */}
        <div className="relative flex flex-col items-center">
          <span
            aria-hidden
            className="absolute -left-3 -right-3 -top-3 bottom-6 rounded-[20px] border-[3px] border-ink"
            style={{
              boxShadow: `inset 0 0 0 8px ${s.color ? SUIT_HEX[s.color] : '#fff4fa'}`,
              backgroundImage: s.color ? undefined : hatch(),
            }}
          />
          <div className="relative">
            {s.discard.slice(-3, -1).map((c, i) => (
              <span key={c.id} className="absolute inset-0" style={{ transform: `rotate(${i === 0 ? -14 : 9}deg)` }}>
                <CardFace face={faceOf(c, s.side)} width={104} />
              </span>
            ))}
            <div ref={discardRef} data-flippable className="relative">
              <CardFace face={faceOf(top, s.side)} width={104} />
            </div>
            {stackAmt > 0 && (
              <span className="absolute -right-7 -top-6 rotate-12 border-[3px] border-ink bg-ink px-2 py-1 font-display text-lg text-electric">
                +{stackAmt}
              </span>
            )}
          </div>
          <span className="relative mt-5 border-2 border-ink bg-paper px-1.5 font-display text-[11px] uppercase">
            Warna {s.color ? COLOR_NAME[s.color] : 'belum dipilih'}
          </span>
        </div>
      </section>

      {/* pita giliran + kejadian */}
      <section className="flex flex-col items-center gap-1.5 px-4 pb-1" aria-live="polite">
        <Tape
          tone={hot ? 'rose' : 'paper'}
          tilt={myTurn ? 'l' : 'r'}
          className="text-2xl"
          style={hot ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#43b929', '#121212'], 90, 18) }}
        >
          {turnLabel}
        </Tape>
        <p className="min-h-5 text-center text-sm font-semibold">{eventText(s, seat, names)}</p>
      </section>

      {/* aksi */}
      <section className="flex min-h-12 flex-wrap items-center justify-center gap-3 px-4 pb-1">
        {p?.kind === 'challenge' && p.victim === seat && (
          <>
            <Slab tone="rose" onClick={() => act({ type: 'challenge' })}>
              Tantang!
            </Slab>
            <Slab tone="paper" onClick={() => act({ type: 'accept' })}>
              {p.untilColor ? 'Terima' : `Terima +${p.amount}`}
            </Slab>
          </>
        )}
        {p?.kind === 'stack' && p.victim === seat && (
          <Slab tone="paper" onClick={() => act({ type: 'accept' })}>
            Ambil +{p.amount}
          </Slab>
        )}
        {myTurn && s.drawn && !s.opts.house.forcePlay && !p && (
          <Slab tone="paper" onClick={() => act({ type: 'pass' })}>
            Simpan & lewat
          </Slab>
        )}
        {canUno && (
          <Slab tone="rose" size="lg" onClick={() => act({ type: 'uno' })}>
            UNO!
          </Slab>
        )}
        {s.unoArmed[seat] && <span className="font-display text-sm uppercase text-fern">UNO aman</span>}
      </section>

      {/* tanganku */}
      <section
        ref={handBox}
        aria-label="Kartumu"
        className="relative border-[3px] border-b-0 border-ink bg-grass pb-[max(10px,env(safe-area-inset-bottom))] pt-3"
        style={{ backgroundImage: squiggles('#12121230', 64, 2.4) }}
      >
        <div className="flex items-center gap-2 px-4 pb-1">
          <Tape tone="paper" tilt="r" className="text-base">
            {names[seat]}
          </Tape>
          <span className="text-sm font-semibold">
            {me.length} kartu · {s.scores[seat]} poin
          </span>
        </div>
        <Hand
          cards={me}
          s={s}
          seat={seat}
          onPlay={play}
          refs={handRefs}
        />
      </section>

      {/* pilih warna */}
      <Drawer open={colorPick} onOpenChange={(o) => !o && wildFor && setWildFor(null)}>
        <DrawerContent className="border-[3px] border-b-0 border-ink bg-paper">
          <DrawerTitle className="px-5 pt-2 font-display text-2xl uppercase">
            {p?.kind === 'roulette' ? 'Roulette: pilih warna' : 'Pilih warna'}
          </DrawerTitle>
          <DrawerDescription className="px-5 text-sm text-ink/75">
            {p?.kind === 'roulette'
              ? 'Kamu akan ambil kartu terus sampai dapat warna ini.'
              : wildFor
                ? faceLabel(faceOf(me.find((c) => c.id === wildFor) ?? top, s.side))
                : 'Kartu pembuka Wild, kamu yang tentukan.'}
          </DrawerDescription>
          <div className="grid grid-cols-2 gap-4 p-5 pb-[max(24px,env(safe-area-inset-bottom))]">
            {sideColors(s).map((c, i) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                className={cn(
                  'h-20 border-[3px] border-ink font-display text-lg uppercase shadow-slab transition-transform active:translate-x-[3px] active:translate-y-[4px] active:shadow-slab-sm',
                  i % 2 ? 'skew-x-6' : '-skew-x-6',
                )}
                style={{ background: SUIT_HEX[c] }}
              >
                {COLOR_NAME[c]}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ledakan UNO! */}
      {s.event?.t === 'uno' && <UnoBurst key={s.eventId} />}

      {s.roundWinner !== null && <RoundEnd s={s} seat={seat} names={names} act={act} exit={exit} />}
    </div>
    </div>
  )
}

function Hand({
  cards,
  s,
  seat,
  onPlay,
  refs,
}: {
  cards: Card[]
  s: UnoState
  seat: Seat
  onPlay: (c: Card) => void
  refs: React.RefObject<Map<string, HTMLDivElement>>
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // jarak antar kartu dihitung dari lebar layar; baru bisa digeser kalau terlalu rapat (± >12 kartu)
  const n = cards.length
  const fit = n <= 1 ? CARD_W : (width - CARD_W - 16) / (n - 1)
  const step = Math.max(MIN_STEP, Math.min(CARD_W + 6, fit))
  const scrolls = fit < MIN_STEP
  const spread = scrolls ? 0 : Math.min(3, 24 / Math.max(n, 1))
  const mid = (n - 1) / 2
  const live = s.roundWinner === null
  return (
    <div ref={box} className={cn('px-4 pb-1 pt-4', scrolls && 'overflow-x-auto [scrollbar-width:thin]')}>
      <div className="relative mx-auto h-[150px]" style={{ width: Math.max(0, n - 1) * step + CARD_W }}>
      {cards.map((c, i) => {
        const ok = live && canPlay(s, c, seat)
        const f = faceOf(c, s.side)
        return (
          <div
            key={c.id}
            ref={(el) => {
              if (el) refs.current.set(c.id, el)
              else refs.current.delete(c.id)
            }}
            data-flippable
            className="absolute top-0"
            style={{
              left: i * step,
              zIndex: i,
              transform: `translateY(${Math.abs(i - mid) * spread * 0.8}px) rotate(${(i - mid) * spread}deg)`,
              transformOrigin: '50% 120%',
            }}
          >
            <button
              onClick={ok ? () => onPlay(c) : undefined}
              aria-disabled={!ok}
              aria-label={faceLabel(f) + (ok ? '' : ' (tidak bisa dimainkan)')}
              className={cn(
                'relative block transition-transform duration-150 ease-out',
                ok ? '-translate-y-3 active:-translate-y-1' : 'cursor-default',
                c.id === s.drawn && '-translate-y-6',
              )}
            >
              <CardFace face={f} width={CARD_W} />
              {ok && <span aria-hidden className="absolute -bottom-2.5 left-2 right-2 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
              {!ok && s.turn === seat && !s.pending && (
                <span aria-hidden className="absolute inset-0 rounded-[10px]" style={{ backgroundImage: hatch('#121212', 7, 0.3) }} />
              )}
            </button>
          </div>
        )
      })}
      </div>
    </div>
  )
}

const CARD_W = 84
const MIN_STEP = 24

/** Kipas kartu lawan: melengkung, kartunya cukup besar supaya cap di punggung kartu terbaca. */
function OppFan({ cards, s }: { cards: Card[]; s: UnoState }) {
  const shown = cards.slice(0, 26)
  const n = shown.length
  const step = n <= 1 ? 0 : Math.min(30, 250 / (n - 1))
  const mid = (n - 1) / 2
  return (
    <div className="relative flex h-[84px] justify-center" aria-hidden>
      <span
        className="absolute -top-7 right-2 h-3 w-24"
        style={{ backgroundImage: squiggles('#ff37a6', 28, 3), backgroundSize: '28px 28px' }}
      />
      <div className="relative" style={{ width: Math.max(0, n - 1) * step + 52 }}>
        {shown.map((c, i) => (
          <div
            key={c.id}
            data-flippable
            className="absolute top-2"
            style={{
              left: i * step,
              transform: `translateY(${Math.abs(i - mid) * 1.4}px) rotate(${(i - mid) * 3}deg)`,
              transformOrigin: '50% -60%',
            }}
          >
            {s.opts.variant === 'flip' ? <CardFace face={faceOf(c, 1 - s.side)} width={52} /> : <CardBack width={52} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function UnoBurst() {
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="relative size-80">
        <Lottie src={burst} autoplay loop={false} subscriptions={{ complete: () => setDone(true) }} className="absolute inset-0" />
        <span className="absolute inset-0 grid place-items-center font-display text-6xl text-ink">UNO!</span>
      </div>
    </div>
  )
}
