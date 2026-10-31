import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import fxGoal from '@/assets/lottie/sport-goal.json'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { GameProps } from '../../types'
import type { PoseFrame } from '../input/pose/tracker'
import { usePoseCamera } from '../input/pose/usePoseCamera'
import { REGULATION, SET_MS } from '../sports/penalty/engine'
import { KeeperGesture, KickGesture } from '../sports/penalty/gesture'
import { PenaltyScene, SHOT_MS } from '../sports/penalty/scene'
import type { Dive, KickAim, PenaltyMatch, PenaltyResult, SportAction, SportState } from '../types'
import { savedLook } from './lookStore'
import { CameraFrame, EndCard, SportMenu, StageCover } from './shared'
import { useSceneStage } from './useSceneStage'
import { useSportSettings } from './useSportSettings'

const WORD: Record<PenaltyResult['why'], string> = { goal: 'GOL!', save: 'DITEPIS!', wide: 'MELESET', over: 'MELAMBUNG' }

function Dots({ log }: { log: boolean[] }) {
  const n = Math.max(REGULATION, log.length)
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full border-2 border-ink ${log[i] === undefined ? 'bg-paper' : log[i] ? 'bg-electric' : 'bg-rose'}`} />
      ))}
    </span>
  )
}

/** Usap ke arah gawang: arah = sudut usapan, tinggi = panjangnya, tenaga = kecepatannya. */
function KickPad({ onKick }: { onKick: (k: KickAim) => void }) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  return (
    <div
      aria-label="Usap ke arah gawang untuk menendang"
      className="absolute inset-0 top-12 touch-none"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
      }}
      onPointerUp={(e) => {
        const b = start.current
        start.current = null
        if (!b) return
        const dx = e.clientX - b.x
        const dy = b.y - e.clientY
        if (dy < 40) return
        const ms = Math.max(40, performance.now() - b.t)
        onKick({ x: dx / (window.innerWidth * 0.2), y: dy / (window.innerHeight * 0.75), power: Math.min(1, Math.hypot(dx, dy) / ms / 1.4) })
      }}
    >
      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center">
        <Tape tone="electric">Usap ke atas ke arah gawang!</Tape>
      </p>
    </div>
  )
}

const DIVE_BUTTONS: { dir: Dive; label: string; text: string }[] = [
  { dir: 'R', label: 'Menyelam ke kiri layar', text: '◀' },
  { dir: 'C', label: 'Jaga tengah', text: 'Tengah' },
  { dir: 'L', label: 'Menyelam ke kanan layar', text: '▶' },
]

/** Tombol kiper. Layar kiper menghadap penendang, jadi kiri layar = sisi kanan gawang bagi penendang. */
function DivePad({ onDive }: { onDive: (d: Dive) => void }) {
  return (
    <div className="absolute inset-x-3 bottom-3 flex items-end justify-center gap-6">
      {DIVE_BUTTONS.map((b) => (
        <button key={b.dir} aria-label={b.label} onClick={() => onDive(b.dir)} className="size-20 touch-none rounded-full border-[3px] border-ink bg-rose font-display text-[11px] uppercase text-ink shadow-slab active:translate-y-0.5">
          {b.text}
        </button>
      ))}
    </div>
  )
}

function PenaltyCamera({ active, taking, onKick, onDive, onButtons }: { active: boolean; taking: boolean; onKick: (k: KickAim) => void; onDive: (d: Dive) => void; onButtons: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const kick = useRef(new KickGesture())
  const keep = useRef(new KeeperGesture())
  const since = useRef(0)
  const [found, setFound] = useState(false)
  const onFrame = (f: PoseFrame) => {
    const r = taking ? kick.current.push(f.landmarks, f.at) : keep.current.push(f.landmarks)
    setFound(r.ok)
    if (!r.ok) {
      since.current = 0
      return
    }
    since.current ||= f.at
    if (f.at - since.current < 800) return
    if ('kick' in r && r.kick) onKick(r.kick)
    if ('dive' in r && r.dive) onDive(r.dive)
  }
  const status = usePoseCamera(video, active, onFrame)
  useEffect(() => {
    if (!active) return
    since.current = 0
    kick.current.reset()
    keep.current.reset()
  }, [active])
  const failed = status === 'denied' || status === 'failed'
  const line = failed ? 'Kamera tidak bisa dibuka' : status !== 'on' ? 'Menyiapkan kamera…' : !found ? (taking ? 'Mundur sampai kaki kelihatan' : 'Mundur sampai bahu & pinggul kelihatan') : taking ? 'Condong untuk arah, lalu TENDANG!' : 'Condong kiri/kanan, atau angkat dua tangan'
  return (
    <div className={`pointer-events-none absolute inset-0 ${active ? '' : 'invisible'}`}>
      <CameraFrame video={video} highlight={found} />
      <p aria-live="polite" className={`absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[60%] border-[3px] border-ink px-3 py-1 text-center font-display text-lg leading-tight ${found ? 'bg-electric' : 'bg-paper'}`}>
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

export function PenaltyBoard({ state: s, seat, names, act, exit }: GameProps<SportState, SportAction>) {
  const m = s.m as PenaltyMatch
  const cfg = useSportSettings(act)
  const { canvas, stage, scene, ready, broken } = useSceneStage((st) => new PenaltyScene(st), cfg.downgraded)
  const [word, setWord] = useState<PenaltyResult['why'] | null>(null)
  const played = useRef(0)
  const taking = m.taker === seat
  const foe = 1 - seat
  const picked = m.phase === 'set' && (taking ? !!m.kick : !!m.dive)
  const choosing = m.phase === 'set' && !picked

  useMusic(m.log[0].length >= REGULATION - 1 ? 'sport-tense' : 'sport')

  useEffect(() => {
    const l = savedLook()
    if (l) act({ type: 'look', look: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    if (m.phase === 'set') {
      setWord(null)
      sc.setup(s.looks[m.taker], s.looks[1 - m.taker], taking ? 'taker' : 'keeper')
      sfx('sport-turn', { delay: 200 })
    } else if (m.phase === 'shot' && m.result && played.current !== m.result.id) {
      played.current = m.result.id
      const r = m.result
      sfx('sport-kick', { delay: 640 })
      sc.play(r, () => {
        setWord(r.why)
        if (r.why === 'goal') sfx(r.taker === seat ? 'sport-strike' : 'sport-gutter')
        else sfx(r.taker === seat ? 'sport-gutter' : 'sport-spare')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.phase, m.shotId, s.looks])

  const host = seat === 0
  useEffect(() => {
    // jam baru jalan setelah arena siap: memuat di HP lambat tidak boleh memakan giliran
    if (!host || !ready || m.phase === 'end') return
    const id = m.shotId
    const t = setTimeout(() => act(m.phase === 'set' ? { type: 'auto', id } : { type: 'next', id }), m.phase === 'set' ? SET_MS : SHOT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, ready, m.phase, m.shotId])

  useEffect(() => {
    if (m.phase === 'end') sfx(m.winners.includes(seat) ? 'sport-champion' : 'sport-lose')
  }, [m.phase, m.winners, seat])

  const kick = (k: KickAim) => choosing && taking && act({ type: 'kick', id: m.shotId, ...k })
  const dive = (d: Dive) => choosing && !taking && act({ type: 'dive', id: m.shotId, dir: d })
  const won = m.winners.includes(seat)
  const head = m.winners.length > 1 ? 'Seri!' : `${names[m.winners[0]] ?? '?'} juara`

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0c1a33]">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />
      <StageCover ready={ready} broken={broken} label="Mengapur lapangan…" exit={exit} cfg={cfg} look={s.looks[seat]} />

      <header className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
        {[seat, foe].map((i) => (
          <div key={i} data-seat={i} className="flex min-w-0 items-center gap-1.5 border-[3px] border-ink bg-paper px-1.5 py-1">
            <span className="max-w-20 truncate text-[12px] font-bold leading-none">{names[i]}</span>
            <b className="font-display text-base leading-none">{m.goals[i]}</b>
            <Dots log={m.log[i]} />
          </div>
        ))}
        <button onClick={() => cfg.setMenu(true)} aria-label="Pengaturan" className="h-9 shrink-0 border-[3px] border-ink bg-paper px-2 font-display text-[12px]">
          Atur
        </button>
      </header>

      {ready && choosing && cfg.input === 'buttons' && (taking ? <KickPad onKick={kick} /> : <DivePad onDive={dive} />)}
      {ready && cfg.input === 'camera' && <PenaltyCamera active={choosing} taking={taking} onKick={kick} onDive={dive} onButtons={() => cfg.choose('buttons')} />}
      {ready && picked && (
        <p className="absolute inset-x-0 bottom-4 text-center">
          <Tape tone="paper">Menunggu {names[foe]}…</Tape>
        </p>
      )}

      {word && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {word === 'goal' && <Lottie src={fxGoal} autoplay loop={false} className="absolute size-[92vh]" />}
          <p className="relative -rotate-3 font-display text-6xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">{WORD[word]}</p>
        </div>
      )}

      <SportMenu cfg={cfg} stage={stage.current} exit={exit} />
      {m.phase === 'end' && (
        <EndCard head={head} won={won} act={act} exit={exit}>
          <p className="font-display text-3xl leading-none">
            {m.goals[seat]} – {m.goals[foe]}
          </p>
          <p className="text-[13px] font-semibold">{won ? 'Kipernya masih nyari bolanya di jaring.' : 'Gawangnya bolong. Revans biar nggak penasaran?'}</p>
        </EndCard>
      )}
    </main>
  )
}
