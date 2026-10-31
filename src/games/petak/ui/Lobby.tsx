import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { BotLevel, LobbyProps } from '../../types'
import { defaultOptions, MAX_ACTORS } from '../engine'
import { MAP_IDS, MAP_INFO } from '../maps'
import type { PetakOptions } from '../types'
import { LEVEL_TITLE, SIZE_TITLE } from './copy'

function Choice<T extends string | number>({ label, values, value, show, onPick }: { label: string; values: readonly T[]; value: T; show?: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-sm uppercase">{label}</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {values.map((v) => (
          <Slab key={v} tone={value === v ? 'electric' : 'paper'} active={value === v} size="sm" role="radio" aria-checked={value === v} onClick={() => onPick(v)}>
            {show ? show(v) : v}
          </Slab>
        ))}
      </div>
    </div>
  )
}

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<PetakOptions>) {
  const [opts, setOpts] = useState<PetakOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const n = players ?? opts.players
  const low = Math.max(2, n)
  const totals = Array.from({ length: MAX_ACTORS - low + 1 }, (_, i) => low + i)
  const total = Math.max(low, opts.total)
  const set = (p: Partial<PetakOptions>) => setOpts({ ...opts, ...p })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Petak Cat</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n, total })}>
          {cta}
        </Slab>
      </div>
      <p className="text-sm text-ink/80">Cat badanmu mirip tembok, diam, dan berharap pencari cuma numpang lewat.</p>

      <div>
        <span className="font-display text-sm uppercase">Map</span>
        <ul className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Map">
          {(['acak', ...MAP_IDS] as const).map((m) => {
            const on = opts.map === m
            return (
              <li key={m}>
                <button role="radio" aria-checked={on} onClick={() => set({ map: m })} className={`h-full w-full border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}>
                  <span className="block font-display text-sm uppercase">{m === 'acak' ? 'Acak' : MAP_INFO[m].title}</span>
                  <span className="block text-[11px] leading-tight text-ink/80">{m === 'acak' ? 'Map berganti tiap ronde' : MAP_INFO[m].line}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Choice label="Ronde" values={[1, 3, 5] as const} value={opts.rounds} onPick={(rounds) => set({ rounds })} />
        <Choice label="Pencari" values={[1, 2] as const} value={opts.seekers} onPick={(seekers) => set({ seekers })} />
        <Choice label="Sembunyi" values={[60, 90, 120] as const} value={opts.hideSecs} show={(v) => `${v} dtk`} onPick={(hideSecs) => set({ hideSecs })} />
        <Choice label="Berburu" values={[120, 180, 240] as const} value={opts.huntSecs} show={(v) => `${v / 60} mnt`} onPick={(huntSecs) => set({ huntSecs })} />
        <Choice label="Ukuran bunglon" values={['kecil', 'sedang', 'besar'] as const} value={opts.size} show={(v) => SIZE_TITLE[v]} onPick={(size) => set({ size })} />
        <Choice label="Peserta" values={totals} value={total} onPick={(v) => set({ total: v })} />
        {total > n && <Choice label="Bot" values={[1, 2, 3] as const} value={opts.level} show={(v) => LEVEL_TITLE[v as BotLevel]} onPick={(level) => set({ level })} />}
      </div>
    </div>
  )
}
