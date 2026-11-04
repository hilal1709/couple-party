import { useEffect, useRef, useState } from 'react'
import { useMusic } from '@/audio/audio'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import { calibrate, classify, type Sensitivity } from '@/voice/loudness'
import { sharedMic, type MicStatus } from '@/voice/mic'
import type { GameProps } from '../../types'
import { collected } from '../engine'
import { Round, savedSens, type Hud } from '../round'
import { Ambient, playEnd, playSound } from '../sounds'
import type { SunyiAction, SunyiState } from '../types'
import { clock, DOWN_LINE, INTRO, ITEM_INFO, LEVEL_INFO, LOSE_LINE, SENS_INFO, WIN_LINE } from './copy'

type Props = GameProps<SunyiState, SunyiAction>

export function SunyiBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const amb = useRef<Ambient | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [failed, setFailed] = useState(false)
  const actRef = useRef(act)
  actRef.current = act
  const tense = s.phase === 'play' && !!hud && (hud.hunted || hud.fear > 0.55)
  useMusic(tense ? 'sunyi-tense' : 'sunyi')

  useEffect(() => {
    let r: Round
    try {
      r = new Round({
        canvas: canvas.current!,
        state: s,
        seat,
        act: (a) => actRef.current(a),
        live,
        onHud: setHud,
        onSound: playSound,
        onPresence: (w, pan) => amb.current?.presence(w, pan),
      })
    } catch {
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV) (window as unknown as { __sunyi?: Round }).__sunyi = r
    amb.current = new Ambient()
    amb.current.start()
    r.start().catch((e) => {
      console.error('Sunyi gagal memuat kampung', e)
      setFailed(true)
    })
    return () => {
      amb.current?.stop()
      r.dispose()
      round.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    round.current?.setState(s)
  }, [s])

  useEffect(() => {
    if (s.phase === 'end') playEnd(s.result === 'kabur')
  }, [s.phase, s.result])

  useKeyboard(round)
  const partner = s.opts.players > 1 ? names[seat === 0 ? 1 : 0] ?? 'Pasangan' : null

  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label="Kampung Sunyi" />
      {hud && !hud.post && <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)' }} />}
      {!hud && !failed && <LoadingScreen label="Menuju Kampung Sunyi" sub="Jangkriknya lagi disuruh diam" overlay />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-petal text-center text-ink">
          <div>
            <p className="font-display text-xl uppercase">Kampung gagal dimuat</p>
            <p className="mb-3 text-sm">HP-nya mungkin kehabisan memori. Coba tutup aplikasi lain.</p>
            <Slab tone="rose" size="md" onClick={exit}>
              Keluar
            </Slab>
          </div>
        </div>
      )}
      {hud && s.phase === 'play' && (
        <>
          <TouchLayer round={round} />
          <TopBar s={s} hud={hud} partner={partner} online={online[seat === 0 ? 1 : 0] ?? true} back={() => setConfirmExit(true)} />
          <MicMeter hud={hud} />
          <Controls s={s} hud={hud} round={round} />
          <Warnings hud={hud} partner={partner} />
          {hud.down && <DownScreen />}
        </>
      )}
      {hud && s.phase === 'calib' && <CalibPanel s={s} seat={seat} partner={partner} hud={hud} round={round} act={act} back={() => setConfirmExit(true)} />}
      {s.phase === 'end' && <EndScreen s={s} seat={seat} act={act} exit={exit} />}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Keluar dari kampung?" description="Kalian berdua kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

function useKeyboard(round: React.RefObject<Round | null>) {
  useEffect(() => {
    const held = new Set<string>()
    const apply = () => {
      const x = (held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0)
      const y = (held.has('w') ? 1 : 0) - (held.has('s') ? 1 : 0)
      round.current?.setMove(x, y)
      round.current?.setRun(held.has('shift'))
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (held.has(k)) return
      held.add(k)
      if (k === 'f') round.current?.toggleLight()
      if (k === 'e') round.current?.interact(true)
      if (k === 'arrowleft') round.current?.look(-60, 0)
      if (k === 'arrowright') round.current?.look(60, 0)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      held.delete(k)
      if (k === 'e') round.current?.interact(false)
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

/** kiri = stik gerak yang muncul di bawah jari; kanan = geser pandangan */
function TouchLayer({ round }: { round: React.RefObject<Round | null> }) {
  const el = useRef<HTMLDivElement>(null)
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const touches = useRef(new Map<number, { kind: 'stick' | 'look'; x: number; y: number }>())
  const down = (e: React.PointerEvent) => {
    el.current!.setPointerCapture(e.pointerId)
    const rect = el.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (px < rect.width * 0.42) {
      touches.current.set(e.pointerId, { kind: 'stick', x: e.clientX, y: e.clientY })
      setStick({ x: px, y: py, dx: 0, dy: 0 })
    } else touches.current.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY })
  }
  const move = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId)
    const r = round.current
    if (!t || !r) return
    if (t.kind === 'look') {
      r.look(e.clientX - t.x, e.clientY - t.y)
      t.x = e.clientX
      t.y = e.clientY
      return
    }
    const R = 52
    const dx = e.clientX - t.x
    const dy = e.clientY - t.y
    const len = Math.min(1, Math.hypot(dx, dy) / R)
    const a = Math.atan2(dy, dx)
    r.setMove(Math.cos(a) * len, -Math.sin(a) * len)
    setStick((s) => s && { ...s, dx: Math.cos(a) * len * R, dy: Math.sin(a) * len * R })
  }
  const up = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId)
    touches.current.delete(e.pointerId)
    if (t?.kind === 'stick') {
      round.current?.setMove(0, 0)
      setStick(null)
    }
  }
  return (
    <div ref={el} data-testid="sunyi-touch" className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {stick && (
        <span className="pointer-events-none absolute size-[104px] rounded-full border-[3px] border-paper/50 bg-ink/25" style={{ left: stick.x - 52, top: stick.y - 52 }}>
          <span className="absolute top-1/2 left-1/2 size-12 rounded-full border-[3px] border-ink bg-paper/80" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
        </span>
      )}
    </div>
  )
}

function TopBar({ s, hud, partner, online, back }: { s: SunyiState; hud: Hud; partner: string | null; online: boolean; back: () => void }) {
  const voice = hud.voice === 'connected' ? 'suara nyambung' : hud.voice === 'solo' ? '' : 'menyambung suara…'
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <button onClick={back} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold text-ink">
        Keluar
      </button>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 border-[3px] border-ink bg-paper px-2 py-0.5 text-ink shadow-slab-sm">
          <span className="font-display text-[11px] uppercase">Pusaka</span>
          <span className="font-display text-xl leading-none tabular-nums">
            {collected(s)}/{s.items.length}
          </span>
          <span className="text-[11px] tabular-nums">{clock(hud.secs)}</span>
        </div>
        {hud.zone && <span className="font-display text-[11px] text-paper/70 uppercase">{hud.zone}</span>}
      </div>
      {partner ? (
        <span className={cn('border-[3px] border-ink px-2 py-1 text-xs font-bold text-ink', hud.partnerDown ? 'bg-rose' : 'bg-electric', !online && 'opacity-50')}>
          {partner} · {hud.partnerDown ? 'pingsan!' : hud.partnerDist !== null ? `${hud.partnerDist} m` : '…'}
          {voice && <span className="block text-[10px] font-normal">{voice}</span>}
        </span>
      ) : (
        <span />
      )}
    </div>
  )
}

/** meter mic tegak: garis bahaya = mulai terdengar Penunggu */
function MicMeter({ hud }: { hud: Hud }) {
  const info = LEVEL_INFO[hud.level]
  const loud = hud.level === 'normal' || hud.level === 'teriak'
  return (
    <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 flex-col items-center gap-1">
      <div className="relative h-36 w-4 border-[3px] border-ink bg-ink/70">
        <div className={cn('absolute inset-x-0 bottom-0 transition-[height] duration-75', loud ? 'bg-rose' : 'bg-grass')} style={{ height: `${hud.meter.v * 100}%` }} />
        <div className="absolute inset-x-[-6px] h-[3px] bg-rose" style={{ bottom: `${hud.meter.danger * 100}%` }} />
      </div>
      <span className={cn('font-display text-[10px] uppercase', info.tone)}>{hud.micOk ? info.label : 'Mic mati'}</span>
    </div>
  )
}

function Controls({ s, hud, round }: { s: SunyiState; hud: Hud; round: React.RefObject<Round | null> }) {
  const pick = hud.canPick !== null ? s.items[hud.canPick] : null
  const showAct = !!pick || hud.canRevive
  return (
    <div className="absolute right-10 bottom-3 flex items-end gap-2.5">
      <Slab tone={hud.light ? 'electric' : 'paper'} size="sm" onClick={() => round.current?.toggleLight()}>
        Senter
      </Slab>
      <div className="flex flex-col items-center gap-1">
        {hud.stamina < 0.99 && (
          <div className="h-1.5 w-16 border-2 border-ink bg-ink">
            <div className="h-full bg-paper" style={{ width: `${hud.stamina * 100}%` }} />
          </div>
        )}
        <button
          className={cn('size-16 rounded-full border-[3px] border-ink font-display text-xs uppercase text-ink', hud.running ? 'bg-rose' : 'bg-paper/85')}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            round.current?.setRun(true)
          }}
          onPointerUp={() => round.current?.setRun(false)}
          onPointerCancel={() => round.current?.setRun(false)}
        >
          Lari
        </button>
      </div>
      {showAct && (
        <button
          className="relative size-20 overflow-hidden rounded-full border-[3px] border-ink bg-grass font-display text-[11px] leading-tight uppercase text-ink"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            round.current?.interact(true)
          }}
          onPointerUp={() => round.current?.interact(false)}
          onPointerCancel={() => round.current?.interact(false)}
        >
          {hud.canRevive && <span className="absolute inset-x-0 bottom-0 bg-electric" style={{ height: `${hud.revive * 100}%` }} />}
          <span className="relative px-1">{hud.canRevive ? 'Tahan: bangunkan' : `Ambil ${ITEM_INFO[pick!.kind]}`}</span>
        </button>
      )}
    </div>
  )
}

function Warnings({ hud, partner }: { hud: Hud; partner: string | null }) {
  let line: string | null = null
  let danger = false
  if (hud.hunted) {
    line = 'Ia mendengarmu… diam!'
    danger = true
  } else if (hud.level === 'teriak' || hud.level === 'normal') {
    line = 'Ssst! Pelankan suaramu.'
    danger = true
  } else if (hud.partnerDown && partner) line = `${partner} pingsan. Datangi dan tahan tombol untuk membangunkan.`
  else if (hud.gateOpen && hud.atGate && partner) line = `Tunggu ${partner} di gerbang…`
  else if (hud.gateOpen) line = 'Gerbang terbuka! Kumpul berdua di gerbang selatan.'
  else if (hud.secs < 14) line = INTRO[Math.min(INTRO.length - 1, Math.floor(hud.secs / 5))]
  else if (!hud.micOk) line = 'Mic mati. Penunggu tidak bisa mendengarmu, tapi pasanganmu juga tidak.'
  if (!line) return null
  return (
    <p
      className={cn(
        'pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit max-w-[70%] border-2 border-ink px-2 py-0.5 text-center text-[12px]',
        danger ? 'animate-pulse bg-rose font-display text-ink uppercase' : 'bg-paper/90 text-ink',
      )}
    >
      {line}
    </p>
  )
}

function DownScreen() {
  const [i] = useState(() => Math.floor(Math.random() * DOWN_LINE.length))
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 text-center">
      <p className="mx-auto w-fit border-2 border-ink bg-ink/80 px-3 py-1 font-display text-sm text-rose uppercase">{DOWN_LINE[i]}</p>
    </div>
  )
}

/** cek mic wajib: minta izin, ukur bising ruangan, rekam bisikan, lalu siap */
function CalibPanel({ s, seat, partner, hud, round, act, back }: { s: SunyiState; seat: number; partner: string | null; hud: Hud; round: React.RefObject<Round | null>; act: (a: SunyiAction) => void; back: () => void }) {
  const mic = sharedMic()
  const [status, setStatus] = useState<MicStatus>(mic.status)
  const [step, setStep] = useState<'izin' | 'diam' | 'bisik' | 'tes'>(mic.status === 'ok' ? (mic.meter.whisper !== null ? 'tes' : 'diam') : 'izin')
  const [sens, setSens] = useState<Sensitivity>(savedSens)
  const [left, setLeft] = useState(0)
  const ready = s.ready[seat]

  const ask = async () => {
    setStatus('asking')
    const st = await mic.start()
    setStatus(st)
    if (st === 'ok') {
      round.current?.startVoice()
      setStep('diam')
    }
  }

  // langkah berwaktu: diam 2 dtk (bising ruangan), bisik 4 dtk (rekam)
  useEffect(() => {
    if (step !== 'diam' && step !== 'bisik') return
    const secs = step === 'diam' ? 2 : 4
    const samples: number[] = []
    const start = performance.now()
    const id = setInterval(() => {
      const t = (performance.now() - start) / 1000
      setLeft(Math.max(0, Math.ceil(secs - t)))
      if (step === 'bisik') samples.push(mic.meter.db)
      if (t >= secs) {
        clearInterval(id)
        if (step === 'bisik') mic.meter = calibrate(mic.meter, samples)
        setStep(step === 'diam' ? 'bisik' : 'tes')
      }
    }, 50)
    return () => clearInterval(id)
  }, [step, mic])

  const level = classify(mic.meter, sens)
  const info = LEVEL_INFO[level]

  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/70 p-3 text-ink">
      <div className="w-full max-w-md border-[3px] border-ink bg-paper p-3 shadow-slab">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-xl leading-none">
            <Tape tone="rose">Cek mic</Tape>
          </h2>
          <button onClick={back} className="border-2 border-ink px-2 text-xs font-bold">
            Keluar
          </button>
        </div>
        <p className="mb-2 text-[13px] leading-snug">{INTRO[0]} Game ini wajib mic, dan sebaiknya pakai headset.</p>

        {step === 'izin' && (
          <div className="flex flex-col gap-2">
            {status === 'denied' && <p className="text-[13px] text-rose">Izin mic ditolak. Buka pengaturan aplikasi, izinkan Mikrofon, lalu coba lagi.</p>}
            {(status === 'failed' || status === 'unsupported') && <p className="text-[13px] text-rose">Mic tidak bisa dibuka di HP ini. Pastikan aplikasi lain tidak sedang memakai mic.</p>}
            <Slab tone="rose" size="lg" loading={status === 'asking'} onClick={ask}>
              Nyalakan mic
            </Slab>
          </div>
        )}
        {step === 'diam' && <p className="font-display text-lg uppercase">Diam dulu… {left}</p>}
        {step === 'bisik' && (
          <p className="font-display text-lg uppercase">
            Sekarang bisik: “aku takut, sayang” <span className="tabular-nums">{left}</span>
          </p>
        )}
        {step !== 'izin' && (
          <div className="my-2 flex items-center gap-2">
            <div className="relative h-4 flex-1 border-[3px] border-ink bg-ink/80">
              <div className={cn('absolute inset-y-0 left-0', level === 'normal' || level === 'teriak' ? 'bg-rose' : 'bg-grass')} style={{ width: `${hud.meter.v * 100}%` }} />
              <div className="absolute inset-y-[-6px] w-[3px] bg-rose" style={{ left: `${hud.meter.danger * 100}%` }} />
            </div>
            <span className={cn('w-20 font-display text-xs uppercase', info.tone === 'text-paper/70' ? 'text-ink/60' : info.tone)}>{info.label}</span>
          </div>
        )}
        {step === 'tes' && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-snug">Coba bicara biasa: kalau jarum lewat garis merah, Penunggu mendengarmu. Bisikan harus tetap di bawah garis.</p>
            <div className="flex items-center gap-2">
              <span className="font-display text-xs uppercase">Kepekaan</span>
              {(['peka', 'sedang', 'santai'] as const).map((v) => (
                <Slab
                  key={v}
                  size="sm"
                  tone={sens === v ? 'electric' : 'paper'}
                  active={sens === v}
                  onClick={() => {
                    setSens(v)
                    round.current?.setSens(v)
                  }}
                >
                  {SENS_INFO[v]}
                </Slab>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Slab tone="paper" size="sm" onClick={() => setStep('diam')}>
                Ulangi
              </Slab>
              <Slab tone="rose" size="md" className="ml-auto" disabled={ready} onClick={() => act({ type: 'ready' })}>
                {ready ? (partner ? `Nunggu ${partner}…` : 'Siap') : 'Aku siap'}
              </Slab>
            </div>
            {partner && <p className="text-[12px] text-ink/70">{hud.voice === 'connected' ? `Suara ${partner} sudah nyambung, coba saling bisik.` : 'Menyambungkan suara ke pasanganmu…'}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function EndScreen({ s, seat, act, exit }: { s: SunyiState; seat: number; act: (a: SunyiAction) => void; exit: () => void }) {
  const win = s.result === 'kabur'
  const [i] = useState(() => Math.floor(Math.random() * 2))
  return (
    <div className={cn('absolute inset-0 grid place-items-center p-3 text-ink', win ? 'bg-grass' : 'bg-ink')}>
      <div className="w-full max-w-md border-[3px] border-ink bg-paper p-4 shadow-slab">
        <h2 className="mb-1 font-display text-3xl leading-none">
          <Tape tone={win ? 'electric' : 'rose'}>{win ? 'Kabur!' : 'Tertangkap'}</Tape>
        </h2>
        <p className="mb-3 text-sm">{win ? WIN_LINE[i] : LOSE_LINE[i]}</p>
        <ul className="mb-3 grid grid-cols-3 gap-2 text-center">
          <li className="border-[3px] border-ink bg-electric p-1">
            <span className="block font-display text-xl">{clock(s.endT)}</span>
            <span className="text-[11px]">waktu</span>
          </li>
          <li className="border-[3px] border-ink bg-paper p-1">
            <span className="block font-display text-xl">
              {collected(s)}/{s.items.length}
            </span>
            <span className="text-[11px]">pusaka</span>
          </li>
          <li className="border-[3px] border-ink bg-rose p-1">
            <span className="block font-display text-xl">{s.downs.reduce((a, b) => a + b, 0)}</span>
            <span className="text-[11px]">kali pingsan</span>
          </li>
        </ul>
        <div className="flex gap-2">
          {seat === 0 && (
            <Slab tone="rose" size="md" onClick={() => act({ type: 'again' })}>
              Main lagi
            </Slab>
          )}
          <Slab tone="paper" size="md" className="ml-auto" onClick={exit}>
            Keluar
          </Slab>
        </div>
      </div>
    </div>
  )
}
