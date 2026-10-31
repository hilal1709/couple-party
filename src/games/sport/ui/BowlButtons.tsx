import { useEffect, useRef, useState } from 'react'
import { sfx } from '@/audio/audio'
import { HEAD_Z, throwSpeed, type BowlThrow } from '../sports/bowling/sim'

type Spin = -1 | 0 | 1

const SPIN: { v: Spin; label: string }[] = [
  { v: -1, label: '↶' },
  { v: 0, label: 'Lurus' },
  { v: 1, label: '↷' },
]

/** geser di ujung penggeser = sejauh ini di depan pin */
const REACH = 0.6

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-13 font-display text-[11px] uppercase">{label}</span>
      <input type="range" min={-1} max={1} step={0.02} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="h-7 w-36 accent-rose" />
    </label>
  )
}

/** Kontrol tombol: atur posisi, arah, putaran; tahan tombol lalu lepas saat meter pas. */
export function BowlButtons({ onAim, onThrow }: { onAim: (th: BowlThrow) => void; onThrow: (th: BowlThrow) => void }) {
  const [x, setX] = useState(0)
  const [aim, setAim] = useState(0)
  const [spin, setSpin] = useState<Spin>(0)
  const [power, setPower] = useState<number | null>(null)
  const started = useRef(0)
  const raf = useRef(0)

  const th = (p: number): BowlThrow => ({ x, dir: (aim * REACH) / HEAD_Z, speed: throwSpeed(p), spin: spin * 0.75 })

  useEffect(() => {
    onAim(th(0.6))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, aim, spin])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const hold = () => {
    started.current = performance.now()
    sfx('ui-open', { volume: 0.4 })
    const tick = (t: number) => {
      // meter naik-turun: yang kepanjangan menahan malah melemah
      const phase = ((t - started.current) / 1100) % 2
      setPower(phase < 1 ? phase : 2 - phase)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  const release = () => {
    cancelAnimationFrame(raf.current)
    if (power === null) return
    onThrow(th(power))
    setPower(null)
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-end justify-between gap-3">
      <div className="pointer-events-auto flex flex-col gap-0.5 border-[3px] border-ink bg-paper px-2 py-1 shadow-slab-sm">
        <Slider label="Posisi" value={x} onChange={setX} />
        <Slider label="Arah" value={aim} onChange={setAim} />
        <div className="flex items-center gap-2">
          <span className="w-13 font-display text-[11px] uppercase">Putar</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Putaran bola">
            {SPIN.map((s) => (
              <button key={s.v} role="radio" aria-checked={spin === s.v} onClick={() => setSpin(s.v)} className={`h-7 min-w-9 border-2 border-ink px-1.5 text-[12px] font-bold ${spin === s.v ? 'bg-electric' : 'bg-paper'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-auto flex items-end gap-2">
        <div aria-hidden className="relative h-24 w-5 border-[3px] border-ink bg-paper">
          <div className="absolute inset-x-0 bottom-0 bg-rose" style={{ height: `${(power ?? 0) * 100}%` }} />
        </div>
        <button
          onPointerDown={hold}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          className="size-24 touch-none select-none rounded-full border-[3px] border-ink bg-rose font-display text-sm uppercase leading-tight text-ink shadow-slab active:translate-y-0.5"
        >
          Tahan
          <br />
          lepas!
        </button>
      </div>
    </div>
  )
}
