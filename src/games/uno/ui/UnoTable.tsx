import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon, RotateClockwiseIcon, RotateLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { Slab, Tape } from '@/components/memphis/Slab'
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import burst from '@/assets/lottie/burst.json'
import type { GameProps, Seat } from '../../types'
import { CardBack, CardFace, COLOR_NAME, faceLabel, SUIT_HEX } from '../art/CardArt'
import { activeSeats, canPlay, faceOf, needsSwapTarget, nextSeat, sideColors, topCard } from '../engine'
import type { Card, Color, UnoAction, UnoState } from '../types'
import { isTense, soundsFor } from '../sounds'
import { eventText } from './copy'
import { RoundEnd } from './RoundEnd'

gsap.registerPlugin(useGSAP)

type Props = GameProps<UnoState, UnoAction>

/** Urutan lawan mengikuti kursi setelahku, supaya terasa duduk melingkar. */
function opponentOrder(players: number, seat: Seat): Seat[] {
  return Array.from({ length: players - 1 }, (_, i) => (seat + 1 + i) % players)
}

export function UnoTable({ state: s, seat, names, online, act, exit }: Props) {
  const me = s.hands[seat]
  const top = topCard(s)
  const myTurn = s.turn === seat && s.roundWinner === null
  const p = s.pending
  const [wildFor, setWildFor] = useState<string | null>(null)
  const [swapFor, setSwapFor] = useState<{ cardId: string; color?: Color } | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const opponents = opponentOrder(s.players, seat)

  const root = useRef<HTMLDivElement>(null)
  const handRefs = useRef(new Map<string, HTMLDivElement>())
  const seatRefs = useRef(new Map<Seat, HTMLDivElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const deckRef = useRef<HTMLButtonElement>(null)
  const discardRef = useRef<HTMLDivElement>(null)
  const handBox = useRef<HTMLDivElement>(null)
  const lastEvent = useRef(s.eventId)

  // ---- suara: musik ikut ketegangan meja, efek dari setiap perubahan state ----
  useMusic(isTense(s) ? 'uno-tense' : 'uno')
  const prevState = useRef<UnoState | null>(null)
  useEffect(() => {
    for (const cue of soundsFor(prevState.current, s, seat)) sfx(cue.sfx, cue)
    prevState.current = s
  }, [s, seat])

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
      const from = prevRects.current.get(e.card) ?? seatRefs.current.get(e.by)?.getBoundingClientRect()
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
        { rotateY: 0, duration: 0.45, stagger: 0.01, ease: 'back.out(1.6)' },
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
    else if (needsSwapTarget(s, f)) setSwapFor({ cardId: c.id })
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
  const catchable = s.unoVulnerable !== null && s.unoVulnerable !== seat ? s.unoVulnerable : null
  const stackAmt = p?.kind === 'stack' ? p.amount : 0
  const hot = myTurn || (!!p && 'victim' in p && p.victim === seat)
  const turnName = names[s.turn] ?? '?'

  // label giliran
  let turnLabel = myTurn ? 'Giliranmu' : `Giliran ${turnName}`
  if (s.out[seat]) turnLabel = 'Kamu tersingkir'
  else if (p?.kind === 'challenge') turnLabel = p.victim === seat ? 'Kamu diserang!' : `${names[p.victim]} mikir…`
  else if (p?.kind === 'stack') turnLabel = p.victim === seat ? `Tumpuk atau +${p.amount}` : `${names[p.victim]} kena +${p.amount}`
  else if (p?.kind === 'roulette') turnLabel = p.victim === seat ? 'Pilih warna roulette' : `${names[p.victim]} pilih warna…`
  else if (p?.kind === 'chooseColor') turnLabel = p.by === seat ? 'Pilih warna dulu' : `${names[p.by]} pilih warna…`

  const floor = { backgroundImage: terrazzo(3, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  const next = activeSeats(s).length > 1 ? nextSeat(s, s.turn) : s.turn

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div
        ref={root}
        className="relative mx-auto grid h-full max-w-[1100px] grid-cols-[1fr_minmax(150px,200px)] grid-rows-[auto_1fr_auto] gap-x-3 px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))]"
      >
        {/* ---- baris atas: kembali + lawan ---- */}
        <header className="col-span-2 flex items-start gap-2 pt-[max(6px,env(safe-area-inset-top))]">
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Kembali ke menu"
            className="mt-1 grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
          </button>
          <SoundButton className="mt-1" />
          {confirmExit ? (
            <div className="flex flex-1 items-center gap-2 pt-1" role="alert">
              <span className="text-[13px] font-semibold">Keluar? Game ini hilang untuk semua pemain.</span>
              <Slab tone="ink" size="sm" onClick={exit}>
                Keluar
              </Slab>
              <Slab tone="paper" size="sm" onClick={() => setConfirmExit(false)}>
                Batal
              </Slab>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-start gap-2 overflow-x-auto pb-1" aria-label="Pemain lain">
              {opponents.map((o) => (
                <OpponentSeat
                  key={o}
                  s={s}
                  seatNo={o}
                  name={names[o] ?? '?'}
                  online={online[o] ?? false}
                  isTurn={s.turn === o && s.roundWinner === null}
                  isNext={next === o && s.turn !== o}
                  canCatch={catchable === o}
                  onCatch={() => act({ type: 'catch' })}
                  refFn={(el) => {
                    if (el) seatRefs.current.set(o, el)
                    else seatRefs.current.delete(o)
                  }}
                />
              ))}
            </div>
          )}
        </header>

        {/* ---- meja tengah ---- */}
        <section className="relative flex min-h-0 items-center justify-center gap-6">
          <div
            aria-hidden
            className="absolute h-[78%] max-h-44 w-[min(92%,24rem)] -skew-x-12 border-[3px] border-ink bg-electric shadow-lift"
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
                <CardFace face={faceOf(s.deck[1], 1 - s.side)} width={52} />
              ) : (
                <CardBack width={52} />
              )}
            </span>
            <span className="relative block" data-flippable>
              {s.opts.variant === 'flip' && s.deck[0] ? (
                <CardFace face={faceOf(s.deck[0], 1 - s.side)} width={52} />
              ) : (
                <CardBack width={52} />
              )}
            </span>
            {myTurn && !p && !s.drawn && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-ink bg-paper px-1 font-display text-[10px] uppercase">
                Ambil
              </span>
            )}
          </button>

          {/* tumpukan buang dengan cincin warna aktif */}
          <div className="relative flex flex-col items-center">
            <span
              aria-hidden
              className="absolute -left-2 -right-2 -top-2 bottom-4 rounded-[14px] border-[3px] border-ink"
              style={{
                boxShadow: `inset 0 0 0 6px ${s.color ? SUIT_HEX[s.color] : '#fff4fa'}`,
                backgroundImage: s.color ? undefined : hatch(),
              }}
            />
            <div className="relative">
              {s.discard.slice(-3, -1).map((c, i) => (
                <span key={c.id} className="absolute inset-0" style={{ transform: `rotate(${i === 0 ? -14 : 9}deg)` }}>
                  <CardFace face={faceOf(c, s.side)} width={64} />
                </span>
              ))}
              <div ref={discardRef} data-flippable className="relative">
                <CardFace face={faceOf(top, s.side)} width={64} />
              </div>
              {stackAmt > 0 && (
                <span className="absolute -right-7 -top-5 rotate-12 border-[3px] border-ink bg-ink px-2 py-0.5 font-display text-base text-electric">
                  +{stackAmt}
                </span>
              )}
            </div>
            <span className="relative mt-3 border-2 border-ink bg-paper px-1.5 font-display text-[9px] uppercase">
              Warna {s.color ? COLOR_NAME[s.color] : 'belum dipilih'}
            </span>
          </div>

          {s.players > 2 && (
            <span
              className="relative grid size-10 place-items-center rounded-full border-[3px] border-ink bg-paper shadow-slab-sm"
              title={s.dir === 1 ? 'Arah searah jarum jam' : 'Arah berlawanan jarum jam'}
              aria-label={s.dir === 1 ? 'Arah putaran: searah' : 'Arah putaran: berbalik'}
            >
              <HugeiconsIcon icon={s.dir === 1 ? RotateClockwiseIcon : RotateLeft01Icon} size={20} strokeWidth={2.4} />
            </span>
          )}
        </section>

        {/* ---- panel kanan: giliran, kejadian, aksi ---- */}
        <aside className="row-span-2 flex min-h-0 flex-col items-stretch justify-center gap-2 pb-[max(8px,env(safe-area-inset-bottom))]" aria-live="polite">
          <Tape
            tone={hot ? 'rose' : 'paper'}
            tilt={myTurn ? 'l' : 'r'}
            className="self-center text-center text-lg leading-tight"
            style={hot ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#43b929', '#121212'], 90, 18) }}
          >
            {turnLabel}
          </Tape>
          <p className="min-h-8 text-center text-[13px] font-semibold leading-snug">{eventText(s, seat, names)}</p>

          <div className="flex flex-col items-stretch gap-2">
            {p?.kind === 'challenge' && p.victim === seat && (
              <>
                <Slab tone="rose" size="sm" onClick={() => act({ type: 'challenge' })}>
                  Tantang!
                </Slab>
                <Slab tone="paper" size="sm" onClick={() => act({ type: 'accept' })}>
                  {p.untilColor ? 'Terima' : `Terima +${p.amount}`}
                </Slab>
              </>
            )}
            {p?.kind === 'stack' && p.victim === seat && (
              <Slab tone="paper" size="sm" onClick={() => act({ type: 'accept' })}>
                Ambil +{p.amount}
              </Slab>
            )}
            {myTurn && s.drawn && !s.opts.house.forcePlay && !p && (
              <Slab tone="paper" size="sm" onClick={() => act({ type: 'pass' })}>
                Simpan & lewat
              </Slab>
            )}
            {canUno && (
              <Slab tone="rose" size="md" onClick={() => act({ type: 'uno' })}>
                UNO!
              </Slab>
            )}
            {s.unoArmed[seat] && <span className="text-center font-display text-xs uppercase text-fern">UNO aman</span>}
          </div>
        </aside>

        {/* ---- tanganku ---- */}
        <section
          ref={handBox}
          aria-label="Kartumu"
          className="relative min-w-0 border-[3px] border-b-0 border-ink bg-grass pb-[max(4px,env(safe-area-inset-bottom))] pt-1.5"
          style={{ backgroundImage: squiggles('#12121230', 64, 2.4) }}
        >
          <div className="flex items-center gap-2 px-3">
            <Tape tone="paper" tilt="r" className="text-sm">
              {names[seat]}
            </Tape>
            <span className="text-[13px] font-semibold">
              {me.length} kartu · {s.scores[seat]} poin
            </span>
          </div>
          <Hand cards={me} s={s} seat={seat} onPlay={play} refs={handRefs} />
        </section>
      </div>

      {/* pilih warna */}
      <Drawer open={colorPick} onOpenChange={(o) => !o && wildFor && setWildFor(null)}>
        <DrawerContent className="mx-auto max-w-xl border-[3px] border-b-0 border-ink bg-paper">
          <DrawerTitle className="px-5 pt-2 font-display text-xl uppercase">
            {p?.kind === 'roulette' ? 'Roulette: pilih warna' : 'Pilih warna'}
          </DrawerTitle>
          <DrawerDescription className="px-5 text-sm text-ink/75">
            {p?.kind === 'roulette'
              ? 'Kamu akan ambil kartu terus sampai dapat warna ini.'
              : wildFor
                ? faceLabel(faceOf(me.find((c) => c.id === wildFor) ?? top, s.side))
                : 'Kartu pembuka Wild, kamu yang tentukan.'}
          </DrawerDescription>
          <div className="grid grid-cols-4 gap-3 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
            {sideColors(s).map((c, i) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                className={cn(
                  'h-16 border-[3px] border-ink font-display text-base uppercase shadow-slab transition-transform active:translate-x-[3px] active:translate-y-[4px] active:shadow-slab-sm',
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

      {/* pilih target tukar (kartu 7) */}
      <Drawer open={swapFor !== null} onOpenChange={(o) => !o && setSwapFor(null)}>
        <DrawerContent className="mx-auto max-w-xl border-[3px] border-b-0 border-ink bg-paper">
          <DrawerTitle className="px-5 pt-2 font-display text-xl uppercase">Tukar tangan dengan siapa?</DrawerTitle>
          <DrawerDescription className="px-5 text-sm text-ink/75">Pilih korbanmu. Kartunya jadi milikmu, kartumu jadi miliknya.</DrawerDescription>
          <div className="flex flex-wrap gap-3 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
            {opponents
              .filter((o) => !s.out[o])
              .map((o) => (
                <Slab
                  key={o}
                  tone="grass"
                  size="sm"
                  onClick={() => {
                    act({ type: 'play', cardId: swapFor!.cardId, target: o })
                    setSwapFor(null)
                  }}
                >
                  {names[o]} · {s.hands[o].length}
                </Slab>
              ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ledakan UNO! */}
      {s.event?.t === 'uno' && <UnoBurst key={s.eventId} />}

      {s.roundWinner !== null && <RoundEnd s={s} seat={seat} names={names} act={act} exit={exit} />}
    </div>
  )
}

/** Satu kursi lawan: pita nama, jumlah kartu, kipas mini, penanda giliran. */
function OpponentSeat({
  s,
  seatNo,
  name,
  online,
  isTurn,
  isNext,
  canCatch,
  onCatch,
  refFn,
}: {
  s: UnoState
  seatNo: Seat
  name: string
  online: boolean
  isTurn: boolean
  isNext: boolean
  canCatch: boolean
  onCatch: () => void
  refFn: (el: HTMLDivElement | null) => void
}) {
  const cards = s.hands[seatNo]
  const out = s.out[seatNo]
  const shown = cards.slice(0, 12)
  const step = shown.length <= 1 ? 0 : Math.min(7, 54 / (shown.length - 1))
  return (
    <div
      ref={refFn}
      className={cn(
        'relative mt-2 flex min-w-[96px] shrink-0 flex-col gap-0.5 border-[3px] border-ink px-2 pb-1 pt-1',
        isTurn ? 'bg-rose shadow-slab' : 'bg-paper/90 shadow-slab-sm',
        out && 'opacity-60',
      )}
      style={out ? { backgroundImage: hatch('#121212', 8, 0.3) } : undefined}
      aria-label={`${name}: ${cards.length} kartu${isTurn ? ', sedang giliran' : ''}${out ? ', tersingkir' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('size-2.5 shrink-0 rounded-full border-2 border-ink', online ? 'bg-electric' : 'bg-paper')} />
        <span className="max-w-[9ch] truncate font-display text-[12px] uppercase">{name}</span>
        <span className="ml-auto text-[12px] font-bold">{out ? 'out' : cards.length}</span>
      </div>
      <div className="relative h-[28px]" aria-hidden>
        {shown.map((c, i) => (
          <div key={c.id} data-flippable className="absolute top-0" style={{ left: i * step, transform: `rotate(${(i - shown.length / 2) * 2}deg)` }}>
            {s.opts.variant === 'flip' ? <CardFace face={faceOf(c, 1 - s.side)} width={19} /> : <CardBack width={19} />}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-semibold">{s.scores[seatNo]} poin</span>
      {isNext && (
        <span className="absolute -top-2.5 right-1 rotate-3 border-2 border-ink bg-electric px-1 font-display text-[9px] uppercase">
          berikutnya
        </span>
      )}
      {canCatch && (
        <Slab tone="ink" size="sm" className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap" onClick={onCatch}>
          Tangkap!
        </Slab>
      )}
    </div>
  )
}

const CARD_W = 60
const MIN_STEP = 22

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
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // jarak antar kartu dihitung dari lebar layar; baru bisa digeser kalau terlalu rapat
  const n = cards.length
  const fit = n <= 1 ? CARD_W : (width - CARD_W - 16) / (n - 1)
  const step = Math.max(MIN_STEP, Math.min(CARD_W + 6, fit))
  const scrolls = fit < MIN_STEP
  const spread = scrolls ? 0 : Math.min(2.5, 24 / Math.max(n, 1))
  const mid = (n - 1) / 2
  const live = s.roundWinner === null
  return (
    <div ref={box} className={cn('px-3 pt-2.5', scrolls && 'overflow-x-auto [scrollbar-width:thin]')}>
      <div className="relative mx-auto h-[96px]" style={{ width: Math.max(0, n - 1) * step + CARD_W }}>
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
                  ok ? '-translate-y-2.5 active:-translate-y-1' : 'cursor-default',
                  c.id === s.drawn && '-translate-y-5',
                )}
              >
                <CardFace face={f} width={CARD_W} />
                {ok && <span aria-hidden className="absolute -bottom-2 left-1.5 right-1.5 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
                {!ok && s.turn === seat && !s.pending && (
                  <span aria-hidden className="absolute inset-0 rounded-[8px]" style={{ backgroundImage: hatch('#121212', 7, 0.3) }} />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UnoBurst() {
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="relative size-64">
        <Lottie src={burst} autoplay loop={false} subscriptions={{ complete: () => setDone(true) }} className="absolute inset-0" />
        <span className="absolute inset-0 grid place-items-center font-display text-5xl text-ink">UNO!</span>
      </div>
    </div>
  )
}
