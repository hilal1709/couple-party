import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon, SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots, hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import confetti from '@/assets/lottie/confetti.json'
import fxBoom from '@/assets/lottie/bom-boom.json'
import fxCancel from '@/assets/lottie/bom-cancel.json'
import fxPass from '@/assets/lottie/bom-pass.json'
import fxPower from '@/assets/lottie/bom-power.json'
import fxSpark from '@/assets/lottie/bom-spark.json'
import type { GameProps, Seat } from '../../types'
import { BOOM_SECONDS, POWERS, REVIEW_SECONDS, WORD_MAX, canAim, canPower, canProtest, fuseRange, promptText, wordProblem } from '../engine'
import { cuesFor, type FxName } from '../sounds'
import type { BomAction, BomState } from '../types'
import { PAPER, POWER_SPRITE, SEAT_HEX, sprite } from './art'
import { FEATURE_INFO, MODE_INFO, POWER_INFO, SPEED_INFO, boomLine, eventLine, protestLine, statusLine, who } from './copy'

gsap.registerPlugin(useGSAP)

type Props = GameProps<BomState, BomAction>
type Act = (a: BomAction) => void
type LottieDoc = { w: number; h: number }
type Fx = { id: number; anim: LottieDoc; size: number }
let fxSeq = 0

const FX: Record<FxName, LottieDoc> = { 'bom-boom': fxBoom, 'bom-pass': fxPass, 'bom-cancel': fxCancel, 'bom-power': fxPower }

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Detik sejak `id` terakhir berubah, dihitung lokal di tiap HP. */
function useSince(id: number, running: boolean) {
  const [clock, setClock] = useState(() => ({ id, at: Date.now(), now: Date.now() }))
  useEffect(() => {
    const t = setInterval(() => setClock((c) => (c.id === id ? { ...c, now: Date.now() } : { id, at: Date.now(), now: Date.now() })), 250)
    return () => clearInterval(t)
  }, [id])
  return running && clock.id === id ? (clock.now - clock.at) / 1000 : 0
}

export function BomBoard({ state: s, seat, names, online, act, exit }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const [fx, setFx] = useState<Fx[]>([])
  const live = s.phase === 'live'
  const elapsed = useSince(s.fuseId, live)
  const [lo] = fuseRange(s.opts, s.booms)
  const boomLeft = Math.max(0, Math.ceil(BOOM_SECONDS - useSince(s.phaseId, s.phase === 'boom')))

  useMusic(live && elapsed >= lo ? 'bom-tense' : 'bom')

  // ---- jam dipegang host: sumbu habis → boom, masa protes habis, layar ledakan → ronde berikutnya ----
  // act bisa berganti identitas tiap render; jam tidak boleh ikut ter-reset
  const actRef = useRef(act)
  useEffect(() => {
    actRef.current = act
  })
  const lit = useRef({ id: -1, at: 0 })
  useEffect(() => {
    if (seat !== 0 || s.phase !== 'live') return
    if (lit.current.id !== s.fuseId) lit.current = { id: s.fuseId, at: Date.now() }
    const id = s.fuseId
    const t = setTimeout(() => actRef.current({ type: 'boom', fuseId: id }), Math.max(0, lit.current.at + s.fuse - Date.now()))
    return () => clearTimeout(t)
  }, [seat, s.phase, s.fuseId, s.fuse])
  const reviewId = s.review?.id
  useEffect(() => {
    if (seat !== 0 || reviewId === undefined) return
    const t = setTimeout(() => actRef.current({ type: 'closeReview', id: reviewId }), REVIEW_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [seat, reviewId])
  useEffect(() => {
    if (seat !== 0 || s.phase !== 'boom') return
    const t = setTimeout(() => actRef.current({ type: 'next' }), BOOM_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [seat, s.phase, s.phaseId])

  // ---- detak bom: makin lama makin rapat (tidak membocorkan sumbu, cuma lama nyalanya) ----
  const tickInfo = useRef({ holder: s.holder, me: seat })
  useEffect(() => {
    tickInfo.current = { holder: s.holder, me: seat }
  })
  useEffect(() => {
    if (!live) return
    const at = Date.now()
    let t: ReturnType<typeof setTimeout>
    const tick = () => {
      const sec = (Date.now() - at) / 1000
      const mine = tickInfo.current.holder === tickInfo.current.me
      sfx('bom-tick', { volume: mine ? 0.75 : 0.35, rate: Math.min(1.5, 1 + sec / 90) })
      t = setTimeout(tick, Math.max(260, 900 - sec * 16))
    }
    t = setTimeout(tick, 400)
    return () => clearTimeout(t)
  }, [live, s.fuseId])

  // ---- suara & efek dari perubahan state ----
  const prev = useRef<BomState | null>(null)
  useEffect(() => {
    const { sounds, fx: cues } = cuesFor(prev.current, s, seat)
    prev.current = s
    sounds.forEach((c) => sfx(c.sfx, c))
    if (cues.length && !reduceMotion()) setFx((cur) => [...cur, ...cues.map((c) => ({ id: ++fxSeq, anim: FX[c.anim], size: c.size }))])
  }, [s, seat])

  const floor = { backgroundImage: terrazzo(14, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }
  const mine = live && s.holder === seat && s.alive[seat]

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="mx-auto flex h-full max-w-[1100px] items-stretch gap-2.5 px-[max(10px,env(safe-area-inset-left))] py-[max(6px,env(safe-area-inset-top))] pr-[max(10px,env(safe-area-inset-right))]">
        {/* ---- meja: tantangan + kartu tiap pemain ---- */}
        <section className="relative flex h-full min-w-0 flex-[1.7] flex-col gap-2" aria-label="Meja pemain">
          <PromptBanner s={s} seat={seat} />
          <Table s={s} seat={seat} names={names} online={online} act={act} elapsed={elapsed} />
          {fx.map((f) => (
            <FxBurst key={f.id} fx={f} onDone={() => setFx((cur) => cur.filter((x) => x.id !== f.id))} />
          ))}
          {s.phase === 'intro' && <IntroPanel s={s} seat={seat} act={act} />}
          {s.phase === 'boom' && <BoomPanel s={s} seat={seat} names={names} left={boomLeft} act={act} />}
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
              Ronde {s.round}
              <span className="block text-[10px] text-ink/70">
                {MODE_INFO[s.opts.mode].title} · {SPEED_INFO[s.opts.speed].title}
              </span>
            </span>
          </header>
          <p className={cn('border-[3px] border-ink px-2 py-1 text-[12px] font-bold leading-snug', mine ? 'bg-rose' : 'bg-paper')} aria-live="polite">
            {statusLine(s, seat, names)}
          </p>
          {mine && !s.aiming && <WordBox s={s} seat={seat} act={act} />}
          <ReviewBox s={s} seat={seat} names={names} act={act} />
          {s.opts.powerups && s.alive[seat] && <PowerBar s={s} seat={seat} act={act} />}
          <EventNote s={s} seat={seat} names={names} />
          <WordLog s={s} seat={seat} names={names} />
        </aside>
      </div>
      {s.phase === 'end' && <EndScreen s={s} seat={seat} names={names} act={act} exit={exit} />}
      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Nyawa dan ronde semua pemain hilang untuk semua orang di room."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

/* ---------- meja ---------- */

function PromptBanner({ s, seat }: { s: BomState; seat: Seat }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (s.phase === 'live' && !reduceMotion()) gsap.fromTo(box.current, { rotation: -2, scale: 1.05 }, { rotation: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' })
  }, [s.turnId])
  const p = s.prompt
  const mine = s.phase === 'live' && s.holder === seat
  return (
    <div
      ref={box}
      className={cn('flex shrink-0 items-center gap-2 border-[3px] border-ink px-2 py-1 shadow-slab-sm', mine ? 'bg-electric' : 'bg-paper')}
      style={{ backgroundImage: dots('#12121216', 12, 1.2) }}
      aria-label={`Tantangan: ${promptText(p)}`}
    >
      <span className="font-display text-[11px] uppercase leading-tight">{mine ? 'Kamu harus:' : 'Tantangan'}</span>
      {p.category && (
        <Tape tone="paper" className="min-w-0 truncate text-[clamp(15px,2.4vw,22px)] leading-tight">
          {p.category}
        </Tape>
      )}
      {p.letter && (
        <span className="flex items-center gap-1">
          <span className="text-[11px] font-bold">{s.opts.mode === 'sambung' ? 'diawali' : 'huruf'}</span>
          <span className="grid size-9 place-items-center border-[3px] border-ink bg-rose font-display text-2xl leading-none">{p.letter}</span>
        </span>
      )}
      {p.syllable && (
        <span className="flex items-center gap-1">
          <span className="text-[11px] font-bold">mengandung</span>
          <span className="border-[3px] border-ink bg-rose px-2 font-display text-2xl leading-tight tracking-wider">{p.syllable}</span>
        </span>
      )}
      {s.opts.mode === 'sambung' && s.log.some((l) => l.ok && l.round === s.round) && (
        <span className="ml-auto truncate text-[11px] font-semibold text-ink/70">sebelumnya: {s.log.findLast((l) => l.ok && l.round === s.round)?.word}</span>
      )}
    </div>
  )
}

function Table({ s, seat, names, online, act, elapsed }: { s: BomState; seat: Seat; names: string[]; online: boolean[]; act: Act; elapsed: number }) {
  const n = s.opts.players
  const cols = n <= 4 ? n : Math.ceil(n / 2)
  return (
    <ol
      className="grid min-h-0 flex-1 gap-2 p-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(n / cols)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: n }, (_, i) => (
        <SeatCard key={i} s={s} i={i} seat={seat} name={who(i, seat, names)} online={online[i] ?? false} act={act} elapsed={elapsed} />
      ))}
    </ol>
  )
}

function SeatCard({ s, i, seat, name, online, act, elapsed }: { s: BomState; i: Seat; seat: Seat; name: string; online: boolean; act: Act; elapsed: number }) {
  const out = !s.alive[i]
  const holding = (s.phase === 'live' || s.phase === 'intro') && s.holder === i
  const target = canAim(s, seat, i)
  const last = s.log.findLast((l) => l.by === i && l.round === s.round)
  const card = useRef<HTMLLIElement>(null)
  useGSAP(() => {
    if (holding && !reduceMotion()) gsap.fromTo(card.current, { rotation: -3, scale: 1.05 }, { rotation: 0, scale: 1, duration: 0.4, ease: 'back.out(2.4)' })
  }, [holding, s.turnId])

  const body = (
    <>
      <div className="flex items-center gap-1.5 border-b-[3px] border-ink px-1.5 py-0.5" style={{ background: SEAT_HEX[i % SEAT_HEX.length] }}>
        <span className="size-2.5 shrink-0 rounded-full border-2 border-ink" style={{ background: online ? '#121212' : PAPER }} aria-label={online ? 'online' : 'offline'} />
        <span className="min-w-0 flex-1 truncate text-left text-[12px] font-bold">{name}</span>
        {s.opts.powerups && s.powers[i].length > 0 && !out && (
          <span className="flex items-center border-2 border-ink bg-paper px-0.5" aria-label={`${s.powers[i].length} power-up`}>
            <img src={sprite(POWER_SPRITE[s.powers[i][0]])} alt="" className="h-3.5 w-auto" draggable={false} />
            {s.powers[i].length > 1 && <span className="font-display text-[9px] leading-none">×{s.powers[i].length}</span>}
          </span>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-0.5">
        <Hearts lives={s.lives[i]} max={s.opts.lives} />
        {holding ? (
          <Bomb elapsed={elapsed} lit={s.phase === 'live'} turnId={s.turnId} />
        ) : last ? (
          <Tape tone={last.ok ? 'paper' : 'rose'} className={cn('block max-w-full truncate text-[clamp(13px,9cqh,20px)] leading-tight', !last.ok && 'line-through')}>
            {last.word}
          </Tape>
        ) : (
          <span className="text-[11px] font-semibold text-ink/45">{out ? '' : 'aman… untuk sekarang'}</span>
        )}
      </div>
      {out && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-paper/55" style={{ backgroundImage: hatch('#121212', 7, 0.14) }}>
          <div className="flex -rotate-12 items-center gap-1 border-[3px] border-ink bg-rose px-1.5 py-0.5 shadow-slab-sm">
            <img src={sprite('mascot-gosong')} alt="" className="h-7 w-auto" draggable={false} />
            <span className="font-display text-[11px] uppercase leading-none">Gosong</span>
          </div>
        </div>
      )}
    </>
  )

  return (
    <li
      ref={card}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden border-[3px] border-ink bg-paper [container-type:size]',
        holding ? 'shadow-[4px_5px_0_#ff37a6]' : 'shadow-slab-sm',
        i === seat && 'outline-dashed outline-2 outline-offset-2 outline-ink',
      )}
    >
      {target ? (
        <button
          onClick={() => act({ type: 'aim', target: i })}
          aria-label={`Oper bom ke ${name}`}
          className="flex h-full min-h-0 flex-col text-left active:bg-electric/40"
          style={{ backgroundImage: dots('#ff37a633', 12, 1.6) }}
        >
          {body}
        </button>
      ) : (
        body
      )}
    </li>
  )
}

function Hearts({ lives, max }: { lives: number; max: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${lives} nyawa`}>
      {Array.from({ length: max }, (_, k) => (
        <img key={k} src={sprite(k < lives ? 'icon-heart' : 'icon-heart-off')} alt="" className={cn('h-[clamp(12px,14cqh,22px)] w-auto', k >= lives && 'opacity-50')} draggable={false} />
      ))}
    </span>
  )
}

/** bom di tangan pemegang: makin lama makin goyang */
function Bomb({ elapsed, lit, turnId }: { elapsed: number; lit: boolean; turnId: number }) {
  const box = useRef<HTMLDivElement>(null)
  const shake = Math.min(1, elapsed / 40)
  useGSAP(() => {
    if (reduceMotion() || !lit) return
    const tw = gsap.to(box.current, { rotation: 4 + shake * 10, duration: 0.18 - shake * 0.1, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 80%' })
    return () => tw.kill()
  }, [Math.round(shake * 5), lit, turnId])
  return (
    <div ref={box} className="relative h-[min(56cqh,96px)] min-h-[40px] aspect-square">
      <img src={sprite('bomb')} alt="Bom berwajah panik dengan sumbu menyala" className="h-full w-auto" draggable={false} />
      {lit && (
        <div aria-hidden className="pointer-events-none absolute -right-[18%] -top-[22%] w-[60%]">
          <Lottie src={fxSpark} autoplay loop className="h-full w-full" />
        </div>
      )}
    </div>
  )
}

/* ---------- panel kanan ---------- */

function WordBox({ s, seat, act }: { s: BomState; seat: Seat; act: Act }) {
  const [text, setText] = useState('')
  const [turn, setTurn] = useState(s.turnId)
  const [error, setError] = useState<string | null>(null)
  if (turn !== s.turnId) {
    setTurn(s.turnId)
    setText('')
    setError(null)
  }
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [s.turnId])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = wordProblem(s, seat, text)
    if (problem) {
      setError(problem)
      sfx('bom-reject')
      if (!reduceMotion()) gsap.fromTo(input.current, { x: -8 }, { x: 0, duration: 0.3, ease: 'elastic.out(1.2, 0.3)' })
      return
    }
    act({ type: 'word', text })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          ref={input}
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, WORD_MAX))
            setError(null)
          }}
          placeholder={`${promptText(s.prompt)}…`}
          aria-label="Kata"
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
          aria-label="Kirim kata & oper bom"
          className="grid size-10 shrink-0 place-items-center border-[3px] border-ink bg-rose shadow-slab-sm active:translate-y-0.5 active:shadow-none disabled:bg-paper disabled:shadow-none"
        >
          <HugeiconsIcon icon={SentIcon} size={18} strokeWidth={2.4} />
        </button>
      </div>
      {error && <p className="bg-[#ffcc1f] px-1 text-[11px] font-bold">{error}</p>}
    </form>
  )
}

function ReviewBox({ s, seat, names, act }: { s: BomState; seat: Seat; names: string[]; act: Act }) {
  const r = s.review
  if (!r || s.phase !== 'live') return null
  const can = canProtest(s, seat)
  const voted = r.votes.includes(seat)
  return (
    <div className="flex items-center gap-1.5 border-[3px] border-ink bg-paper px-1.5 py-1 shadow-slab-sm" style={{ backgroundImage: dots('#12121214', 10, 1.1) }}>
      <img src={sprite('icon-protest')} alt="" className="h-8 w-auto shrink-0" draggable={false} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[12px] font-bold">
          "{r.word}" <span className="font-semibold text-ink/70">· {who(r.by, seat, names)}</span>
        </p>
        <p className="text-[10px] font-semibold text-ink/70">
          {r.by === seat ? 'Semoga nggak diprotes…' : promptText(r.prompt)} · {protestLine(s)}
        </p>
      </div>
      {can ? (
        <Slab tone="rose" size="sm" onClick={() => act({ type: 'protest', id: r.id })}>
          Ngawur!
        </Slab>
      ) : (
        voted && <span className="border-2 border-ink bg-rose px-1 font-display text-[10px] uppercase">protes ✓</span>
      )}
    </div>
  )
}

function PowerBar({ s, seat, act }: { s: BomState; seat: Seat; act: Act }) {
  const mine = s.powers[seat]
  if (!mine.length) return <p className="text-[11px] font-semibold text-ink/60">Belum punya power-up. Ketik kata ≥ 8 huruf buat dapat.</p>
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Power-up milikmu">
      {POWERS.filter((p) => mine.includes(p)).map((p) => {
        const count = mine.filter((x) => x === p).length
        const ok = canPower(s, seat, p)
        return (
          <li key={p}>
            <button
              onClick={() => act({ type: 'power', power: p })}
              disabled={!ok}
              title={POWER_INFO[p].line}
              aria-label={`${POWER_INFO[p].title}: ${POWER_INFO[p].line}`}
              className={cn(
                'flex items-center gap-1 border-[3px] border-ink px-1.5 py-0.5 text-left shadow-slab-sm active:translate-y-0.5 active:shadow-none disabled:shadow-none',
                ok ? 'bg-electric' : 'bg-paper opacity-60',
              )}
            >
              <img src={sprite(POWER_SPRITE[p])} alt={POWER_INFO[p].alt} className="h-6 w-auto" draggable={false} />
              <span className="font-display text-[11px] uppercase leading-none">{POWER_INFO[p].title}</span>
              {count > 1 && <span className="font-display text-[10px]">×{count}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function EventNote({ s, seat, names }: { s: BomState; seat: Seat; names: string[] }) {
  // catatan kejadian cuma tampil sebentar
  const [gone, setGone] = useState<number | null>(null)
  const id = s.event?.id ?? null
  useEffect(() => {
    if (id === null) return
    const t = setTimeout(() => setGone(id), 4500)
    return () => clearTimeout(t)
  }, [id])
  const line = s.phase === 'live' && id !== gone ? eventLine(s, seat, names) : null
  const box = useRef<HTMLParagraphElement>(null)
  useGSAP(() => {
    if (line && !reduceMotion()) gsap.from(box.current, { scale: 0.8, rotation: -4, duration: 0.3, ease: 'back.out(2)' })
  }, [s.event?.id])
  if (!line) return null
  return (
    <p ref={box} className="self-start border-2 border-ink bg-[#ffcc1f] px-1.5 text-[11px] font-bold">
      {line}
    </p>
  )
}

function WordLog({ s, seat, names }: { s: BomState; seat: Seat; names: string[] }) {
  const items = s.log.slice(-8).reverse()
  return (
    <ol className="mt-auto flex flex-wrap gap-1" aria-label="Kata terakhir">
      {items.map((l, k) => (
        <li key={`${l.round}-${l.word}-${k}`} className={cn('flex items-center gap-1 border-2 border-ink px-1 text-[11px] font-bold', l.ok ? 'bg-paper' : 'bg-petal text-ink/60 line-through')}>
          <span className="size-2 shrink-0 rounded-full border border-ink" style={{ background: SEAT_HEX[l.by % SEAT_HEX.length] }} aria-label={who(l.by, seat, names)} />
          {l.word}
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
        className={cn('relative flex max-h-full w-full flex-col gap-2 overflow-y-auto border-[3px] border-ink bg-paper p-3 shadow-lift', wide ? 'max-w-[540px]' : 'max-w-[420px]')}
      >
        <div aria-hidden className="absolute -top-0 right-4 h-4 w-16 rotate-6 border-[3px] border-ink bg-rose" style={{ backgroundImage: squiggles('#121212', 40, 2.6) }} />
        {children}
      </div>
    </div>
  )
}

function IntroPanel({ s, seat, act }: { s: BomState; seat: Seat; act: Act }) {
  const m = MODE_INFO[s.opts.mode]
  const on = (Object.keys(FEATURE_INFO) as (keyof typeof FEATURE_INFO)[]).filter((f) => s.opts[f])
  return (
    <Overlay label="Aturan Bom Waktu" wide>
      <div className="flex items-start gap-3">
        <img src={sprite('bomb')} alt="Bom berwajah panik dengan sumbu menyala" className="h-20 w-auto shrink-0" draggable={false} />
        <div className="min-w-0 flex-1">
          <Tape tone="electric" className="text-xl leading-tight">
            {m.title}
          </Tape>
          <p className="mt-1 text-[12px] font-semibold">{m.line}</p>
          <p className="text-[12px] font-bold text-ink/70">Contoh: {m.example}</p>
          <p className="mt-1 text-[12px]">
            Ketik kata yang cocok → bom pindah. Waktu ledaknya rahasia ({SPEED_INFO[s.opts.speed].line}). Kena DUAR = nyawa −1. {s.opts.lives} nyawa per orang.
          </p>
        </div>
      </div>
      {on.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {on.map((f) => (
            <li key={f} className="border-2 border-ink bg-electric px-1.5 text-[11px] font-bold">
              {FEATURE_INFO[f].title}
            </li>
          ))}
        </ul>
      )}
      {seat === 0 ? (
        <Slab tone="rose" size="sm" className="self-end" onClick={() => act({ type: 'next' })}>
          Nyalakan sumbu!
        </Slab>
      ) : (
        <p className="self-end text-[11px] font-semibold text-ink/70">Nunggu host menyalakan sumbu…</p>
      )}
    </Overlay>
  )
}

function BoomPanel({ s, seat, names, left, act }: { s: BomState; seat: Seat; names: string[]; left: number; act: Act }) {
  const { title, line } = boomLine(s, seat, names)
  return (
    <Overlay label={title}>
      <div className="flex items-center gap-3">
        <img src={sprite('mascot-gosong')} alt="Maskot gosong berambut kribo berasap" className="h-24 w-auto shrink-0" draggable={false} />
        <div className="min-w-0">
          <Tape tone="rose" className="text-xl leading-tight">
            {title}
          </Tape>
          <p className="mt-1 text-[13px] font-semibold">{line}</p>
        </div>
      </div>
      {seat === 0 ? (
        <Slab tone="rose" size="sm" className="self-end" onClick={() => act({ type: 'next' })}>
          Ronde berikutnya ({left})
        </Slab>
      ) : (
        <p className="self-end text-[11px] font-semibold text-ink/70">Bom baru dinyalakan {left} detik lagi…</p>
      )}
    </Overlay>
  )
}

/* ---------- layar juara ---------- */

function EndScreen({ s, seat, names, act, exit }: { s: BomState; seat: Seat; names: string[]; act: Act; exit: () => void }) {
  const happy = s.winner === seat
  const box = useRef<HTMLDivElement>(null)
  // juara dulu, lalu yang paling lama bertahan
  const ranking = [...(s.winner !== null ? [s.winner] : []), ...[...s.outOrder].reverse()]
  useGSAP(
    () => {
      if (!reduceMotion()) gsap.from('[data-pop]', { y: 30, rotation: -4, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.4, ease: 'back.out(1.7)' })
    },
    { scope: box },
  )
  const headline = happy ? 'Kamu selamat sendirian!' : `${names[s.winner ?? 0] ?? '?'} juara`
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={headline} className="fixed inset-0 z-30 flex overflow-y-auto bg-ink/70 px-5 py-3">
      {happy && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 h-full w-full" />}
      <div className="m-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5">
        <div className="flex flex-col items-center">
          <img
            data-pop
            src={sprite(happy ? 'bom-win' : 'bom-lose')}
            alt={happy ? 'Maskot di atas podium memegang bom yang sumbunya padam' : 'Maskot gosong berasap di samping bom yang meledak'}
            className="-mb-5 h-28 w-auto"
            draggable={false}
          />
          <div data-pop className="w-72 border-[3px] border-ink bg-paper p-4 shadow-lift">
            <Tape tone={happy ? 'electric' : 'rose'} className="text-xl leading-tight">
              {headline}
            </Tape>
            <p className="mt-2 text-[13px] font-medium text-ink/80">
              {happy ? 'Jari secepat kilat, otak nggak nge-blank. Bomnya takut sama kamu.' : 'Rambutmu masih berasap. Revans biar nggak penasaran?'}
            </p>
          </div>
        </div>
        <div className="flex w-72 flex-col gap-3">
          <ol data-pop className="space-y-1 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab" aria-label="Peringkat akhir">
            {ranking.map((i, rank) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[12px] font-semibold leading-tight">
                <span className={cn('flex items-center gap-1.5', i === seat && 'font-bold')}>
                  <span className="size-2.5 shrink-0 rounded-full border-2 border-ink" style={{ background: SEAT_HEX[i % SEAT_HEX.length] }} />
                  {rank + 1}. {who(i, seat, names)}
                </span>
                <span className="text-ink/70">{s.words[i]} kata</span>
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
