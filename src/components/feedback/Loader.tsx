import { Lottie } from 'lottie-react'
import loaderAnim from '@/assets/lottie/loader.json'
import { Tape } from '@/components/memphis/Slab'
import { terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Loader Couple Party: tiga bentuk Memphis melompat bergantian di atas balok terrazzo. */
export function Loader({ size = 120, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex flex-col items-center gap-1', className)}>
      <Lottie
        src={loaderAnim}
        autoplay={!reduceMotion()}
        loop
        aria-hidden
        style={{ width: size, height: (size * 170) / 240 }}
      />
      {label ? <span className="font-display text-sm uppercase">{label}</span> : <span className="sr-only">Memuat…</span>}
    </span>
  )
}

const floor = { backgroundImage: terrazzo(5, ['#ff37a6', '#43b929', '#121212', '#5cf64a', '#87e752'], 180, 30) }

/** Layar penuh saat menunggu: dipakai untuk memuat game, mencari room, dan menunggu host. */
export function LoadingScreen({ label, sub, overlay }: { label: string; sub?: string; overlay?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 bg-petal px-6 text-center',
        overlay ? 'fixed inset-0 z-40' : 'min-h-dvh w-full',
      )}
      style={floor}
    >
      <Loader size={180} />
      <Tape tone="rose" className="text-xl">
        {label}
      </Tape>
      {sub && <p className="max-w-[34ch] bg-paper/90 px-2 py-1 text-sm font-semibold">{sub}</p>}
    </div>
  )
}
