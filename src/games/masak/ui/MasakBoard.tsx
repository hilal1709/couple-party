import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import confetti from '@/assets/lottie/confetti.json'
import fxStar from '@/assets/lottie/masak-bintang.json'
import fxWin from '@/assets/lottie/masak-menang.json'
import fxServe from '@/assets/lottie/masak-saji.json'
import { useMusic } from '@/audio/audio'
import { HoldButton } from '@/components/controls/HoldButton'
import { Joystick } from '@/components/controls/Joystick'
import { LoadingScreen } from '@/components/feedback/Loader'
import { ConfirmModal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { randomLook } from '@/games/sport/look'
import { savedLook } from '@/games/sport/ui/lookStore'
import { cn } from '@/lib/utils'
import type { GameProps } from '../../types'
import { actorOf, starsOf, winner } from '../engine'
import { ING, KITCHENS, RECIPES, starGoals } from '../kitchens'
import { Round, type Hud } from '../round'
import type { Fx } from '../sim/kitchen'
import { Boil, fxSound, playSound } from '../sounds'
import type { MasakAction, MasakState } from '../types'
import { botName, clock, STAR_LINE } from './copy'

type Props = GameProps<MasakState, MasakAction>

export function MasakBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const me = actorOf(s, seat)
  const nameOf = (actor: number) => {
    const a = s.actors[actor].seat
    return a === null ? botName(actor) : names[a] ?? '?'
  }
  // kirim tampilan koki sekali; dipakai HP lain untuk mewarnai chibi kita
  const sentLook = useRef(false)
  useEffect(() => {
    if (sentLook.current || me < 0 || s.looks[me]) return
    sentLook.current = true
    act({ type: 'look', look: savedLook() ?? randomLook(Date.now() % 100000)[0] })
  }, [act, me, s.looks])
  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      {s.phase === 'end' ? (
        <EndScreen s={s} seat={seat} nameOf={nameOf} act={act} exit={exit} />
      ) : (
        <RoundScreen key={s.phaseId} s={s} seat={seat} online={online} act={act} live={live} nameOf={nameOf} back={() => setConfirmExit(true)} />
      )}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Keluar dari permainan?" description="Semua pemain kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

type ScreenProps = Pick<Props, 'seat' | 'online' | 'act' | 'live'> & { s: MasakState; nameOf: (a: number) => string; back: () => void }

type Pop = { id: number; text: string; tone: 'electric' | 'rose' }

function RoundScreen({ s, seat, online, act, live, nameOf, back }: ScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [failed, setFailed] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const actRef = useRef(act)
  actRef.current = act

  useEffect(() => {
    let r: Round
    const onFx = (f: Fx) => {
      const snd = fxSound(f)
      if (snd) playSound(snd, f.kind === 'cooked' ? 0.6 : 1)
      const text = f.kind === 'served' ? `+${f.pts}` : f.kind === 'wrong' ? 'Salah pesanan!' : f.kind === 'missed' ? 'Pelanggan kabur −10' : f.kind === 'burnt' ? 'Gosong!' : null
      if (!text) return
      const pop: Pop = { id: f.n, text, tone: f.kind === 'served' ? 'electric' : 'rose' }
      setPops((p) => [...p.slice(-3), pop])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 1600)
    }
    try {
      r = new Round({ canvas: canvas.current!, state: s, seat, look: savedLook(), act: (a) => actRef.current(a), live, onHud: setHud, onFx, onSound: playSound })
    } catch {
      setFailed(true)
      return
    }
    round.current = r
    if (import.meta.env.DEV) (window as unknown as { __masak?: Round }).__masak = r
    r.start().catch((e) => {
      console.error('Dapur Kacau gagal memuat', e)
      setFailed(true)
    })
    return () => {
      r.dispose()
      round.current = null
    }
    // ronde baru = komponen baru (key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    round.current?.setState(s)
  }, [s])

  useKeyboard(round)
  useMusic(hud && hud.secs <= 30 ? 'masak-tense' : 'masak')
  const boil = useRef<Boil | null>(null)
  useEffect(() => {
    boil.current = new Boil()
    return () => boil.current?.stop()
  }, [])
  useEffect(() => boil.current?.set(hud?.cooking ?? 0), [hud?.cooking])

  return (
    <div className="absolute inset-0">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label="Dapur" />
      <Joystick className="absolute inset-y-0 left-0 w-[48%]" onMove={(x, y) => round.current?.setMove(x, y)} />
      {!hud && !failed && <LoadingScreen label={`Membuka ${KITCHENS[s.opts.kitchen].title}`} sub="Kompor lagi dipanasin" overlay />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-petal text-center text-ink">
          <div>
            <p className="font-display text-xl uppercase">Dapur gagal dimuat</p>
            <p className="mb-3 text-sm">HP-nya mungkin kehabisan memori. Coba tutup aplikasi lain.</p>
            <Slab tone="rose" size="md" onClick={back}>Keluar</Slab>
          </div>
        </div>
      )}
      {hud && (
        <>
          <TopBar s={s} hud={hud} online={online} nameOf={nameOf} back={back} />
          <div className="absolute right-3 bottom-3 flex items-end gap-2.5">
            {s.opts.mode === 'versus' && (
              <button
                aria-label="Iseng ke dapur lawan"
                disabled={hud.jahil <= 0}
                onClick={() => round.current?.iseng()}
                className="relative h-[52px] w-[70px] border-[3px] border-ink bg-suit-orange font-display text-sm text-ink uppercase shadow-slab-sm disabled:opacity-40"
              >
                Iseng
                <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border-2 border-ink bg-paper text-[11px] tabular-nums">{hud.jahil}</span>
              </button>
            )}
            <HoldButton label="Dash" onHold={(v) => v && round.current?.dash()} className="h-[52px] w-[64px] bg-paper/90 text-sm">
              Dash
            </HoldButton>
            {hud.work && (
              <HoldButton label={hud.work} onHold={(v) => round.current?.holdChop(v)} className={cn('h-[64px] w-[92px] text-base', hud.chopping ? 'bg-electric' : 'bg-paper')}>
                {hud.work}
              </HoldButton>
            )}
            <Slab tone="rose" size="lg" onClick={() => round.current?.grab()}>
              {hud.holding ? 'Taruh' : 'Ambil'}
            </Slab>
          </div>
          {hud.flour && <Flour />}
          <Gimmick s={s} hud={hud} />
          {pops.some((p) => p.tone === 'electric') && <Lottie key={pops.at(-1)?.id} src={fxServe} loop={false} className="pointer-events-none absolute top-[30%] left-1/2 size-32 -translate-x-1/2" />}
          <ul className="pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center gap-1">
            {pops.map((p) => (
              <li key={p.id}>
                <Tape tone={p.tone} className="font-display text-lg uppercase">{p.text}</Tape>
              </li>
            ))}
          </ul>
          {import.meta.env.DEV && (
            <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 bg-ink/70 px-1 text-[10px] text-paper tabular-nums">
              {hud.fps} fps · aksi {hud.rtt === null ? 'host' : `${Math.round(hud.rtt)} ms`}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/** pita peringatan gimik dapur: lift turun, truk mau belok, sambungan gerbong lepas */
function Gimmick({ s, hud }: { s: MasakState; hud: Hud }) {
  const g = KITCHENS[s.opts.kitchen].gimmick
  const line =
    g === 'lift' && !hud.lift
      ? 'Lift turun! Tunggu loket naik'
      : g === 'truck' && hud.turn
        ? hud.turn < 0
          ? 'Awas, belok kiri!'
          : 'Awas, belok kanan!'
        : g === 'ship' && hud.turn
          ? 'Ombak besar! Barang meluncur'
          : g === 'gap' && hud.gap
            ? 'Sambungan lepas! Oper lewat meja tengah'
            : g === 'lava' && hud.lava === 'soon'
              ? 'Lava mau naik! Minggir dari kisi bergetar'
              : null
  if (!line) return null
  return (
    <p className="pointer-events-none absolute inset-x-0 top-[24%] text-center">
      <Tape tone="rose" className="font-display text-base uppercase">{line}</Tape>
    </p>
  )
}

/** bom tepung dari tim lawan: cipratan putih menutupi sebagian layar, lalu memudar */
function Flour() {
  const spots = [
    [18, 30, 34],
    [52, 22, 40],
    [70, 55, 30],
    [30, 62, 28],
    [46, 44, 22],
  ]
  return (
    <div className="pointer-events-none absolute inset-0 animate-[fadeOut_5s_ease-in_forwards]" aria-label="Layar tertutup tepung">
      {spots.map(([x, y, r], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[radial-gradient(circle,#fffdf7_0%,#fffdf7_55%,rgba(255,253,247,0.85)_70%,rgba(255,253,247,0)_100%)]"
          style={{ left: `${x - r / 2}%`, top: `${y - r / 2}%`, width: `${r}vw`, height: `${r}vw` }}
        />
      ))}
      <p className="absolute inset-x-0 top-[16%] text-center font-display text-xl text-ink uppercase">Kena bom tepung!</p>
    </div>
  )
}

function useKeyboard(round: React.RefObject<Round | null>) {
  useEffect(() => {
    const held = new Set<string>()
    const apply = () => {
      const x = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0)
      const y = (held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)
      const len = Math.hypot(x, y) || 1
      round.current?.setMove(x / len, y / len)
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (e.repeat) return
      if (k === ' ' || k === 'e') round.current?.grab()
      else if (k === 'f') round.current?.holdChop(true)
      else if (k === 'shift') round.current?.dash()
      else if (k === 'q') round.current?.iseng()
      held.add(k)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'f') round.current?.holdChop(false)
      held.delete(k)
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

const TEAM_BG = ['bg-electric', 'bg-rose']
export const TEAM_NAME = ['Tim Hijau', 'Tim Pink']

const ING_DOT: Record<string, string> = {
  roti: 'bg-[#d99a4e]',
  daging: 'bg-[#6b3f22]',
  selada: 'bg-[#6cc24a]',
  tomat: 'bg-[#e8432f]',
  keju: 'bg-suit-yellow',
  adonan: 'bg-[#f1e3c2]',
  jamur: 'bg-[#a8876a]',
  nasi: 'bg-paper',
  ikan: 'bg-[#ff8a5c]',
  nori: 'bg-[#1d2b22]',
  timun: 'bg-[#3d8a2f]',
  mie: 'bg-[#f5d27a]',
  telur: 'bg-[#ffa21a]',
  bawang: 'bg-[#7fd65a]',
  tortilla: 'bg-[#e9c98a]',
  pancake: 'bg-[#d9954a]',
  stroberi: 'bg-[#d81a2a]',
  madu: 'bg-[#e8a317]',
  pisang: 'bg-[#f7d84a]',
  beras: 'bg-[#c98a4a]',
  udang: 'bg-[#ff7a3c]',
  ayam: 'bg-[#e8b08a]',
  kacang: 'bg-[#8a4f1e]',
  lontong: 'bg-[#4f9a3a]',
}

function TopBar({ s, hud, online, nameOf, back }: { s: MasakState; hud: Hud; online: boolean[]; nameOf: (a: number) => string; back: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <div className="flex flex-col items-start gap-1">
        <button onClick={back} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold text-ink">
          Keluar
        </button>
        <ul className="flex max-w-[180px] flex-wrap gap-1">
          {s.actors.map((a, i) => (
            <li key={i} data-seat={a.seat ?? undefined} className={cn('border-2 border-ink px-1 text-[10px] leading-4 font-bold text-ink', s.opts.mode === 'versus' ? TEAM_BG[a.team] : 'bg-paper', a.seat !== null && !online[a.seat] && 'opacity-50')}>
              {nameOf(i)}
            </li>
          ))}
        </ul>
      </div>
      <ol className="flex flex-1 justify-center gap-1.5" aria-label="Pesanan">
        {hud.orders.map((o) => (
          <li key={o.id} className="w-[92px] border-[3px] border-ink bg-paper px-1.5 pt-0.5 pb-1 text-ink shadow-slab-sm">
            <p className="font-display text-[12px] leading-tight uppercase">{RECIPES[o.r].title}</p>
            <p className="my-0.5 flex gap-1" aria-label={RECIPES[o.r].ings.map((i) => ING[i].title).join(', ')}>
              {RECIPES[o.r].ings.map((i, n) => (
                <span key={n} className={cn('size-3.5 rounded-full border-2 border-ink', ING_DOT[i])} />
              ))}
            </p>
            <span className="block h-1.5 border border-ink bg-ink/10">
              <span className={cn('block h-full', o.left < 0.25 ? 'bg-rose' : 'bg-electric')} style={{ width: `${o.left * 100}%` }} />
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-end gap-1">
        <span className={cn('border-[3px] border-ink bg-paper px-2 py-0.5 font-display text-xl leading-none text-ink tabular-nums shadow-slab-sm', hud.secs <= 15 && 'text-rose')}>{clock(hud.secs)}</span>
        {s.opts.mode === 'versus' ? (
          <span className="flex gap-1" aria-label="Skor tim">
            {hud.scores.map((v, t) => (
              <span key={t} className={cn('border-[3px] border-ink px-1.5 py-0.5 font-display text-base leading-none text-ink tabular-nums', TEAM_BG[t], t === hud.team && 'outline-2 outline-offset-1 outline-paper')}>
                {v}
              </span>
            ))}
          </span>
        ) : (
          <span className="border-[3px] border-ink bg-electric px-2 py-0.5 font-display text-base leading-none text-ink tabular-nums">{hud.score} poin</span>
        )}
      </div>
    </div>
  )
}

function EndScreen(props: { s: MasakState; seat: number; nameOf: (a: number) => string; act: (a: MasakAction) => void; exit: () => void }) {
  return props.s.opts.mode === 'versus' ? <VersusEnd {...props} /> : <CoopEnd {...props} />
}

function VersusEnd({ s, seat, nameOf, act, exit }: { s: MasakState; seat: number; nameOf: (a: number) => string; act: (a: MasakAction) => void; exit: () => void }) {
  const win = winner(s)
  const me = actorOf(s, seat)
  const mine = me >= 0 ? s.actors[me].team : -1
  useMusic('masak')
  useEffect(() => playSound(win === -1 || win === mine ? 'win' : 'lose'), [win, mine])
  const r = s.result
  return (
    <div className="absolute inset-0 grid place-items-center bg-petal text-ink">
      <Lottie src={confetti} loop={false} className="pointer-events-none absolute inset-0 size-full" />
      <Lottie src={fxWin} loop={false} className="pointer-events-none absolute top-2 right-6 size-40" />
      <div className="relative flex w-[min(600px,94vw)] flex-col gap-2">
        <h2 className="font-display text-3xl leading-none uppercase">
          <Tape tone={win === 1 ? 'rose' : 'electric'}>{win === -1 ? 'Seri! Dapur sama kacaunya' : `${TEAM_NAME[win]} menang!`}</Tape>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((t) => (
            <section key={t} className={cn('border-[3px] border-ink p-2', TEAM_BG[t], win === t ? 'shadow-slab' : 'opacity-85')}>
              <p className="font-display text-base uppercase">{TEAM_NAME[t]}</p>
              <p className="font-display text-4xl leading-none tabular-nums">{r?.score[t] ?? 0}</p>
              <p className="text-[12px]">
                {r?.served[t] ?? 0} tersaji · {r?.missed[t] ?? 0} kabur
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {s.actors.flatMap((a, i) =>
                  a.team === t
                    ? [
                        <li key={i} data-seat={a.seat ?? undefined} className="border-2 border-ink bg-paper px-1.5 text-[11px] font-bold">
                          {nameOf(i)}
                        </li>,
                      ]
                    : [],
                )}
              </ul>
            </section>
          ))}
        </div>
        {seat === 0 ? (
          <div className="flex justify-end gap-2">
            <Slab tone="paper" size="md" onClick={() => act({ type: 'again' })}>
              Tanding lagi
            </Slab>
            <Slab tone="rose" size="md" onClick={exit}>
              Kembali ke room
            </Slab>
          </div>
        ) : (
          <p className="text-right text-sm">Menunggu host.</p>
        )}
      </div>
    </div>
  )
}

function CoopEnd({ s, seat, nameOf, act, exit }: { s: MasakState; seat: number; nameOf: (a: number) => string; act: (a: MasakAction) => void; exit: () => void }) {
  const stars = starsOf(s)
  useMusic('masak')
  useEffect(() => playSound(stars > 0 ? 'win' : 'lose'), [stars])
  const goals = starGoals(s.opts.kitchen, s.actors.length, s.opts.secs)
  const r = s.result
  return (
    <div className="absolute inset-0 grid place-items-center bg-petal text-ink">
      <div className="relative flex w-[min(560px,92vw)] flex-col gap-2">
        <h2 className="font-display text-3xl leading-none uppercase">
          <Tape tone="electric">{KITCHENS[s.opts.kitchen].title}</Tape>
        </h2>
        {stars > 0 && <Lottie src={fxStar} loop={false} className="pointer-events-none absolute -top-16 left-24 size-40" />}
        <p className="font-display text-5xl leading-none tracking-widest" aria-label={`${stars} bintang`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < stars ? 'text-suit-yellow [-webkit-text-stroke:2px_#121212]' : 'text-ink/20'}>
              ★
            </span>
          ))}
        </p>
        <p className="text-sm">{STAR_LINE[stars]}</p>
        <dl className="grid grid-cols-3 gap-1.5 text-center">
          {[
            ['Poin', r?.score[0] ?? 0],
            ['Tersaji', r?.served[0] ?? 0],
            ['Kabur', r?.missed[0] ?? 0],
          ].map(([t, v]) => (
            <div key={t} className="border-[3px] border-ink bg-paper py-1">
              <dt className="text-[11px] font-bold uppercase">{t}</dt>
              <dd className="font-display text-2xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[12px] text-ink/70">Bintang di {goals.join(' · ')} poin</p>
        <ul className="flex flex-wrap gap-1">
          {s.actors.map((a, i) => (
            <li key={i} data-seat={a.seat ?? undefined} className="border-2 border-ink bg-paper px-1.5 text-[11px] font-bold">
              {nameOf(i)}
            </li>
          ))}
        </ul>
        {seat === 0 ? (
          <div className="flex justify-end gap-2">
            <Slab tone="paper" size="md" onClick={() => act({ type: 'again' })}>
              Main lagi
            </Slab>
            <Slab tone="rose" size="md" onClick={exit}>
              Kembali ke room
            </Slab>
          </div>
        ) : (
          <p className="text-right text-sm">Menunggu host.</p>
        )}
      </div>
    </div>
  )
}
