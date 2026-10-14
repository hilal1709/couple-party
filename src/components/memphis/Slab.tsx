import { Slot } from 'radix-ui'
import type { ComponentProps, CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { hatch, squiggles } from './patterns'

export type SlabTone = 'rose' | 'electric' | 'grass' | 'fern' | 'paper' | 'ink'

const TONE: Record<SlabTone, string> = {
  rose: 'bg-rose text-ink',
  electric: 'bg-electric text-ink',
  grass: 'bg-grass text-ink',
  fern: 'bg-fern text-ink',
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-petal',
}

type Props = ComponentProps<'button'> & {
  tone?: SlabTone
  size?: 'sm' | 'md' | 'lg'
  /** status aktif ditandai pola squiggle, bukan sekadar warna */
  active?: boolean
  asChild?: boolean
}

/**
 * Tombol "balok" Memphis: jajar genjang miring, outline tinta, bayangan keras.
 * Saat ditekan balok turun ke bayangannya.
 */
export function Slab({ tone = 'rose', size = 'md', active, asChild, className, style, children, ...rest }: Props) {
  const Comp = asChild ? Slot.Root : 'button'
  const pattern: CSSProperties = active
    ? { backgroundImage: squiggles(tone === 'ink' ? '#ffcae9' : '#121212', 44, 2.6), backgroundSize: '44px 44px' }
    : {}
  return (
    <Comp
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-2 border-[3px] border-ink font-display uppercase',
        '-skew-x-6 shadow-slab transition-[transform,box-shadow] duration-150 ease-out',
        'active:translate-x-[3px] active:translate-y-[4px] active:shadow-slab-sm',
        'disabled:pointer-events-none disabled:shadow-none disabled:translate-x-[3px] disabled:translate-y-[4px]',
        'focus-visible:outline-offset-4',
        TONE[tone],
        size === 'sm' && 'h-9 px-3 text-[13px]',
        size === 'md' && 'h-12 px-5 text-base',
        size === 'lg' && 'h-16 px-7 text-xl',
        className,
      )}
      style={{ ...pattern, ...style }}
      {...rest}
    >
      <span className="inline-flex skew-x-6 items-center gap-2">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden group-disabled:block"
        style={{ backgroundImage: hatch('#121212', 8, 0.35) }}
      />
    </Comp>
  )
}

/** Judul di atas pita warna miring. */
export function Tape({
  tone = 'rose',
  tilt = 'l',
  className,
  style,
  children,
}: {
  tone?: SlabTone
  tilt?: 'l' | 'r'
  className?: string
  style?: CSSProperties
  children: React.ReactNode
}) {
  return (
    <span className={cn('tape font-display uppercase text-ink', tilt === 'r' && 'tape-r', TONE[tone], className)} style={style}>
      {children}
    </span>
  )
}
