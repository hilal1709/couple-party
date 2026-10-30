import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { toast } from '@/components/feedback/toast'
import { Switch } from '@/components/ui/switch'
import { CUPS, LEVEL_INFO } from '../data'
import { defaultOptions } from '../engine'
import { TRACKS, TRACK_IDS } from '../tracks'
import type { CupId, KartOptions, Level } from '../types'
import { hasKartUnity, KartUnity } from '../unity'
import type { LobbyProps } from '../../types'

const SWITCH = 'h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal'

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<KartOptions>) {
  const [opts, setOpts] = useState<KartOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const n = players ?? opts.players

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Kart Kacau</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n })}>
          {cta}
        </Slab>
        {/* sementara: uji penyematan Unity, dihapus setelah Fase 2 */}
        {hasKartUnity() && (
          <Slab
            tone="ink"
            size="sm"
            onClick={() =>
              KartUnity.start().then(
                (r) => toast(`Unity balik: ${r.finished ? r.result : 'ditutup'}`),
                (e: Error) => toast(e.message),
              )
            }
          >
            Uji Unity
          </Slab>
        )}
      </div>

      <div>
        <span className="font-display text-sm uppercase">Grand Prix</span>
        <ul className="mt-1 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Piala">
          {(Object.keys(CUPS) as CupId[]).map((c) => {
            const on = opts.course === c
            return (
              <li key={c}>
                <button
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOpts({ ...opts, course: c })}
                  className={`h-full w-full border-[3px] border-ink px-3 py-1.5 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
                >
                  <span className="block font-display text-sm uppercase">{CUPS[c].title}</span>
                  <span className="block text-[12px] leading-snug text-ink/80">{CUPS[c].tracks.map((t) => TRACKS[t].title).join(' → ')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <span className="font-display text-sm uppercase">Atau satu lintasan</span>
        <ul className="mt-1 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Lintasan">
          {TRACK_IDS.map((t) => {
            const on = opts.course === t
            const th = TRACKS[t].theme
            return (
              <li key={t}>
                <button
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOpts({ ...opts, course: t })}
                  className={`flex h-full w-full items-center gap-2 border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
                >
                  <span className="size-5 shrink-0 border-2 border-ink" style={{ background: `linear-gradient(${th.sky[0]}, ${th.ground})` }} />
                  <span className="text-[12px] font-bold leading-tight">{TRACKS[t].title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm uppercase">Putaran</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Putaran">
            {([1, 3, 5] as const).map((v) => (
              <Slab key={v} tone={opts.laps === v ? 'electric' : 'paper'} active={opts.laps === v} size="sm" role="radio" aria-checked={opts.laps === v} onClick={() => setOpts({ ...opts, laps: v })}>
                {v}
              </Slab>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="font-display text-sm uppercase">Bot</span>
          <Switch checked={opts.bots} onCheckedChange={(v) => setOpts({ ...opts, bots: v })} className={SWITCH} />
        </label>
        {opts.bots && (
          <div className="flex gap-1.5" role="radiogroup" aria-label="Tingkat bot">
            {(Object.keys(LEVEL_INFO) as Level[]).map((v) => (
              <Slab key={v} tone={opts.level === v ? 'electric' : 'paper'} active={opts.level === v} size="sm" role="radio" aria-checked={opts.level === v} onClick={() => setOpts({ ...opts, level: v })}>
                {LEVEL_INFO[v].title}
              </Slab>
            ))}
          </div>
        )}
      </div>
      <p className="text-[13px] font-semibold">
        Lintasan raksasa 3+ km per putaran, penuh rintangan. Drift buat isi turbo, ambil kotak "?" buat item jahil. {opts.bots ? 'Kursi kosong diisi bot sampai 8 kart.' : 'Hanya pemain di room.'}
      </p>
    </div>
  )
}
