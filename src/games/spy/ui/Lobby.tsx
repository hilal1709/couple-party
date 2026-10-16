import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import { MR_WHITE_MIN, defaultOptions } from '../engine'
import type { LobbyProps } from '../../types'
import type { Pack, SpyMode, SpyOptions } from '../types'
import { parseCustom } from '../words'
import { MODE_INFO, MR_WHITE_INFO, PACK_INFO, POINT_RULES, castLine } from './copy'

const SWITCH = 'h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal'

function Radio<T extends number>({ label, value, options, unit, onPick }: { label: string; value: T; options: readonly T[]; unit: string; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-sm uppercase">{label}</span>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {options.map((n) => (
          <Slab key={n} tone={value === n ? 'electric' : 'paper'} active={value === n} size="sm" role="radio" aria-checked={value === n} onClick={() => onPick(n)}>
            {n}
            {unit}
          </Slab>
        ))}
      </div>
    </div>
  )
}

function ToggleCard({ title, line, checked, disabled, onChange, tilt }: { title: string; line: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; tilt: number }) {
  return (
    <li className={tilt % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'}>
      <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
        <span className="flex-1">
          <span className="block font-display text-sm uppercase">{title}</span>
          <span className="block text-[12px] leading-snug text-ink/75">{line}</span>
        </span>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} className={SWITCH} />
      </label>
    </li>
  )
}

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<SpyOptions>) {
  const [opts, setOpts] = useState<SpyOptions>(() => ({ ...defaultOptions(players ?? 4), ...initial }))
  const [customText, setCustomText] = useState(() => (initial?.custom ?? []).map((p) => p.join(' / ')).join('\n'))
  const custom = parseCustom(customText)
  const n = players ?? opts.players
  const kata = opts.mode === 'kata'
  const enough = !kata || opts.packs.length > 0 || custom.length >= 3
  const mwOk = players === undefined || players >= MR_WHITE_MIN

  const togglePack = (p: Pack, on: boolean) =>
    setOpts({ ...opts, packs: on ? [...opts.packs, p].filter((x, i, a) => a.indexOf(x) === i) : opts.packs.filter((x) => x !== p) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Siapa Mata-mata</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" disabled={!enough} onClick={() => onSubmit({ ...opts, custom, players: n })}>
          {cta}
        </Slab>
      </div>

      <ul className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Mode">
        {(Object.keys(MODE_INFO) as SpyMode[]).map((m) => {
          const on = opts.mode === m
          return (
            <li key={m}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => setOpts({ ...opts, mode: m })}
                className={`h-full w-full border-[3px] border-ink px-3 py-2 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}
              >
                <span className="block font-display text-sm uppercase">{MODE_INFO[m].title}</span>
                <span className="block text-[12px] leading-snug text-ink/80">{MODE_INFO[m].line}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Radio label="Ronde" value={opts.rounds} options={[3, 5, 7] as const} unit="x" onPick={(rounds) => setOpts({ ...opts, rounds })} />
        <Radio label="Petunjuk" value={opts.seconds} options={[30, 45, 60] as const} unit="s" onPick={(seconds) => setOpts({ ...opts, seconds })} />
      </div>
      <p className="text-[13px] font-semibold">
        Gantian ketik satu petunjuk, lalu voting siapa yang mencurigakan. {players !== undefined && `Susunan: ${castLine({ ...opts, players })}.`}
      </p>

      {kata && (
        <>
          <ul className="grid grid-cols-2 gap-3" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
            {(Object.keys(PACK_INFO) as Pack[]).map((p, i) => (
              <ToggleCard key={p} tilt={i} title={PACK_INFO[p].title} line={PACK_INFO[p].line} checked={opts.packs.includes(p)} onChange={(v) => togglePack(p, v)} />
            ))}
            <ToggleCard
              tilt={1}
              title={MR_WHITE_INFO.title}
              line={mwOk ? MR_WHITE_INFO.line : `Butuh minimal ${MR_WHITE_MIN} pemain.`}
              checked={opts.mrWhite && mwOk}
              disabled={!mwOk}
              onChange={(v) => setOpts({ ...opts, mrWhite: v })}
            />
          </ul>
          <label className="flex flex-col gap-1">
            <span className="font-display text-sm uppercase">Pasangan kata sendiri</span>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={2}
              placeholder={'Satu pasangan per baris, pisahkan dengan "/". Contoh:\nnasi uduk / nasi kuning'}
              className="border-[3px] border-ink bg-paper px-2 py-1 text-sm font-semibold shadow-slab-sm outline-none placeholder:text-ink/50 focus:bg-white"
            />
            <span className="text-[12px] font-semibold text-ink/70">
              {custom.length} pasangan terbaca{!enough && ' · nyalakan satu paket atau tulis minimal 3 pasangan'}
            </span>
          </label>
        </>
      )}

      <ul className="flex flex-wrap gap-1.5 text-[12px] font-semibold">
        {POINT_RULES.filter((r) => kata || !r.startsWith('Mr.')).map((r) => (
          <li key={r} className="border-2 border-ink bg-paper px-1.5">
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}
