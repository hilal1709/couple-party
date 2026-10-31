import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { defaultOptions } from '../engine'
import { randomLook } from '../look'
import type { LobbyProps } from '../../types'
import type { Look, SportOptions } from '../types'
import { CharacterMaker } from './CharacterMaker'
import { END_INFO, FRAME_INFO, POINT_INFO, ROUND_INFO, SPORT_INFO } from './copy'
import { savedLook, saveLook } from './lookStore'

const FRAMES = [3, 5, 10] as const
const ROUNDS = [1, 3, 5] as const
const SPORTS = ['bowling', 'tinju', 'panahan', 'penalti', 'tenis', 'badminton'] as const
const POINTS = [5, 7, 11] as const
const ENDS = [3, 5] as const

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<SportOptions>) {
  const [opts, setOpts] = useState<SportOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const [making, setMaking] = useState(false)
  const [look] = useState<Look>(() => savedLook() ?? randomLook(Date.now() | 0)[0])
  const n = players ?? opts.players

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Sport Kacau</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n })}>
          {cta}
        </Slab>
      </div>

      <ul className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cabang">
        {SPORTS.map((c) => {
          const on = opts.sport === c
          return (
            <li key={c}>
              <button role="radio" aria-checked={on} onClick={() => setOpts({ ...opts, sport: c })} className={`h-full w-full border-[3px] border-ink px-3 py-1.5 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}>
                <span className="block font-display text-sm uppercase">{SPORT_INFO[c].title}</span>
                <span className="block text-[12px] leading-snug text-ink/80">{SPORT_INFO[c].line}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {opts.sport === 'tenis' || opts.sport === 'badminton' ? (
        <div className="flex gap-1.5" role="radiogroup" aria-label="Poin untuk menang">
          {POINTS.map((v) => (
            <Slab key={v} tone={opts.points === v ? 'electric' : 'paper'} size="sm" role="radio" aria-checked={opts.points === v} onClick={() => setOpts({ ...opts, points: v })}>
              {POINT_INFO[v].title}
              <span className="text-[10px] font-semibold opacity-70">{POINT_INFO[v].line}</span>
            </Slab>
          ))}
        </div>
      ) : opts.sport === 'penalti' ? (
        <p className="text-[13px] font-semibold">Lima tendangan bergantian. Masih seri? Lanjut satu-satu sampai ada yang gagal.</p>
      ) : opts.sport === 'panahan' ? (
        <div className="flex gap-1.5" role="radiogroup" aria-label="Jumlah babak">
          {ENDS.map((e) => (
            <Slab key={e} tone={opts.ends === e ? 'electric' : 'paper'} size="sm" role="radio" aria-checked={opts.ends === e} onClick={() => setOpts({ ...opts, ends: e })}>
              {END_INFO[e].title}
              <span className="text-[10px] font-semibold opacity-70">{END_INFO[e].line}</span>
            </Slab>
          ))}
        </div>
      ) : opts.sport === 'bowling' ? (
        <div className="flex gap-1.5" role="radiogroup" aria-label="Jumlah frame">
          {FRAMES.map((f) => (
            <Slab key={f} tone={opts.frames === f ? 'electric' : 'paper'} size="sm" role="radio" aria-checked={opts.frames === f} onClick={() => setOpts({ ...opts, frames: f })}>
              {FRAME_INFO[f].title}
              <span className="text-[10px] font-semibold opacity-70">{FRAME_INFO[f].line}</span>
            </Slab>
          ))}
        </div>
      ) : (
        <div className="flex gap-1.5" role="radiogroup" aria-label="Jumlah ronde">
          {ROUNDS.map((r) => (
            <Slab key={r} tone={opts.rounds === r ? 'electric' : 'paper'} size="sm" role="radio" aria-checked={opts.rounds === r} onClick={() => setOpts({ ...opts, rounds: r })}>
              {ROUND_INFO[r].title}
              <span className="text-[10px] font-semibold opacity-70">{ROUND_INFO[r].line}</span>
            </Slab>
          ))}
        </div>
      )}

      <p className="text-[13px] font-semibold">Main pakai tombol, atau sandarkan HP lalu gerakkan badan beneran di depan kamera. Tiap pemain bebas pilih sendiri saat main.</p>

      <Slab tone="paper" className="self-start" onClick={() => setMaking(true)}>
        Buat karaktermu
      </Slab>

      {making && (
        <CharacterMaker
          initial={look}
          onDone={(l) => {
            saveLook(l)
            setMaking(false)
          }}
        />
      )}
    </div>
  )
}
