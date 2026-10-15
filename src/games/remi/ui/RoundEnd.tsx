import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useRef, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { squiggles } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import type { Seat } from '../../types'
import { MODE_INFO } from '../modes'
import type { RemiAction, RemiState } from '../types'
import { sprite } from './art'
import { roundText } from './copy'

type Props = {
  s: RemiState
  seat: Seat
  names: string[]
  act: (a: RemiAction) => void
  exit: () => void
}

const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)

export function RoundEnd({ s, seat, names, act, exit }: Props) {
  const [peek, setPeek] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const champ = s.champions
  const happy = champ ? champ.includes(seat) : s.roundWinners.includes(seat) || s.deltas[seat] > 0
  const { headline, tease } = roundText(s, seat, names)
  const chips = MODE_INFO[s.opts.mode].chips
  const ranking = s.scores.map((_, i) => i).sort((a, b) => s.scores[b] - s.scores[a])
  const lo = Math.min(0, ...s.scores)
  const hi = Math.max(1, ...s.scores)

  useGSAP(
    () => {
      if (peek) return
      gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, ease: 'back.out(1.7)' })
      gsap.from('[data-bar]', { scaleX: 0, transformOrigin: 'left', duration: 0.8, delay: 0.3, stagger: 0.05, ease: 'power3.out' })
    },
    { scope: box, dependencies: [peek] },
  )

  if (peek) {
    return (
      <div className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2">
        <Slab tone="rose" size="sm" onClick={() => setPeek(false)}>
          Lihat hasil
        </Slab>
      </div>
    )
  }

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/70 px-5 py-4">
      {happy && <Lottie src={confetti} autoplay loop={!!champ} className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}

      <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={sprite(happy ? 'remi-win' : 'remi-lose')}
            alt={happy ? 'Maskot bermahkota di atas podium bersama tumpukan chip' : 'Maskot hijau cemberut di samping kartu berserakan'}
            className="-mb-5 h-32 w-auto"
            draggable={false}
          />
          <div data-pop className="relative w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <div aria-hidden className="absolute -top-3 right-5 h-7 w-20 rotate-6 border-[3px] border-ink bg-rose" style={{ backgroundImage: squiggles('#121212', 40, 2.6) }} />
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">{tease}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-4xl">{signed(s.deltas[seat])}</span>
              <span className="pb-1 text-[13px] font-semibold">{chips ? 'chip' : 'poin'} buat kamu ronde ini</span>
            </div>
          </div>
        </div>

        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-2 border-[3px] border-ink bg-paper p-3 shadow-slab" aria-label="Papan skor">
            {ranking.map((p, rank) => (
              <li key={p}>
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className={cn(p === seat && 'font-bold')}>
                    {rank + 1}. {p === seat ? 'Kamu' : names[p]}
                  </span>
                  <span>
                    {s.scores[p]} <span className="text-ink/60">({signed(s.deltas[p])})</span>
                  </span>
                </div>
                <div className="mt-0.5 h-3.5 -skew-x-12 border-2 border-ink bg-petal">
                  <div
                    data-bar
                    className={p === seat ? 'h-full bg-rose' : s.roundWinners.includes(p) ? 'h-full bg-electric' : 'h-full bg-fern'}
                    style={{ width: `${Math.max(3, ((s.scores[p] - lo) / (hi - lo || 1)) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div data-pop className="flex flex-wrap justify-center gap-3">
            {champ ? (
              <>
                <Slab tone="rose" onClick={() => act({ t: 'again' })}>
                  Main lagi
                </Slab>
                <Slab tone="paper" onClick={exit}>
                  Ke menu
                </Slab>
              </>
            ) : (
              <Slab tone="rose" onClick={() => act({ t: 'next' })}>
                {chips ? `Tangan ${s.round + 1}` : `Ronde ${s.round + 1}`}
              </Slab>
            )}
            <Slab tone="paper" size="sm" onClick={() => setPeek(true)}>
              Lihat meja
            </Slab>
          </div>
        </div>
      </div>
    </div>
  )
}
