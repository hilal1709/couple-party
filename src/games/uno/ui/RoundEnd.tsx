import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useRef } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { squiggles } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import winArt from '@/assets/illustrations/win.webp'
import loseArt from '@/assets/illustrations/lose.webp'
import type { Seat } from '../../types'
import type { UnoAction, UnoState } from '../types'

type Props = {
  s: UnoState
  seat: Seat
  names: string[]
  act: (a: UnoAction) => void
  exit: () => void
}

export function RoundEnd({ s, seat, names, act, exit }: Props) {
  const w = s.roundWinner!
  const iWon = w === seat
  const champ = s.gameWinner
  const happy = champ !== null ? champ === seat : iWon
  const box = useRef<HTMLDivElement>(null)
  const pts = useRef<HTMLSpanElement>(null)
  const ranking = s.hands.map((_, i) => i).sort((a, b) => s.scores[b] - s.scores[a])

  useGSAP(
    () => {
      gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, ease: 'back.out(1.7)' })
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
      gsap.from('[data-bar]', { scaleX: 0, transformOrigin: 'left', duration: 0.8, delay: 0.4, stagger: 0.05, ease: 'power3.out' })
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
        ? 'Poinnya dari semua kartu yang tersisa di tangan pemain lain.'
        : 'Kartu yang tersisa di tanganmu jadi poin buat dia.'

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4"
    >
      {happy && <Lottie src={confetti} autoplay loop={champ !== null} className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}

      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        {/* kiri: ilustrasi + hasil ronde */}
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={happy ? winArt : loseArt}
            alt={happy ? 'Maskot bermahkota di atas podium' : 'Maskot pink cemberut'}
            className="-mb-6 h-32 w-auto"
            draggable={false}
          />
          <div data-pop className="relative w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <div
              aria-hidden
              className="absolute -top-3 right-5 h-7 w-20 rotate-6 border-[3px] border-ink bg-rose"
              style={{ backgroundImage: squiggles('#121212', 40, 2.6) }}
            />
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">{tease}</p>
            <div className="mt-2 flex items-end gap-2">
              <span ref={pts} className="font-display text-4xl">
                +{s.roundPoints}
              </span>
              <span className="pb-1 text-[13px] font-semibold">poin untuk {iWon ? 'kamu' : names[w]}</span>
            </div>
          </div>
        </div>

        {/* kanan: papan skor semua pemain */}
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-2 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Papan skor">
            {ranking.map((p, rank) => (
              <li key={p}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className={cn(p === seat && 'font-bold')}>
                    {rank + 1}. {p === seat ? 'Kamu' : names[p]}
                    {s.out[p] && <span className="ml-1 text-ink/60">(tersingkir)</span>}
                  </span>
                  <span>
                    {s.scores[p]} / {s.opts.target}
                  </span>
                </div>
                <div className="mt-0.5 h-3.5 -skew-x-12 border-2 border-ink bg-petal">
                  <div
                    data-bar
                    className={p === seat ? 'h-full bg-rose' : p === w ? 'h-full bg-electric' : 'h-full bg-fern'}
                    style={{ width: `${Math.min(100, (s.scores[p] / s.opts.target) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div data-pop className="flex flex-wrap justify-center gap-3">
            <Slab tone="rose" onClick={() => act({ type: 'nextRound' })}>
              {champ !== null ? 'Main lagi' : `Ronde ${s.round + 1}`}
            </Slab>
            {champ !== null && (
              <Slab tone="paper" onClick={exit}>
                Ke menu
              </Slab>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
