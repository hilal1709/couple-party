import { Lottie } from 'lottie-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import fxKo from '@/assets/lottie/sport-ko.json'
import { Tape } from '@/components/memphis/Slab'
import type { GameProps } from '../../types'
import { savedQuality, Stage } from '../render/stage'
import { BoxingScene, type Who } from '../sports/boxing/scene'
import { BREAK_MS, CAMERA_GRACE_MS, defend, EXPIRE_MS, IMPACT_MS, INTRO_MS, MAX_HP, ROUND_MS } from '../sports/boxing/engine'
import type { BoxHand, BoxingMatch, BoxResult, SportAction, SportState, Stance } from '../types'
import { BoxButtons } from './BoxButtons'
import { BoxCamera } from './BoxCamera'
import { savedLook } from './lookStore'
import { EndCard, SportMenu, StageCover } from './shared'
import { useSportSettings } from './useSportSettings'

/** jeda antar pukulan sendiri */
const PUNCH_GAP_MS = 480
/** pukulan sendiri terlihat lebih cepat daripada telegraf lawan */
const MY_REACH_MS = 170
/** hindar lewat tombol: lama badan tetap miring, lalu jeda sebelum bisa lagi */
const DODGE_HOLD_MS = 620
const DODGE_GAP_MS = 900

function HpBar({ seat, name, hp, wins, side }: { seat: number; name: string; hp: number; wins: number; side: 'l' | 'r' }) {
  const pct = (hp / MAX_HP) * 100
  return (
    <div data-seat={seat} className={`flex min-w-0 flex-1 flex-col gap-0.5 ${side === 'r' ? 'items-end' : ''}`}>
      <div className={`flex items-center gap-1 ${side === 'r' ? 'flex-row-reverse' : ''}`}>
        <span className="max-w-32 truncate border-2 border-ink bg-paper px-1.5 text-[12px] font-bold leading-tight">{name}</span>
        {Array.from({ length: wins }, (_, i) => (
          <span key={i} aria-label="Menang satu ronde" className="size-3 rounded-full border-2 border-ink bg-electric" />
        ))}
      </div>
      <div className="relative h-4 w-full border-[3px] border-ink bg-ink">
        <div className={`absolute inset-y-0 transition-[width] duration-200 ${side === 'r' ? 'right-0' : 'left-0'} ${pct < 30 ? 'bg-rose' : 'bg-electric'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function BoxingBoard({ state: s, seat, names, online, act, exit }: GameProps<SportState, SportAction>) {
  const m = s.m as BoxingMatch
  const me = seat
  const foe = 1 - seat
  const host = seat === 0
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const scene = useRef<BoxingScene | null>(null)
  const cfg = useSportSettings(act)
  const [ready, setReady] = useState(false)
  const [broken, setBroken] = useState(false)
  const [incoming, setIncoming] = useState<BoxHand | null>(null)
  const [hurt, setHurt] = useState(0)
  const [note, setNote] = useState<{ id: number; text: string } | null>(null)
  const [left, setLeft] = useState(ROUND_MS / 1000)

  const stance = useRef<Stance>('none')
  const lastPunch = useRef(0)
  const lastDodge = useRef(0)
  const seen = useRef(new Set<number>())
  const judged = useRef(new Set<ReturnType<typeof setTimeout>>())
  const lastResult = useRef(0)
  const lastPhase = useRef(0)
  const latest = useRef(m)
  useEffect(() => {
    latest.current = m
  })

  useMusic(m.round === m.rounds ? 'sport-tense' : 'sport')

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let alive = true
    const st = new Stage(cv, savedQuality())
    const sc = new BoxingScene(st)
    stage.current = st
    st.onDowngrade = cfg.downgraded
    sc.load(s.looks[me], s.looks[foe])
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

  useEffect(() => {
    const l = savedLook()
    if (l) act({ type: 'look', look: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ready) scene.current?.setLooks(s.looks[me], s.looks[foe])
  }, [ready, s.looks, me, foe])

  // tiap ganti fase: kamera, bel, dan hitung mundur ronde
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    // main lagi: nomor pukulan & fase mulai dari awal
    if (m.phaseId < lastPhase.current) {
      seen.current.clear()
      lastResult.current = 0
      lastPhase.current = 0
    }
    if (lastPhase.current === m.phaseId) return
    lastPhase.current = m.phaseId
    if (m.phase === 'intro') {
      stance.current = 'none'
      sc.intro()
    } else if (m.phase === 'fight') {
      sc.fight()
      sfx('sport-bell')
    } else if (m.last?.ko) {
      const target: Who = m.last.by === me ? 'foe' : 'me'
      sc.ko(target)
      sfx('sport-ko')
      sfx(target === 'foe' ? 'sport-champion' : 'sport-lose', { delay: 900 })
    } else {
      const [a, b] = [m.hp[me], m.hp[foe]]
      sc.bell(a === b ? null : a > b ? 'me' : 'foe')
      sfx('sport-bell')
    }
    if (m.phase === 'fight') setLeft(ROUND_MS / 1000)
  }, [ready, m, me, foe])

  useEffect(() => {
    if (m.phase !== 'fight') return
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [m.phase, m.phaseId])

  // jam host: perkenalan, bel ronde, jeda antar ronde
  useEffect(() => {
    if (!host || m.phase === 'end') return
    const id = m.phaseId
    const wait = m.phase === 'intro' ? INTRO_MS : m.phase === 'fight' ? ROUND_MS : BREAK_MS
    const t = setTimeout(() => act(m.phase === 'fight' ? { type: 'bell', id } : { type: 'next', id }), wait)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, m.phase, m.phaseId])

  // pukulan baru: telegraf di layar yang dipukul, hasilnya dinilai di HP itu saat tiba
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    for (const a of m.attacks) {
      if (seen.current.has(a.id)) continue
      seen.current.add(a.id)
      if (host) {
        const t = setTimeout(() => act({ type: 'expire', id: a.id }), EXPIRE_MS)
        judged.current.add(t)
      }
      if (a.by === me) continue
      const impact = IMPACT_MS + (cfg.input === 'camera' ? CAMERA_GRACE_MS : 0)
      sc.punch('foe', a.hand, impact)
      setIncoming(a.hand)
      sfx('sport-swing', { volume: 0.6 })
      const t = setTimeout(() => {
        setIncoming(null)
        act({ type: 'resolve', id: a.id, outcome: defend(a.hand, stance.current) })
      }, impact)
      judged.current.add(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, m.attacks, me, host])

  useEffect(() => {
    const timers = judged.current
    return () => timers.forEach(clearTimeout)
  }, [])

  // hasil pukulan: reaksi, suara, tulisan singkat
  const showResult = useCallback(
    (r: BoxResult) => {
      const sc = scene.current
      if (!sc) return
      const target: Who = r.by === me ? 'foe' : 'me'
      sc.react(target, r.hand, r.outcome, r.counter)
      if (r.outcome === 'hit') {
        sfx(r.counter ? 'sport-hit-big' : 'sport-hit', { rate: 0.9 + Math.random() * 0.2 })
        if (target === 'me') setHurt((n) => n + 1)
        if (r.counter) setNote({ id: r.id, text: 'BALASAN!' })
      } else if (r.outcome === 'block') {
        sfx('sport-block')
        if (target === 'me') setNote({ id: r.id, text: 'TERTAHAN' })
      } else {
        sfx('sport-dodge')
        if (target === 'me') setNote({ id: r.id, text: 'LOLOS!' })
      }
    },
    [me],
  )

  useEffect(() => {
    if (!ready || !m.last || m.last.id === lastResult.current) return
    lastResult.current = m.last.id
    showResult(m.last)
  }, [ready, m.last, showResult])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(null), 800)
    return () => clearTimeout(t)
  }, [note])

  // sikap lawan datang dari state
  const foeStance = m.stance[foe]
  useEffect(() => {
    if (ready) scene.current?.stance('foe', foeStance)
  }, [ready, foeStance])

  const setStance = useCallback(
    (st: Stance) => {
      if (latest.current.phase !== 'fight') return
      const now = performance.now()
      const dodging = st === 'dodgeL' || st === 'dodgeR'
      if (dodging && now - lastDodge.current < DODGE_GAP_MS && cfg.input === 'buttons') return
      if (stance.current === st) return
      stance.current = st
      scene.current?.stance('me', st)
      act({ type: 'stance', stance: st })
      if (dodging && cfg.input === 'buttons') {
        lastDodge.current = now
        setTimeout(() => {
          if (stance.current !== st) return
          stance.current = 'none'
          scene.current?.stance('me', 'none')
          act({ type: 'stance', stance: 'none' })
        }, DODGE_HOLD_MS)
      }
    },
    [act, cfg.input],
  )

  const punch = useCallback(
    (hand: BoxHand, power: number) => {
      const now = performance.now()
      const cur = latest.current
      if (cur.phase !== 'fight' || stance.current === 'guard' || now - lastPunch.current < PUNCH_GAP_MS) return
      if (cur.attacks.some((a) => a.by === me)) return
      lastPunch.current = now
      scene.current?.punch('me', hand, MY_REACH_MS)
      sfx('sport-swing', { volume: 0.8 })
      act({ type: 'punch', hand, power })
    },
    [act, me],
  )

  const fightOn = m.phase === 'fight'
  const koWho = m.last?.ko && m.phase !== 'fight' && m.phase !== 'intro'
  const roundLine = m.phase === 'roundEnd' && !koWho ? (m.hp[me] === m.hp[foe] ? 'Ronde seri' : `Ronde untuk ${names[m.hp[0] > m.hp[1] ? 0 : 1]}`) : null
  const won = m.winners.includes(seat)
  const head = m.winners.length > 1 ? 'Seri!' : `${names[m.winners[0]] ?? '?'} juara`
  // incoming dari tangan kanan lawan datang di sisi kiri layar
  const edge = incoming === 'R' ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l'

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#090612]">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" />

      <StageCover ready={ready} broken={broken} label="Mendirikan ring…" exit={exit} cfg={cfg} look={s.looks[seat]} />

      {incoming && <div aria-hidden className={`pointer-events-none absolute inset-y-0 w-1/3 from-rose/80 to-transparent ${edge}`} />}
      {hurt > 0 && <div key={hurt} aria-hidden className="pointer-events-none absolute inset-0 animate-out fade-out-0 bg-rose/40 duration-300 fill-mode-forwards" />}

      <header className="absolute inset-x-2 top-2 flex items-start gap-2">
        <HpBar seat={me} name={names[me] ?? 'Kamu'} hp={m.hp[me]} wins={m.wins[me]} side="l" />
        <div className="flex shrink-0 flex-col items-center">
          <span className="border-[3px] border-ink bg-paper px-2 font-display text-lg leading-tight">{fightOn ? left : '—'}</span>
          <span className="text-[11px] font-bold text-paper">
            Ronde {m.round}/{m.rounds}
          </span>
        </div>
        <HpBar seat={foe} name={`${names[foe] ?? 'Lawan'}${online[foe] === false ? ' (putus)' : ''}`} hp={m.hp[foe]} wins={m.wins[foe]} side="r" />
        <button onClick={() => cfg.setMenu(true)} aria-label="Pengaturan" className="h-9 shrink-0 border-[3px] border-ink bg-paper px-2 font-display text-[12px]">
          Atur
        </button>
      </header>

      {ready && m.phase === 'intro' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="-rotate-2 font-display text-6xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">RONDE {m.round}</p>
          {m.round === 1 && <Tape tone="paper">{cfg.input === 'camera' ? 'Pukul ke depan, tangan di wajah = tangkis, geser badan = hindar' : 'Layar menyala merah? Hindar ke arah sebaliknya, atau tangkis'}</Tape>}
        </div>
      )}

      {note && (
        <p key={note.id} className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-display text-4xl text-electric [-webkit-text-stroke:2px_#121212] [paint-order:stroke_fill]">
          {note.text}
        </p>
      )}

      {ready && cfg.input === 'buttons' && fightOn && <BoxButtons onStance={setStance} onPunch={punch} />}
      {ready && cfg.input === 'camera' && <BoxCamera active={m.phase === 'fight' || m.phase === 'intro'} onStance={setStance} onPunch={punch} onButtons={() => cfg.choose('buttons')} />}

      {koWho && m.phase === 'roundEnd' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Lottie src={fxKo} autoplay loop={false} className="absolute size-[92vh]" />
          <p className="relative -rotate-3 font-display text-7xl text-paper [-webkit-text-stroke:3px_#121212] [paint-order:stroke_fill]">K.O.!</p>
        </div>
      )}
      {roundLine && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center">
          <Tape tone="electric" className="text-2xl">
            {roundLine}
          </Tape>
        </p>
      )}

      <SportMenu cfg={cfg} stage={stage.current} exit={exit} />
      {m.phase === 'end' && (
        <EndCard head={head} won={won} act={act} exit={exit}>
          <p className="font-display text-3xl leading-none">
            {m.wins[me]} – {m.wins[foe]}
          </p>
          <p className="text-[13px] font-semibold">{won ? 'Lawanmu lagi ngitung bintang di atas kepala.' : 'Rahangmu baik-baik aja? Revans biar nggak penasaran.'}</p>
        </EndCard>
      )}
    </main>
  )
}
