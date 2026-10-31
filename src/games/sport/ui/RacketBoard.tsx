import { Lottie } from 'lottie-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import fxAce from '@/assets/lottie/sport-ace.json'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { GameProps } from '../../types'
import type { PoseFrame } from '../input/pose/tracker'
import { usePoseCamera } from '../input/pose/usePoseCamera'
import { CAMERA_GRACE_MS, landBackupMs, POINT_MS, SERVE_MS, windowMs } from '../sports/racket/engine'
import { SwingGesture } from '../sports/racket/gesture'
import { RacketScene } from '../sports/racket/scene'
import type { RacketMatch, ShotKind, SportAction, SportState } from '../types'
import { savedLook } from './lookStore'
import { CameraFrame, EndCard, SportMenu, StageCover } from './shared'
import { useSceneStage } from './useSceneStage'
import { useSportSettings } from './useSportSettings'

/** ayunan terlalu dini: tangan tidak bisa langsung mengayun lagi */
const WHIFF_LOCK_MS = 350

const WHY_WORD = { ace: 'ACE!', miss: 'POIN!', out: 'KELUAR' }

function SwingButtons({ canLob, serving, onSwing }: { canLob: boolean; serving: boolean; onSwing: (dir: number, shot: ShotKind) => void }) {
  const pad = 'touch-none select-none rounded-full border-[3px] border-ink font-display uppercase leading-tight text-ink shadow-slab active:translate-y-0.5'
  const down = (dir: number, shot: ShotKind) => (e: React.PointerEvent) => {
    e.preventDefault()
    onSwing(dir, shot)
  }
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">
      <button aria-label="Lob" disabled={serving} onPointerDown={down(0, 'lob')} className={`pointer-events-auto size-18 bg-electric text-[12px] disabled:opacity-40 ${pad}`}>
        Lob
      </button>
      <div className="pointer-events-auto flex items-end gap-2">
        <button aria-label="Pukul ke kiri" onPointerDown={down(-0.75, canLob ? 'smash' : 'drive')} className={`size-20 bg-rose text-lg ${pad}`}>
          ◀
        </button>
        <button aria-label="Pukul ke tengah" onPointerDown={down(0, canLob ? 'smash' : 'drive')} className={`size-20 bg-rose text-[12px] ${pad}`}>
          {canLob ? 'Smash' : serving ? 'Servis' : 'Pukul'}
        </button>
        <button aria-label="Pukul ke kanan" onPointerDown={down(0.75, canLob ? 'smash' : 'drive')} className={`size-20 bg-rose text-lg ${pad}`}>
          ▶
        </button>
      </div>
    </div>
  )
}

function SwingCamera({ active, onSwing, onButtons }: { active: boolean; onSwing: (shot: ShotKind, power: number) => void; onButtons: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const gesture = useRef(new SwingGesture())
  const since = useRef(0)
  const [found, setFound] = useState(false)
  const onFrame = (f: PoseFrame) => {
    const r = gesture.current.push(f.landmarks, f.at)
    setFound(r.ok)
    if (!r.ok) {
      since.current = 0
      return
    }
    since.current ||= f.at
    if (r.swing && f.at - since.current > 600) onSwing(r.swing.shot, r.swing.power)
  }
  const status = usePoseCamera(video, active, onFrame)
  const failed = status === 'denied' || status === 'failed'
  const line = failed ? 'Kamera tidak bisa dibuka' : status !== 'on' ? 'Menyiapkan kamera…' : found ? null : 'Mundur sampai bahu & pinggul kelihatan'
  return (
    <div className={`pointer-events-none absolute inset-0 ${active ? '' : 'invisible'}`}>
      <CameraFrame video={video} highlight={found} />
      {line && (
        <p aria-live="polite" className="absolute inset-x-0 bottom-20 mx-auto w-fit border-[3px] border-ink bg-paper px-3 py-1 text-center font-display text-xl leading-tight">
          {line}
        </p>
      )}
      {failed && (
        <Slab tone="rose" size="sm" className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2" onClick={onButtons}>
          Pakai tombol
        </Slab>
      )}
    </div>
  )
}

export function RacketBoard({ state: s, seat, names, online, act, exit }: GameProps<SportState, SportAction>) {
  const m = s.m as RacketMatch
  const foe = 1 - seat
  const cfg = useSportSettings(act)
  const { canvas, stage, scene, ready, broken } = useSceneStage((st) => {
    const sc = new RacketScene(st, m.sport, seat === 1)
    return { sc, load: () => sc.load(s.looks[seat], s.looks[foe]) }
  }, cfg.downgraded)
  const [word, setWord] = useState<string | null>(null)
  const [swingNow, setSwingNow] = useState(false)
  const arrive = useRef(0)
  const lock = useRef(0)
  const seen = useRef(0)
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const windowTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const latest = useRef(m)
  useEffect(() => {
    latest.current = m
  })

  const near = Math.max(...m.points) >= m.target - 1
  useMusic(near ? 'sport-tense' : 'sport')

  useEffect(() => {
    const l = savedLook()
    if (l) act({ type: 'look', look: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ready) scene.current?.sc.setLooks(s.looks[seat], s.looks[foe])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, s.looks])

  const grace = cfg.input === 'camera' ? CAMERA_GRACE_MS : 0
  const clearTimers = () => {
    if (missTimer.current) clearTimeout(missTimer.current)
    windowTimers.current.forEach(clearTimeout)
    windowTimers.current = []
    setSwingNow(false)
  }
  useEffect(() => clearTimers, [])

  // bola baru: jalankan di layar; kalau menuju kita, buka jendela pukul di HP ini
  useEffect(() => {
    const sc = scene.current?.sc
    const b = m.ball
    if (!ready || !sc || !b || seen.current === b.id) return
    seen.current = b.id
    clearTimers()
    const mine = b.by === seat
    sfx(m.sport === 'tenis' ? 'sport-racket' : 'sport-shuttle', { rate: b.kind === 'smash' ? 1.3 : 1 })
    if (!mine) sc.swing('foe', b.kind, sc.worldX(b.x))
    sc.fly(b, mine, () => {})
    if (mine) return
    const half = windowMs(b.x) + grace
    arrive.current = performance.now() + b.ms + grace
    windowTimers.current.push(setTimeout(() => setSwingNow(true), Math.max(0, b.ms + grace - half)))
    windowTimers.current.push(setTimeout(() => setSwingNow(false), b.ms + grace + half))
    // terlewat: lapor segera supaya poin tidak menunggu cadangan host
    missTimer.current = setTimeout(() => act({ type: 'land', id: b.id }), b.ms + grace + half + 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.ball])

  // ganti fase
  useEffect(() => {
    const sc = scene.current?.sc
    if (!ready || !sc) return
    if (m.phase === 'serve') {
      setWord(null)
      seen.current = 0
      sc.ready()
      sc.serveReady(m.server === seat ? 'me' : 'foe')
      if (m.server === seat) sfx('sport-turn', { delay: 150 })
    } else if ((m.phase === 'point' || m.phase === 'end') && m.last) {
      clearTimers()
      const iWon = m.last.winner === seat
      sc.celebrate(iWon ? 'me' : 'foe')
      setWord(WHY_WORD[m.last.why])
      sfx(iWon ? 'sport-spare' : 'sport-gutter')
      if (m.phase === 'end') sfx(m.winners.includes(seat) ? 'sport-champion' : 'sport-lose', { delay: 500 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.phase, m.phaseId])

  // jam host, baru jalan setelah arena siap
  const host = seat === 0
  useEffect(() => {
    if (!host || !ready) return
    const id = m.phaseId
    if (m.phase === 'serve') {
      const t = setTimeout(() => act({ type: 'auto', id }), online[m.server] === false ? 3000 : SERVE_MS)
      return () => clearTimeout(t)
    }
    if (m.phase === 'point') {
      const t = setTimeout(() => act({ type: 'next', id }), POINT_MS)
      return () => clearTimeout(t)
    }
    if (m.phase === 'rally' && m.ball) {
      const b = m.ball
      const t = setTimeout(() => act({ type: 'land', id: b.id }), landBackupMs(b) + 300)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, ready, m.phase, m.phaseId, m.ball?.id])

  const swing = useCallback(
    (dir: number, shot: ShotKind, power: number) => {
      const sc = scene.current?.sc
      const cur = latest.current
      const now = performance.now()
      if (!sc || now < lock.current) return
      if (cur.phase === 'serve') {
        if (cur.server !== seat) return
        sc.swing('me', 'smash', 0)
        act({ type: 'hit', id: cur.phaseId, x: sc.toCourt(dir), shot: 'drive', power, err: 0 })
        return
      }
      const b = cur.ball
      if (cur.phase !== 'rally' || !b || b.by === seat) return
      const half = windowMs(b.x) + grace
      const delta = now - arrive.current
      sc.swing('me', shot, sc.worldX(b.x))
      if (delta < -half) {
        // terlalu dini: ayunan kosong
        lock.current = now + WHIFF_LOCK_MS
        return
      }
      if (delta > half) return
      if (missTimer.current) clearTimeout(missTimer.current)
      setSwingNow(false)
      act({ type: 'hit', id: b.id, x: sc.toCourt(dir), shot, power, err: delta / half })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, grace, seat],
  )

  const myServe = m.phase === 'serve' && m.server === seat
  const incoming = m.phase === 'rally' && m.ball?.by === foe
  const canSmash = incoming && m.ball?.kind === 'lob'
  const won = m.winners.includes(seat)
  const head = `${names[m.winners[0]] ?? '?'} juara`

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0d0a18]">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />
      <StageCover ready={ready} broken={broken} label="Memasang jaring…" exit={exit} cfg={cfg} look={s.looks[seat]} />

      {swingNow && <div aria-hidden className="pointer-events-none absolute inset-0 border-[14px] border-electric" />}

      <header className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {[seat, foe].map((i) => (
            <div key={i} data-seat={i} className={`flex h-9 items-center gap-1.5 border-[3px] border-ink px-1.5 ${m.server === i && m.phase === 'serve' ? 'bg-electric' : 'bg-paper'}`}>
              <span className="max-w-20 truncate text-[12px] font-bold leading-none">{names[i]}</span>
              <b className="font-display text-lg leading-none">{m.points[i]}</b>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-9 items-center border-[3px] border-ink bg-paper px-2 text-[12px] font-bold">Sampai {m.target}</span>
          <button onClick={() => cfg.setMenu(true)} aria-label="Pengaturan" className="h-9 border-[3px] border-ink bg-paper px-2 font-display text-[12px]">
            Atur
          </button>
        </div>
      </header>

      {ready && cfg.input === 'buttons' && (myServe || incoming) && <SwingButtons canLob={!!canSmash} serving={myServe} onSwing={(d, k) => swing(d, k, k === 'smash' ? 0.9 : 0.55)} />}
      {ready && cfg.input === 'camera' && <SwingCamera active={m.phase !== 'end'} onSwing={(k, p) => swing(0, k, p)} onButtons={() => cfg.choose('buttons')} />}
      {ready && m.phase === 'serve' && !myServe && (
        <p className="absolute inset-x-0 bottom-4 text-center">
          <Tape tone="paper">{names[m.server]} servis</Tape>
        </p>
      )}
      {ready && cfg.input === 'camera' && myServe && (
        <p className="absolute inset-x-0 top-14 text-center">
          <Tape tone="electric">Ayunkan untuk servis!</Tape>
        </p>
      )}

      {word && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {word === 'ACE!' && <Lottie src={fxAce} autoplay loop={false} className="absolute size-[92vh]" />}
          <p className="relative -rotate-3 font-display text-6xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">{word}</p>
        </div>
      )}

      <SportMenu cfg={cfg} stage={stage.current} exit={exit} />
      {m.phase === 'end' && (
        <EndCard head={head} won={won} act={act} exit={exit}>
          <p className="font-display text-3xl leading-none">
            {m.points[seat]} – {m.points[foe]}
          </p>
          <p className="text-[13px] font-semibold">{won ? 'Lawanmu lari-lari ngejar angin doang.' : 'Raketnya baru dipanasin. Revans biar nggak penasaran?'}</p>
        </EndCard>
      )}
    </main>
  )
}
