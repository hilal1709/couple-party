import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import { defaultOptions } from '../engine'
import type { LobbyProps } from '../../types'
import type { BomMode, BomOptions, Speed } from '../types'
import { FEATURE_INFO, MODE_INFO, SPEED_INFO } from './copy'

const SWITCH = 'h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal'
type Feature = keyof typeof FEATURE_INFO

function ToggleCard({ title, line, checked, onChange, tilt }: { title: string; line: string; checked: boolean; onChange: (v: boolean) => void; tilt: number }) {
  return (
    <li className={tilt % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'}>
      <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
        <span className="flex-1">
          <span className="block font-display text-sm uppercase">{title}</span>
          <span className="block text-[12px] leading-snug text-ink/75">{line}</span>
        </span>
        <Switch checked={checked} onCheckedChange={onChange} className={SWITCH} />
      </label>
    </li>
  )
}

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<BomOptions>) {
  const [opts, setOpts] = useState<BomOptions>(() => ({ ...defaultOptions(players ?? 4), ...initial }))
  const n = players ?? opts.players

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Bom Waktu</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n })}>
          {cta}
        </Slab>
      </div>

      <ul className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Mode">
        {(Object.keys(MODE_INFO) as BomMode[]).map((m) => {
          const on = opts.mode === m
          return (
            <li key={m}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => setOpts({ ...opts, mode: m })}
                className={`h-full w-full border-[3px] border-ink px-3 py-1.5 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
              >
                <span className="block font-display text-sm uppercase">{MODE_INFO[m].title}</span>
                <span className="block text-[12px] leading-snug text-ink/80">{MODE_INFO[m].line}</span>
                <span className="mt-0.5 block text-[11px] font-bold text-ink/60">{MODE_INFO[m].example}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm uppercase">Nyawa</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Nyawa">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <Slab key={v} tone={opts.lives === v ? 'electric' : 'paper'} active={opts.lives === v} size="sm" role="radio" aria-checked={opts.lives === v} onClick={() => setOpts({ ...opts, lives: v })}>
                {v}
              </Slab>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm uppercase">Sumbu</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Kecepatan sumbu">
            {(Object.keys(SPEED_INFO) as Speed[]).map((v) => (
              <Slab key={v} tone={opts.speed === v ? 'electric' : 'paper'} active={opts.speed === v} size="sm" role="radio" aria-checked={opts.speed === v} onClick={() => setOpts({ ...opts, speed: v })}>
                {SPEED_INFO[v].title}
                <span className="text-[10px] font-semibold opacity-70">{SPEED_INFO[v].line}</span>
              </Slab>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[13px] font-semibold">
        Bom dioper tiap kali kamu ngetik kata yang cocok. Waktu ledaknya rahasia. Yang pegang bom pas DUAR kehilangan satu nyawa; yang bertahan terakhir menang.
      </p>

      <ul className="grid grid-cols-2 gap-2.5" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
        {(Object.keys(FEATURE_INFO) as Feature[]).map((f, i) => (
          <ToggleCard key={f} tilt={i} title={FEATURE_INFO[f].title} line={FEATURE_INFO[f].line} checked={opts[f]} onChange={(v) => setOpts({ ...opts, [f]: v })} />
        ))}
      </ul>
    </div>
  )
}
