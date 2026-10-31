import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import fxBull from '@/assets/lottie/sport-bullseye.json'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { GameProps } from '../../types'
import { ARROWS, totalArrows } from '../sports/archery/engine'
import { ArcheryScene, SHOT_MS } from '../sports/archery/scene'
import { AIM_MAX, type ArrowAim } from '../sports/archery/sim'
import { BowGesture } from '../sports/archery/gesture'
import type { ArcheryMatch, ArrowShot, SportAction, SportState } from '../types'
import type { PoseFrame } from '../input/pose/tracker'
import { usePoseCamera } from '../input/pose/usePoseCamera'
import { savedLook } from './lookStore'
import { CameraFrame, EndCard, SportMenu, StageCover } from './shared'
import { useSceneStage } from './useSceneStage'
import { useSportSettings } from './useSportSettings'

const TURN_MS = 45000
const OFFLINE_MS = 8000
/** satu layar penuh digeser = sejauh ini di sasaran */
const DRAG_RANGE = 2.4

function WindFlag({ wind }: { wind: number }) {
  const v = Math.abs(wind)
  return (
    <div className="flex h-9 items-center gap-1 border-[3px] border-ink bg-paper px-2 text-[12px] font-bold">
      Angin
      <span aria-hidden className={wind < 0 ? 'rotate-180' : ''}>
        {v < 0.3 ? '•' : v < 2 ? '→' : '⇒'}
      </span>
      <b className="font-display">{v.toFixed(1)}</b>
    </div>
  )
}

/** Giliran lewat kamera: rentangkan tangan, tarik ke dagu, tahan, lepas. */
function BowCamera({ active, onAim, onDraw, onLoose, onButtons }: { active: boolean; onAim: (a: ArrowAim) => void; onDraw: (on: boolean) => void; onLoose: () => void; onButtons: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const gesture = useRef(new BowGesture())
  const [read, setRead] = useState<'find' | 'pose' | 'draw'>('find')
  const onFrame = (f: PoseFrame) => {
    const r = gesture.current.push(f.landmarks, f.at)
    setRead(!r.ok ? 'find' : r.drawing ? 'draw' : 'pose')
    onDraw(r.drawing)
    if (r.drawing || r.loose) onAim(r.aim)
    if (r.loose) onLoose()
  }
  const status = usePoseCamera(video, active, onFrame)
  useEffect(() => {
    if (active) gesture.current.reset()
  }, [active])
  const failed = status === 'denied' || status === 'failed'
  const line = failed ? 'Kamera tidak bisa dibuka' : status !== 'on' ? 'Menyiapkan kamera…' : read === 'find' ? 'Mundur sampai bahu & pinggul kelihatan' : read === 'pose' ? 'Rentangkan satu tangan ke samping, tarik tangan lain ke dagu' : 'Tahan… lepas!'
  return (
    <div className={`pointer-events-none absolute inset-0 ${active ? '' : 'invisible'}`}>
      <CameraFrame video={video} highlight={read === 'draw'} />
      <p aria-live="polite" className={`absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[60%] border-[3px] border-ink px-3 py-1 text-center font-display text-lg leading-tight ${read === 'draw' ? 'bg-electric' : 'bg-paper'}`}>
        {line}
      </p>
      {failed && (
        <Slab tone="rose" size="sm" className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2" onClick={onButtons}>
          Pakai tombol
        </Slab>
      )}
    </div>
  )
}

/** Tombol: geser layar untuk membidik, tahan tombol menarik, lepas memanah. */
function BowButtons({ scene, onLoose }: { scene: React.RefObject<ArcheryScene | null>; onLoose: () => void }) {
  const aim = useRef<ArrowAim>({ x: 0, y: 0 })
  const last = useRef<{ x: number; y: number } | null>(null)
  const [held, setHeld] = useState(0)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const move = (e: React.PointerEvent) => {
    if (!last.current) return
    const w = window.innerWidth
    const k = DRAG_RANGE / w
    const clamp = (v: number) => Math.max(-AIM_MAX, Math.min(AIM_MAX, v))
    aim.current = { x: clamp(aim.current.x + (e.clientX - last.current.x) * k), y: clamp(aim.current.y - (e.clientY - last.current.y) * k) }
    last.current = { x: e.clientX, y: e.clientY }
    scene.current?.setAim(aim.current)
  }

  const down = () => {
    scene.current?.setDrawing(true)
    const tick = () => {
      setHeld(scene.current?.draw() ?? 0)
      raf.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const up = () => {
    cancelAnimationFrame(raf.current)
    setHeld(0)
    onLoose()
  }

  return (
    <>
      <div
        aria-label="Geser untuk membidik"
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          last.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerMove={move}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
      <p className="pointer-events-none absolute bottom-4 left-3 border-[3px] border-ink bg-paper px-2 py-1 text-[12px] font-bold">Geser layar untuk membidik</p>
      <div className="absolute bottom-3 right-3 flex items-end gap-2">
        <div aria-hidden className="relative h-24 w-5 border-[3px] border-ink bg-paper">
          <div className="absolute inset-x-0 bottom-0 bg-rose" style={{ height: `${held * 100}%` }} />
        </div>
        <button onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} className="size-24 touch-none select-none rounded-full border-[3px] border-ink bg-rose font-display text-sm uppercase leading-tight text-ink shadow-slab active:translate-y-0.5">
          Tarik
          <br />
          lepas!
        </button>
      </div>
    </>
  )
}

export function ArcheryBoard({ state: s, seat, names, online, act, exit }: GameProps<SportState, SportAction>) {
  const m = s.m as ArcheryMatch
  const cfg = useSportSettings(act)
  const { canvas, stage, scene, ready, broken } = useSceneStage((st) => new ArcheryScene(st), cfg.downgraded)
  const [score, setScore] = useState<ArrowShot | null>(null)
  const played = useRef(0)
  const myTurn = m.phase === 'aim' && m.turn === seat

  useMusic(m.end === m.ends - 1 ? 'sport-tense' : 'sport')

  useEffect(() => {
    const l = savedLook()
    if (l) act({ type: 'look', look: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const taken = (m.scores[m.turn]?.[m.end] ?? []).length
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    sc.setArcher(s.looks[m.turn])
    if (m.phase === 'aim') {
      setScore(null)
      if (taken === 0) sc.clearStuck()
      sc.startAim(myTurn)
      if (myTurn) sfx('sport-turn', { delay: 200 })
    } else if (m.phase === 'fly' && m.shot && played.current !== m.shot.id) {
      played.current = m.shot.id
      const shot = m.shot
      sfx('sport-bowstring')
      sc.shoot(shot, () => {
        setScore(shot)
        sfx(shot.score ? 'sport-thunk' : 'sport-gutter')
        if (shot.score >= 9) sfx('sport-strike', { delay: 150 })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.phase, m.shotId, myTurn, s.looks])

  const host = seat === 0
  useEffect(() => {
    if (!host || m.phase !== 'fly' || !m.shot) return
    const id = m.shot.id
    const t = setTimeout(() => act({ type: 'next', id }), SHOT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, m.phase, m.shot?.id])

  useEffect(() => {
    if (!host || !ready || m.phase !== 'aim') return
    const t = setTimeout(() => act({ type: 'auto', id: m.shotId }), online[m.turn] === false ? OFFLINE_MS : TURN_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, ready, m.phase, m.shotId, online[m.turn]])

  useEffect(() => {
    if (m.phase === 'end') sfx(m.winners.includes(seat) ? 'sport-champion' : 'sport-lose')
  }, [m.phase, m.winners, seat])

  const loose = () => {
    const sc = scene.current
    if (!sc || !myTurn) return
    act({ type: 'shoot', id: m.shotId, aim: sc.currentAim(), draw: sc.draw() })
  }

  const totals = m.scores.map(totalArrows)
  const top = Math.max(...totals)
  const won = m.winners.includes(seat)
  const head = m.winners.length > 1 ? 'Seri!' : `${names[m.winners[0]] ?? '?'} juara`

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#9bd8f5]">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />
      <StageCover ready={ready} broken={broken} label="Memasang sasaran…" exit={exit} cfg={cfg} look={s.looks[seat]} />

      {ready && myTurn && cfg.input === 'buttons' && <BowButtons key={m.shotId} scene={scene} onLoose={loose} />}
      {ready && cfg.input === 'camera' && (
        <BowCamera active={myTurn} onAim={(a) => scene.current?.setAim(a)} onDraw={(on) => scene.current?.setDrawing(on)} onLoose={loose} onButtons={() => cfg.choose('buttons')} />
      )}

      <header className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {m.scores.map((_, i) => (
            <div key={i} data-seat={i} className={`flex h-9 min-w-0 items-center gap-1.5 border-[3px] border-ink px-1.5 ${m.turn === i && m.phase !== 'end' ? 'bg-electric' : 'bg-paper'}`}>
              <span className={`max-w-16 truncate text-[12px] leading-none ${i === seat ? 'font-bold' : 'font-semibold'}`}>{names[i] ?? `Kursi ${i + 1}`}</span>
              <b className="font-display text-base leading-none">{totals[i]}</b>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 gap-1">
          <WindFlag wind={m.wind} />
          <span className="flex h-9 items-center border-[3px] border-ink bg-paper px-2 text-[12px] font-bold">
            Babak {m.end + 1}/{m.ends} · {Math.min(ARROWS, taken + 1)}/{ARROWS}
          </span>
          <button onClick={() => cfg.setMenu(true)} aria-label="Pengaturan" className="pointer-events-auto h-9 border-[3px] border-ink bg-paper px-2 font-display text-[12px]">
            Atur
          </button>
        </div>
      </header>

      {ready && m.phase === 'aim' && !myTurn && (
        <p className="absolute inset-x-0 bottom-4 text-center">
          <Tape tone="paper">Giliran {names[m.turn]}</Tape>
        </p>
      )}

      {score && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {score.score >= 9 && <Lottie src={fxBull} autoplay loop={false} className="absolute size-[92vh]" />}
          <p className="relative -rotate-3 font-display text-7xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">{score.score ? score.score : 'MELESET'}</p>
        </div>
      )}

      <SportMenu cfg={cfg} stage={stage.current} exit={exit} />
      {m.phase === 'end' && (
        <EndCard head={head} won={won} act={act} exit={exit}>
          <ol className="space-y-0.5 text-[13px] font-semibold">
            {[...totals.keys()]
              .sort((a, b) => totals[b] - totals[a])
              .map((i, r) => (
                <li key={i} className={i === seat ? 'font-bold' : ''}>
                  {r + 1}. {names[i]} · {totals[i]} poin
                </li>
              ))}
          </ol>
          <p className="text-[13px] font-semibold">{won ? `${top} poin. Sasarannya udah kayak landak.` : 'Sasarannya masih mulus tuh. Revans biar nggak penasaran?'}</p>
        </EndCard>
      )}
    </main>
  )
}
