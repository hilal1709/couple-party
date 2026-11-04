import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import confetti from '@/assets/lottie/confetti.json'
import fxStar from '@/assets/lottie/masak-bintang.json'
import { useMusic } from '@/audio/audio'
import { HoldButton } from '@/components/controls/HoldButton'
import { Joystick } from '@/components/controls/Joystick'
import { TapButton } from '@/components/controls/TapButton'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import type { GameProps } from '../../types'
import { actorOf, starsOf } from '../engine'
import { randomLook, saveFirstPerson, savedFirstPerson, savedLook, saveLook } from '../look'
import { MOUNTAINS } from '../mountains'
import { Round, type Hud, type Pop } from '../round'
import { ITEMS } from '../sim/items'
import { playSound, RainLoop, WindLoop } from '../sounds'
import type { PuncakAction, PuncakState } from '../types'
import { botName, clock, STAR_LINE } from './copy'
import { LookMaker } from './LookMaker'

type Props = GameProps<PuncakState, PuncakAction>

const SKY_LABEL: Record<Hud['sky'], string> = {
  cerah: 'Cerah',
  berawan: '☁ Mendung',
  hujan: '☂ Hujan · licin',
  badai: '⚡ Badai petir',
  pasir: '≋ Badai pasir',
  abu: '☁ Hujan abu',
  salju: '❄ Salju',
  kabut: '≈ Kabut',
}

export function PuncakBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const me = actorOf(s, seat)
  const nameOf = (actor: number) => {
    const a = s.actors[actor]?.seat
    return a === null || a === undefined ? botName(actor) : (names[a] ?? '?')
  }
  const sentLook = useRef(false)
  useEffect(() => {
    if (sentLook.current || me < 0 || s.looks[me]) return
    sentLook.current = true
    act({ type: 'look', look: savedLook() ?? randomLook(Date.now() % 100000)[0] })
  }, [act, me, s.looks])
  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      {s.phase === 'end' ? (
        <EndScreen s={s} seat={seat} nameOf={nameOf} act={act} exit={exit} />
      ) : (
        <ClimbScreen key={s.phaseId} s={s} seat={seat} online={online} act={act} live={live} nameOf={nameOf} back={() => setConfirmExit(true)} />
      )}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Turun gunung?" description="Semua pemain kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

type ScreenProps = Pick<Props, 'seat' | 'online' | 'act' | 'live'> & { s: PuncakState; nameOf: (a: number) => string; back: () => void }

type PopItem = Pop & { id: number }

function ClimbScreen({ s, seat, online, act, live, nameOf, back }: ScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [failed, setFailed] = useState(false)
  const [pops, setPops] = useState<PopItem[]>([])
  const [pickSlot, setPickSlot] = useState<number | null>(null)
  const actRef = useRef(act)
  actRef.current = act
  const nameRef = useRef(nameOf)
  nameRef.current = nameOf
  const popId = useRef(0)
  const [fp, setFp] = useState(savedFirstPerson)
  const [styling, setStyling] = useState(false)
  const me = actorOf(s, seat)
  const myLook = (me >= 0 ? s.looks[me] : null) ?? savedLook() ?? randomLook(7)[0]

  useEffect(() => {
    let r: Round
    const onPop = (p: Pop) => {
      const item = { ...p, id: ++popId.current }
      setPops((x) => [...x.slice(-2), item])
      setTimeout(() => setPops((x) => x.filter((y) => y.id !== item.id)), 2200)
    }
    try {
      r = new Round({ canvas: canvas.current!, state: s, seat, look: savedLook(), fp: savedFirstPerson(), act: (a) => actRef.current(a), live, onHud: setHud, onPop, onSound: playSound, nameOf: (a) => nameRef.current(a) })
    } catch {
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV) (window as unknown as { __puncak?: Round }).__puncak = r
    r.start().catch((e) => {
      console.error('Puncak Berdua gagal memuat', e)
      setFailed(true)
    })
    return () => {
      r.dispose()
      round.current = null
    }
    // ronde baru = komponen baru (key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    round.current?.setState(s)
  }, [s])

  useKeyboard(round)
  useMusic('puncak')
  const wind = useRef<WindLoop | null>(null)
  useEffect(() => {
    wind.current = new WindLoop()
    return () => wind.current?.stop()
  }, [])
  const rainLoop = useRef<RainLoop | null>(null)
  useEffect(() => {
    rainLoop.current = new RainLoop()
    return () => rainLoop.current?.stop()
  }, [])
  const raining = hud && (hud.sky === 'hujan' || hud.sky === 'badai') ? Math.round(hud.skyK * 10) / 10 : 0
  useEffect(() => rainLoop.current?.set(raining), [raining])
  useEffect(() => wind.current?.set((hud?.wind ?? 0) + (hud?.storm ?? 0) * 6 + (hud?.alt ?? 0) / 40), [hud?.wind, hud?.storm, hud?.alt])

  // geser layar kanan = putar kamera
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map())
  const m = MOUNTAINS[s.mountain]

  return (
    <div className="absolute inset-0">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label={m.title} />
      <div
        className="absolute inset-y-0 right-0 w-[52%] touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (!drag.current) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
        }}
        onPointerMove={(e) => {
          const pts = pinch.current
          const prev = pts.get(e.pointerId)
          if (pts.size === 2 && prev) {
            const [a, b] = [...pts.values()]
            const before = Math.hypot(a.x - b.x, a.y - b.y)
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
            const [c, d] = [...pts.values()]
            const after = Math.hypot(c.x - d.x, c.y - d.y)
            if (before > 0 && after > 0) round.current?.zoom(before / after)
            return
          }
          if (prev) pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          round.current?.look(e.clientX - d.x, e.clientY - d.y)
          d.x = e.clientX
          d.y = e.clientY
        }}
        onPointerUp={(e) => {
          pinch.current.delete(e.pointerId)
          if (drag.current?.id === e.pointerId) drag.current = null
        }}
        onPointerCancel={(e) => {
          pinch.current.delete(e.pointerId)
          drag.current = null
        }}
        onWheel={(e) => round.current?.zoom(e.deltaY > 0 ? 1.1 : 0.9)}
      />
      <Joystick className="absolute inset-y-0 left-0 w-[46%]" onMove={(x, y) => round.current?.setMove(x, y)} />
      {!hud && !failed && <LoadingScreen label={`Menuju ${m.title}`} sub="Mengikat tali sepatu" overlay />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-petal text-center text-ink">
          <div>
            <p className="font-display text-xl uppercase">Gunung gagal dimuat</p>
            <p className="mb-3 text-sm">HP-nya mungkin kehabisan memori. Coba grafis Hemat atau tutup aplikasi lain.</p>
            <Slab tone="rose" size="md" onClick={back}>
              Keluar
            </Slab>
          </div>
        </div>
      )}
      {hud && (
        <>
          <Marks hud={hud} nameOf={nameOf} />
          <TopBar
            s={s}
            hud={hud}
            online={online}
            nameOf={nameOf}
            back={back}
            fp={fp}
            onCam={() => {
              const v = !fp
              setFp(v)
              saveFirstPerson(v)
              round.current?.setFirstPerson(v)
            }}
            onStyle={me >= 0 ? () => setStyling(true) : null}
          />
          <LookMaker
            open={styling}
            onOpenChange={setStyling}
            look={myLook}
            onChange={(l) => {
              saveLook(l)
              act({ type: 'look', look: l })
            }}
          />
          <StaminaBar hud={hud} />
          <Inventory
            hud={hud}
            pick={pickSlot}
            onTap={(i) => {
              if (pickSlot === i) setPickSlot(null)
              else round.current?.useSlot(i)
            }}
            onLong={(i) => setPickSlot(i)}
            onDrop={(i) => {
              round.current?.dropSlot(i)
              setPickSlot(null)
            }}
            onGive={(i) => {
              round.current?.giveSlot(i)
              setPickSlot(null)
            }}
          />
          {/* ibu jari kanan: Lompat paling besar di pojok, Pegang di sebelahnya, Lari/Lunge & aksi di atasnya */}
          <div className="absolute right-[max(12px,env(safe-area-inset-right))] bottom-3 flex items-end gap-2">
            <div className="flex flex-col items-center gap-2">
              <HoldButton label={hud.mode === 'climb' ? 'Lunge' : 'Lari'} onHold={(v) => round.current?.run(v)} className="h-12 w-[84px] bg-grass text-sm">
                {hud.mode === 'climb' ? 'Lunge' : 'Lari'}
              </HoldButton>
              <HoldButton label="Pegang" onHold={(v) => round.current?.grip(v)} className={cn('h-[74px] w-[84px] text-[13px]', hud.mode === 'climb' || hud.mode === 'rope' ? 'bg-rose text-paper' : 'bg-paper')}>
                Pegang
              </HoldButton>
            </div>
            <div className="flex flex-col items-end gap-2">
              {hud.action ? (
                <TapButton label={hud.action.label} onTap={() => round.current?.doAction()} className="h-12 max-w-[120px] bg-electric px-2 text-xs leading-tight">
                  {hud.action.label}
                </TapButton>
              ) : (
                <span className="h-12" aria-hidden />
              )}
              <TapButton label="Lompat" onTap={() => round.current?.jump()} className="h-[74px] w-[104px] bg-rose text-base">
                Lompat
              </TapButton>
            </div>
          </div>
          {hud.downLeft !== null && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/45">
              <p className="text-center">
                <Tape tone="rose" className="font-display text-2xl uppercase">
                  Pingsan
                </Tape>
                <span className="mt-2 block font-bold text-paper">Tunggu dibangunkan · {hud.downLeft} detik</span>
              </p>
            </div>
          )}
          {hud.storm > 0.6 && (
            <p className="pointer-events-none absolute inset-x-0 top-[22%] text-center">
              <Tape tone="paper" className="font-display text-base uppercase">
                Badai! Cari api unggun
              </Tape>
            </p>
          )}
          <ul className="pointer-events-none absolute inset-x-0 top-[30%] flex flex-col items-center gap-1">
            {pops.map((p) => (
              <li key={p.id}>
                <Tape tone={p.tone} className="font-display text-base uppercase">
                  {p.text}
                </Tape>
              </li>
            ))}
          </ul>
          {hud.chests.map(([x, y], i) => (
            <span key={i} className="pointer-events-none absolute size-4 -translate-1/2 rotate-45 border-2 border-ink bg-suit-yellow" style={{ left: `${x}%`, top: `${y}%` }} />
          ))}
          {hud.compass && (
            <div className="pointer-events-none absolute top-[66px] left-1/2 flex -translate-x-1/2 flex-col items-center">
              <span className="block size-0 border-x-[10px] border-b-[18px] border-x-transparent border-b-rose" style={{ transform: `rotate(${-hud.compass[0]}rad)` }} />
              <span className="bg-ink/70 px-1 text-[11px] font-bold text-paper tabular-nums">{hud.compass[1]} m</span>
            </div>
          )}
          {import.meta.env.DEV && (
            <span className="pointer-events-none absolute bottom-1 left-1 bg-ink/70 px-1 text-[10px] text-paper tabular-nums">
              {hud.fps} fps · {hud.mode} · aksi {hud.rtt === null ? 'host' : `${Math.round(hud.rtt)} ms`}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/** bar stamina bersegmen: bagian yang dikunci lelah berwarna sesuai penyebabnya */
function StaminaBar({ hud }: { hud: Hud }) {
  const f = hud.fat
  const parts: [string, number, string][] = [
    ['Luka', f.fall, 'bg-[#e8432f]'],
    ['Lapar', f.hunger, 'bg-[#e8a317]'],
    ['Dingin', f.cold, 'bg-[#7ab8ff]'],
    ['Panas', f.heat, 'bg-[#ff6b35]'],
    ['Racun', f.poison, 'bg-[#a64dff]'],
  ]
  const low = hud.stamina < 0.22
  return (
    <div className="pointer-events-none absolute right-[max(218px,calc(env(safe-area-inset-right)+206px))] bottom-[76px] w-[234px]" aria-label={`Stamina ${Math.round(hud.stamina * 100)}%`}>
      <div className={cn('relative flex h-4 overflow-hidden border-[3px] border-ink bg-ink/40', low && 'animate-pulse')}>
        <span className={cn('h-full', low ? 'bg-rose' : 'bg-electric')} style={{ width: `${hud.stamina * 100}%` }} />
        <span className="h-full" style={{ width: `${Math.max(0, hud.max - hud.stamina) * 100}%` }} />
        {parts.map(([k, v, c]) => (v > 0.005 ? <span key={k} className={cn('h-full border-l border-ink/40', c)} style={{ width: `${v * 100}%` }} title={k} /> : null))}
      </div>
      <div className="mt-0.5 flex justify-center gap-1.5 text-[10px] font-bold text-paper [text-shadow:0_1px_0_#121212]">
        {parts.filter(([, v]) => v > 0.03).map(([k]) => (
          <span key={k}>{k}</span>
        ))}
        {(Object.entries(hud.buffs) as [string, number][])
          .filter(([, v]) => v > 0)
          .map(([k, v]) => (
            <span key={k} className="text-electric">
              {ITEMS[k as keyof typeof ITEMS]?.title ?? k} {Math.ceil(v)}s
            </span>
          ))}
      </div>
    </div>
  )
}

function Inventory({ hud, pick, onTap, onLong, onDrop, onGive }: { hud: Hud; pick: number | null; onTap: (i: number) => void; onLong: (i: number) => void; onDrop: (i: number) => void; onGive: (i: number) => void }) {
  const timer = useRef<number | null>(null)
  const long = useRef(false)
  return (
    <div className="absolute right-[max(218px,calc(env(safe-area-inset-right)+206px))] bottom-3 flex gap-1.5">
      {Array.from({ length: 4 }, (_, i) => {
        const id = hud.inv[i]
        const info = id ? ITEMS[id] : null
        return (
          <div key={i} className="relative">
            <button
              aria-label={info ? `${info.title}: ${info.line}` : 'Slot kosong'}
              disabled={!id}
              onPointerDown={() => {
                long.current = false
                timer.current = window.setTimeout(() => {
                  long.current = true
                  onLong(i)
                }, 450)
              }}
              onPointerUp={() => {
                if (timer.current) clearTimeout(timer.current)
                if (!long.current && id) onTap(i)
              }}
              onPointerLeave={() => timer.current && clearTimeout(timer.current)}
              onContextMenu={(e) => e.preventDefault()}
              className={cn('grid h-[54px] w-[54px] place-items-center border-[3px] border-ink bg-paper/90 p-0.5 text-center shadow-slab-sm disabled:opacity-50', pick === i && 'outline-2 outline-offset-1 outline-rose')}
            >
              {info ? (
                <>
                  <span className="block size-4 rounded-full border-2 border-ink" style={{ background: info.color }} />
                  <span className="block text-[9px] leading-[10px] font-bold text-ink">{info.title}</span>
                </>
              ) : (
                <span className="text-[10px] text-ink/50">{i + 1}</span>
              )}
            </button>
            {pick === i && id && (
              <div className="absolute bottom-[60px] left-1/2 flex -translate-x-1/2 flex-col gap-1">
                <Slab tone="paper" size="sm" onClick={() => onDrop(i)}>
                  Buang
                </Slab>
                {hud.giveTo !== null && (
                  <Slab tone="electric" size="sm" onClick={() => onGive(i)}>
                    Kasih
                  </Slab>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** penanda nama pasangan di layar; panah di tepi kalau di luar layar */
function Marks({ hud, nameOf }: { hud: Hud; nameOf: (a: number) => string }) {
  return (
    <>
      {hud.marks.map(([a, x, y, d, down, off]) => (
        <span
          key={a}
          className={cn('pointer-events-none absolute -translate-x-1/2 -translate-y-full border-2 border-ink px-1 text-[10px] leading-4 font-bold whitespace-nowrap text-ink', down ? 'animate-pulse bg-rose text-paper' : 'bg-paper/90', off && 'opacity-80')}
          style={{ left: `${Math.min(88, Math.max(12, x))}%`, top: `${Math.min(62, Math.max(26, y))}%` }}
        >
          {off ? '◀ ' : ''}
          {nameOf(a)} · {d} m{down ? ' · PINGSAN' : ''}
        </span>
      ))}
    </>
  )
}

function TopBar({ s, hud, online, nameOf, back, fp, onCam, onStyle }: { s: PuncakState; hud: Hud; online: boolean[]; nameOf: (a: number) => string; back: () => void; fp: boolean; onCam: () => void; onStyle: (() => void) | null }) {
  const m = MOUNTAINS[s.mountain]
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <div className="flex flex-col items-start gap-1">
        <div className="pointer-events-auto flex gap-1">
          <button onClick={back} className="h-8 border-[3px] border-ink bg-paper px-2 text-xs font-bold text-ink">
            Keluar
          </button>
          <button onClick={onCam} aria-label={fp ? 'Kamera orang ketiga' : 'Kamera orang pertama'} className="h-8 border-[3px] border-ink bg-paper px-2 text-xs font-bold text-ink">
            {fp ? 'Tampak belakang' : 'Tampak mata'}
          </button>
          {onStyle && (
            <button onClick={onStyle} className="h-8 border-[3px] border-ink bg-electric px-2 text-xs font-bold text-ink">
              Gaya
            </button>
          )}
        </div>
        <ul className="flex max-w-[200px] flex-wrap gap-1">
          {s.actors.map((a, i) => (
            <li key={i} data-seat={a.seat ?? undefined} className={cn('border-2 border-ink bg-paper px-1 text-[10px] leading-4 font-bold text-ink', a.seat !== null && !online[a.seat] && 'opacity-50')}>
              {nameOf(i)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-center">
        <span className="border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-sm leading-none text-ink uppercase shadow-slab-sm">{hud.zone}</span>
        <span className="mt-1 flex gap-1" aria-label={`Api unggun ${hud.lit + 1} dari ${s.opts.zones}`}>
          {Array.from({ length: s.opts.zones }, (_, i) => (
            <span key={i} className={cn('size-3 rotate-45 border-2 border-ink', i <= hud.lit ? 'bg-suit-orange' : 'bg-ink/30')} />
          ))}
          <span className={cn('ml-1 text-[11px] leading-3 font-bold text-paper [text-shadow:0_1px_0_#121212]')}>▲ {m.title}</span>
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-lg leading-none text-ink tabular-nums shadow-slab-sm">{clock(hud.secs)}</span>
        <span className="border-[3px] border-ink bg-electric px-2 py-0.5 font-display text-sm leading-none text-ink tabular-nums">{hud.alt} m</span>
        <span className="text-sm leading-none text-rose [text-shadow:0_1px_0_#121212]" aria-label={`${hud.lives} nyawa`}>
          {'♥'.repeat(hud.lives)}
        </span>
        {hud.sky !== 'cerah' && hud.skyK > 0.15 && <span className="border-2 border-ink bg-paper/90 px-1.5 text-[11px] leading-5 font-bold text-ink">{SKY_LABEL[hud.sky]}</span>}
      </div>
    </div>
  )
}

function useKeyboard(round: React.RefObject<Round | null>) {
  useEffect(() => {
    const held = new Set<string>()
    const apply = () => {
      const x = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0)
      const y = (held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)
      const len = Math.hypot(x, y) || 1
      const run = 0.9
      round.current?.setMove((x / len) * run, (y / len) * run)
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (e.repeat) return
      if (k === ' ') round.current?.jump()
      else if (k === 'shift') round.current?.grip(true)
      else if (k === 'control') round.current?.run(true)
      else if (k === 'e') round.current?.doAction()
      else if ('1234'.includes(k) && k.length === 1) round.current?.useSlot(Number(k) - 1)
      else if (k === 'q') round.current?.look(-40, 0)
      else if (k === 'r') round.current?.look(40, 0)
      held.add(k)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'shift') round.current?.grip(false)
      else if (k === 'control') round.current?.run(false)
      held.delete(k)
      apply()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [round])
}

function EndScreen({ s, seat, nameOf, act, exit }: { s: PuncakState; seat: number; nameOf: (a: number) => string; act: (a: PuncakAction) => void; exit: () => void }) {
  const stars = starsOf(s)
  const r = s.result
  useMusic('puncak')
  useEffect(() => playSound(r?.win ? 'menang' : 'kalah'), [r?.win])
  const m = MOUNTAINS[s.mountain]
  return (
    <div className="absolute inset-0 grid place-items-center bg-petal text-ink">
      {r?.win && <Lottie src={confetti} loop={false} className="pointer-events-none absolute inset-0 size-full" />}
      <div className="relative flex w-[min(560px,92vw)] flex-col gap-2">
        <h2 className="font-display text-3xl leading-none uppercase">
          <Tape tone={r?.win ? 'electric' : 'rose'}>{r?.win ? `Puncak ${m.title}!` : 'Nyawa habis'}</Tape>
        </h2>
        {stars > 0 && <Lottie src={fxStar} loop={false} className="pointer-events-none absolute -top-16 left-24 size-40" />}
        <p className="font-display text-5xl leading-none tracking-widest" aria-label={`${stars} bintang`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < stars ? 'text-suit-yellow [-webkit-text-stroke:2px_#121212]' : 'text-ink/20'}>
              ★
            </span>
          ))}
        </p>
        <p className="text-sm">{STAR_LINE[stars]}</p>
        <dl className="grid grid-cols-4 gap-1.5 text-center">
          {[
            ['Waktu', clock(r?.secs ?? 0)],
            ['Pingsan', r?.falls ?? 0],
            ['Item', r?.items ?? 0],
            ['Api unggun', `${(r?.camp ?? 0) + 1}/${s.opts.zones}`],
          ].map(([t, v]) => (
            <div key={t} className="border-[3px] border-ink bg-paper py-1">
              <dt className="text-[11px] font-bold uppercase">{t}</dt>
              <dd className="font-display text-2xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[12px] text-ink/70">Bintang 2: sampai di bawah {s.opts.zones === 4 ? '16' : '8'} menit · Bintang 3: pingsan paling banyak sekali</p>
        <ul className="flex flex-wrap gap-1">
          {s.actors.map((a, i) => (
            <li key={i} data-seat={a.seat ?? undefined} className="border-2 border-ink bg-paper px-1.5 text-[11px] font-bold">
              {nameOf(i)}
            </li>
          ))}
        </ul>
        {seat === 0 ? (
          <div className="flex justify-end gap-2">
            <Slab tone="paper" size="md" onClick={() => act({ type: 'again' })}>
              Daki lagi
            </Slab>
            <Slab tone="rose" size="md" onClick={exit}>
              Kembali ke room
            </Slab>
          </div>
        ) : (
          <p className="text-right text-sm">Menunggu host.</p>
        )}
      </div>
    </div>
  )
}
