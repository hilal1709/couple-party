import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { LobbyProps } from '../../types'
import { defaultOptions } from '../engine'
import type { JinakOptions, Level } from '../types'
import { LEVEL_INFO, STRIKE_INFO } from './copy'

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<JinakOptions>) {
  const [opts, setOpts] = useState<JinakOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const n = players ?? opts.players

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="rose">Jinak Bom</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="electric" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n })}>
          {cta}
        </Slab>
      </div>

      <p className="text-[13px] font-semibold">
        Satu orang pegang bom 3D, yang lain cuma pegang buku panduan. Penjinak nggak punya panduan, pakar nggak lihat bomnya. Ngobrol lewat telepon atau VC, jelasin apa yang
        kelihatan, lalu jinakkan sebelum waktunya habis. Peran gantian tiap ronde.
      </p>

      <ul className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Tingkat">
        {(Object.keys(LEVEL_INFO) as Level[]).map((l) => {
          const on = opts.level === l
          return (
            <li key={l}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => setOpts({ ...opts, level: l })}
                className={`h-full w-full border-[3px] border-ink px-3 py-1.5 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
              >
                <span className="block font-display text-sm uppercase">{LEVEL_INFO[l].title}</span>
                <span className="block text-[12px] leading-snug text-ink/80">{LEVEL_INFO[l].line}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm uppercase">Nyawa</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Batas salah">
          {([1, 3, 5] as const).map((v) => (
            <Slab key={v} tone={opts.strikes === v ? 'electric' : 'paper'} active={opts.strikes === v} size="sm" role="radio" aria-checked={opts.strikes === v} onClick={() => setOpts({ ...opts, strikes: v })}>
              {STRIKE_INFO[v]}
            </Slab>
          ))}
        </div>
      </div>
    </div>
  )
}
