import { useState } from 'react'
import { defaultOptions, init, reduce } from './games/uno/engine'
import type { UnoAction, Variant } from './games/uno/types'
import { UnoTable } from './games/uno/ui/UnoTable'
import * as drawEngine from './games/draw/engine'
import type { DrawAction } from './games/draw/types'
import { DrawBoard } from './games/draw/ui/DrawBoard'
import { lcg, randomStep } from './games/remi/dev'
import * as remiEngine from './games/remi/engine'
import type { Mode, RemiAction } from './games/remi/types'
import { RemiTable } from './games/remi/ui/RemiTable'
import { randomStep as dominoStep } from './games/domino/dev'
import * as dominoEngine from './games/domino/engine'
import { turnOf as dominoTurn } from './games/domino/sounds'
import type { DominoAction, Mode as DominoMode } from './games/domino/types'
import { DominoTable } from './games/domino/ui/DominoTable'
import { randomStep as monopolyStep } from './games/monopoly/dev'
import * as monopolyEngine from './games/monopoly/engine'
import type { MonopolyAction } from './games/monopoly/types'
import { MonopolyBoard } from './games/monopoly/ui/MonopolyBoard'
import { randomStep as ludoStep } from './games/ludo/dev'
import * as ludoEngine from './games/ludo/engine'
import type { Arms, LudoAction } from './games/ludo/types'
import { LudoBoard } from './games/ludo/ui/LudoBoard'

const NAMES = ['Andi', 'Sari', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita']

/**
 * Hanya untuk development: meja UNO lokal tanpa jaringan (tangkapan layar review).
 * ?demo=classic|flip|noMercy  &n=2..8 jumlah pemain  &turn=lawan untuk melihat dari kursi yang bukan giliran.
 */
export function Demo({ variant }: { variant: Variant | 'draw' | 'remi' | 'domino' | 'monopoly' | 'ludo' }) {
  if (variant === 'draw') return <DrawDemo />
  if (variant === 'domino') return <DominoDemo />
  if (variant === 'monopoly') return <MonopolyDemo />
  if (variant === 'ludo') return <LudoDemo />
  if (variant === 'remi') return <RemiDemo />
  return <UnoDemo variant={variant} />
}

/**
 * Tebak Gambar lokal: ?demo=draw&n=2..8 &seat=kursi yang dilihat &phase=draw (langsung menggambar).
 * Tombol kursi di pojok kanan bawah untuk pindah sudut pandang.
 */
function DrawDemo() {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 3)))
  const [seat, setSeat] = useState(() => Math.min(n - 1, Number(q.get('seat') ?? 0)))
  const [s, setS] = useState(() => {
    const st = drawEngine.init(42, { ...drawEngine.defaultOptions(), players: n })
    return q.get('phase') === 'draw' ? drawEngine.reduce(st, { type: 'pick', i: 0 }, 0) : st
  })
  // timeUp & next hanya sah dari host (kursi 0)
  const act = (a: DrawAction) => setS((cur) => drawEngine.reduce(cur, a, a.type === 'timeUp' || a.type === 'next' ? 0 : seat))
  return (
    <>
      <DrawBoard state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, n).map((nm, i) => (
          <button key={nm} onClick={() => setSeat(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * Kartu Remi lokal: ?demo=remi&mode=cangkulan|bigtwo|remi41|poker|joker|bohong|blackjack|seven &n=2..8 &seat=
 * &auto=N memainkan N langkah acak dulu (untuk melihat kondisi tengah permainan); &auto=round sampai ronde pertama selesai.
 * Kursi yang dilihat otomatis ikut giliran (kecuali &seat= diisi); tombol kursi di bawah untuk pindah sudut pandang.
 */
function RemiDemo() {
  const q = new URLSearchParams(location.search)
  const mode = (q.get('mode') ?? 'cangkulan') as Mode
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 3)))
  const follow = !q.get('seat')
  const [fixed, setFixed] = useState(() => Number(q.get('seat') ?? 0))
  const [s, setS] = useState(() => {
    let st = remiEngine.init(42, remiEngine.defaultOptions(mode, n))
    const rnd = lcg(7)
    const auto = q.get('auto')
    // auto=round: main sampai ronde pertama selesai
    for (let i = 0; i < (auto === 'round' ? 5000 : Number(auto ?? 0)) && !(auto === 'round' && st.phase !== 'play'); i++) st = randomStep(st, rnd) ?? st
    return st
  })
  const players = s.scores.length
  const m = s.m
  const auto = m.kind === 'blackjack' ? (m.step === 'play' ? m.turn : null) : m.kind === 'poker' ? (m.result ? null : m.turn) : m.turn
  const seat = follow && auto !== null && s.phase === 'play' ? auto : fixed
  const act = (a: RemiAction) => setS((cur) => remiEngine.reduce(cur, a, seat))
  return (
    <>
      <RemiTable state={s} seat={seat} names={NAMES.slice(0, players)} online={Array(players).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, players).map((nm, i) => (
          <button key={nm} onClick={() => setFixed(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}

function UnoDemo({ variant }: { variant: Variant }) {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 2)))
  const viewOther = q.get('turn') === 'lawan'
  const [s, setS] = useState(() => init(42, defaultOptions(variant, n)))
  const act = (a: UnoAction) => setS((cur) => reduce(cur, a, cur.turn))
  const seat = viewOther ? (s.turn + 1) % n : s.turn
  return <UnoTable state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
}

/**
 * Domino lokal: ?demo=domino&mode=gaple|cangkul|lima|qiuqiu &n=2..6 &seat= &auto=N|round (sama seperti Kartu Remi).
 */
function DominoDemo() {
  const q = new URLSearchParams(location.search)
  const mode = (q.get('mode') ?? 'gaple') as DominoMode
  const n = Math.min(6, Math.max(2, Number(q.get('n') ?? 3)))
  const follow = !q.get('seat')
  const [fixed, setFixed] = useState(() => Number(q.get('seat') ?? 0))
  const [s, setS] = useState(() => {
    let st = dominoEngine.init(42, dominoEngine.defaultOptions(mode, n))
    const rnd = lcg(7)
    const auto = q.get('auto')
    for (let i = 0; i < (auto === 'round' ? 5000 : Number(auto ?? 0)) && !(auto === 'round' && st.phase !== 'play'); i++) st = dominoStep(st, rnd) ?? st
    return st
  })
  const players = s.scores.length
  const auto = dominoTurn(s)
  const seat = follow && auto !== null ? auto : fixed
  const act = (a: DominoAction) => setS((cur) => dominoEngine.reduce(cur, a, seat))
  return (
    <>
      <DominoTable state={s} seat={seat} names={NAMES.slice(0, players)} online={Array(players).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, players).map((nm, i) => (
          <button key={nm} onClick={() => setFixed(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * Monopoli lokal: ?demo=monopoly &n=2..8 &seat= &auto=N|end &end=bankrupt (bot memainkan N langkah dulu).
 */
function MonopolyDemo() {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 4)))
  const follow = !q.get('seat')
  const [fixed, setFixed] = useState(() => Number(q.get('seat') ?? 0))
  const [s, setS] = useState(() => {
    let st = monopolyEngine.init(42, { ...monopolyEngine.defaultOptions(n), end: q.get('end') === 'bankrupt' ? 'bankrupt' : 'rounds', rounds: 15 })
    const rnd = lcg(7)
    const auto = q.get('auto')
    for (let i = 0; i < (auto === 'end' ? 20000 : Number(auto ?? 0)) && st.phase !== 'end'; i++) st = monopolyStep(st, rnd) ?? st
    return st
  })
  const auto = monopolyEngine.actorOf(s)
  const seat = follow && auto !== null ? auto : fixed
  const act = (a: MonopolyAction) => setS((cur) => monopolyEngine.reduce(cur, a, seat))
  return (
    <>
      <MonopolyBoard state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, n).map((nm, i) => (
          <button key={nm} onClick={() => setFixed(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * Ludo lokal: ?demo=ludo &n=2..8 &arms=4|6|8 &seat= &auto=N|end &teams=1 &pieces=2..4 &plain=1 (tanpa petak jahil).
 */
function LudoDemo() {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 4)))
  const follow = !q.get('seat')
  const [fixed, setFixed] = useState(() => Number(q.get('seat') ?? 0))
  const [s, setS] = useState(() => {
    const arms = Number(q.get('arms') ?? 0) as Arms
    let st = ludoEngine.init(42, {
      ...ludoEngine.defaultOptions(n),
      ...(arms ? { arms } : {}),
      teams: q.get('teams') === '1',
      specials: q.get('plain') !== '1',
      pieces: (Number(q.get('pieces') ?? 4) as 2 | 3 | 4) || 4,
    })
    const rnd = lcg(7)
    const auto = q.get('auto')
    for (let i = 0; i < (auto === 'end' ? 20000 : Number(auto ?? 0)) && st.phase !== 'end'; i++) st = ludoStep(st, rnd) ?? st
    return st
  })
  const seat = follow ? s.turn : fixed
  const act = (a: LudoAction) => setS((cur) => ludoEngine.reduce(cur, a, seat))
  return (
    <>
      <LudoBoard state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, n).map((nm, i) => (
          <button key={nm} onClick={() => setFixed(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}
