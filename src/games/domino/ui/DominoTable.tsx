import { useGSAP } from '@gsap/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import gsap from 'gsap'
import { Lottie } from 'lottie-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { sfx, useMusic } from '@/audio/audio'
import { SoundButton } from '@/audio/SoundSettings'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { hatch, squiggles, terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import blocked from '@/assets/lottie/domino-blocked.json'
import chipsFx from '@/assets/lottie/domino-chips.json'
import deal from '@/assets/lottie/domino-deal.json'
import score from '@/assets/lottie/domino-score.json'
import slam from '@/assets/lottie/domino-slam.json'
import special from '@/assets/lottie/domino-special.json'
import type { GameProps, Seat } from '../../types'
import { MODE_INFO } from '../modes'
import { canPass, chainPlayable, endCount, ends, mustDraw, sidesFor } from '../modes/chain'
import { evaluateQiu, minRaiseTo, qiuName, qiuPot, toCall } from '../modes/qiuqiu'
import { effectFor, isTense, soundsFor, turnOf, type Effect } from '../sounds'
import { handPips, sortTiles, tileLabel } from '../tiles'
import type { ChainState, DominoAction, DominoState, Placed, QiuState, Side, Tile } from '../types'
import { sprite } from './art'
import { eventText } from './copy'
import { RoundEnd } from './RoundEnd'
import { TileFace } from './TileFace'

gsap.registerPlugin(useGSAP)

type Props = GameProps<DominoState, DominoAction>

const ANIMS: Record<Effect['anim'], object> = {
  'domino-blocked': blocked,
  'domino-chips': chipsFx,
  'domino-deal': deal,
  'domino-score': score,
  'domino-slam': slam,
  'domino-special': special,
}

const WOOD = '#e0a463'
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function opponentOrder(players: number, seat: Seat): Seat[] {
  return Array.from({ length: players - 1 }, (_, i) => (seat + 1 + i) % players)
}

export function DominoTable({ state: s, seat, names, online, act, exit }: Props) {
  const m = s.m
  const chainM = m.kind === 'chain' ? m : null
  const qiuM = m.kind === 'qiuqiu' ? m : null
  // pilihan kartu hanya berlaku sampai ada kejadian baru di meja
  const [pick, setPick] = useState<{ id: string; at: number } | null>(null)
  const sel = pick && pick.at === s.eventId && s.phase === 'play' ? pick.id : null
  const setSel = (id: string | null) => setPick(id ? { id, at: s.eventId } : null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [effect, setEffect] = useState<(Effect & { key: number }) | null>(null)
  const n = s.scores.length
  const opponents = opponentOrder(n, seat)
  const turn = turnOf(s)
  const myTurn = turn === seat
  const hand = qiuM && qiuM.hands[seat].length === 4 ? qiuOrder(qiuM.hands[seat]) : sortTiles(m.hands[seat])
  const playable = chainM && s.phase === 'play' ? chainPlayable(chainM, seat) : []

  // ---- suara & efek dari setiap perubahan state ----
  useMusic(isTense(s) ? 'domino-tense' : 'domino')
  const prev = useRef<DominoState | null>(null)
  useEffect(() => {
    for (const cue of soundsFor(prev.current, s, seat)) sfx(cue.sfx, cue)
    const fx = effectFor(prev.current, s, seat)
    if (fx && !reduced()) setEffect({ ...fx, key: s.eventId })
    prev.current = s
  }, [s, seat])

  // ---- animasi kartu baru masuk tangan (dibagi / nyangkul) ----
  const handRefs = useRef(new Map<string, HTMLElement>())
  const known = useRef(new Set<string>())
  const knownSeat = useRef(seat)
  useLayoutEffect(() => {
    const fresh = hand.filter((t) => !known.current.has(t.id))
    const sameSeat = knownSeat.current === seat
    knownSeat.current = seat
    if (sameSeat && known.current.size && fresh.length && !reduced()) {
      fresh.forEach((t, i) => {
        const el = handRefs.current.get(t.id)
        if (el) gsap.from(el, { y: -80, rotation: 25, opacity: 0, duration: 0.36, delay: Math.min(i, 8) * 0.05, ease: 'power2.out' })
      })
    }
    known.current = new Set(hand.map((t) => t.id))
  })

  const play = (id: string, side: Side) => {
    setSel(null)
    act({ t: 'play', id, side })
  }

  const onTile = (t: Tile) => {
    if (!chainM || !playable.includes(t.id)) return
    const sides = sidesFor(chainM, t)
    const e = ends(chainM)
    // satu-satunya pilihan (atau dua ujung sama angkanya): langsung jalan
    if (sides.length === 1 || !e || e[0] === e[1]) return play(t.id, sides[0])
    setSel(sel === t.id ? null : t.id)
  }

  const selTile = sel ? hand.find((t) => t.id === sel) : undefined
  const label =
    s.phase !== 'play' ? (s.phase === 'end' ? 'Game selesai' : 'Ronde selesai') : chainM ? chainStatus(chainM, seat, names, !!selTile) : qiuStatus(qiuM!, seat, names)
  const floor = { backgroundImage: terrazzo(9, ['#ff37a6', '#c98a4b', '#121212', '#5cf64a', '#ffcc1f'], 180, 30) }
  const scoreText = (x: Seat) => (qiuM ? `${s.phase === 'play' ? qiuM.stack[x] : s.scores[x]} chip` : `${s.scores[x]} poin`)
  const meLine = chainM
    ? [chainM.mode === 'lima' && chainM.pts[seat] ? `+${chainM.pts[seat]} ronde ini` : '', `mata ${handPips(chainM.hands[seat])}`].filter(Boolean).join(' · ')
    : qiuM && s.phase === 'play'
      ? [qiuM.hands[seat].length === 4 ? qiuName(evaluateQiu(qiuM.hands[seat])) : '3 kartu, tunggu kartu ke-4', qiuM.bet[seat] ? `taruhan ${qiuM.bet[seat]}` : '', seat === qiuM.dealer ? 'bandar' : '']
          .filter(Boolean)
          .join(' · ')
      : ''

  return (
    <div className="h-dvh overflow-hidden bg-petal" style={floor}>
      <div className="relative mx-auto grid h-full max-w-[1100px] grid-cols-[1fr_minmax(150px,200px)] grid-rows-[auto_1fr_auto] gap-x-3 px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))]">
        {/* ---- atas: kembali + lawan ---- */}
        <header className="col-span-2 flex items-start gap-2 pt-[max(6px,env(safe-area-inset-top))]">
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Kembali ke menu"
            className="mt-1 grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.4} />
          </button>
          <SoundButton className="mt-1" />
          <div className="flex min-w-0 flex-1 items-start gap-2 overflow-x-auto pb-1" aria-label="Pemain lain">
            {opponents.map((o) => {
              const tiles = m.hands[o]
              const isTurn = turn === o
              return (
                <div
                  key={o}
                  className={cn('relative mt-1 flex min-w-[104px] shrink-0 flex-col gap-0.5 border-[3px] border-ink px-2 pb-1 pt-1', isTurn ? 'bg-rose shadow-slab' : 'bg-paper/90 shadow-slab-sm')}
                  aria-label={`${names[o]}: ${tiles.length} kartu, ${scoreText(o)}${isTurn ? ', sedang giliran' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn('size-2.5 shrink-0 rounded-full border-2 border-ink', online[o] ? 'bg-electric' : 'bg-paper')} />
                    <span className="max-w-[9ch] truncate font-display text-[12px] uppercase">{names[o] ?? '?'}</span>
                    <span className="ml-auto text-[12px] font-bold">{tiles.length}</span>
                  </div>
                  {qiuM?.result?.shown && qiuM.result.hands[o] ? (
                    <QiuMini m={qiuM} who={o} />
                  ) : (
                    <div className="relative h-[20px]" aria-hidden>
                      {tiles.slice(0, 14).map((t, i, arr) => (
                        <span key={t.id} className="absolute top-0" style={{ left: i * (arr.length <= 1 ? 0 : Math.min(9, 76 / (arr.length - 1))) }}>
                          <TileFace a={0} b={0} size={10} back />
                        </span>
                      ))}
                    </div>
                  )}
                  {qiuM && <QiuSeatTag m={qiuM} who={o} />}
                  <span className="text-[11px] font-semibold">
                    {scoreText(o)}
                    {chainM?.mode === 'lima' && chainM.pts[o] ? ` · +${chainM.pts[o]}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </header>

        {/* ---- meja tengah ---- */}
        <section className="relative flex min-h-0 items-center justify-center py-1">
          <div
            aria-hidden
            className="absolute inset-x-[2%] inset-y-[4%] -skew-x-3 border-[3px] border-ink shadow-lift"
            style={{ backgroundColor: WOOD, backgroundImage: squiggles('#8a5a2b40', 70, 2.2) }}
          />
          <div className="relative h-full w-full">
            {chainM ? <ChainBoard m={chainM} seat={seat} names={names} sel={selTile} onSide={(side) => selTile && play(selTile.id, side)} act={act} /> : <QiuCenter m={qiuM!} s={s} />}
          </div>
        </section>

        {/* ---- panel kanan ---- */}
        <aside className="row-span-2 flex min-h-0 flex-col items-stretch justify-center gap-2 pb-[max(8px,env(safe-area-inset-bottom))]" aria-live="polite">
          <Tape
            tone={myTurn ? 'rose' : 'paper'}
            tilt={myTurn ? 'l' : 'r'}
            className="self-center text-center text-base leading-tight"
            style={myTurn ? undefined : { backgroundImage: terrazzo(21, ['#ff37a6', '#c98a4b', '#121212'], 90, 18) }}
          >
            {label}
          </Tape>
          <p className="min-h-8 text-center text-[12px] font-semibold leading-snug">{eventText(s, seat, names)}</p>
          <span className="text-center font-display text-[10px] uppercase text-ink/70">
            {MODE_INFO[s.opts.mode].title} · {qiuM ? 'tangan' : 'ronde'} {s.round}/{qiuM ? s.opts.hands : s.opts.rounds}
          </span>
          {s.phase === 'play' && (
            <div className="flex flex-col items-stretch gap-2">
              {chainM ? <ChainActions m={chainM} seat={seat} sel={selTile} act={act} onSide={(side) => selTile && play(selTile.id, side)} onCancel={() => setSel(null)} /> : <QiuActions m={qiuM!} seat={seat} ante={s.opts.ante} act={act} />}
            </div>
          )}
        </aside>

        {/* ---- tanganku ---- */}
        <section
          aria-label="Kartumu"
          className="relative min-w-0 border-[3px] border-b-0 border-ink bg-grass pb-[max(4px,env(safe-area-inset-bottom))] pt-1.5"
          style={{ backgroundImage: squiggles('#12121230', 64, 2.4) }}
        >
          <div className="flex items-center gap-2 px-3">
            <Tape tone="paper" tilt="r" className="text-sm">
              {names[seat]}
            </Tape>
            <span className="truncate text-[12px] font-semibold">
              {hand.length} kartu · {scoreText(seat)}
              {meLine && s.phase === 'play' ? ` · ${meLine}` : ''}
            </span>
          </div>
          <Hand tiles={hand} playable={playable} sel={sel} onTile={onTile} refs={handRefs} dimOthers={myTurn && !!chainM} pairs={!!qiuM && hand.length === 4} />
        </section>
      </div>

      {effect && <FxOverlay key={effect.key} fx={effect} onDone={() => setEffect(null)} />}

      {s.phase !== 'play' && <RoundEnd s={s} seat={seat} names={names} act={act} exit={exit} />}

      <ConfirmModal
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Balik ke menu?"
        description="Game ini berhenti untuk semua pemain dan kartu di tangan hilang."
        confirmLabel="Keluar"
        onConfirm={exit}
      />
    </div>
  )
}

/* ---------- status ---------- */

function chainStatus(m: ChainState, seat: Seat, names: string[], picking: boolean): string {
  if (m.turn !== seat) return `Giliran ${names[m.turn]}`
  if (picking) return 'Pasang di ujung mana?'
  if (!m.line.length) return m.first ? 'Buka pakai balak!' : 'Kamu yang buka'
  if (mustDraw(m, seat)) return 'Nyangkul dulu!'
  if (canPass(m, seat)) return 'Nggak nyambung, pass'
  return 'Sambung kartumu'
}

function qiuStatus(m: QiuState, seat: Seat, names: string[]): string {
  if (m.result) return 'Buka kartu!'
  if (!m.inHand[seat]) return 'Kamu bangkrut'
  if (m.folded[seat]) return 'Kamu fold, nonton dulu'
  if (m.turn !== seat) return `Giliran ${names[m.turn]}`
  return toCall(m, seat) > 0 ? `Call ${toCall(m, seat)}?` : 'Check atau raise'
}

/* ---------- rantai di meja ---------- */

const GAP = 3

/** Bagi rantai jadi baris ular: baris genap kiri→kanan, ganjil kanan→kiri. */
function layoutRows(line: Placed[], u: number, width: number): Placed[][] {
  const rows: Placed[][] = [[]]
  let used = 0
  for (const p of line) {
    const w = (p.tile.a === p.tile.b ? u : u * 2) + GAP
    if (used + w > width && rows[rows.length - 1].length) {
      rows.push([])
      used = 0
    }
    rows[rows.length - 1].push(p)
    used += w
  }
  return rows
}

function ChainBoard({ m, seat, names, sel, onSide, act }: { m: ChainState; seat: Seat; names: string[]; sel?: Tile; onSide: (s: Side) => void; act: (a: DominoAction) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 420, h: 150 })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // ukuran kartu terbesar yang muat
  const width = Math.max(120, size.w - 24)
  let u = 26
  for (; u > 11; u--) {
    const rows = layoutRows(m.line, u, width).length
    if (rows * (u * 2 + 6) <= size.h - 34) break
  }
  const rows = layoutRows(m.line, u, width)
  const e = ends(m)
  const sides = sel ? sidesFor(m, sel) : []
  const lastId = m.last?.id
  const canDraw = mustDraw(m, seat)

  const endTile = (p: Placed, side: Side) => sides.includes(side) && (side === 'L' ? m.line[0] === p : m.line[m.line.length - 1] === p)

  return (
    <div ref={box} className="relative flex h-full flex-col items-center justify-center px-3 pb-7 pt-1">
      {!m.line.length && <span className="font-display text-[13px] uppercase text-ink/80">{m.turn === seat ? 'Kamu buka meja' : `${names[m.turn]} buka meja`}</span>}
      <div className="flex flex-col gap-1.5" style={{ width: rows.length > 1 ? width : undefined }}>
        {rows.map((row, ri) => (
          <div key={ri} className={cn('flex items-center', ri % 2 ? 'flex-row-reverse' : 'flex-row')} style={{ gap: GAP, minHeight: u * 2 }}>
            {row.map((p) => {
              const dbl = p.tile.a === p.tile.b
              // baris terbalik: kartu ikut diputar supaya angka yang bersambung tetap bersebelahan
              const [x, y] = ri % 2 ? [p.r, p.l] : [p.l, p.r]
              const target = endTile(p, 'L') ? 'L' : endTile(p, 'R') ? 'R' : null
              const body = <TileFace a={x} b={y} size={u} horizontal={!dbl} />
              return (
                <span key={p.tile.id} data-tile={p.tile.id} className="relative">
                  {target ? (
                    <button onClick={() => onSide(target)} aria-label={`Pasang di ujung ${target === 'L' ? 'kiri' : 'kanan'}`} className="block outline-[3px] outline-offset-2 outline-electric [outline-style:solid] animate-pulse">
                      {body}
                    </button>
                  ) : (
                    body
                  )}
                  {p.tile.id === lastId && <span aria-hidden className="absolute -bottom-1.5 left-1 right-1 h-1 -skew-x-12 bg-rose" />}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-2 bottom-1 flex items-center justify-between gap-2">
        {e ? (
          <Tag tone="paper">
            Ujung {e[0]} · {e[1]}
            {m.mode === 'lima' ? ` = ${endCount(m.line)}` : ''}
          </Tag>
        ) : (
          <span />
        )}
        {m.mode === 'gaple' ? (
          m.bone.length > 0 && <Tag tone="ink">tidur {m.bone.length}</Tag>
        ) : (
          <button
            onClick={canDraw ? () => act({ t: 'draw' }) : undefined}
            aria-label={`Tumpukan cangkul: ${m.bone.length} kartu`}
            className={cn('flex items-center gap-1', canDraw && 'animate-bounce')}
            disabled={!canDraw}
          >
            <img src={sprite('bone')} alt="" className="h-6 w-auto" draggable={false} />
            <Tag tone={canDraw ? 'electric' : 'paper'}>cangkul {m.bone.length}</Tag>
          </button>
        )}
      </div>
    </div>
  )
}

function ChainActions({ m, seat, sel, act, onSide, onCancel }: { m: ChainState; seat: Seat; sel?: Tile; act: (a: DominoAction) => void; onSide: (s: Side) => void; onCancel: () => void }) {
  if (m.turn !== seat) return null
  const e = ends(m)
  if (sel && e) {
    return (
      <>
        <div className="flex gap-2">
          <Slab tone="electric" size="sm" className="flex-1 px-1" onClick={() => onSide('L')}>
            ◀ Kiri ({e[0]})
          </Slab>
          <Slab tone="electric" size="sm" className="flex-1 px-1" onClick={() => onSide('R')}>
            Kanan ({e[1]}) ▶
          </Slab>
        </div>
        <Slab tone="paper" size="sm" onClick={onCancel}>
          Batal
        </Slab>
      </>
    )
  }
  if (mustDraw(m, seat))
    return (
      <Slab tone="rose" size="sm" onClick={() => act({ t: 'draw' })}>
        Cangkul{m.drew ? ` lagi (${m.drew})` : ''}
      </Slab>
    )
  if (canPass(m, seat))
    return (
      <Slab tone="paper" size="sm" onClick={() => act({ t: 'pass' })}>
        Pass
      </Slab>
    )
  return null
}

/* ---------- Qiu Qiu ---------- */

/** Urutkan empat kartu sesuai pasangan terbaik. */
function qiuOrder(h: Tile[]): Tile[] {
  const q = evaluateQiu(h)
  return [...q.pairs[0], ...q.pairs[1]]
}

function QiuCenter({ m, s }: { m: QiuState; s: DominoState }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="flex items-end gap-3">
        <img src={sprite('bone')} alt="" className="h-12 w-auto" draggable={false} />
        <span className="flex items-center gap-1.5 border-[3px] border-ink bg-paper px-2 py-1 shadow-slab-sm">
          <span className="font-display text-[12px] uppercase">Pot</span>
          <Chips amount={qiuPot(m)} size={22} />
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Tag tone="electric">{m.result ? 'Buka kartu' : m.street === 0 ? '3 kartu' : 'Kartu ke-4'}</Tag>
        <Tag>Ante {s.opts.ante}</Tag>
        {m.high > 0 && !m.result && <Tag tone="rose">Taruhan {m.high}</Tag>}
      </div>
    </div>
  )
}

function QiuMini({ m, who: o }: { m: QiuState; who: Seat }) {
  const h = m.result!.hands[o]!
  return (
    <div className="flex items-center gap-1" aria-label={`Kartu ${qiuName(h)}`}>
      {h.pairs.map((p, i) => (
        <span key={i} className="flex gap-px">
          {p.map((t) => (
            <TileFace key={t.id} a={t.a} b={t.b} size={9} />
          ))}
        </span>
      ))}
      <span className="font-display text-[10px]">{qiuName(h)}</span>
    </div>
  )
}

function QiuSeatTag({ m, who: o }: { m: QiuState; who: Seat }) {
  if (!m.inHand[o]) return <Tag tone="ink">bangkrut</Tag>
  if (m.folded[o]) return <Tag tone="ink">fold</Tag>
  if (m.stack[o] === 0) return <Tag tone="rose">all-in</Tag>
  return (
    <div className="flex items-center gap-1">
      {o === m.dealer && <Tag>bandar</Tag>}
      {m.bet[o] > 0 && <Chips amount={m.bet[o]} size={12} />}
    </div>
  )
}

function QiuActions({ m, seat, ante, act }: { m: QiuState; seat: Seat; ante: number; act: (a: DominoAction) => void }) {
  const [extra, setExtra] = useState(0)
  if (m.result || m.turn !== seat || m.folded[seat] || !m.inHand[seat]) return null
  const need = toCall(m, seat)
  const maxTo = m.bet[seat] + m.stack[seat]
  const minTo = Math.min(maxTo, minRaiseTo(m))
  const to = Math.min(maxTo, minTo + extra)
  const canRaise = maxTo > m.high
  return (
    <>
      <div className="flex gap-2">
        <Slab tone="paper" size="sm" className="flex-1" onClick={() => act({ t: 'fold' })}>
          Fold
        </Slab>
        <Slab tone="grass" size="sm" className="flex-1" onClick={() => act(need > 0 ? { t: 'call' } : { t: 'check' })}>
          {need > 0 ? `Call ${need}` : 'Check'}
        </Slab>
      </div>
      {canRaise && (
        <div className="flex items-center gap-1">
          <button aria-label="Kurangi raise" className="grid size-8 place-items-center border-[3px] border-ink bg-paper font-display" onClick={() => setExtra(Math.max(0, extra - ante))}>
            −
          </button>
          <Slab
            tone="rose"
            size="sm"
            className="flex-1 px-1"
            onClick={() => {
              act(to >= maxTo ? { t: 'allin' } : { t: 'raise', to })
              setExtra(0)
            }}
          >
            {to >= maxTo ? 'All-in' : `Raise ${to}`}
          </Slab>
          <button aria-label="Tambah raise" className="grid size-8 place-items-center border-[3px] border-ink bg-paper font-display" onClick={() => setExtra(Math.min(maxTo - minTo, extra + ante))}>
            +
          </button>
        </div>
      )}
      {canRaise && to < maxTo && (
        <Slab tone="ink" size="sm" onClick={() => act({ t: 'allin' })}>
          All-in {maxTo}
        </Slab>
      )}
    </>
  )
}

/* ---------- potongan kecil ---------- */

function Tag({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'electric' | 'rose' | 'ink' }) {
  return (
    <span
      className={cn(
        'inline-block border-2 border-ink px-1.5 font-display text-[10px] uppercase leading-relaxed',
        tone === 'paper' && 'bg-paper',
        tone === 'electric' && 'bg-electric',
        tone === 'rose' && 'bg-rose',
        tone === 'ink' && 'bg-ink text-petal',
      )}
    >
      {children}
    </span>
  )
}

function Chips({ amount, size = 18 }: { amount: number; size?: number }) {
  const n = amount <= 0 ? 0 : Math.min(3, Math.ceil(Math.log10(amount + 1)))
  return (
    <span className="inline-flex items-center gap-1 font-display text-[11px]">
      <span className="relative inline-block" style={{ width: size, height: size + n * 3 }}>
        {Array.from({ length: Math.max(1, n) }, (_, i) => (
          <img key={i} src={sprite(`chip-${i % 4}`)} alt="" className="absolute left-0" style={{ width: size, bottom: i * 3, opacity: n ? 1 : 0.35 }} draggable={false} />
        ))}
      </span>
      {amount}
    </span>
  )
}

const TILE = 30
const MIN_STEP = 18

function Hand({
  tiles,
  playable,
  sel,
  onTile,
  refs,
  dimOthers,
  pairs,
}: {
  tiles: Tile[]
  playable: string[]
  sel: string | null
  onTile: (t: Tile) => void
  refs: React.RefObject<Map<string, HTMLElement>>
  dimOthers: boolean
  /** Qiu Qiu: tampilkan sebagai dua pasang */
  pairs: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = tiles.length
  const fit = n <= 1 ? TILE : (width - TILE - 16) / (n - 1)
  const step = Math.max(MIN_STEP, Math.min(TILE + 10, fit))
  const scrolls = fit < MIN_STEP
  const pairValue = (i: number) => (tiles[i].a + tiles[i].b + tiles[i + 1].a + tiles[i + 1].b) % 10
  return (
    <div ref={box} className={cn('px-3 pt-2.5', scrolls && 'overflow-x-auto [scrollbar-width:thin]')}>
      <div className="relative mx-auto h-[84px]" style={{ width: Math.max(0, n - 1) * step + TILE + (pairs ? 24 : 0) }}>
        {!n && <span className="absolute inset-x-0 top-6 text-center text-[12px] font-bold">Tanganmu kosong</span>}
        {tiles.map((t, i) => {
          const ok = playable.includes(t.id)
          const picked = sel === t.id
          const left = i * step + (pairs && i >= 2 ? 24 : 0)
          return (
            <div
              key={t.id}
              ref={(el) => {
                if (el) refs.current.set(t.id, el)
                else refs.current.delete(t.id)
              }}
              className="absolute top-0"
              style={{ left, zIndex: i }}
            >
              <button
                onClick={() => onTile(t)}
                aria-disabled={!ok}
                aria-pressed={picked || undefined}
                aria-label={tileLabel(t) + (ok ? '' : dimOthers ? ' (tidak nyambung)' : '')}
                className={cn('relative block transition-transform duration-150 ease-out', ok ? '-translate-y-1.5 active:-translate-y-0.5' : 'cursor-default', picked && '-translate-y-5')}
              >
                <TileFace a={t.a} b={t.b} size={TILE} />
                {picked && <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-2 border-ink bg-electric" />}
                {ok && !picked && <span aria-hidden className="absolute -bottom-2 left-0.5 right-0.5 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
                {!ok && dimOthers && <span aria-hidden className="absolute inset-0 rounded-[5px]" style={{ backgroundImage: hatch('#121212', 7, 0.3) }} />}
              </button>
              {pairs && i % 2 === 0 && (
                <span className="absolute left-0 top-[64px] text-center font-display text-[11px]" style={{ width: step + TILE }}>
                  <span className="border-2 border-ink bg-paper px-1">{pairValue(i)}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FxOverlay({ fx, onDone }: { fx: Effect; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (fx.text) gsap.from('[data-fx-text]', { scale: 2.4, rotation: -14, opacity: 0, duration: 0.3, delay: 0.08, ease: 'back.out(2)' })
  }, { scope: box })
  const small = fx.anim === 'domino-deal'
  return (
    <div ref={box} aria-hidden className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className={cn('relative', small ? 'h-40 w-64' : 'size-72')}>
        <Lottie src={ANIMS[fx.anim]} autoplay loop={false} subscriptions={{ complete: onDone }} className="absolute inset-0" />
        {fx.text && (
          <span data-fx-text className="absolute inset-0 grid -rotate-[10deg] place-items-center text-center font-display text-5xl text-ink [text-shadow:3px_3px_0_#fff4fa]">
            {fx.text}
          </span>
        )}
      </div>
    </div>
  )
}
