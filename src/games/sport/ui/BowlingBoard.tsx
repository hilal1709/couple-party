import { Lottie } from 'lottie-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import fxGutter from '@/assets/lottie/sport-gutter.json'
import fxSpare from '@/assets/lottie/sport-spare.json'
import fxStrike from '@/assets/lottie/sport-strike.json'
import { Modal } from '@/components/feedback/Modal'
import { Tape } from '@/components/memphis/Slab'
import type { GameProps } from '../../types'
import { SHIRTS } from '../look'
import { savedQuality, Stage } from '../render/stage'
import { cuesFor } from '../sounds'
import { AFTER_MS, BowlingScene, WINDUP_MS } from '../sports/bowling/scene'
import { rollMarks, runningScores, totalScore } from '../sports/bowling/score'
import type { BowlThrow } from '../sports/bowling/sim'
import type { BowlingMatch, BowlRoll, RollCall, SportAction, SportState } from '../types'
import { BowlButtons } from './BowlButtons'
import { BowlCamera } from './BowlCamera'
import { CALL_WORD } from './copy'
import { savedLook } from './lookStore'
import { EndCard, SportMenu, StageCover } from './shared'
import { useSportSettings } from './useSportSettings'

/** jatah waktu satu giliran */
const TURN_MS = 60000
/** pemain putus: ditunggu sebentar sebelum dilempar otomatis */
const OFFLINE_MS = 8000

const CALL_FX: Partial<Record<RollCall, object>> = { strike: fxStrike, spare: fxSpare, gutter: fxGutter }

function ScoreChip({ seat, name, total, on, me }: { seat: number; name: string; total: number; on: boolean; me: boolean }) {
  return (
    <div data-seat={seat} className={`flex h-9 min-w-0 items-center gap-1.5 border-[3px] border-ink px-1.5 ${on ? 'bg-electric' : 'bg-paper'}`}>
      <span className={`max-w-16 truncate text-[12px] leading-none ${me ? 'font-bold' : 'font-semibold'}`}>{name}</span>
      <b className="font-display text-base leading-none">{total}</b>
    </div>
  )
}

function ScoreTable({ m, names, seat }: { m: BowlingMatch; names: string[]; seat: number }) {
  const { rolls, frames } = m
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center text-[12px]">
        <thead>
          <tr>
            <th className="text-left font-display">Pemain</th>
            {Array.from({ length: frames }, (_, f) => (
              <th key={f} className="font-display">
                {f + 1}
              </th>
            ))}
            <th className="font-display">Total</th>
          </tr>
        </thead>
        <tbody>
          {rolls.map((p, i) => {
            const run = runningScores(p, frames)
            return (
              <tr key={i} className={i === seat ? 'font-bold' : ''}>
                <td className="max-w-20 truncate pr-1 text-left">{names[i]}</td>
                {Array.from({ length: frames }, (_, f) => (
                  <td key={f} className="min-w-10 border-2 border-ink px-0.5 leading-tight">
                    <div className="h-4">{rollMarks(p[f] ?? [], f === frames - 1).join(' ')}</div>
                    <div className="h-4 font-display">{run[f] ?? ''}</div>
                  </td>
                ))}
                <td className="border-2 border-ink px-1 font-display">{totalScore(p, frames)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EndScreen({ m, names, seat, act, exit }: Pick<GameProps<SportState, SportAction>, 'names' | 'seat' | 'act' | 'exit'> & { m: BowlingMatch }) {
  const rank = m.rolls.map((p) => totalScore(p, m.frames)).sort((a, b) => b - a)
  const won = m.winners.includes(seat)
  const head = m.winners.length > 1 ? 'Seri!' : `${names[m.winners[0]] ?? '?'} juara`
  return (
    <EndCard head={head} won={won} act={act} exit={exit}>
      <ScoreTable m={m} names={names} seat={seat} />
      <p className="text-[13px] font-semibold">{won ? `${rank[0]} poin. Pinnya sampai minta ampun.` : 'Pinnya masih pada berdiri nih. Revans biar nggak penasaran?'}</p>
    </EndCard>
  )
}

export function BowlingBoard({ state: s, seat, names, online, act, exit }: GameProps<SportState, SportAction>) {
  const m = s.m as BowlingMatch
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const scene = useRef<BowlingScene | null>(null)
  const prev = useRef<SportState | null>(null)
  const played = useRef(0)
  const [ready, setReady] = useState(false)
  const [broken, setBroken] = useState(false)
  const cfg = useSportSettings(act)
  const [call, setCall] = useState<RollCall | null>(null)
  const [scores, setScores] = useState(false)

  const myTurn = m.phase === 'aim' && m.turn === seat
  const lastFrame = m.frame === m.frames - 1
  useMusic(lastFrame ? 'sport-tense' : 'sport')

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let alive = true
    const st = new Stage(cv, savedQuality())
    const sc = new BowlingScene(st)
    stage.current = st
    st.onDowngrade = cfg.downgraded
    sc.load()
      .then(() => {
        if (!alive) return
        scene.current = sc
        st.start()
        setReady(true)
      })
      .catch(() => alive && setBroken(true))
    return () => {
      alive = false
      scene.current = null
      stage.current = null
      setReady(false)
      st.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // penampilan tersimpan dikirim sekali begitu papan terbuka
  useEffect(() => {
    const l = savedLook()
    if (l) act({ type: 'look', look: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dressThrower = useCallback(() => {
    const look = s.looks[m.turn]
    scene.current?.setPlayer(look, SHIRTS[look.shirt])
  }, [s.looks, m.turn])

  // ikuti state: tiap giliran baru menyiapkan adegan, tiap lemparan baru diputar sekali
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    dressThrower()
    if (m.phase === 'aim') {
      setCall(null)
      sc.setRack(m.standing)
      sc.backToAim()
      sc.setAim({ x: 0, dir: 0, speed: 8, spin: 0 }, myTurn)
    } else if (m.phase === 'roll' && m.roll && played.current !== m.roll.id) {
      played.current = m.roll.id
      playRoll(sc, m.roll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.phase, m.rollId, myTurn, dressThrower])

  const playRoll = (sc: BowlingScene, r: BowlRoll) => {
    const hit = () => sfx(r.knocked.length >= 7 ? 'sport-pins' : 'sport-pins-few', { volume: 0.5 + r.knocked.length * 0.05 })
    sc.playRoll(r, {
      onRelease: () => sfx('sport-roll', { volume: 0.8, rate: 0.85 + r.th.speed * 0.03 }),
      onFirstHit: hit,
    })
    sfx('sport-throw', { delay: WINDUP_MS - 200 })
    if (CALL_WORD[r.call]) {
      window.setTimeout(() => {
        setCall(r.call)
        sfx(r.call === 'strike' ? 'sport-strike' : r.call === 'spare' ? 'sport-spare' : 'sport-gutter')
      }, WINDUP_MS + r.ms * 0.8)
    }
  }

  // suara giliran & hasil akhir
  useEffect(() => {
    cuesFor(prev.current, s, seat).forEach((c) => sfx(c.sfx, c))
    prev.current = s
  }, [s, seat])

  // jam milik host: tutup lemparan, dan gantikan pemain yang menghilang
  const host = seat === 0
  useEffect(() => {
    if (!host || m.phase !== 'roll' || !m.roll) return
    const id = m.roll.id
    const wait = WINDUP_MS + m.roll.ms + AFTER_MS
    const t = setTimeout(() => act({ type: 'next', id }), wait)
    return () => clearTimeout(t)
  }, [host, m.phase, m.roll, act])

  useEffect(() => {
    if (!host || !ready || m.phase !== 'aim') return
    const t = setTimeout(() => act({ type: 'auto', id: m.rollId }), online[m.turn] === false ? OFFLINE_MS : TURN_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, ready, m.phase, m.rollId, online[m.turn], act])

  const aim = useCallback((th: BowlThrow) => scene.current?.setAim(th, true), [])
  const shoot = (th: BowlThrow) => {
    if (myTurn) act({ type: 'throw', id: m.rollId, th })
  }

  const frameLabel = useMemo(() => `Frame ${m.frame + 1}/${m.frames}`, [m.frame, m.frames])
  const totals = m.rolls.map((p) => totalScore(p, m.frames))

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0d0a18]">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />

      <StageCover ready={ready} broken={broken} label="Menata pin…" exit={exit} cfg={cfg} look={s.looks[seat]} />

      <header className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {m.rolls.map((_, i) => (
            <ScoreChip key={i} seat={i} name={names[i] ?? `Kursi ${i + 1}`} total={totals[i]} on={m.turn === i && m.phase !== 'end'} me={i === seat} />
          ))}
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setScores(true)} className="h-9 border-[3px] border-ink bg-paper px-2 text-[12px] font-bold">
            {frameLabel}
          </button>
          <button onClick={() => cfg.setMenu(true)} aria-label="Pengaturan" className="h-9 border-[3px] border-ink bg-paper px-2 font-display text-[12px]">
            Atur
          </button>
        </div>
      </header>

      {ready && m.phase === 'aim' && !myTurn && (
        <p className="absolute inset-x-0 bottom-4 text-center">
          <Tape tone="paper">Giliran {names[m.turn]}</Tape>
        </p>
      )}

      {ready && myTurn && cfg.input === 'buttons' && <BowlButtons key={m.rollId} onAim={aim} onThrow={shoot} />}
      {ready && cfg.input === 'camera' && <BowlCamera active={myTurn} onAim={aim} onThrow={shoot} onButtons={() => cfg.choose('buttons')} />}

      {call && CALL_FX[call] && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Lottie src={CALL_FX[call]!} autoplay loop={false} className="absolute size-[92vh]" />
          <p className="relative -rotate-3 font-display text-6xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">{CALL_WORD[call]}</p>
        </div>
      )}

      <Modal open={scores} onOpenChange={setScores} title="Papan skor" tone="electric" className="w-[min(680px,calc(100vw-32px))]">
        <ScoreTable m={m} names={names} seat={seat} />
      </Modal>

      <SportMenu cfg={cfg} stage={stage.current} exit={exit} />
      {m.phase === 'end' && <EndScreen m={m} names={names} seat={seat} act={act} exit={exit} />}
    </main>
  )
}
