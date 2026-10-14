import { Dialog as D } from 'radix-ui'
import { useEffect, useRef, type ReactNode } from 'react'
import { sfx } from '@/audio/audio'
import { Slab, Tape, type SlabTone } from '@/components/memphis/Slab'
import { squiggles } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  tone?: SlabTone
  /** ilustrasi kecil di atas kartu */
  art?: string
  /** false = tidak tertutup dengan ketuk luar / tombol kembali */
  dismissable?: boolean
  className?: string
  children?: ReactNode
}

/** Modal Memphis: kartu paper miring, judul pita, potongan selotip squiggle di pojok. */
export function Modal({ open, onOpenChange, title, description, tone = 'rose', art, dismissable = true, className, children }: ModalProps) {
  const was = useRef(open)
  useEffect(() => {
    if (open !== was.current) sfx(open ? 'ui-open' : 'ui-close', { volume: 0.7 })
    was.current = open
  }, [open])

  const block = (e: Event) => {
    if (!dismissable) e.preventDefault()
  }

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <D.Content
          onPointerDownOutside={block}
          onEscapeKeyDown={block}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 -rotate-[0.8deg] flex-col gap-3 overflow-y-auto border-[3px] border-ink bg-paper p-4 shadow-lift outline-none',
            'duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-90 motion-reduce:animate-none',
            className,
          )}
        >
          <div
            aria-hidden
            className="absolute -top-0.5 right-5 h-5 w-16 rotate-6 border-[3px] border-t-0 border-ink bg-rose"
            style={{ backgroundImage: squiggles('#121212', 40, 2.6) }}
          />
          {art && <img src={art} alt="" className="-mb-1 h-24 w-auto self-start" draggable={false} />}
          <D.Title asChild>
            <Tape tone={tone} className="self-start text-xl leading-tight">
              {title}
            </Tape>
          </D.Title>
          {description ? (
            <D.Description className="text-[14px] font-semibold leading-snug">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

type ConfirmProps = Omit<ModalProps, 'children' | 'dismissable'> & {
  confirmLabel: string
  cancelLabel?: string
  confirmTone?: SlabTone
  onConfirm: () => void
}

/** Konfirmasi dua tombol: aksi utama di kiri, batal di kanan. */
export function ConfirmModal({ confirmLabel, cancelLabel = 'Batal', confirmTone = 'ink', onConfirm, onOpenChange, ...rest }: ConfirmProps) {
  return (
    <Modal onOpenChange={onOpenChange} {...rest}>
      <div className="mt-1 flex flex-wrap gap-3">
        <Slab
          tone={confirmTone}
          size="sm"
          className="flex-1"
          onClick={() => {
            onOpenChange(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </Slab>
        <Slab tone="paper" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Slab>
      </div>
    </Modal>
  )
}
