import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon, SentIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal, Modal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots, hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import fxCaught from '@/assets/lottie/spy-caught.json'
import fxEscape from '@/assets/lottie/spy-escape.json'
import fxGuess from '@/assets/lottie/spy-guess.json'
import fxReveal from '@/assets/lottie/spy-reveal.json'
import fxStamp from '@/assets/lottie/spy-stamp.json'
import type { GameProps, Seat } from '../../types'
import {
  CLUE_MAX,
  GUESS_SECONDS,
  OUT_SECONDS,
  ROUND_SECONDS,
  VOTE_SECONDS,
  canSpyGuess,
  canVoteFor,
  clueProblem,
  guesser,
} from '../engine'
import { LOCATIONS } from '../locations'
import { cuesFor, type FxName } from '../sounds'
import type { SpyAction, SpyState } from '../types'
import { PAPER, ROLE_ALT, ROLE_SPRITE, SEAT_HEX, sprite } from './art'
import { ROLE_INFO, castLine, outLine, roundLine, statusLine, who } from './copy'

gsap.registerPlugin(useGSAP)

type Props = GameProps<SpyState, SpyAction>
type LottieDoc = { w: number; h: number }
type Fx = { id: number; anim: LottieDoc; size: number }
let fxSeq = 0

const FX: Record<FxName, LottieDoc> = { 'spy-reveal': fxReveal, 'spy-stamp': fxStamp, 'spy-caught': fxCaught, 'spy-escape': fxEscape, 'spy-guess': fxGuess }

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Detik tersisa di fase sekarang, dihitung lokal sejak phaseId berubah. */
function usePhaseClock(phaseId: number, total: number) {
  const [clock, setClock] = useState(() => ({ id: phaseId, at: Date.now(), now: Date.now() }))
  useEffect(() => {
    const t = setInterval(() => setClock((c) => (c.id === phaseId ? { ...c, now: Date.now() } : { id: phaseId, at: Date.now(), now: Date.now() })), 250)
    return () => clearInterval(t)
  }, [phaseId])
  const spent = clock.id === phaseId ? (clock.now - clock.at) / 1000 : 0
  return { left: Math.max(0, Math.ceil(total - spent)), fresh: clock.id === phaseId }
}

function phaseSeconds(s: SpyState): number {
  switch (s.phase) {
    case 'clue':
      return s.opts.seconds
    case 'vote':
      return VOTE_SECONDS
    case 'guess':
      return GUESS_SECONDS
    case 'out':
      return OUT_SECONDS
    case 'roundEnd':
      return ROUND_SECONDS
    default:
      return 0
  }
}

export function SpyBoard({ state: s, seat, names, online, act, exit }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const [atlas, setAtlas] = useState(false)
  const [fx, setFx] = useState<Fx[]>([])
  const total = phaseSeconds(s)
  const { left, fresh } = usePhaseClock(s.phaseId, total)

  useMusic(s.phase === 'vote' || s.phase === 'guess' || (s.phase === 'clue' && left <= 10) ? 'spy-tense' : 'spy')

  // ---- jam dipegang host: waktu habis → timeUp, layar hasil selesai → next ----
  const fired = useRef(0)
  useEffect(() => {
    if (seat !== 0 || !total || !fresh || left > 0 || fired.current === s.phaseId) return
    fired.current = s.phaseId
    act({ type: s.phase === 'out' || s.phase === 'roundEnd' ? 'next' : 'timeUp' })
  }, [seat, total, fresh, left, s.phaseId, s.phase, act])

  // detak di 5 detik terakhir giliran sendiri / voting
  useEffect(() => {
    const mine = (s.phase === 'clue' && s.turn === seat) || (s.phase === 'vote' && s.alive[seat]) || (s.phase === 'guess' && s.lastOut === seat)
    if (mine && fresh && left > 0 && left <= 5) sfx('spy-tick', { volume: 0.5, rate: 1.3 })
  }, [left, s.phase, s.turn, s.alive, s.lastOut, seat, fresh])

  // ---- suara & efek dari perubahan state ----
  const prev = useRef<SpyState | null>(null)
  useEffect(() => {
    const { sounds, fx: cues } = cuesFor(prev.current, s, seat)
    prev.current = s
    sounds.forEach((c) => sfx(c.sfx, c))
    if (cues.length && !reduceMotion()) setFx((cur) => [...cur, ...cues.map((c) => ({ id: ++fxSeq, anim: FX[c.anim], size: c.size }))])
  }, [s, seat])

  const floor = { backgroundImage: terrazzo(14, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-2.5 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- meja: kartu tiap pemain + petunjuknya ---- */}
        <section className="relative flex h-full min-w-0 flex-[1.7] flex-col" aria-label="Meja pemain">
          <Table s={s} seat={seat} names={names} online={online} act={act} />
          {fx.map((f) => (
            <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
          ))}
          {s.phase === 'role' && !s.ready[seat] && <RolePanel s={s} seat={seat} act={act} />}
          {s.phase === 'out' && <OutPanel s={s} seat={seat} names={names} left={left} act={act} />}
          {s.phase === 'guess' && <GuessPanel s={s} seat={seat} names={names} left={left} act={act} />}
          {s.phase === 'roundEnd' && <RoundPanel s={s} seat={seat} names={names} left={left} act={act} />}
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="flex min-w-[230px] flex-1 flex-col gap-1.5 pb-[max(4px,env(safe-area-inset-bottom))]">
          <header className="flex items-center gap-2">
            <button
              onClick={() => setConfirmExit(true)}
              aria-label="Kembali ke menu"
              className="grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
            </button>
            <SoundButton />
            <span className="font-display text-[12px] uppercase leading-tight">
              Ronde {s.round}/{s.opts.rounds}
            </span>
            {total > 0 && s.phase !== 'end' && <Timer left={left} urgent={(s.phase === 'clue' || s.phase === 'vote' || s.phase === 'guess') && left <= 10} />}
          </header>
          <SecretCard s={s} seat={seat} />
          <p className="border-[3px] border-ink bg-paper px-2 py-1 text-[12px] font-bold leading-snug" aria-live="polite">
            {statusLine(s, seat, names)}
          </p>
          {s.phase === 'clue' && s.turn === seat && s.alive[seat] && <ClueBox s={s} seat={seat} act={act} />}
          {s.phase === 'role' && s.ready[seat] && seat === 0 && !s.ready.every(Boolean) && (
            <Slab tone="paper" size="sm" className="self-start" onClick={() => act({ type: 'next' })}>
              Mulai tanpa nunggu
            </Slab>
          )}
          {s.opts.mode === 'lokasi' && (
            <Slab tone={canSpyGuess(s, seat) ? 'rose' : 'paper'} size="sm" className="self-start" onClick={() => setAtlas(true)}>
              <img src={sprite('icon-pin')} alt="" className="h-5 w-auto" draggable={false} />
              {canSpyGuess(s, seat) ? 'Tebak lokasi' : 'Daftar lokasi'}
            </Slab>
          )}
          <Scores s={s} seat={seat} names={names} />
        </aside>
      </div>
      {s.phase === 'end' && <EndScreen s={s} seat={seat} names={names} act={act} exit={exit} />}
      <LocationAtlas open={atlas} onOpenChange={setAtlas} s={s} seat={seat} act={act} />
      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Ronde dan skor semua pemain hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

/* ---------- meja ---------- */

function Table({ s, seat, names, online, act }: { s: SpyState; seat: Seat; names: string[]; online: boolean[]; act: (a: SpyAction) => void }) {
  const n = s.opts.players
  const cols = n <= 4 ? n : Math.ceil(n / 2)
  return (
    <ol
      className="grid min-h-0 flex-1 gap-2 p-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(n / cols)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: n }, (_, i) => (
        <SeatCard key={i} s={s} i={i} seat={seat} name={who(i, seat, names)} online={online[i] ?? false} act={act} />
      ))}
    </ol>
  )
}

function SeatCard({ s, i, seat, name, online, act }: { s: SpyState; i: Seat; seat: Seat; name: string; online: boolean; act: (a: SpyAction) => void }) {
  const out = !s.alive[i]
  const turn = s.phase === 'clue' && s.turn === i
  const votable = canVoteFor(s, seat, i)
  const myPick = s.phase === 'vote' && s.votes[seat] === i
  const voted = s.phase === 'vote' && s.alive[i] && s.votes[i] >= 0
  const clues = s.clues.filter((c) => c.by === i)
  const showTally = s.phase === 'out' || (s.phase === 'vote' && s.candidates)
  const card = useRef<HTMLLIElement>(null)
  useGSAP(() => {
    if (turn && !reduceMotion()) gsap.fromTo(card.current, { rotation: -2.5, scale: 1.04 }, { rotation: 0, scale: 1, duration: 0.45, ease: 'back.out(2.2)' })
  }, [turn, s.phaseId])

  const body = (
    <>
      <div className="flex items-center gap-1.5 border-b-[3px] border-ink px-1.5 py-0.5" style={{ background: SEAT_HEX[i % SEAT_HEX.length] }}>
        <span className="size-2.5 shrink-0 rounded-full border-2 border-ink" style={{ background: online ? '#121212' : PAPER }} aria-label={online ? 'online' : 'offline'} />
        <span className="min-w-0 flex-1 truncate text-left text-[12px] font-bold">{name}</span>
        {turn && <img src={sprite('icon-magnifier')} alt="sedang memberi petunjuk" className="h-4 w-auto" draggable={false} />}
        {voted && (
          <span className="border-2 border-ink bg-paper px-1 font-display text-[9px] uppercase leading-tight" aria-label="sudah memilih">
            ✓
          </span>
        )}
        {showTally && s.tally[i] > 0 && <span className="border-2 border-ink bg-ink px-1 font-display text-[10px] text-petal">{s.tally[i]}</span>}
      </div>
      <ul className="flex min-h-0 flex-1 flex-col items-start justify-center gap-1 overflow-hidden px-1.5 py-1">
        {clues
          .slice()
          .reverse()
          .map((c, k) =>
            k === 0 ? (
              <li key={c.cycle} className="max-w-full">
                {c.text ? (
                  <Tape tone={c.cycle === s.cycle ? 'electric' : 'paper'} className="block max-w-full truncate text-[clamp(14px,4.2cqh,22px)] leading-tight">
                    {c.text}
                  </Tape>
                ) : (
                  <span className="text-[13px] font-semibold italic text-ink/60">(diam saja)</span>
                )}
              </li>
            ) : (
              <li key={c.cycle} className={cn('max-w-full truncate text-[11px] font-semibold leading-tight text-ink/55', !c.text && 'italic')}>
                {c.text || '(diam saja)'}
              </li>
            ),
          )}
        {!clues.length && <li className="self-center text-[11px] font-semibold text-ink/45">{turn ? 'lagi mikir…' : 'belum ngomong'}</li>}
      </ul>
      {out && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-paper/55" style={{ backgroundImage: hatch('#121212', 7, 0.14) }}>
          <div className="flex -rotate-12 items-center gap-1 border-[3px] border-ink bg-rose px-1.5 py-0.5 shadow-slab-sm">
            <img src={sprite(ROLE_SPRITE[s.roles[i]])} alt="" className="h-7 w-auto" draggable={false} />
            <span className="font-display text-[11px] uppercase leading-none">{ROLE_INFO[s.roles[i]].title}</span>
          </div>
        </div>
      )}
      {myPick && <img src={sprite('icon-stamp')} alt="pilihanmu" className="pointer-events-none absolute -bottom-1 -right-1 h-10 w-auto rotate-12" draggable={false} />}
    </>
  )

  return (
    <li
      ref={card}
      data-seat={i}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden border-[3px] border-ink bg-paper [container-type:size]',
        turn ? 'shadow-[4px_5px_0_#ff37a6]' : 'shadow-slab-sm',
        i === seat && 'outline-dashed outline-2 outline-offset-2 outline-ink',
      )}
    >
      {votable ? (
        <button
          onClick={() => act({ type: 'vote', target: i })}
          aria-label={`Pilih ${name}`}
          aria-pressed={myPick}
          className={cn('flex h-full min-h-0 flex-col text-left', myPick ? 'bg-rose/25' : 'active:bg-electric/30')}
          style={myPick ? undefined : { backgroundImage: dots('#12121214', 12, 1.2) }}
        >
          {body}
        </button>
      ) : (
        body
      )}
    </li>
  )
}

/* ---------- panel kanan ---------- */

function Timer({ left, urgent }: { left: number; urgent: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (urgent && !reduceMotion()) gsap.fromTo(box.current, { rotation: -10, scale: 1.12 }, { rotation: 0, scale: 1, duration: 0.3, ease: 'back.out(2)' })
  }, [left, urgent])
  return (
    <div ref={box} role="timer" aria-label={`${left} detik lagi`} className={cn('ml-auto flex items-center gap-1 border-[3px] border-ink px-1.5 py-0.5', urgent ? 'bg-rose' : 'bg-paper')}>
      <span className="w-7 text-right font-display text-lg leading-none tabular-nums">{left}</span>
      <span className="text-[10px] font-bold">dtk</span>
    </div>
  )
}

/** kartu rahasia milik sendiri; bisa ditutup kalau ada yang ngintip */
function SecretCard({ s, seat }: { s: SpyState; seat: Seat }) {
  const [hidden, setHidden] = useState(false)
  const role = s.roles[seat]
  const lokasi = s.opts.mode === 'lokasi'
  const known = s.secret[seat]
  const icon = role === 'mrwhite' || role === 'spy' ? ROLE_SPRITE[role] : lokasi ? 'icon-pin' : 'card-word'
  return (
    <div className="relative flex items-center gap-2 border-[3px] border-ink bg-paper px-2 py-1 shadow-slab-sm" style={{ backgroundImage: dots('#ff37a622', 10, 1.2) }}>
      <img src={sprite(icon)} alt="" className="h-10 w-auto shrink-0" draggable={false} />
      <div className="min-w-0 flex-1">
        {s.phase === 'role' && !s.ready[seat] ? (
          <p className="font-display text-sm uppercase text-ink/60">Intip kartu di meja dulu</p>
        ) : hidden ? (
          <p className="font-display text-sm uppercase text-ink/60">Kartu ditutup</p>
        ) : known ? (
          <>
            <p className="text-[10px] font-bold uppercase leading-tight">{lokasi ? `Lokasi · kamu ${s.jobs[seat]}` : 'Kata rahasiamu'}</p>
            <Tape tone="rose" className={cn('line-clamp-2 leading-tight', known.length > 14 ? 'text-[15px]' : 'text-lg')}>
              {known}
            </Tape>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase leading-tight">Kamu</p>
            <Tape tone="electric" className="text-lg leading-tight">
              {ROLE_INFO[role].title}
            </Tape>
          </>
        )}
      </div>
      <button
        onClick={() => setHidden((h) => !h)}
        aria-label={hidden ? 'Buka kartu' : 'Tutup kartu'}
        className="grid size-8 shrink-0 place-items-center border-2 border-ink bg-paper active:translate-y-0.5"
      >
        <HugeiconsIcon icon={hidden ? ViewIcon : ViewOffIcon} size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}

function ClueBox({ s, seat, act }: { s: SpyState; seat: Seat; act: (a: SpyAction) => void }) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState(s.phaseId)
  const [error, setError] = useState<string | null>(null)
  if (phase !== s.phaseId) {
    setPhase(s.phaseId)
    setText('')
    setError(null)
  }
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = clueProblem(s, seat, text)
    if (problem) {
      setError(problem)
      sfx('spy-guess-wrong', { volume: 0.5, rate: 1.4 })
      return
    }
    act({ type: 'clue', text })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          ref={input}
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, CLUE_MAX))
            setError(null)
          }}
          placeholder="Satu petunjuk…"
          aria-label="Petunjuk"
          aria-invalid={!!error}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          className="h-10 min-w-0 flex-1 border-[3px] border-ink bg-paper px-2 text-sm font-semibold shadow-slab-sm outline-none placeholder:text-ink/50 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Kirim petunjuk"
          className="grid size-10 shrink-0 place-items-center border-[3px] border-ink bg-rose shadow-slab-sm active:translate-y-0.5 active:shadow-none disabled:bg-paper disabled:shadow-none"
        >
          <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={2.4} />
        </button>
      </div>
      {error && <p className="bg-[#ffcc1f] px-1 text-[11px] font-bold">{error}</p>}
    </form>
  )
}

function Scores({ s, seat, names }: { s: SpyState; seat: Seat; names: string[] }) {
  return (
    <ol className="mt-auto flex flex-wrap gap-1" aria-label="Skor pemain">
      {s.scores.map((pts, i) => (
        <li key={i} className={cn('flex items-center gap-1 border-2 border-ink px-1.5 py-px text-[11px] font-bold', s.alive[i] ? 'bg-paper' : 'bg-petal text-ink/60')}>
          <span className="size-2.5 shrink-0 rounded-full border-2 border-ink" style={{ background: SEAT_HEX[i % SEAT_HEX.length] }} />
          <span className="max-w-[72px] truncate">{who(i, seat, names)}</span>
          <span className="font-display">{pts}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- panel di atas meja ---------- */

function FxBurst({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ width: `${fx.size}%`, aspectRatio: `${fx.anim.w} / ${fx.anim.h}` }}
    >
      <Lottie src={fx.anim} autoplay loop={false} subscriptions={{ complete: onDone }} className="h-full w-full" />
    </div>
  )
}

function Overlay({ children, label, wide }: { children: React.ReactNode; label: string; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (!reduceMotion()) gsap.from(box.current, { scale: 0.7, rotation: -6, opacity: 0, duration: 0.35, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-2">
      <div
        ref={box}
        role="dialog"
        aria-label={label}
        className={cn('relative flex max-h-full w-full flex-col gap-2 overflow-y-auto border-[3px] border-ink bg-paper p-3 shadow-lift', wide ? 'max-w-[520px]' : 'max-w-[420px]')}
      >
        <div aria-hidden className="absolute -top-0 right-4 h-4 w-16 rotate-6 border-[3px] border-ink bg-rose" style={{ backgroundImage: squiggles('#121212', 40, 2.6) }} />
        {children}
      </div>
    </div>
  )
}

function RolePanel({ s, seat, act }: { s: SpyState; seat: Seat; act: (a: SpyAction) => void }) {
  const [open, setOpen] = useState(false)
  const card = useRef<HTMLButtonElement>(null)
  const role = s.roles[seat]
  const lokasi = s.opts.mode === 'lokasi'
  const flip = () => {
    if (open) return
    sfx('spy-reveal', { rate: 1.1 })
    if (!reduceMotion()) gsap.fromTo(card.current, { rotationY: 90 }, { rotationY: 0, duration: 0.4, ease: 'back.out(1.8)' })
    setOpen(true)
  }
  return (
    <Overlay label="Kartu peranmu">
      <p className="font-display text-sm uppercase">
        Ronde {s.round} · {castLine(s.opts)}
      </p>
      <button
        ref={card}
        onClick={flip}
        aria-label={open ? 'Kartu peranmu' : 'Buka kartu peranmu'}
        className="flex min-h-[130px] items-center gap-3 border-[3px] border-ink p-3 text-left shadow-slab [perspective:600px]"
        style={{ background: open ? PAPER : '#121212', backgroundImage: open ? dots('#ff37a622', 12, 1.4) : squiggles('#ff37a6', 44, 2.6) }}
      >
        {!open ? (
          <span className="flex w-full flex-col items-center gap-1 text-petal">
            <img src={sprite('card-back')} alt="" className="h-20 w-auto" draggable={false} />
            <span className="bg-ink px-2 py-0.5 text-center font-display text-sm uppercase">Tap untuk intip · jangan sampai keliatan!</span>
          </span>
        ) : (
          <>
            <img
              src={sprite(role === 'mrwhite' || role === 'spy' ? ROLE_SPRITE[role] : lokasi ? 'icon-pin' : 'card-word')}
              alt={role === 'mrwhite' || role === 'spy' ? ROLE_ALT[role] : ''}
              className="h-24 w-auto shrink-0"
              draggable={false}
            />
            <span className="min-w-0 flex-1">
              {role === 'mrwhite' ? (
                <>
                  <Tape tone="electric" className="text-xl">
                    Kamu Mr. White
                  </Tape>
                  <span className="mt-1 block text-[12px] font-semibold">Kamu nggak dapat kata. Dengarkan petunjuk orang, pura-pura ngerti, jangan ketahuan!</span>
                </>
              ) : role === 'spy' ? (
                <>
                  <Tape tone="electric" className="text-xl">
                    Kamu mata-mata
                  </Tape>
                  <span className="mt-1 block text-[12px] font-semibold">Kamu nggak tahu lokasinya. Tebak dari petunjuk, atau nekat tebak lokasi kapan saja.</span>
                </>
              ) : lokasi ? (
                <>
                  <span className="block text-[11px] font-bold uppercase">Lokasi</span>
                  <Tape tone="rose" className="text-xl leading-tight">
                    {s.secret[seat]}
                  </Tape>
                  <span className="mt-1 block text-[12px] font-semibold">
                    Kamu jadi <b>{s.jobs[seat]}</b>. Ada satu mata-mata yang nggak tahu tempat ini.
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-[11px] font-bold uppercase">Kata rahasiamu</span>
                  <Tape tone="rose" className="text-2xl leading-tight">
                    {s.secret[seat]}
                  </Tape>
                  <span className="mt-1 block text-[12px] font-semibold">Ada yang katanya beda dikit. Bisa jadi itu kamu, lho.</span>
                </>
              )}
            </span>
          </>
        )}
      </button>
      <Slab tone="rose" size="sm" className="self-end" disabled={!open} onClick={() => act({ type: 'ready' })}>
        Udah hafal, siap!
      </Slab>
    </Overlay>
  )
}

function OutPanel({ s, seat, names, left, act }: { s: SpyState; seat: Seat; names: string[]; left: number; act: (a: SpyAction) => void }) {
  const out = s.lastOut
  return (
    <Overlay label="Hasil voting">
      <div className="flex items-center gap-3">
        {out !== null ? (
          <img src={sprite(ROLE_SPRITE[s.roles[out]])} alt={ROLE_ALT[s.roles[out]]} className="h-24 w-auto shrink-0" draggable={false} />
        ) : (
          <img src={sprite('icon-stamp')} alt="" className="h-16 w-auto shrink-0 opacity-60" draggable={false} />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase">Hasil voting</p>
          {out !== null && (
            <Tape tone={s.roles[out] === 'warga' ? 'paper' : 'rose'} className="text-xl leading-tight">
              {who(out, seat, names)}: {ROLE_INFO[s.roles[out]].title}
            </Tape>
          )}
          <p className="mt-1 text-[13px] font-semibold">{outLine(s, seat, names)}</p>
        </div>
      </div>
      <HostNext seat={seat} left={left} label="Lanjut" act={act} />
    </Overlay>
  )
}

function GuessPanel({ s, seat, names, left, act }: { s: SpyState; seat: Seat; names: string[]; left: number; act: (a: SpyAction) => void }) {
  const me = guesser(s) === seat
  const [text, setText] = useState('')
  const lokasi = s.opts.mode === 'lokasi'
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) act({ type: 'guess', text })
  }
  return (
    <Overlay label="Tebakan terakhir" wide={lokasi && me}>
      <div className="flex items-center gap-2">
        <img src={sprite(ROLE_SPRITE[s.roles[s.lastOut!]])} alt="" className="h-14 w-auto shrink-0" draggable={false} />
        <div>
          <Tape tone="electric" className="text-lg leading-tight">
            {me ? 'Kesempatan terakhirmu!' : `${names[s.lastOut!] ?? '?'} menebak…`}
          </Tape>
          <p className="text-[12px] font-semibold">
            {me ? (lokasi ? 'Pilih lokasi yang kamu kira. Benar = kamu menang.' : 'Ketik kata milik warga. Benar = kamu menang sendiri.') : `Kalau benar, dia menang. ${left} detik lagi.`}
          </p>
        </div>
      </div>
      {me &&
        (lokasi ? (
          <LocationGrid onPick={(name) => act({ type: 'guess', text: name })} />
        ) : (
          <form onSubmit={submit} className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 40))}
              placeholder="Kata warga…"
              aria-label="Tebakan kata warga"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              className="h-10 min-w-0 flex-1 border-[3px] border-ink bg-paper px-2 text-sm font-semibold shadow-slab-sm outline-none focus:bg-white"
            />
            <Slab tone="rose" size="sm" type="submit" disabled={!text.trim()}>
              Tebak ({left})
            </Slab>
          </form>
        ))}
    </Overlay>
  )
}

function RoundPanel({ s, seat, names, left, act }: { s: SpyState; seat: Seat; names: string[]; left: number; act: (a: SpyAction) => void }) {
  const { title, line } = roundLine(s, seat, names)
  const gained = s.gained.map((p, i) => ({ i, p })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p)
  const last = s.round >= s.opts.rounds
  return (
    <Overlay label={title} wide>
      <div className="flex items-start gap-3">
        <img src={sprite(s.winner === 'warga' ? 'role-warga' : s.opts.mode === 'lokasi' ? 'role-spy' : 'role-penyusup')} alt="" className="h-20 w-auto shrink-0" draggable={false} />
        <div className="min-w-0 flex-1">
          <Tape tone={s.winner === 'warga' ? 'electric' : 'rose'} className="text-xl leading-tight">
            {title}
          </Tape>
          <p className="mt-1 text-[12px] font-semibold">{line}</p>
          <p className="mt-1 text-[12px]">
            {s.opts.mode === 'lokasi' ? (
              <>
                Lokasinya: <b>{s.answer}</b>
              </>
            ) : (
              <>
                Kata warga <b>{s.answer}</b> · kata penyusup <b>{s.decoy}</b>
              </>
            )}
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1">
        {s.roles.map((r, i) => (
          <li key={i} className={cn('flex items-center gap-1 border-2 border-ink px-1 text-[11px] font-bold', r === 'warga' ? 'bg-paper' : 'bg-rose')}>
            <img src={sprite(ROLE_SPRITE[r])} alt="" className="h-4 w-auto" draggable={false} />
            {who(i, seat, names)} · {ROLE_INFO[r].title}
            {gained.find((g) => g.i === i) && <span className="font-display">+{s.gained[i]}</span>}
          </li>
        ))}
      </ul>
      <HostNext seat={seat} left={left} label={last ? 'Lihat juara' : 'Ronde berikutnya'} act={act} />
    </Overlay>
  )
}

function HostNext({ seat, left, label, act }: { seat: Seat; left: number; label: string; act: (a: SpyAction) => void }) {
  return seat === 0 ? (
    <Slab tone="rose" size="sm" className="self-end" onClick={() => act({ type: 'next' })}>
      {label} ({left})
    </Slab>
  ) : (
    <p className="self-end text-[11px] font-semibold text-ink/70">Lanjut otomatis {left} detik lagi…</p>
  )
}

function LocationGrid({ onPick, current }: { onPick?: (name: string) => void; current?: string }) {
  return (
    <ul className="grid grid-cols-3 gap-1">
      {LOCATIONS.map((l) => (
        <li key={l.name}>
          {onPick ? (
            <button
              onClick={() => onPick(l.name)}
              className="h-full w-full border-2 border-ink bg-paper px-1 py-1 text-left text-[11px] font-bold leading-tight shadow-slab-sm active:translate-y-0.5 active:bg-electric active:shadow-none"
            >
              {l.name}
            </button>
          ) : (
            <span className={cn('block h-full border-2 border-ink px-1 py-1 text-[11px] font-bold leading-tight', l.name === current ? 'bg-electric' : 'bg-paper')}>{l.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Daftar semua lokasi (mode lokasi). Mata-mata bisa nekat menebak dari sini. */
function LocationAtlas({ open, onOpenChange, s, seat, act }: { open: boolean; onOpenChange: (v: boolean) => void; s: SpyState; seat: Seat; act: (a: SpyAction) => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const can = canSpyGuess(s, seat)
  useEffect(() => {
    if (!can && open && s.roles[seat] === 'spy') onOpenChange(false)
  }, [can, open, s.roles, seat, onOpenChange])
  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={can ? 'Nekat tebak lokasi?' : 'Daftar lokasi'}
        description={can ? 'Benar = kamu menang ronde ini. Salah = langsung kalah. Cuma sekali.' : 'Semua lokasi yang mungkin keluar. Mata-mata juga lihat daftar ini.'}
        className="max-w-[640px]"
      >
        <LocationGrid onPick={can ? (name) => setPick(name) : undefined} current={s.secret[seat] || undefined} />
      </Modal>
      <ConfirmModal
        open={pick !== null}
        onOpenChange={(v) => !v && setPick(null)}
        title={`Yakin di "${pick}"?`}
        description="Kalau salah, warga langsung menang."
        confirmLabel="Tebak!"
        onConfirm={() => {
          if (pick) act({ type: 'guess', text: pick })
          setPick(null)
          onOpenChange(false)
        }}
      />
    </>
  )
}

/* ---------- layar juara ---------- */

function EndScreen({ s, seat, names, act, exit }: { s: SpyState; seat: Seat; names: string[]; act: (a: SpyAction) => void; exit: () => void }) {
  const winners = s.winners ?? []
  const happy = winners.includes(seat)
  const box = useRef<HTMLDivElement>(null)
  const ranking = s.scores.map((_, i) => i).sort((a, b) => s.scores[b] - s.scores[a])
  const top = Math.max(1, ...s.scores)
  useGSAP(
    () => {
      if (!reduceMotion()) gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.4, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const headline = winners.length > 1 ? (happy ? 'Juara bareng!' : 'Juaranya seri') : happy ? 'Detektif & penipu terbaik!' : `${names[winners[0]] ?? '?'} juara`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex overflow-y-auto bg-ink/70 px-5 py-3">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="m-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={sprite(happy ? 'spy-win' : 'spy-lose')}
            alt={happy ? 'Maskot bermantel memegang kaca pembesar di atas podium' : 'Maskot berkumis palsu yang kumisnya copot'}
            className="-mb-5 h-28 w-auto"
            draggable={false}
          />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">
              {happy ? 'Muka datar, hati licik. Nggak ada yang bisa baca kamu.' : 'Ekspresimu terlalu jujur. Latihan muka poker dulu, revans?'}
            </p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-1 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab" aria-label="Skor akhir">
            {ranking.map((i, rank) => (
              <li key={i}>
                <div className="flex justify-between text-[12px] font-semibold leading-tight">
                  <span className={cn(i === seat && 'font-bold')}>
                    {rank + 1}. {who(i, seat, names)}
                  </span>
                  <span>{s.scores[i]}</span>
                </div>
                <div className="h-2.5 -skew-x-12 border-2 border-ink bg-petal">
                  <div className="h-full" style={{ width: `${(s.scores[i] / top) * 100}%`, background: SEAT_HEX[i % SEAT_HEX.length] }} />
                </div>
              </li>
            ))}
          </ol>
          <div data-pop className="flex justify-center gap-2.5">
            <Slab tone="rose" className="px-4" onClick={() => act({ type: 'again' })}>
              Main lagi
            </Slab>
            <Slab tone="paper" className="px-4" onClick={exit}>
              Ke menu
            </Slab>
          </div>
        </div>
      </div>
    </div>
  )
}
