import { useSyncExternalStore } from 'react'

export type FeedbackTone = 'info' | 'success' | 'warn' | 'error'

export type Toast = { id: number; text: string; tone: FeedbackTone }

const MAX = 3
let list: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function dismissToast(id: number) {
  const next = list.filter((t) => t.id !== id)
  if (next.length === list.length) return
  list = next
  emit()
}

/** Pesan singkat di pojok kanan atas; hilang sendiri. Pesan sama yang masih tampil tidak ditumpuk. */
export function toast(text: string, opts: { tone?: FeedbackTone; ms?: number } = {}) {
  const tone = opts.tone ?? 'info'
  const dup = list.find((t) => t.text === text)
  if (dup) return dup.id
  const id = nextId++
  list = [...list, { id, text, tone }].slice(-MAX)
  emit()
  setTimeout(() => dismissToast(id), opts.ms ?? (tone === 'error' ? 4500 : 2800))
  return id
}

export function getToasts() {
  return list
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => list,
  )
}
