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
import { cn } from '@/lib/utils'
import type { GameProps } from '../../types'
import { actorOf, starsOf, winner } from '../engine'
import { KITCHENS, starGoals } from '../kitchens'
import { Round, type Hud } from '../round'
import type { Fx } from '../sim/kitchen'
import { Boil, fxSound, playSound } from '../sounds'
import { ANIMAL_TITLE, APRONS, TEAM_APRONS } from '../render/koki'
import { ANIMALS, type Animal, type MasakAction, type MasakState } from '../types'
import { botName, STAR_LINE } from './copy'
import { ClockScore, Countdown, GraphicsMenu, RecipeCard, Tickets, type IconUrls } from './Hud'

type Props = GameProps<MasakState, MasakAction>

export function MasakBoard({ state: s, seat, names, online, act, exit, live }: Props) {
  const [confirmExit, setConfirmExit] = useState(false)
  const me = actorOf(s, seat)
  const nameOf = (actor: number) => {
    const a = s.actors[actor].seat
    return a === null ? botName(actor) : names[a] ?? '?'
  }
  return (
    <div className="relative h-dvh overflow-hidden bg-ink select-none">
      {s.phase === 'pick' ? (
        <PickScreen s={s} seat={seat} me={me} nameOf={nameOf} act={act} back={() => setConfirmExit(true)} />
      ) : s.phase === 'end' ? (
        <EndScreen s={s} seat={seat} nameOf={nameOf} act={act} exit={exit} />
      ) : (
        <RoundScreen key={s.phaseId} s={s} seat={seat} online={online} act={act} live={live} nameOf={nameOf} back={() => setConfirmExit(true)} />
      )}
      <ConfirmModal open={confirmExit} onOpenChange={setConfirmExit} title="Keluar dari permainan?" description="Semua pemain kembali ke room." confirmLabel="Keluar" onConfirm={exit} />
    </div>
  )
}

const PORTRAIT = import.meta.glob<string>('@/assets/masak/koki/*.webp', { eager: true, import: 'default' })
const portraitOf = (a: Animal) => PORTRAIT[`/src/assets/masak/koki/${a}.webp`]
const LAST_KEY = 'masak-koki'

function savedAnimal(): Animal | null {
  try {
    const v = localStorage.getItem(LAST_KEY) as Animal | null
    return v && ANIMALS.includes(v) ? v : null
  } catch {
    return null
  }
}

/** sebelum ronde pertama: tiap pemain memilih koki hewan; host memulai saat semua siap */
function PickScreen({ s, seat, me, nameOf, act, back }: { s: MasakState; seat: number; me: number; nameOf: (a: number) => string; act: (a: MasakAction) => void; back: () => void }) {
  useMusic('masak')
  const mine = me >= 0 ? s.koki[me] : null
  // pilihan terakhir dipakai lagi kalau belum diambil orang
  const tried = useRef(false)
  useEffect(() => {
    if (tried.current || me < 0 || mine) return
    tried.current = true
    const last = savedAnimal()
    if (last && !s.koki.includes(last)) act({ type: 'koki', animal: last })
  }, [act, me, mine, s.koki])
  const pick = (a: Animal) => {
    playSound('grab', 0.7)
    try {
      localStorage.setItem(LAST_KEY, a)
    } catch {
      /* penyimpanan diblokir: pilihan tetap berlaku ronde ini */
    }
    act({ type: 'koki', animal: a })
  }
  const owner = (a: Animal) => s.koki.indexOf(a)
  const versus = s.opts.mode === 'versus'
  const apron = (i: number) => (versus ? TEAM_APRONS[s.actors[i].team] : APRONS[i % APRONS.length])
  const humans = s.actors.flatMap((a, i) => (a.seat !== null ? [i] : []))
  const waiting = humans.filter((i) => !s.koki[i]).length
  return (
    <div className="absolute inset-0 flex flex-col gap-2 bg-petal p-3 text-ink">
      <div className="flex items-center gap-2">
        <button onClick={back} className="border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold">
          Keluar
        </button>
        <h2 className="font-display text-2xl leading-none uppercase">
          <Tape tone="electric">Pilih koki</Tape>
        </h2>
        <span className="text-sm">{KITCHENS[s.opts.kitchen].title}</span>
        {seat === 0 ? (
          <Slab tone="rose" size="md" className="ml-auto" onClick={() => act({ type: 'go' })}>
            {waiting ? `Mulai (${waiting} belum pilih)` : 'Mulai masak'}
          </Slab>
        ) : (
          <span className="ml-auto text-sm">{mine ? 'Menunggu host mulai.' : 'Pilih kokimu dulu.'}</span>
        )}
      </div>
      <ul className="grid flex-1 grid-cols-8 gap-2" role="radiogroup" aria-label="Koki hewan">
        {ANIMALS.map((a) => {
          const o = owner(a)
          const taken = o >= 0 && o !== me
          const on = o >= 0 && o === me
          return (
            <li key={a} className="min-h-0">
              <button
                role="radio"
                aria-checked={on}
                disabled={taken || me < 0}
                onClick={() => pick(a)}
                data-seat={o >= 0 ? (s.actors[o].seat ?? undefined) : undefined}
                className={cn('flex size-full flex-col items-center justify-end border-[3px] border-ink px-1 pb-1', on ? 'bg-electric' : 'bg-paper shadow-slab-sm', taken && 'opacity-60')}
              >
                <img src={portraitOf(a)} alt="" className="min-h-0 w-full flex-1 object-contain" />
                <span className="font-display text-sm uppercase">{ANIMAL_TITLE[a]}</span>
                <span className="h-4 max-w-full truncate px-1 text-[11px] font-bold" style={o >= 0 ? { background: apron(o) } : undefined}>
                  {o >= 0 ? nameOf(o) : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-[12px] text-ink/70">Bot dapat koki yang tersisa. Warna celemek = warna kamu di dapur.</p>
    </div>
  )
}

type ScreenProps = Pick<Props, 'seat' | 'online' | 'act' | 'live'> & { s: MasakState; nameOf: (a: number) => string; back: () => void }

/** angka/pesan melayang; x,y = piksel layar (dari stasiun), kosong = tengah layar */
type Pop = { id: number; text: string; tone: 'electric' | 'rose'; x?: number; y?: number }

function RoundScreen({ s, seat, online, act, live, nameOf, back }: ScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const round = useRef<Round | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [failed, setFailed] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const [icons, setIcons] = useState<IconUrls>(new Map())
  const [coins, setCoins] = useState<{ id: number; x: number; y: number }[]>([])
  const actRef = useRef(act)
  actRef.current = act

  useEffect(() => {
    let r: Round
    const onFx = (f: Fx) => {
      const snd = fxSound(f)
      if (snd) playSound(snd, f.kind === 'cooked' ? 0.6 : 1)
      const text = f.kind === 'served' ? `+${f.pts}` : f.kind === 'wrong' ? 'Salah pesanan!' : f.kind === 'missed' ? 'Pelanggan kabur −10' : f.kind === 'burnt' ? 'Gosong!' : null
      if (!text) return
      const at = f.st >= 0 ? round.current?.screenOf(f.st) : null
      if (f.kind === 'served' && at) {
        // beberapa koin terbang dari loket ke skor
        const burst = [0, 1, 2].map((i) => ({ id: f.n * 10 + i, x: at[0] + (i - 1) * 14, y: at[1] }))
        setCoins((c) => [...c.slice(-9), ...burst])
        setTimeout(() => setCoins((c) => c.filter((x) => !burst.some((b) => b.id === x.id))), 1100)
      }
      const pop: Pop = { id: f.n, text, tone: f.kind === 'served' ? 'electric' : 'rose', x: at?.[0], y: at?.[1] }
      setPops((p) => [...p.slice(-3), pop])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 1600)
    }
    try {
      r = new Round({ canvas: canvas.current!, state: s, seat, act: (a) => actRef.current(a), live, onHud: setHud, onFx, onSound: playSound, onIcons: setIcons })
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
          <TopBar s={s} hud={hud} online={online} nameOf={nameOf} back={back} icons={icons} />
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
            {hud.canThrow && (
              <HoldButton label="Lempar" onHold={(v) => v && round.current?.toss()} className="h-[56px] w-[76px] bg-suit-yellow text-sm">
                Lempar
              </HoldButton>
            )}
            {hud.work && (
              <HoldButton label={hud.work} onHold={(v) => v && round.current?.holdChop(true)} className={cn('h-[64px] w-[92px] text-base', hud.chopping ? 'bg-electric' : 'bg-paper')}>
                {hud.chopping ? `${hud.work}…` : hud.work}
              </HoldButton>
            )}
            <Slab tone="rose" size="lg" className="min-w-[132px] text-center" onClick={() => round.current?.grab()}>
              {hud.grab}
            </Slab>
          </div>
          {hud.flour && <Flour />}
          <Gimmick s={s} hud={hud} />
          {pops.some((p) => p.tone === 'electric') && <Lottie key={pops.at(-1)?.id} src={fxServe} loop={false} className="pointer-events-none absolute top-[30%] left-1/2 size-32 -translate-x-1/2" />}
          {pops.map((p, i) => (
            <span
              key={p.id}
              className="pointer-events-none absolute animate-[floatUp_1.6s_ease-out_forwards]"
              style={{ left: p.x ?? '50%', top: p.y ?? `calc(38% + ${i * 34}px)` }}
            >
              <Tape tone={p.tone} className="font-display text-lg whitespace-nowrap uppercase">{p.text}</Tape>
            </span>
          ))}
          {coins.map((c, i) => (
            <FlyCoin key={c.id} x={c.x} y={c.y} delay={(i % 3) * 70} />
          ))}
          <Countdown intro={hud.intro} over={hud.over} />
          {hud.intro === 'card' && <RecipeCard kitchen={s.opts.kitchen} icons={icons} host={seat === 0} onSkip={() => round.current?.skipIntro()} />}
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

/** koin kecil terbang dari titik layar ke angka skor ([data-score]) */
function FlyCoin({ x, y, delay }: { x: number; y: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    const to = document.querySelector('[data-score]')?.getBoundingClientRect()
    if (!el) return
    // versus tidak punya angka koin: koin cukup memudar di tempat
    if (!to) {
      el.style.opacity = '0'
      return
    }
    const id = setTimeout(() => {
      el.style.transform = `translate(${to.left + to.width / 2 - x}px, ${to.top + to.height / 2 - y}px) scale(0.6)`
      el.style.opacity = '0.2'
    }, 30 + delay)
    return () => clearTimeout(id)
  }, [x, y, delay])
  return (
    <span ref={ref} className="pointer-events-none absolute z-20 -mt-3 -ml-3 transition-[transform,opacity] duration-700 ease-in" style={{ left: x, top: y }} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-6 drop-shadow">
        <circle cx="12" cy="12" r="9.5" fill="#ffd23f" stroke="#121212" strokeWidth={2} />
        <circle cx="12" cy="12" r="5.5" fill="none" stroke="#c98a12" strokeWidth={2} />
      </svg>
    </span>
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
      else if (k === 'r') round.current?.toss()
      else if (k === 'q') round.current?.iseng()
      held.add(k)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
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

function TopBar({ s, hud, online, nameOf, back, icons }: { s: MasakState; hud: Hud; online: boolean[]; nameOf: (a: number) => string; back: () => void; icons: IconUrls }) {
  const versus = s.opts.mode === 'versus'
  const [menu, setMenu] = useState(false)
  return (
    <>
    {menu && <GraphicsMenu onClose={() => setMenu(false)} />}
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex flex-col gap-1">
          <button onClick={back} className="pointer-events-auto border-[3px] border-ink bg-paper px-2 py-1 text-xs font-bold text-ink">
            Keluar
          </button>
          <button onClick={() => setMenu(true)} aria-label="Pengaturan grafis" className="pointer-events-auto grid h-7 place-items-center border-[3px] border-ink bg-paper text-ink">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.2 4.6.1-1.1-.1-1.1 2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-1.9-1.1L15.5 2h-4l-.4 2.6c-.7.3-1.3.6-1.9 1.1l-2.4-.9-2 3.4 2 1.6-.1 1.1.1 1.1-2 1.6 2 3.4 2.4-.9c.6.5 1.2.8 1.9 1.1l.4 2.6h4l.4-2.6c.7-.3 1.3-.6 1.9-1.1l2.4.9 2-3.4-2-1.6Z" fill="#121212" />
            </svg>
          </button>
        </div>
        <Tickets orders={hud.orders} icons={icons} />
      </div>
      <ClockScore secs={hud.secs} score={hud.score} streak={hud.streak} versus={versus}>
        {versus && (
          <span className="flex gap-1" aria-label="Skor tim">
            {hud.scores.map((v, t) => (
              <span key={t} className={cn('border-[3px] border-ink px-1.5 py-0.5 font-display text-base leading-none text-ink tabular-nums', TEAM_BG[t], t === hud.team && 'outline-2 outline-offset-1 outline-paper')}>
                {v}
              </span>
            ))}
          </span>
        )}
        <ul className="flex max-w-[150px] flex-wrap justify-end gap-1">
          {s.actors.map((a, i) => (
            <li
              key={i}
              data-seat={a.seat ?? undefined}
              className={cn('border-2 border-ink px-1 text-[10px] leading-4 font-bold text-ink', a.seat !== null && !online[a.seat] && 'opacity-50')}
              style={{ background: versus ? TEAM_APRONS[a.team] : APRONS[i % APRONS.length] }}
            >
              {nameOf(i)}
            </li>
          ))}
        </ul>
      </ClockScore>
    </div>
    </>
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
