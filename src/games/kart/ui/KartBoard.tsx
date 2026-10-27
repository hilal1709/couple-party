import { ArrowLeft01Icon, Settings02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Lottie } from 'lottie-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots, terrazzo } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { store } from '@/net/transport'
import type { GameProps, Seat } from '../../types'
import { BODIES, BODY_IDS, CHARACTERS, ITEM_INFO, POINTS, statsFor } from '../data'
import { racerOf, standings } from '../engine'
import { Race, type Hud, type Sound } from '../race'
import { Podium } from '../render/podium'
import { QUALITY_INFO, detectQuality, saveQuality, savedQuality, type Quality } from '../render/quality'
import confetti from '@/assets/lottie/confetti.json'
import fxBoost from '@/assets/lottie/kart-boost.json'
import fxBox from '@/assets/lottie/kart-box.json'
import fxFinish from '@/assets/lottie/kart-finish.json'
import fxHit from '@/assets/lottie/kart-hit.json'
import fxLap from '@/assets/lottie/kart-lap.json'
import { Engine, playSound } from '../sounds'
import { TRACKS } from '../tracks'
import type { ItemKind, KartAction, KartState } from '../types'
import { ITEM_SPRITE, charSprite, sprite } from './art'
import { clock, courseTitle, rankLine } from './copy'

type Props = GameProps<KartState, KartAction>
type LottieDoc = { w: number; h: number }
type Fx = { id: number; anim: LottieDoc; size: number; at: 'mid' | 'low' }
let fxSeq = 0
/** bunyi kejadian balapan yang juga dapat efek Lottie */
const SOUND_FX: Partial<Record<Sound, Omit<Fx, 'id'>>> = {
  boost: { anim: fxBoost, size: 30, at: 'low' },
  hit: { anim: fxHit, size: 30, at: 'mid' },
  blast: { anim: fxHit, size: 36, at: 'mid' },
  lap: { anim: fxLap, size: 32, at: 'mid' },
  final: { anim: fxLap, size: 40, at: 'mid' },
  box: { anim: fxBox, size: 18, at: 'low' },
  finish: { anim: fxFinish, size: 46, at: 'mid' },
}
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function FxBurst({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2', fx.at === 'mid' ? 'top-[42%]' : 'top-[68%]')}
      style={{ width: `${fx.size}%`, aspectRatio: `${fx.anim.w} / ${fx.anim.h}` }}
    >
      <Lottie src={fx.anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}
type Act = (a: KartAction) => void

const SWITCH = 'h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal'
const PREF = 'couple-party:kart-controls'
type Prefs = { tilt: boolean; autoGas: boolean }
function loadPrefs(): Prefs {
  try {
    return { tilt: false, autoGas: false, ...(JSON.parse(store.getItem(PREF) ?? '{}') as Partial<Prefs>) }
  } catch {
    return { tilt: false, autoGas: false }
  }
}

const nameOf = (s: KartState, i: number, names: string[]) => {
  const r = s.racers[i]
  return r.seat !== null ? (names[r.seat] ?? '?') : `${CHARACTERS[r.char].name} (bot)`
}

export function KartBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const racing = s.phase === 'race'
  // saat balapan, lagu diatur RaceScreen (putaran terakhir lebih tegang)
  useMusic(racing ? null : 'kart')

  const floor = { backgroundImage: terrazzo(14, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  const back = (
    <button
      onClick={() => setConfirmExit(true)}
      aria-label="Kembali ke menu"
      className="grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
    </button>
  )

  return (
    <div className={cn('relative h-dvh overflow-hidden', racing ? 'bg-ink' : 'bg-petal')} style={racing ? undefined : floor}>
      {s.phase === 'pick' && <PickScreen s={s} seat={seat} names={names} online={online} act={act} back={back} />}
      {racing && <RaceScreen key={s.phaseId} s={s} seat={seat} act={act} live={live} back={back} />}
      {(s.phase === 'results' || s.phase === 'standings' || s.phase === 'end') && <ResultScreen s={s} seat={seat} names={names} act={act} back={back} />}
      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Keluar dari balapan?"
        description={seat === 0 ? 'Semua pemain kembali ke room.' : 'Kamu kembali ke room; balapan jalan terus untuk yang lain.'}
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pilih karakter & kart

function Portrait({ char, size = 56, className }: { char: number; size?: number; className?: string }) {
  const c = CHARACTERS[char]
  const src = charSprite(c.id)
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden border-[3px] border-ink', className)} style={{ width: size, height: size, background: c.color }}>
      {src ? <img src={src} alt="" className="size-full object-contain" draggable={false} /> : <span className="font-display text-xl text-ink">{c.name[0]}</span>}
    </span>
  )
}

function StatBar({ label, v }: { label: string; v: number }) {
  // statistik di sekitar 0.8..1.3 → 1..5 kotak
  const n = Math.max(1, Math.min(5, Math.round((v - 0.78) * 9) + 1))
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase">
      <span className="w-16">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('h-2.5 w-4 border-2 border-ink', i < n ? 'bg-rose' : 'bg-paper')} />
      ))}
    </div>
  )
}

function PickScreen({ s, seat, names, online, act, back }: { s: KartState; seat: Seat; names: string[]; online: boolean[]; act: Act; back: ReactNode }) {
  const me = racerOf(s, seat)
  const mine = s.racers[me]
  const ready = s.ready[seat]
  const takenBy = (c: number) => s.racers.findIndex((r, i) => i !== me && r.seat !== null && r.char === c)
  const st = statsFor(mine.char, mine.body)
  const waiting = s.ready.filter((v) => !v).length

  return (
    <div className="mx-auto flex h-full max-w-[1100px] gap-3 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
      <section className="flex min-w-0 flex-[1.6] flex-col gap-2">
        <header className="flex items-center gap-2">
          {back}
          <SoundButton />
          <h1 className="font-display text-lg uppercase leading-none">
            <Tape tone="electric">Pilih pembalap</Tape>
          </h1>
          <span className="ml-auto text-[12px] font-bold">
            {courseTitle(s.opts.course)} · {s.opts.laps} putaran
          </span>
        </header>
        <ul className="grid flex-1 grid-cols-4 gap-2 overflow-y-auto" aria-label="Pembalap">
          {CHARACTERS.map((c, i) => {
            const by = takenBy(i)
            const on = mine.char === i
            return (
              <li key={c.id}>
                <button
                  disabled={by >= 0 || ready}
                  onClick={() => act({ type: 'pick', char: i, body: mine.body })}
                  aria-pressed={on}
                  className={cn(
                    'flex h-full w-full flex-col items-center gap-1 border-[3px] border-ink p-1.5 text-center',
                    on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm',
                    by >= 0 && 'opacity-45',
                  )}
                >
                  <Portrait char={i} size={54} />
                  <span className="font-display text-[13px] uppercase leading-none">{c.name}</span>
                  <span className="text-[10px] font-bold leading-none text-ink/70">
                    {c.animal} · {c.weight}
                  </span>
                  {by >= 0 && <span className="text-[10px] font-bold leading-none">dipakai {names[s.racers[by].seat ?? 0]}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <aside className="flex min-w-[240px] flex-1 flex-col gap-2 pb-[max(4px,env(safe-area-inset-bottom))]">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Kart">
          {BODY_IDS.map((b) => (
            <button
              key={b}
              role="radio"
              aria-checked={mine.body === b}
              disabled={ready}
              onClick={() => act({ type: 'pick', char: mine.char, body: b })}
              className={cn('flex-1 border-[3px] border-ink px-1.5 py-1 text-left', mine.body === b ? 'bg-electric' : 'bg-paper shadow-slab-sm')}
            >
              {sprite(`kart-${b}`) && <img src={sprite(`kart-${b}`)} alt="" className="mx-auto h-9 object-contain" />}
              <span className="block font-display text-[11px] uppercase leading-tight">{BODIES[b].title}</span>
              <span className="block text-[10px] leading-tight text-ink/70">{BODIES[b].line}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-[3px] border-ink bg-paper p-2 shadow-slab-sm">
          <StatBar label="Kecepatan" v={st.speed} />
          <StatBar label="Akselerasi" v={st.accel} />
          <StatBar label="Belok" v={st.turn} />
          <StatBar label="Berat" v={st.weight} />
        </div>
        <ul className="flex flex-wrap gap-1" aria-label="Status pemain">
          {s.racers
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.seat !== null)
            .map(({ r, i }) => (
              <li key={i} className={cn('flex items-center gap-1 border-2 border-ink px-1 py-0.5 text-[11px] font-bold', s.ready[r.seat!] ? 'bg-fern' : 'bg-paper', !online[r.seat!] && 'opacity-50')}>
                <Portrait char={r.char} size={20} className="border-2" />
                {names[r.seat!]} {s.ready[r.seat!] ? '✓' : '…'}
              </li>
            ))}
        </ul>
        <div className="mt-auto flex flex-col gap-1.5">
          <Slab tone={ready ? 'paper' : 'rose'} size="lg" disabled={ready} onClick={() => act({ type: 'ready' })}>
            {ready ? 'Nunggu yang lain…' : 'Siap balapan!'}
          </Slab>
          {seat === 0 && waiting > 0 && ready && (
            <Slab tone="ink" size="sm" onClick={() => act({ type: 'go' })}>
              Mulai tanpa nunggu ({waiting} belum siap)
            </Slab>
          )}
        </div>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Balapan

function useKeys(race: React.RefObject<Race | null>, autoGas: boolean, onItem: () => void) {
  useEffect(() => {
    const down = new Set<string>()
    const sync = () => {
      const r = race.current
      if (!r) return
      const c = r.controls
      const left = down.has('arrowleft') || down.has('a')
      const right = down.has('arrowright') || down.has('d')
      if (left || right || down.size) c.steer = (right ? 1 : 0) - (left ? 1 : 0)
      c.gas = autoGas || down.has('arrowup') || down.has('w')
      c.brake = down.has('arrowdown') || down.has('s')
      c.drift = down.has(' ') || down.has('shift')
    }
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'e' || k === 'enter') onItem()
      down.add(k)
      sync()
    }
    const ku = (e: KeyboardEvent) => {
      down.delete(e.key.toLowerCase())
      sync()
      if (!down.size && race.current) race.current.controls.steer = 0
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [race, autoGas, onItem])
}

/** setir miring: HP landscape diputar seperti setir; kalibrasi saat diaktifkan */
function useTilt(race: React.RefObject<Race | null>, on: boolean) {
  useEffect(() => {
    if (!on) return
    let zero: number | null = null
    const h = (e: DeviceOrientationEvent) => {
      const r = race.current
      if (!r || e.beta === null) return
      const angle = (screen.orientation?.angle ?? 90) === 270 ? -1 : 1
      const v = e.beta * angle
      zero ??= v
      r.controls.steer = Math.max(-1, Math.min(1, (v - zero) / 22))
    }
    window.addEventListener('deviceorientation', h)
    return () => window.removeEventListener('deviceorientation', h)
  }, [race, on])
}

function HoldButton({ label, onHold, className, children }: { label: string; onHold: (v: boolean) => void; className?: string; children: ReactNode }) {
  const [on, setOn] = useState(false)
  const set = (v: boolean) => {
    setOn(v)
    onHold(v)
  }
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('grid touch-none select-none place-items-center border-[3px] border-ink font-display uppercase text-ink shadow-slab-sm', on && 'translate-y-0.5 shadow-none brightness-90', className)}
    >
      {children}
    </button>
  )
}

function ItemSlot({ item, uses, rolling, onUse }: { item: ItemKind | null; uses: number; rolling: boolean; onUse: () => void }) {
  const [spin, setSpin] = useState(0)
  useEffect(() => {
    if (!rolling) return
    const t = setInterval(() => setSpin((v) => v + 1), 90)
    return () => clearInterval(t)
  }, [rolling])
  const kinds = Object.keys(ITEM_INFO) as ItemKind[]
  const show = item ?? (rolling ? kinds[spin % kinds.length] : null)
  const src = show ? sprite(ITEM_SPRITE[show]) : null
  return (
    <button
      aria-label={item ? `Pakai ${ITEM_INFO[item].title}` : 'Belum punya item'}
      disabled={!item}
      onPointerDown={(e) => {
        e.preventDefault()
        onUse()
      }}
      className={cn('relative grid size-[78px] touch-none place-items-center border-[3px] border-ink bg-paper/90 shadow-slab-sm', item && 'bg-electric')}
    >
      {show ? (
        src ? (
          <img src={src} alt="" className="size-14 object-contain" draggable={false} />
        ) : (
          <span className="px-1 text-center font-display text-[11px] uppercase leading-tight">{ITEM_INFO[show].title}</span>
        )
      ) : (
        <span className="font-display text-2xl text-ink/30">?</span>
      )}
      {item && uses > 1 && <span className="absolute -right-2 -top-2 grid size-6 place-items-center border-2 border-ink bg-rose font-display text-xs">×{uses}</span>}
    </button>
  )
}

function RaceScreen({ s, seat, act, live, back }: { s: KartState; seat: Seat; act: Act; live: Props['live']; back: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const race = useRef<Race | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [path, setPath] = useState('')
  const [prefs, setPrefs] = useState(loadPrefs)
  const [settings, setSettings] = useState(false)
  const [quality, setQuality] = useState<Quality | 'auto'>(savedQuality)
  const [autoTier, setAutoTier] = useState<Quality>(detectQuality)
  const [fx, setFx] = useState<Fx[]>([])
  const actRef = useRef(act)
  useEffect(() => {
    actRef.current = act
  })
  const engine = useMemo(() => new Engine(), [])

  useEffect(() => {
    const r = new Race({
      canvas: canvas.current!,
      state: s,
      seat,
      live,
      act: (a) => actRef.current(a),
      onHud: setHud,
      onQuality: (q) => setAutoTier(q),
      onSound: (snd, info) => {
        playSound(snd, info)
        const f = SOUND_FX[snd]
        if (f && !reduceMotion()) setFx((cur) => [...cur.slice(-3), { ...f, id: ++fxSeq }])
      },
    })
    race.current = r
    void r.start().then(() => setPath(r.mapPath()))
    engine.start()
    const onResize = () => r.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      r.dispose()
      race.current = null
      engine.stop()
    }
    // satu Race per balapan (komponen di-key dengan phaseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    race.current?.setState(s)
  }, [s])

  useEffect(() => {
    if (hud) engine.set(Math.min(1, hud.speed / 190), hud.boost)
  }, [hud, engine])

  useEffect(() => {
    store.setItem(PREF, JSON.stringify(prefs))
    if (race.current) race.current.controls.gas = prefs.autoGas
  }, [prefs])

  const useItem = useMemo(() => () => race.current?.useItem(), [])
  useKeys(race, prefs.autoGas, useItem)
  useTilt(race, prefs.tilt)

  const me = racerOf(s, seat)
  const item = me >= 0 ? s.items[me] : null
  const uses = me >= 0 ? s.uses[me] : 0
  const set = (patch: Partial<Race['controls']>) => {
    if (race.current) Object.assign(race.current.controls, patch)
  }
  const steer = (dir: number) => (v: boolean) => {
    const c = race.current?.controls
    if (!c) return
    if (v) c.steer = dir
    else if (c.steer === dir) c.steer = 0
  }
  useMusic(hud && hud.lap === hud.laps && hud.laps > 1 && !hud.finished ? 'kart-tense' : 'kart')
  const count = hud ? Math.ceil(hud.count) : 4
  const track = TRACKS[s.schedule[s.race]]

  return (
    <div className="absolute inset-0">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />
      {hud?.intro && (
        <button
          className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-2 pb-[max(18px,env(safe-area-inset-bottom))] text-center"
          onClick={() => race.current?.skipIntro()}
          aria-label="Lewati intro lintasan"
        >
          <span className="animate-in slide-in-from-left-10 -rotate-2 font-display text-4xl uppercase drop-shadow-[4px_4px_0_#121212]">
            <Tape tone="electric">{track.title}</Tape>
          </span>
          <span className="border-2 border-ink bg-paper px-2 py-0.5 text-sm font-bold">{track.line}</span>
          <span className="text-[12px] font-bold text-paper drop-shadow-[1px_1px_0_#121212]">Ketuk untuk lewati</span>
        </button>
      )}
      {!hud && (
        <div className="absolute inset-0 grid place-items-center bg-petal" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
          <div className="text-center">
            <p className="font-display text-3xl uppercase">
              <Tape tone="electric">{track.title}</Tape>
            </p>
            <p className="mt-2 text-sm font-bold">{track.line}</p>
            <p className="mt-1 text-xs font-bold text-ink/60">Menyiapkan lintasan…</p>
          </div>
        </div>
      )}

      {fx.map((f) => (
        <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
      ))}

      {/* ---- HUD atas ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 px-[max(10px,env(safe-area-inset-left))] pt-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        <div className="pointer-events-auto flex gap-1.5">
          {back}
          <SoundButton />
          <button
            onClick={() => setSettings((v) => !v)}
            aria-label="Pengaturan kontrol"
            className="grid size-9 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm"
          >
            <HugeiconsIcon icon={Settings02Icon} size={18} strokeWidth={2.4} />
          </button>
        </div>
        {hud && (
          <>
            <div className="border-[3px] border-ink bg-paper px-2 py-0.5 font-display leading-none shadow-slab-sm">
              <span className="text-[34px]">{hud.rank}</span>
              <span className="text-xs text-ink/60">/{hud.total}</span>
            </div>
            <div className="border-[3px] border-ink bg-electric px-2 py-1 font-display text-sm uppercase leading-tight shadow-slab-sm">
              Putaran {hud.lap}/{hud.laps}
              <span className="block font-sans text-[12px] font-bold normal-case tabular-nums">{clock(hud.timeMs)}</span>
            </div>
          </>
        )}
        {hud && path && <Minimap path={path} hud={hud} />}
      </div>

      {settings && (
        <div className="absolute left-1/2 top-14 z-20 flex w-[280px] -translate-x-1/2 flex-col gap-2 border-[3px] border-ink bg-paper p-3 shadow-slab">
          <label className="flex items-center justify-between gap-2 text-sm font-bold">
            Setir miringkan HP
            <Switch checked={prefs.tilt} onCheckedChange={(v) => setPrefs({ ...prefs, tilt: v })} className={SWITCH} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm font-bold">
            Gas otomatis
            <Switch checked={prefs.autoGas} onCheckedChange={(v) => setPrefs({ ...prefs, autoGas: v })} className={SWITCH} />
          </label>
          <p className="text-[11px] leading-snug text-ink/70">Mode miring: pegang HP lurus saat menyalakan, lalu putar seperti setir.</p>
          <div>
            <span className="text-sm font-bold">Grafis</span>
            <div className="mt-1 grid grid-cols-4 gap-1" role="radiogroup" aria-label="Kualitas grafis">
              {(['auto', 'low', 'med', 'high'] as const).map((q) => (
                <button
                  key={q}
                  role="radio"
                  aria-checked={quality === q}
                  onClick={() => {
                    setQuality(q)
                    saveQuality(q)
                    race.current?.setQuality(q === 'auto' ? detectQuality() : q)
                  }}
                  className={cn('border-2 border-ink px-1 py-1 text-[11px] font-bold leading-tight', quality === q ? 'bg-electric' : 'bg-paper')}
                >
                  {q === 'auto' ? 'Otomatis' : QUALITY_INFO[q].title}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-ink/70">
              {quality === 'auto' ? `Sekarang: ${QUALITY_INFO[autoTier].title}. ` : ''}
              {QUALITY_INFO[quality === 'auto' ? autoTier : quality].line}
            </p>
          </div>
          <Slab tone="ink" size="sm" onClick={() => setSettings(false)}>
            Oke
          </Slab>
        </div>
      )}

      {/* ---- hitung mundur & pesan tengah ---- */}
      {hud && count > 0 && count <= 3 && (
        <div key={count} className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="animate-in zoom-in-50 font-display text-[120px] leading-none text-paper drop-shadow-[6px_6px_0_#121212]" style={{ WebkitTextStroke: '4px #121212' }}>
            {count}
          </span>
        </div>
      )}
      {hud && count <= 0 && count > -1 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="animate-in zoom-in-50 font-display text-[110px] leading-none text-electric drop-shadow-[6px_6px_0_#121212]" style={{ WebkitTextStroke: '4px #121212' }}>
            GAS!
          </span>
        </div>
      )}
      {hud?.wrongWay && !hud.finished && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center">
          <span className="border-[3px] border-ink bg-rose px-3 py-1 font-display text-xl uppercase">Salah arah!</span>
        </div>
      )}
      {hud?.finished && (
        <div className="pointer-events-none absolute inset-x-0 top-[30%] text-center">
          <p className="inline-block -rotate-2 border-[3px] border-ink bg-electric px-5 py-2 font-display text-4xl uppercase shadow-slab">Finish! Posisi {hud.rank}</p>
          <p className="mt-2 text-sm font-bold text-paper drop-shadow-[2px_2px_0_#121212]">Nunggu yang lain sampai garis finish…</p>
        </div>
      )}
      {hud && (hud.slow || hud.shield) && (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 border-2 border-ink bg-paper px-2 py-0.5 text-[12px] font-bold">{hud.slow ? 'Kehujanan! Melambat…' : 'Perisai aktif'}</div>
      )}

      {/* ---- kontrol bawah ---- */}
      {hud && !hud.finished && !hud.intro && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-[max(12px,env(safe-area-inset-left))] pb-[max(10px,env(safe-area-inset-bottom))] pr-[max(12px,env(safe-area-inset-right))]">
          <div className="flex items-end gap-2">
            {!prefs.tilt && (
              <>
                <HoldButton label="Belok kiri" onHold={steer(-1)} className="h-[86px] w-[92px] bg-paper/90 text-3xl">
                  ◀
                </HoldButton>
                <HoldButton label="Belok kanan" onHold={steer(1)} className="h-[86px] w-[92px] bg-paper/90 text-3xl">
                  ▶
                </HoldButton>
              </>
            )}
            <div className="mb-1 ml-1 border-2 border-ink bg-paper/90 px-1.5 font-display text-sm tabular-nums">
              {hud.speed} <span className="text-[10px]">km/j</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <ItemSlot item={item} uses={uses} rolling={hud.rolling} onUse={useItem} />
            <div className="flex flex-col gap-2">
              <HoldButton label="Rem" onHold={(v) => set({ brake: v })} className="h-[44px] w-[96px] bg-paper/90 text-sm">
                Rem
              </HoldButton>
              <HoldButton
                label="Drift"
                onHold={(v) => set({ drift: v })}
                className={cn('h-[86px] w-[96px] text-lg', hud.drift === 3 ? 'bg-[#8a55ff]' : hud.drift === 2 ? 'bg-[#ff8a1c]' : hud.drift === 1 ? 'bg-[#2f7bff]' : 'bg-rose')}
              >
                Drift
              </HoldButton>
            </div>
            {!prefs.autoGas && (
              <HoldButton label="Gas" onHold={(v) => set({ gas: v })} className="h-[138px] w-[96px] bg-electric text-2xl">
                Gas
              </HoldButton>
            )}
          </div>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {hud ? `Posisi ${hud.rank} dari ${hud.total}, putaran ${hud.lap}` : ''}
      </span>
    </div>
  )
}

function Minimap({ path, hud }: { path: string; hud: Hud }) {
  return (
    <svg viewBox="-4 -4 108 108" className="ml-auto size-[108px] border-[3px] border-ink bg-paper/80" aria-hidden>
      <polyline points={path} fill="none" stroke="#121212" strokeWidth="7" strokeLinejoin="round" />
      <polyline points={path} fill="none" stroke="#fff4fa" strokeWidth="3.5" strokeLinejoin="round" />
      {hud.dots
        .map((d, i) => ({ d, i }))
        .sort((a, b) => Number(a.d.me) - Number(b.d.me))
        .map(({ d, i }) => (
          <circle key={i} cx={d.x * 100} cy={d.z * 100} r={d.me ? 5 : 3.4} fill={d.color} stroke="#121212" strokeWidth={d.me ? 2 : 1.2} />
        ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Hasil balapan, klasemen, akhir

/** podium 3D juara Grand Prix (kanvas sendiri) */
function PodiumView({ champs }: { champs: { id: string; color: string }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = champs.map((c) => c.id).join()
  useEffect(() => {
    const p = new Podium(ref.current!)
    void p.show(champs)
    const onResize = () => p.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      p.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <canvas ref={ref} className="h-[200px] w-full border-[3px] border-ink bg-gradient-to-b from-[#7fd0ff] to-petal shadow-slab" aria-label="Podium juara" />
}

function ResultScreen({ s, seat, names, act, back }: { s: KartState; seat: Seat; names: string[]; act: Act; back: ReactNode }) {
  const me = racerOf(s, seat)
  const host = seat === 0
  const totals = s.phase !== 'results'
  const rows = totals ? standings(s) : s.order
  const track = TRACKS[s.schedule[s.race]]
  const pos = rows.indexOf(me)
  // akhir Grand Prix: juara dapat confetti & jingle
  const champ = s.phase === 'end' && rows[0] === me
  useEffect(() => {
    if (s.phase === 'end') playSound(champ ? 'champion' : 'lose')
  }, [s.phase, champ])
  const title =
    s.phase === 'results' ? `Hasil · ${track.title}` : s.phase === 'standings' ? `Klasemen setelah ${s.race + 1}/${s.schedule.length}` : s.schedule.length > 1 ? `Juara ${courseTitle(s.opts.course)}` : 'Balapan selesai'

  return (
    <div className="mx-auto flex h-full max-w-[1000px] gap-3 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
      {champ && !reduceMotion() && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <section className="flex min-w-0 flex-[1.6] flex-col gap-2">
        <header className="flex items-center gap-2">
          {back}
          <SoundButton />
          <h1 className="font-display text-lg uppercase leading-none">
            <Tape tone="electric">{title}</Tape>
          </h1>
        </header>
        <ol className="grid flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto">
          {rows.map((r, i) => (
            <li
              key={r}
              className={cn('flex items-center gap-2 border-[3px] border-ink px-2 py-1', r === me ? 'bg-electric' : 'bg-paper', i < 3 && 'shadow-slab-sm')}
            >
              <span className="w-6 font-display text-xl">{i + 1}</span>
              <Portrait char={s.racers[r].char} size={34} className="border-2" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{nameOf(s, r, names)}</span>
                <span className="block text-[11px] tabular-nums text-ink/70">{totals ? `+${s.gained[r]} terakhir` : s.times[r] !== null ? clock(s.times[r]!) : 'belum finish'}</span>
              </span>
              <span className="font-display text-lg tabular-nums">{totals ? s.points[r] : `+${POINTS[i] ?? 0}`}</span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="flex min-w-[220px] flex-1 flex-col justify-center gap-3">
        {s.phase === 'end' && <PodiumView champs={rows.slice(0, 3).map((r) => CHARACTERS[s.racers[r].char])} />}
        {me >= 0 && s.phase !== 'end' && (
          <div className="border-[3px] border-ink bg-paper p-3 shadow-slab">
            <Portrait char={s.racers[me].char} size={72} />
            <p className="mt-2 font-display text-2xl uppercase leading-none">Posisi {pos + 1}</p>
            <p className="mt-1 text-sm font-semibold">{rankLine(pos, rows.length)}</p>
          </div>
        )}
        {host ? (
          s.phase === 'end' ? (
            <Slab tone="rose" size="lg" onClick={() => act({ type: 'again' })}>
              Main lagi
            </Slab>
          ) : (
            <Slab tone="rose" size="lg" onClick={() => act({ type: 'next' })}>
              {s.phase === 'results' ? (s.schedule.length > 1 ? 'Lihat klasemen' : 'Selesai') : `Lanjut: ${TRACKS[s.schedule[s.race + 1]].title}`}
            </Slab>
          )
        ) : (
          <p className="text-sm font-bold">Nunggu host lanjut…</p>
        )}
      </aside>
    </div>
  )
}
