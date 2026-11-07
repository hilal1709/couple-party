import { useEffect, useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import { finalState, ING, KITCHENS, RECIPES, statesOf, toolOf, TOOL_TITLE, type Ing, type Tool } from '../kitchens'
import { detectQuality, QUALITY_INFO, saveQuality, savedQuality } from '@/games/kart/render/quality'
import { dishKey, ingKey } from '../render/icons'
import { saveBattery, savedBattery } from '../render/perf'
import type { Hud } from '../round'
import type { KitchenId } from '../types'
import { clock } from './copy'
import { INK, TOOL_PATHS } from './tools'

export type IconUrls = Map<string, string>

export function ToolIcon({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={TOOL_TITLE[tool]}>
      {TOOL_PATHS[tool].map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

/** alat yang dibutuhkan bahan sampai jadi, urut */
const toolsOf = (ing: Ing) => ING[ing].steps.map((st) => toolOf(ing, st))

function IngChip({ ing, icons, size = 'sm' }: { ing: Ing; icons: IconUrls; size?: 'sm' | 'md' }) {
  const url = icons.get(ingKey(ing, finalState(ing)))
  const tools = toolsOf(ing)
  return (
    <span className="flex flex-col items-center" title={ING[ing].title}>
      <span className={cn('grid place-items-center rounded-md border-2 border-ink bg-paper', size === 'sm' ? 'size-[22px]' : 'size-10')}>
        {url ? <img src={url} alt={ING[ing].title} className="size-full object-contain" /> : <span className="text-[9px]">{ING[ing].title}</span>}
      </span>
      <span className={cn('flex h-3.5 items-center justify-center gap-px', size === 'md' && 'h-5')}>
        {tools.map((t, i) => (
          <ToolIcon key={i} tool={t} className={size === 'sm' ? 'size-3' : 'size-5'} />
        ))}
      </span>
    </span>
  )
}

type Ticket = { id: number; r: string; left: number; out?: 'served' | 'missed'; at?: number }

/** tiket pesanan berjajar: gambar hidangan, bahan dengan lencana alat, bar waktu berubah warna */
export function Tickets({ orders, icons }: { orders: Hud['orders']; icons: IconUrls }) {
  const [list, setList] = useState<Ticket[]>([])
  // HUD diperbarui tiap 0,15 dtk: tiket yang hilang dianimasikan keluar sebentar lalu dibuang
  useEffect(() => {
    const now = performance.now()
    setList((cur) => {
      const ids = new Set(orders.map((o) => o.id))
      const gone = cur.filter((t) => !t.out && !ids.has(t.id)).map((t): Ticket => ({ ...t, out: t.left > 0.03 ? 'served' : 'missed', at: now }))
      const leaving = cur.filter((t) => t.out && now - (t.at ?? 0) < 450)
      return [...orders, ...leaving, ...gone]
    })
  }, [orders])

  return (
    <ol className="flex items-start gap-1.5" aria-label="Pesanan">
      {list.map((o) => {
        const r = RECIPES[o.r]
        const url = icons.get(dishKey(o.r))
        const tone = o.out === 'served' ? 'bg-electric' : o.out === 'missed' ? 'bg-rose' : o.left < 0.2 ? 'bg-[#ff3b30]' : o.left < 0.5 ? 'bg-suit-yellow' : 'bg-electric'
        return (
          <li
            key={o.id}
            className={cn('min-w-[84px] origin-top border-[3px] border-ink bg-paper text-ink shadow-slab-sm', o.out ? 'animate-[ticketOut_0.45s_ease-in_forwards]' : 'animate-[ticketIn_0.4s_cubic-bezier(.2,1.4,.4,1)]')}
            style={!o.out && o.left < 0.2 ? { animation: 'ticketShake 0.35s ease-in-out infinite' } : undefined}
          >
            <span className="block h-2 border-b-2 border-ink bg-ink/15">
              <span className={cn('block h-full transition-[width] duration-200', tone)} style={{ width: `${(o.out ? 1 : o.left) * 100}%` }} />
            </span>
            <span className={cn('relative block px-1 pt-0.5', o.out && tone)}>
              {url ? <img src={url} alt="" className="mx-auto h-[30px] object-contain" /> : <span className="block h-[30px]" />}
              <span className="block max-w-[110px] truncate text-center font-display text-[9px] leading-tight uppercase">{r.title}</span>
            </span>
            <span className="flex justify-center gap-0.5 px-0.5 pb-0.5" aria-label={r.ings.map((i) => ING[i].title).join(', ')}>
              {r.ings.map((i, n) => (
                <IngChip key={n} ing={i} icons={icons} />
              ))}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** jam pasir + sisa waktu, dan koin skor */
export function ClockScore({ secs, score, streak, versus, children }: { secs: number; score: number; streak: number; versus: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={cn('flex items-center gap-1 border-[3px] border-ink bg-paper py-0.5 pr-2 pl-1 font-display text-xl leading-none tabular-nums shadow-slab-sm', secs <= 15 ? 'text-rose' : 'text-ink', secs <= 10 && 'animate-pulse')}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d="M6 2 H18 V5 Q18 9 13 12 Q18 15 18 19 V22 H6 V19 Q6 15 11 12 Q6 9 6 5 Z" fill="#fffdf8" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d={`M8 ${20 - Math.min(1, secs / 180) * 4} H16 V20 H8 Z`} fill="#ffb020" />
        </svg>
        {clock(secs)}
      </span>
      {!versus && (
        <span className="flex items-center gap-1 border-[3px] border-ink bg-suit-yellow py-0.5 pr-2 pl-1 font-display text-base leading-none text-ink tabular-nums">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <circle cx="12" cy="12" r="9.5" fill="#ffd23f" stroke={INK} strokeWidth={2} />
            <circle cx="12" cy="12" r="5.5" fill="none" stroke="#c98a12" strokeWidth={2} />
          </svg>
          <span data-score>{score}</span>
        </span>
      )}
      <span className={cn('border-2 border-ink px-1.5 font-display text-[11px] leading-4 text-ink uppercase tabular-nums transition-colors', streak > 1 ? 'bg-rose' : 'bg-paper/80')} aria-label={`Tip kali ${streak}`}>
        Tip ×{streak}
      </span>
      {children}
    </div>
  )
}

const SEEN_KEY = 'masak-resep'
function seenRecipes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * Kartu cara masak sebelum ronde: tiap menu dapur ini, bahan mentah → alat → bahan jadi, lalu hidangan di piring.
 * Menu yang belum pernah dilihat di HP ini diberi pita "Resep baru".
 */
export function RecipeCard({ kitchen, icons, host, onSkip }: { kitchen: KitchenId; icons: IconUrls; host: boolean; onSkip: () => void }) {
  const menu = [...new Set(KITCHENS[kitchen].menu)]
  const [seen] = useState(seenRecipes)
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, ...menu])]))
    } catch {
      /* penyimpanan diblokir: pita resep baru muncul lagi lain kali */
    }
  }, [menu, seen])
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/75 p-2">
      <div className="relative flex max-h-full w-[min(760px,96vw)] flex-col gap-1.5 overflow-auto border-[3px] border-ink bg-[#203029] p-3 text-paper shadow-slab">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl leading-none uppercase">
            <Tape tone="electric">Cara masak</Tape>
          </h2>
          <span className="text-sm text-paper/80">{KITCHENS[kitchen].title}</span>
          {host && (
            <Slab tone="paper" size="sm" className="ml-auto" onClick={onSkip}>
              Lewati
            </Slab>
          )}
        </div>
        {menu.map((r) => {
          const R = RECIPES[r]
          const dish = icons.get(dishKey(r))
          return (
            <div key={r} className="flex items-center gap-2 border-t-2 border-dashed border-paper/25 pt-1.5">
              <div className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                {R.ings.map((ing, n) => {
                  const st = statesOf(ing)
                  return (
                    <span key={n} className="flex items-center gap-1">
                      {n > 0 && <span className="font-display text-lg text-paper/70">+</span>}
                      <Pic url={icons.get(ingKey(ing, st[0]))} label={ING[ing].title} />
                      {ING[ing].steps.map((step, k) => (
                        <span key={k} className="flex items-center gap-1">
                          <span className="text-paper/60">→</span>
                          <ToolIcon tool={toolOf(ing, step)} className="size-7" />
                          <span className="text-paper/60">→</span>
                          <Pic url={icons.get(ingKey(ing, st[k + 1]))} label="" />
                        </span>
                      ))}
                    </span>
                  )
                })}
              </div>
              <span className="font-display text-xl text-paper/70">=</span>
              <div className="relative flex w-24 flex-col items-center">
                {!seen.has(r) && (
                  <span className="absolute -top-2 -right-2 rotate-6 border-2 border-ink bg-rose px-1 font-display text-[10px] text-ink uppercase">Resep baru</span>
                )}
                {dish ? <img src={dish} alt="" className="h-11 object-contain" /> : <span className="h-11" />}
                <span className="text-center font-display text-xs leading-tight uppercase">{R.title}</span>
              </div>
            </div>
          )
        })}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-paper/80">
          {(['pisau', 'wajan', 'panci', 'oven'] as const).filter((t) => menu.some((r) => RECIPES[r].ings.some((i) => toolsOf(i).includes(t)))).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <ToolIcon tool={t} className="size-4" />
              {TOOL_TITLE[t]}
            </span>
          ))}
          <span>· Taruh semua bahan jadi di piring, lalu bawa ke loket.</span>
        </p>
      </div>
    </div>
  )
}

function Pic({ url, label }: { url?: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="grid size-9 place-items-center rounded-md border-2 border-ink bg-paper">{url ? <img src={url} alt={label} className="size-full object-contain" /> : null}</span>
      {label && <span className="text-[10px] leading-tight">{label}</span>}
    </span>
  )
}

/** 3-2-1, "Mulai!", dan "Waktu habis!" */
export function Countdown({ intro, over }: { intro: Hud['intro']; over: boolean }) {
  const text = over ? 'Waktu habis!' : intro === 'go' ? 'Mulai!' : typeof intro === 'number' ? String(intro) : null
  if (!text) return null
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span key={text} className={cn('animate-[countPop_0.9s_ease-out_forwards] font-display leading-none text-ink uppercase', typeof intro === 'number' && !over ? 'text-8xl' : 'text-5xl')}>
        <Tape tone={over ? 'rose' : 'electric'}>{text}</Tape>
      </span>
    </div>
  )
}

/** menu grafis Dapur Kacau: tingkat (sama dengan Kart) + hemat baterai; berlaku mulai ronde berikutnya */
export function GraphicsMenu({ onClose }: { onClose: () => void }) {
  const [quality, setQuality] = useState(savedQuality)
  const [battery, setBattery] = useState(savedBattery)
  const auto = detectQuality()
  const shown = quality === 'auto' ? auto : quality
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/60" onClick={onClose}>
      <div className="flex w-[min(380px,92vw)] flex-col gap-2 border-[3px] border-ink bg-paper p-3 text-ink shadow-slab" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg uppercase">Grafis</h2>
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Kualitas grafis">
          {(['auto', 'low', 'med', 'high'] as const).map((q) => (
            <button
              key={q}
              role="radio"
              aria-checked={quality === q}
              onClick={() => {
                setQuality(q)
                saveQuality(q)
              }}
              className={cn('border-2 border-ink px-1 py-1 text-[11px] leading-tight font-bold', quality === q ? 'bg-electric' : 'bg-paper')}
            >
              {q === 'auto' ? 'Otomatis' : QUALITY_INFO[q].title}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-ink/70">
          {quality === 'auto' ? `Sekarang: ${QUALITY_INFO[auto].title}. ` : ''}
          {shown === 'low' ? 'Tanpa bayangan, 30 fps. Paling dingin untuk HP lama.' : shown === 'med' ? 'Bayangan, 60 fps, tanpa cahaya kilau.' : 'Bayangan tajam, cahaya kilau, 60 fps.'}
        </p>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={battery}
            onChange={(e) => {
              setBattery(e.target.checked)
              saveBattery(e.target.checked)
            }}
            className="size-5 accent-[#43b929]"
          />
          Hemat baterai (30 fps, HP lebih dingin)
        </label>
        <p className="text-[11px] text-ink/70">Berlaku mulai ronde berikutnya. Kalau HP mulai berat, grafis turun sendiri.</p>
        <Slab tone="ink" size="sm" onClick={onClose}>
          Oke
        </Slab>
      </div>
    </div>
  )
}
