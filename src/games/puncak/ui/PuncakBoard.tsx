import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import confetti from '@/assets/lottie/confetti.json'
import fxFire from '@/assets/lottie/puncak-api.json'
import fxSummit from '@/assets/lottie/puncak-puncak.json'
import { useMusic } from '@/audio/audio'
import { HoldButton } from '@/components/controls/HoldButton'
import { Joystick } from '@/components/controls/Joystick'
import { TapButton } from '@/components/controls/TapButton'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import { onBack } from '@/platform/back'
import type { GameProps } from '../../types'
import { actorOf, starsOf } from '../engine'
import { randomLook, saveFirstPerson, savedFirstPerson, savedLook, saveLook } from '../look'
import { MOUNTAINS, zoneCount } from '../mountains'
import { checkWebGL2 } from '../platform/webgl'
import { BUTTON_SCALE, loadSettings, saveSettings, type PuncakSettings } from '../platform/settings'
import { Round, type Hud, type Perf, type Pop } from '../round'
import { ITEMS } from '../sim/items'
import { AmbLoop, playSound, RainLoop, WindLoop } from '../sounds'
import type { PuncakAction, PuncakState } from '../types'
import { botName, clock, STAR_LINE } from './copy'
import { LookMaker } from './LookMaker'
import { PauseMenu } from './PauseMenu'

type Props = GameProps<PuncakState, PuncakAction>

const GFX_LABEL: Record<string, string> = { low: 'Hemat', med: 'Sedang', high: 'Tinggi' }

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
      ) : !checkWebGL2().ok ? (
        <Incompatible back={exit} />
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
  const [settings, setSettings] = useState<PuncakSettings>(loadSettings)
  const settingsRef = useRef(settings)
  const [paused, setPaused] = useState(false)
  const [glLost, setGlLost] = useState(false)
  const [perf, setPerf] = useState<Perf | null>(null)
  const me = actorOf(s, seat)
  const together = s.actors.filter((a) => a.seat !== null).length > 1
  const myLook = (me >= 0 ? s.looks[me] : null) ?? savedLook() ?? randomLook(7)[0]

  useEffect(() => {
    let r: Round
    const onPop = (p: Pop) => {
      const item = { ...p, id: ++popId.current }
      setPops((x) => [...x.slice(-2), item])
      setTimeout(() => setPops((x) => x.filter((y) => y.id !== item.id)), 2200)
    }
    try {
      r = new Round({ canvas: canvas.current!, state: s, seat, look: savedLook(), fp: savedFirstPerson(), act: (a) => actRef.current(a), live, onHud: setHud, onPop, onSound: playSound, nameOf: (a) => nameRef.current(a), settings: settingsRef.current, onGl: setGlLost })
    } catch {
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV || import.meta.env.VITE_QA === '1') (window as unknown as { __puncak?: Round }).__puncak = r
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

  // aplikasi ke latar (tombol home, telepon masuk): loop berhenti; kembali = lanjut
  useEffect(() => {
    const vis = () => round.current?.setPaused(document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])
  // tombol kembali Android / Escape = buka-tutup menu jeda, bukan keluar aplikasi
  // tombol kembali saat jendela Gaya terbuka menutup jendela itu dulu
  const stylingRef = useRef(false)
  stylingRef.current = styling
  useEffect(
    () =>
      onBack(() => {
        if (stylingRef.current) setStyling(false)
        else setPaused((v) => !v)
      }),
    [],
  )
  useEffect(() => {
    round.current?.setFrozen(paused && !together)
    if (paused) round.current?.setMove(0, 0)
  }, [paused, together])
  useEffect(() => {
    if (!settings.stats) return setPerf(null)
    const id = setInterval(() => round.current && setPerf(round.current.perf()), 500)
    return () => clearInterval(id)
  }, [settings.stats])
  const changeSettings = (v: PuncakSettings) => {
    setSettings(v)
    settingsRef.current = v
    saveSettings(v)
    round.current?.applySettings(v)
  }
  const k = BUTTON_SCALE[settings.buttons]
  // musik berganti saat naik ke tebing besar atau saat badai
  useMusic(hud?.high ? 'puncak-tinggi' : 'puncak')
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
  // suasana alam: hutan, air terjun, api unggun
  const amb = useRef<{ hutan: AmbLoop; air: AmbLoop; api: AmbLoop } | null>(null)
  useEffect(() => {
    amb.current = { hutan: new AmbLoop('hutan', 0.55), air: new AmbLoop('airterjun', 0.7), api: new AmbLoop('unggun', 0.6) }
    return () => {
      amb.current?.hutan.stop()
      amb.current?.air.stop()
      amb.current?.api.stop()
    }
  }, [])
  // api unggun baru menyala: animasi nyala sebentar di tengah atas layar
  const lit = hud?.lit ?? 0
  const [fire, setFire] = useState(0)
  const litSeen = useRef(lit)
  useEffect(() => {
    if (lit <= litSeen.current) return
    litSeen.current = lit
    setFire((n) => n + 1)
    const id = window.setTimeout(() => setFire(0), 1600)
    return () => clearTimeout(id)
  }, [lit])
  const ambQ = (v: number | undefined) => Math.round((v ?? 0) * 10) / 10
  const [aH, aA, aF] = [ambQ(hud?.amb.hutan), ambQ(hud?.amb.air), ambQ(hud?.amb.api)]
  useEffect(() => {
    amb.current?.hutan.set(aH)
    amb.current?.air.set(aA)
    amb.current?.api.set(aF)
  }, [aH, aA, aF])
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
      <Joystick className="absolute inset-y-0 left-0 w-[46%]" deadzone={0.12} onMove={(x, y) => round.current?.setMove(x, y)} />
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
            back={() => setPaused(true)}
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
          <PauseMenu
            open={paused}
            onOpenChange={setPaused}
            settings={settings}
            onSettings={changeSettings}
            gfxNow={GFX_LABEL[round.current?.perf().q ?? ''] ?? ''}
            together={together}
            onLeave={() => {
              setPaused(false)
              back()
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
            onMenu={(what, i) => {
              const r = round.current
              if (what === 'buang') r?.dropSlot(i)
              if (what === 'kasih') r?.giveSlot(i)
              if (what === 'lempar') r?.throwSlot(i)
              if (what === 'simpan') r?.stashSlot(i)
              setPickSlot(null)
            }}
            onBag={(i) => round.current?.unstashSlot(i)}
          />
          {fire > 0 && <Lottie key={fire} src={fxFire} loop={false} className="pointer-events-none absolute top-[70px] left-1/2 size-36 -translate-x-1/2" aria-hidden />}
          {hud.campWait && (
            <div className="pointer-events-none absolute top-[88px] left-1/2 -translate-x-1/2 border-[3px] border-ink bg-paper px-2 py-0.5 text-xs font-bold text-ink" role="status">
              Api unggun menunggu semua: {hud.campWait.have}/{hud.campWait.need} pendaki
            </div>
          )}
          {hud.carrying !== null && (
            <div className="pointer-events-none absolute top-[88px] left-1/2 -translate-x-1/2 border-[3px] border-ink bg-electric px-2 py-0.5 text-xs font-bold text-ink" role="status">
              Menggendong {nameOf(hud.carrying)} · bawa ke api unggun
            </div>
          )}
          {/* ibu jari kanan: Lompat paling besar di pojok, Pegang di sebelahnya, Lari/Lunge & aksi di atasnya */}
          <div className="absolute right-[max(12px,env(safe-area-inset-right))] bottom-[max(12px,env(safe-area-inset-bottom))] flex origin-bottom-right items-end gap-2" style={{ scale: k }}>
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
          {hud.net && !hud.net.synced && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/55 text-center text-paper">
              <p>
                <span className="block font-display text-xl uppercase">Menyambung ke host</span>
                <span className="text-sm">Mengambil posisi pendaki dari HP host…</span>
              </p>
            </div>
          )}
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
          {perf && <PerfOverlay perf={perf} rtt={hud.rtt} />}
          {glLost && (
            <div className="absolute inset-0 grid place-items-center bg-ink/80 text-center text-paper">
              <p>
                <span className="block font-display text-xl uppercase">Memulihkan grafis</span>
                <span className="text-sm">HP sempat melepas layar 3D. Tunggu sebentar.</span>
              </p>
            </div>
          )}
          {import.meta.env.DEV && !perf && (
            <span className="pointer-events-none absolute bottom-1 left-1 bg-ink/70 px-1 text-[10px] text-paper tabular-nums">
              {hud.fps} fps · {hud.mode} · aksi {hud.rtt === null ? 'host' : `${Math.round(hud.rtt)} ms`}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/** statistik frame untuk uji performa (Pengaturan → Grafis → Statistik) */
function PerfOverlay({ perf: p, rtt }: { perf: Perf; rtt: number | null }) {
  const label = { low: 'Hemat', med: 'Sedang', high: 'Tinggi' }[p.q] ?? p.q
  return (
    <div className="pointer-events-none absolute top-[44px] left-[max(8px,env(safe-area-inset-left))] border-2 border-ink bg-ink/75 px-1.5 py-0.5 font-mono text-[10px] leading-[13px] text-paper tabular-nums">
      <div>
        {p.fps}/{p.cap} fps · 1% {p.low1} · 5% {p.low5}
      </div>
      <div>
        p95 {p.p95Ms} ms · {label} {p.height}p ×{p.scale.toFixed(2)}
      </div>
      <div>
        {p.calls} draw · {Math.round(p.tris / 1000)}k tri · {p.tex} tex
      </div>
      {rtt !== null && <div>ping {Math.round(rtt)} ms</div>}
    </div>
  )
}

/** kualitas sinyal ke host: titik warna + teks saat buruk (warna saja tidak cukup untuk buta warna) */
function NetDot({ net, rtt }: { net: NonNullable<Hud['net']>; rtt: number | null }) {
  const label = net.q === 'putus' ? 'Terputus' : net.q === 'lemah' ? 'Sinyal lemah' : null
  return (
    <span className="flex items-center gap-1" role="status" aria-label={label ?? `Sinyal baik${rtt !== null ? `, ${Math.round(rtt)} ms` : ''}`}>
      <span className={cn('size-3 rounded-full border-2 border-ink', net.q === 'baik' ? 'bg-grass' : net.q === 'lemah' ? 'bg-suit-yellow' : 'animate-pulse bg-rose')} />
      {label && <span className="border-2 border-ink bg-paper px-1 text-[11px] leading-4 font-bold text-ink">{label}</span>}
    </span>
  )
}

/** HP tanpa WebGL 2: jelaskan, jangan layar hitam */
function Incompatible({ back }: { back: () => void }) {
  const gl = checkWebGL2()
  return (
    <div className="absolute inset-0 grid place-items-center bg-petal p-4 text-center text-ink">
      <div className="max-w-[460px]">
        <p className="font-display text-xl uppercase">HP ini belum bisa mendaki</p>
        <p className="mb-1 text-sm">Puncak Berdua butuh grafis WebGL 2. {gl.ok ? '' : gl.reason === 'small' ? 'GPU HP ini terlalu tua untuk tekstur gunung.' : 'WebView di HP ini tidak menyediakannya.'}</p>
        <p className="mb-3 text-[12px] text-ink/70">Coba perbarui "Android System WebView" di Play Store, lalu buka lagi.{gl.gpu ? ` GPU: ${gl.gpu}` : ''}</p>
        <Slab tone="rose" size="md" onClick={back}>
          Kembali ke room
        </Slab>
      </div>
    </div>
  )
}

/**
 * Bar stamina: hijau = stamina sekarang; segmen status menggerogoti dari ujung kanan (luka, lapar, dingin,
 * panas, racun), jadi stamina maksimal = panjang bar dikurangi semua segmen. Bar kedua di bawahnya =
 * stamina bonus dari makanan, terpakai lebih dulu.
 */
function StaminaBar({ hud }: { hud: Hud }) {
  const f = hud.fat
  const parts: [string, number, string][] = [
    ['Racun', f.poison, 'bg-[#a64dff]'],
    ['Panas', f.heat, 'bg-[#ff6b35]'],
    ['Dingin', f.cold, 'bg-[#7ab8ff]'],
    ['Lapar', f.hunger, 'bg-[repeating-linear-gradient(135deg,#e8a317_0_4px,#c98810_4px_8px)]'],
    ['Luka', f.fall, 'bg-[#e8432f]'],
  ]
  const low = hud.stamina + hud.bonus < 0.22
  return (
    <div className="pointer-events-none absolute right-[max(218px,calc(env(safe-area-inset-right)+206px))] bottom-[76px] w-[234px]" aria-label={`Stamina ${Math.round(hud.stamina * 100)}%${hud.bonus > 0.01 ? `, bonus ${Math.round(hud.bonus * 100)}%` : ''}`}>
      <div className={cn('relative h-4 overflow-hidden border-[3px] border-ink bg-ink/40', low && 'animate-pulse')}>
        <span className={cn('absolute inset-y-0 left-0', low ? 'bg-rose' : 'bg-electric')} style={{ width: `${hud.stamina * 100}%` }} />
        <span className="absolute inset-0 flex flex-row-reverse">
          {parts.map(([key, v, c]) => (v > 0.005 ? <span key={key} className={cn('h-full shrink-0 border-l border-ink/50', c)} style={{ width: `${Math.min(1, v) * 100}%` }} title={key} /> : null))}
        </span>
      </div>
      {/* bar bonus: kapsul kecil kalau kosong */}
      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-[10px] leading-none font-bold text-electric [text-shadow:0_1px_0_#121212]" aria-hidden>
          ⚡
        </span>
        <div className="relative h-2 border-2 border-ink bg-ink/40" style={{ width: hud.bonus > 0.01 ? `${(hud.bonus / 0.6) * 60}%` : '18px' }}>
          {hud.bonus > 0.01 && <span className="absolute inset-0 bg-[#d7f25a]" />}
        </div>
      </div>
      <div className="mt-0.5 flex justify-center gap-1.5 text-[10px] font-bold text-paper [text-shadow:0_1px_0_#121212]">
        {parts.filter(([, v]) => v > 0.03).map(([key]) => (
          <span key={key}>{key}</span>
        ))}
        {(Object.entries(hud.buffs) as [string, number][])
          .filter(([, v]) => v > 0)
          .map(([key, v]) => (
            <span key={key} className="text-electric">
              {ITEMS[key as keyof typeof ITEMS]?.title ?? key} {Math.ceil(v)}s
            </span>
          ))}
      </div>
    </div>
  )
}

type Menu = 'buang' | 'kasih' | 'lempar' | 'simpan'

/** 3 saku (dipakai kapan saja) + tombol ransel (4 slot, dibongkar saat berdiri). Tekan lama saku = menu. */
function Inventory({ hud, pick, onTap, onLong, onMenu, onBag }: { hud: Hud; pick: number | null; onTap: (i: number) => void; onLong: (i: number) => void; onMenu: (what: Menu, i: number) => void; onBag: (i: number) => void }) {
  const timer = useRef<number | null>(null)
  const long = useRef(false)
  const [open, setOpen] = useState(false)
  const inBag = hud.bag.filter(Boolean).length
  const bagFree = hud.bag.includes(null)
  return (
    <div className="absolute right-[max(218px,calc(env(safe-area-inset-right)+206px))] bottom-3 flex gap-1.5">
      {Array.from({ length: hud.inv.length || 3 }, (_, i) => {
        const id = hud.inv[i]
        const info = id ? ITEMS[id] : null
        return (
          <div key={i} className="relative">
            <button
              aria-label={info ? `${info.title}: ${info.line}` : 'Saku kosong'}
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
                <Slab tone="electric" size="sm" onClick={() => onMenu('lempar', i)}>
                  Lempar
                </Slab>
                {hud.giveTo !== null && (
                  <Slab tone="electric" size="sm" onClick={() => onMenu('kasih', i)}>
                    Kasih
                  </Slab>
                )}
                {hud.canBag && bagFree && (
                  <Slab tone="paper" size="sm" onClick={() => onMenu('simpan', i)}>
                    Ransel
                  </Slab>
                )}
                <Slab tone="paper" size="sm" onClick={() => onMenu('buang', i)}>
                  Buang
                </Slab>
              </div>
            )}
          </div>
        )
      })}
      <div className="relative">
        <button
          aria-label={`Ransel: ${inBag} dari ${hud.bag.length} terisi`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn('grid h-[54px] w-[54px] place-items-center border-[3px] border-ink p-0.5 text-center shadow-slab-sm', open ? 'bg-electric' : 'bg-paper/90')}
        >
          <span className="block text-[10px] leading-[11px] font-bold text-ink">Ransel</span>
          <span className="block text-[10px] font-bold text-ink/70">
            {inBag}/{hud.bag.length}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 bottom-[124px] flex w-[200px] flex-col gap-1 border-[3px] border-ink bg-paper p-1.5" role="group" aria-label="Isi ransel">
            <span className="text-[10px] font-bold text-ink/70">{hud.canBag ? 'Ketuk untuk pindah ke saku' : 'Berdiri dulu untuk membongkar ransel'}</span>
            <div className="grid grid-cols-4 gap-1">
              {hud.bag.map((id, i) => {
                const info = id ? ITEMS[id] : null
                return (
                  <button key={i} disabled={!id || !hud.canBag} aria-label={info ? `Ambil ${info.title}` : 'Slot ransel kosong'} onClick={() => onBag(i)} className="grid h-[44px] place-items-center border-2 border-ink bg-paper/90 p-0.5 disabled:opacity-50">
                    {info ? (
                      <>
                        <span className="block size-3 rounded-full border-2 border-ink" style={{ background: info.color }} />
                        <span className="block text-[8px] leading-[9px] font-bold text-ink">{info.title}</span>
                      </>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
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
    <div className="pointer-events-none absolute top-2 right-[max(8px,env(safe-area-inset-right))] left-[max(8px,env(safe-area-inset-left))] flex items-start justify-between gap-2">
      <div className="flex flex-col items-start gap-1">
        <div className="pointer-events-auto flex gap-1">
          <button onClick={back} aria-label="Menu jeda" className="h-8 min-w-11 border-[3px] border-ink bg-paper px-2 text-xs font-bold text-ink">
            Jeda
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
        <span className="mt-1 flex gap-1" aria-label={`Api unggun ${hud.lit + 1} dari ${zoneCount(s.mountain, s.opts.zones)}`}>
          {Array.from({ length: zoneCount(s.mountain, s.opts.zones) }, (_, i) => (
            <span key={i} className={cn('size-3 rotate-45 border-2 border-ink', i <= hud.lit ? 'bg-suit-orange' : 'bg-ink/30')} />
          ))}
          <span className={cn('ml-1 text-[11px] leading-3 font-bold text-paper [text-shadow:0_1px_0_#121212]')}>▲ {m.title}</span>
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="flex items-center gap-1.5">
          {hud.net && <NetDot net={hud.net} rtt={hud.rtt} />}
          <span className="border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-lg leading-none text-ink tabular-nums shadow-slab-sm">{clock(hud.secs)}</span>
        </span>
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
        {r?.win && <Lottie src={fxSummit} loop={false} className="pointer-events-none absolute -top-20 left-20 size-44" />}
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
            ['Api unggun', `${(r?.camp ?? 0) + 1}/${zoneCount(s.mountain, s.opts.zones)}`],
          ].map(([t, v]) => (
            <div key={t} className="border-[3px] border-ink bg-paper py-1">
              <dt className="text-[11px] font-bold uppercase">{t}</dt>
              <dd className="font-display text-2xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[12px] text-ink/70">Bintang 2: sampai di bawah {zoneCount(s.mountain, s.opts.zones) * 4} menit · Bintang 3: pingsan paling banyak sekali</p>
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
