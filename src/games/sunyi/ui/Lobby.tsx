import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { LobbyProps } from '../../types'
import { defaultOptions } from '../engine'
import type { Difficulty, SunyiOptions } from '../types'
import { DIFF_INFO } from './copy'

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<SunyiOptions>) {
  const [opts, setOpts] = useState<SunyiOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const set = (p: Partial<SunyiOptions>) => setOpts({ ...opts, ...p })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Sunyi</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: players ?? opts.players })}>
          {cta}
        </Slab>
      </div>
      <p className="text-sm text-ink/80">
        Horor berdua di kampung kosong. Mic wajib nyala: bisik aman, bicara keras bikin Penunggu datang. Pakai headset biar suaranya nggak bocor.
      </p>
      <div>
        <span className="font-display text-sm uppercase">Tingkat seram</span>
        <ul className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tingkat seram">
          {(Object.keys(DIFF_INFO) as Difficulty[]).map((d) => {
            const on = opts.difficulty === d
            return (
              <li key={d}>
                <button
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ difficulty: d })}
                  className={`h-full w-full border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
                >
                  <span className="block font-display text-sm uppercase">{DIFF_INFO[d].title}</span>
                  <span className="block text-[11px] leading-tight text-ink/80">{DIFF_INFO[d].line}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-sm uppercase">Pusaka</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Jumlah pusaka">
          {([3, 5, 7] as const).map((n) => (
            <Slab key={n} tone={opts.items === n ? 'electric' : 'paper'} active={opts.items === n} size="sm" role="radio" aria-checked={opts.items === n} onClick={() => set({ items: n })}>
              {n}
            </Slab>
          ))}
        </div>
      </div>
    </div>
  )
}
