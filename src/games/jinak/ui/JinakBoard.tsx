import { ArrowLeft01Icon, ArrowTurnBackwardIcon, ArrowTurnForwardIcon, ZoomOutAreaIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Lottie } from 'lottie-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { hatch } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import fxBoom from '@/assets/lottie/bom-boom.json'
import confetti from '@/assets/lottie/confetti.json'
import type { GameProps } from '../../types'
import { clockText } from '../engine'
import type { BombScene } from '../render/bomb'
import { QUALITIES, QUALITY_TITLE, savedQuality, saveQuality, type Quality } from '../render/stage'
import { cuesFor } from '../sounds'
import type { JinakAction, JinakState } from '../types'
import { MODULE_TITLE, boomLine, defusedLine, who } from './copy'
import { ManualView } from './ManualView'

type Props = GameProps<JinakState, JinakAction>

const SPRITES = import.meta.glob('/src/assets/jinak/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const sprite = (n: string) => SPRITES[`/src/assets/jinak/${n}.webp`]

const leftOf = (s: JinakState, elapsed: number) => (s.phase === 'live' ? Math.max(0, s.timeLeft - elapsed * s.rate) : s.phase === 'intro' ? s.timeLeft : s.finalLeft)

/**
 * Jam lokal: sisa waktu dihitung sejak clockId terakhir berubah di HP ini.
 * `left` untuk tampilan (diperbarui 5x per detik), `leftNow()` presisi untuk aksi & layar 3D.
 */
function useClock(s: JinakState) {
  const id = s.clockId
  const mark = useRef({ id, at: 0 })
  const [clock, setClock] = useState({ id, elapsed: 0 })
  useEffect(() => {
    if (mark.current.id !== id || !mark.current.at) mark.current = { id, at: Date.now() }
    const t = setInterval(() => setClock({ id, elapsed: Date.now() - mark.current.at }), 200)
    return () => clearInterval(t)
  }, [id])
  const sRef = useRef(s)
  useEffect(() => {
    sRef.current = s
  })
  const leftNow = useCallback(() => {
    const m = mark.current
    const st = sRef.current
    return leftOf(st, m.id === st.clockId && m.at ? Date.now() - m.at : 0)
  }, [])
  return { left: leftOf(s, clock.id === id ? clock.elapsed : 0), leftNow }
}

export function JinakBoard({ state: s, seat, names, act, exit }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const defuser = s.defuser === seat
  const { left, leftNow: leftFn } = useClock(s)
  const tense = s.phase === 'live' && left < 30000

  useMusic(tense ? 'spy-tense' : 'spy')

  // host: waktu habis
  const actRef = useRef(act)
  useEffect(() => {
    actRef.current = act
  })
  useEffect(() => {
    if (seat !== 0 || s.phase !== 'live') return
    const id = s.clockId
    const t = setTimeout(() => actRef.current({ type: 'timeout', clockId: id }), Math.max(0, s.timeLeft / s.rate) + 150)
    return () => clearTimeout(t)
  }, [seat, s.phase, s.clockId, s.timeLeft, s.rate])

  // detak per detik, makin keras saat gawat
  const sec = Math.ceil(left / 1000)
  useEffect(() => {
    if (s.phase === 'live' && sec > 0) sfx('bom-tick', { volume: (defuser ? 0.55 : 0.3) * (sec <= 30 ? 1.4 : 1), rate: sec <= 10 ? 1.3 : 1 })
  }, [sec, s.phase, defuser])

  const prev = useRef<JinakState | null>(null)
  useEffect(() => {
    cuesFor(prev.current, s, seat).forEach((c) => sfx(c.sfx, c))
    prev.current = s
  }, [s, seat])

  const done = s.phase === 'defused' || s.phase === 'boom'

  return (
    <div className="relative h-dvh overflow-hidden bg-[#0d0a0c] text-ink">
      {defuser ? (
        <DefuserView s={s} act={act} left={leftFn} onBack={() => setConfirmExit(true)} />
      ) : (
        <ExpertView s={s} seat={seat} names={names} left={left} onBack={() => setConfirmExit(true)} />
      )}
      {s.phase === 'intro' && <IntroPanel s={s} seat={seat} names={names} act={act} />}
      {done && <ResultPanel s={s} seat={seat} names={names} act={act} />}
      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Kabur dari bom?"
        description="Ronde ini berhenti dan semua kembali ke menu room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

function TopBar({ onBack, children }: { onBack: () => void; children?: React.ReactNode }) {
  return (
    <header className="pointer-events-auto flex items-center gap-2">
      <button
        onClick={onBack}
        aria-label="Kembali ke menu"
        className="grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
      </button>
      <SoundButton />
      {children}
    </header>
  )
}

/* ---------- penjinak: bom 3D ---------- */

function DefuserView({ s, act, left, onBack }: { s: JinakState; act: (a: JinakAction) => void; left: () => number; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<BombScene | null>(null)
  const [ready, setReady] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)
  const [quality, setQuality] = useState<Quality>(savedQuality)
  const live = useRef({ s, act, left })
  useEffect(() => {
    live.current = { s, act, left }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gone = false
    let scene: BombScene | null = null
    import('../render/bomb').then(async ({ BombScene }) => {
      if (gone) return
      scene = new BombScene(canvas, savedQuality(), {
        act: (a) => live.current.act({ ...a, left: live.current.left() } as JinakAction),
        left: () => live.current.left(),
        onFocus: setFocus,
      })
      scene.stage.onDowngrade = setQuality
      sceneRef.current = scene
      if (import.meta.env.DEV) (window as unknown as { __jinakScene: BombScene }).__jinakScene = scene
      await scene.load()
      if (gone) return
      scene.setState(live.current.s, live.current.s.phase === 'live')
      setReady(true)
    })
    return () => {
      gone = true
      scene?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setState(s, s.phase === 'live')
  }, [s, ready])

  // denyut merah grading saat waktu < 30 detik
  useEffect(() => {
    const t = setInterval(() => {
      const sc = sceneRef.current
      if (!sc) return
      const l = live.current.left()
      sc.stage.heat = live.current.s.phase === 'live' && l < 30000 ? 1 - l / 30000 : 0
    }, 250)
    return () => clearInterval(t)
  }, [])

  const cycleQuality = () => {
    const q = QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length]
    setQuality(q)
    saveQuality(q)
    sceneRef.current?.stage.setQuality(q)
  }

  const boom = s.phase === 'boom'
  return (
    <>
      <canvas ref={canvasRef} className={cn('absolute inset-0 size-full touch-none', boom && 'animate-pulse')} aria-label="Bom 3D. Ketuk modul untuk mendekat, geser untuk memutar." />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="border-[3px] border-ink bg-paper px-4 py-2 font-display uppercase shadow-slab">Merakit bom…</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-[max(10px,env(safe-area-inset-left))] py-[max(8px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        <div className="flex items-start justify-between gap-2">
          <TopBar onBack={onBack}>
            <button onClick={cycleQuality} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-1 font-display text-[11px] uppercase shadow-slab-sm" aria-label="Ganti kualitas grafis">
              Grafis: {QUALITY_TITLE[quality]}
            </button>
          </TopBar>
          <div className="flex flex-col items-end gap-1">
            <Tape tone="rose">Kamu penjinak</Tape>
            <span className="bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-paper">Ronde {s.round} · jelasin ke pakar apa yang kamu lihat</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="max-w-[46%] bg-ink/70 px-2 py-1 text-[12px] font-semibold leading-snug text-paper">
            {focus === null
              ? 'Ketuk modul untuk mendekat. Geser layar atau pakai tombol putar untuk lihat sisi bom (nomor seri, baterai, stiker).'
              : `${MODULE_TITLE[s.modules[focus].kind]} — ${s.modules[focus].kind === 'tombol' ? 'tekan sebentar, atau tahan sampai lampu strip menyala.' : 'ketuk bagiannya.'}`}
          </p>
          <div className="pointer-events-auto flex gap-1.5">
            {focus !== null ? (
              <Slab tone="paper" size="sm" onClick={() => sceneRef.current?.focus(null)}>
                <HugeiconsIcon icon={ZoomOutAreaIcon} size={16} /> Mundur
              </Slab>
            ) : (
              <>
                <Slab tone="paper" size="sm" aria-label="Putar ke kiri" onClick={() => sceneRef.current?.turn(1)}>
                  <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={16} />
                </Slab>
                <Slab tone="paper" size="sm" onClick={() => sceneRef.current?.turn(0)}>
                  Depan
                </Slab>
                <Slab tone="paper" size="sm" aria-label="Putar ke kanan" onClick={() => sceneRef.current?.turn(-1)}>
                  <HugeiconsIcon icon={ArrowTurnForwardIcon} size={16} />
                </Slab>
              </>
            )}
          </div>
        </div>
      </div>
      {boom && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Lottie src={fxBoom} autoplay loop={false} className="w-[70vmin]" />
        </div>
      )}
    </>
  )
}

/* ---------- pakar: buku panduan ---------- */

function ExpertView({ s, seat, names, left, onBack }: { s: JinakState; seat: number; names: string[]; left: number; onBack: () => void }) {
  const solved = s.solved.filter(Boolean).length
  const tense = s.phase === 'live' && left < 30000
  return (
    <div className="flex h-full gap-2.5 bg-petal px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]" style={{ backgroundImage: hatch('#121212', 10, 0.08) }}>
      <ManualView className="min-w-0 flex-[2.2]" />
      <aside className="flex min-w-[190px] flex-1 flex-col gap-2 pb-[max(4px,env(safe-area-inset-bottom))]">
        <TopBar onBack={onBack} />
        <Tape tone="electric">Kamu pakar</Tape>
        <p className="text-[12px] font-semibold leading-snug">
          {who(s.defuser, seat, names)} pegang bomnya. Kamu nggak bisa lihat bom, jadi tanya terus: "modulnya kayak apa? warnanya apa?"
        </p>
        <div className={cn('border-[3px] border-ink bg-[#120303] px-3 py-2 text-center shadow-slab', tense && 'animate-pulse')}>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-[#ff9a8a]">Sisa waktu</span>
          <span className="block font-mono text-4xl font-black tabular-nums text-[#ff3a24]" style={{ textShadow: '0 0 12px #ff3a2499' }}>
            {clockText(left)}
          </span>
          <span className="mt-1 flex justify-center gap-1" aria-label={`Salah ${s.strikes} dari ${s.opts.strikes}`}>
            {Array.from({ length: s.opts.strikes }, (_, i) => (
              <span key={i} className={cn('size-4 rounded-sm border border-[#ff3a24]', i < s.strikes ? 'bg-[#ff3a24]' : 'bg-transparent')} />
            ))}
          </span>
        </div>
        <div className="border-[3px] border-ink bg-paper px-2 py-1.5 shadow-slab-sm">
          <span className="font-display text-[12px] uppercase">Modul beres</span>
          <span className="mt-1 flex gap-1">
            {s.solved.map((v, i) => (
              <span key={i} className={cn('size-4 rounded-full border-2 border-ink', v ? 'bg-electric' : 'bg-ink/15')} />
            ))}
          </span>
          <span className="text-[11px] font-bold text-ink/70">
            {solved} dari {s.modules.length}
          </span>
        </div>
      </aside>
    </div>
  )
}

/* ---------- panel ---------- */

function IntroPanel({ s, seat, names, act }: { s: JinakState; seat: number; names: string[]; act: (a: JinakAction) => void }) {
  const me = s.defuser === seat
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/55 p-4">
      <div className="flex max-w-[560px] items-center gap-4 border-[3px] border-ink bg-paper p-4 shadow-slab">
        <img src={sprite(me ? 'role-penjinak' : 'role-pakar')} alt="" className="w-[120px] shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl uppercase leading-none">
            Ronde {s.round}: {me ? 'kamu penjinak' : 'kamu pakar'}
          </h2>
          <p className="text-[13px] leading-snug">
            {me
              ? `Kamu pegang bomnya, tapi nggak punya buku panduan. Ceritakan semua yang kamu lihat ke ${names.filter((_, i) => i !== seat).join(' & ') || 'pakar'}.`
              : `${who(s.defuser, seat, names)} pegang bomnya. Kamu pegang buku panduan. Jangan intip layar penjinak ya!`}
          </p>
          <p className="text-[12px] font-bold text-ink/70">Telepon / VC dulu sebelum mulai. Waktu langsung jalan begitu ditekan.</p>
          <Slab tone="rose" onClick={() => act({ type: 'start' })}>
            Mulai jinakkan
          </Slab>
        </div>
      </div>
    </div>
  )
}

function ResultPanel({ s, seat, names, act }: { s: JinakState; seat: number; names: string[]; act: (a: JinakAction) => void }) {
  const ok = s.phase === 'defused'
  const wins = s.history.filter((h) => h.ok).length
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/55 p-4">
      {ok && <Lottie src={confetti} autoplay loop={false} className="pointer-events-none absolute inset-0" />}
      <div className="relative flex max-w-[600px] items-center gap-4 border-[3px] border-ink bg-paper p-4 shadow-slab">
        <img src={sprite(ok ? 'jinak-win' : 'jinak-lose')} alt="" className="w-[150px] shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl uppercase leading-none">{ok ? 'Bom jinak!' : 'DUAR!'}</h2>
          <p className="text-[13px] font-semibold leading-snug">{ok ? defusedLine(s, seat, names) : boomLine(s, seat, names)}</p>
          <p className="text-[12px] font-bold text-ink/70">
            Skor tim: {wins} dari {s.history.length} bom dijinakkan. Ronde berikutnya peran gantian.
          </p>
          <Slab tone="electric" onClick={() => act({ type: 'next' })}>
            Bom berikutnya
          </Slab>
        </div>
      </div>
    </div>
  )
}
