import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useRef } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { squiggles } from '@/components/memphis/patterns'
import confetti from '@/assets/lottie/confetti.json'
import winArt from '@/assets/illustrations/win.webp'
import loseArt from '@/assets/illustrations/lose.webp'
import type { Seat } from '../../types'
import { CardFace } from '../art/CardArt'
import { faceOf, other } from '../engine'
import type { UnoAction, UnoState } from '../types'

type Props = {
  s: UnoState
  seat: Seat
  names: [string, string]
  act: (a: UnoAction) => void
  exit: () => void
}

export function RoundEnd({ s, seat, names, act, exit }: Props) {
  const w = s.roundWinner!
  const iWon = w === seat
  const champ = s.gameWinner
  const loserHand = s.hands[other(w)]
  const box = useRef<HTMLDivElement>(null)
  const pts = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      gsap.from('[data-pop]', { y: 40, rotation: -6, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.7)' })
      const counter = { v: 0 }
      gsap.to(counter, {
        v: s.roundPoints,
        duration: 0.9,
        delay: 0.3,
        ease: 'power2.out',
        onUpdate: () => {
          if (pts.current) pts.current.textContent = `+${Math.round(counter.v)}`
        },
      })
      gsap.from('[data-bar]', { scaleX: 0, transformOrigin: 'left', duration: 0.8, delay: 0.4, ease: 'power3.out' })
    },
    { scope: box },
  )

  const headline =
    champ !== null
      ? champ === seat
        ? 'Juara! Kamu menang game'
        : `${names[champ]} juara game ini`
      : iWon
        ? 'Kamu menang ronde!'
        : `${names[w]} menang ronde`

  const tease =
    champ !== null
      ? champ === seat
        ? 'Saatnya minta traktiran.'
        : 'Kalah telak. Siapin traktiran ya.'
      : iWon
        ? 'Poin dari kartu yang tersisa di tangan lawan.'
        : 'Kartumu yang tersisa jadi poin buat dia.'

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-ink/70 px-5 py-8"
    >
      {iWon && (
        <Lottie src={confetti} autoplay loop={champ !== null} className="pointer-events-none fixed inset-0 z-40 h-full w-full" />
      )}
      <img
        data-pop
        src={iWon || champ === seat ? winArt : loseArt}
        alt={iWon || champ === seat ? 'Maskot bermahkota di atas podium' : 'Maskot pink cemberut'}
        className="-mb-10 h-40 w-auto"
        draggable={false}
      />
      <div data-pop className="relative w-full max-w-sm border-[3px] border-ink bg-paper p-5 shadow-lift">
        <div
          aria-hidden
          className="absolute -top-4 right-6 h-8 w-24 rotate-6 border-[3px] border-ink bg-rose"
          style={{ backgroundImage: squiggles('#121212', 40, 2.6) }}
        />
        <Tape tone={iWon || champ === seat ? 'electric' : 'rose'} className="text-2xl leading-tight">
          {headline}
        </Tape>
        <p className="mt-3 text-sm font-medium text-ink/80">{tease}</p>

        <div className="mt-4 flex items-end gap-3">
          <span ref={pts} className="font-display text-5xl">
            +{s.roundPoints}
          </span>
          <span className="pb-1 text-sm font-semibold">poin untuk {iWon ? 'kamu' : names[w]}</span>
        </div>

        {loserHand.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" aria-label="Kartu yang dihitung">
            {loserHand.slice(0, 18).map((c) => (
              <CardFace key={c.id} face={faceOf(c, s.side)} width={30} />
            ))}
            {loserHand.length > 18 && <span className="self-center text-xs font-semibold">+{loserHand.length - 18}</span>}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {([seat, other(seat)] as Seat[]).map((p) => (
            <div key={p}>
              <div className="flex justify-between text-sm font-semibold">
                <span>{p === seat ? 'Kamu' : names[p]}</span>
                <span>
                  {s.scores[p]} / {s.opts.target}
                </span>
              </div>
              <div className="mt-1 h-5 -skew-x-12 border-[3px] border-ink bg-petal">
                <div
                  data-bar
                  className={p === seat ? 'h-full bg-rose' : 'h-full bg-fern'}
                  style={{ width: `${Math.min(100, (s.scores[p] / s.opts.target) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-pop className="flex flex-wrap justify-center gap-4">
        <Slab tone="rose" size="lg" onClick={() => act({ type: 'nextRound' })}>
          {champ !== null ? 'Main lagi' : `Ronde ${s.round + 1}`}
        </Slab>
        {champ !== null && (
          <Slab tone="paper" onClick={exit}>
            Ganti varian
          </Slab>
        )}
      </div>
    </div>
  )
}
