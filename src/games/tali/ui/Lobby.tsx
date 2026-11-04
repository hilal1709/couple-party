import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { LobbyProps } from '../../types'
import { defaultOptions } from '../engine'
import { LEVELS } from '../levels'
import type { TaliOptions } from '../types'
import { savedStars } from './copy'

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<TaliOptions>) {
  const [opts, setOpts] = useState<TaliOptions>(() => ({ ...defaultOptions(), ...initial, ...(players !== undefined ? { bot: players < 2 } : {}) }))
  const stars = savedStars()
  const set = (p: Partial<TaliOptions>) => setOpts({ ...opts, ...p })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Tali Jodoh</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" disabled={players !== undefined && players > 2} onClick={() => onSubmit(opts)}>
          {cta}
        </Slab>
      </div>
      <p className="text-sm text-ink/80">Onde dan Klepon terikat satu tali. Lompat, gelantungan, tarik pasanganmu, dan jangan saling tinggal. Harus berdua!</p>
      {players !== undefined && players > 2 && <p className="text-sm font-bold text-rose">Game ini untuk 2 pemain, atau main sendiri bareng bot.</p>}
      <div className="flex items-center gap-2">
        <span className="font-display text-sm uppercase">Pasangan</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Pasangan">
          <Slab tone={!opts.bot ? 'electric' : 'paper'} active={!opts.bot} size="sm" role="radio" aria-checked={!opts.bot} disabled={players === 1} onClick={() => set({ bot: false })}>
            Berdua (2 HP)
          </Slab>
          <Slab tone={opts.bot ? 'electric' : 'paper'} active={opts.bot} size="sm" role="radio" aria-checked={opts.bot} disabled={players === 2} onClick={() => set({ bot: true })}>
            Sendiri + bot Klepon
          </Slab>
        </div>
      </div>
      {opts.bot && <p className="text-xs text-ink/70">Kamu jadi Onde. Klepon dijalankan bot: dia menunggumu, ikut melompat, dan bilang apa yang perlu kamu lakukan.</p>}
      <div>
        <span className="font-display text-sm uppercase">Mulai dari level</span>
        <ul className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Level">
          {LEVELS.map((l, i) => {
            const on = opts.start === i
            return (
              <li key={l.id}>
                <button role="radio" aria-checked={on} onClick={() => set({ start: i })} className={`h-full w-full border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}>
                  <span className="block font-display text-sm uppercase">
                    {i + 1}. {l.title}
                  </span>
                  <span className="block text-[11px] leading-tight text-ink/80">{l.line}</span>
                  <span className="block text-xs tracking-widest" aria-label={`${stars[i]} bintang`}>
                    {'★'.repeat(stars[i])}
                    <span className="text-ink/25">{'★'.repeat(3 - stars[i])}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-sm uppercase">Setelah selesai</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Setelah selesai">
          <Slab tone={opts.run ? 'electric' : 'paper'} active={opts.run} size="sm" role="radio" aria-checked={opts.run} onClick={() => set({ run: true })}>
            Lanjut level berikutnya
          </Slab>
          <Slab tone={!opts.run ? 'electric' : 'paper'} active={!opts.run} size="sm" role="radio" aria-checked={!opts.run} onClick={() => set({ run: false })}>
            Satu level saja
          </Slab>
        </div>
      </div>
    </div>
  )
}
