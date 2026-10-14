import { Howl, Howler } from 'howler'
import { useEffect, useSyncExternalStore } from 'react'
import { store } from '@/net/transport'

export type Track = 'menu' | 'uno' | 'uno-tense' | 'snakes' | 'snakes-tense'

export type SfxName =
  | 'card-place-1'
  | 'card-place-2'
  | 'card-place-3'
  | 'card-slide-1'
  | 'card-slide-2'
  | 'card-slide-3'
  | 'card-shuffle'
  | 'card-fan'
  | 'card-shove'
  | 'pack-open'
  | 'pack-take'
  | 'chips-stack'
  | 'dice-shake'
  | 'ui-click'
  | 'ui-open'
  | 'ui-close'
  | 'ui-toggle'
  | 'ui-select'
  | 'turn-ding'
  | 'switch'
  | 'jingle-uno'
  | 'jingle-round-win'
  | 'jingle-champion'
  | 'jingle-round-lose'
  | 'jingle-caught'
  | 'jingle-challenge-win'
  | 'jingle-challenge-lose'
  | 'jingle-out'

export type AudioSettings = { music: number; sfx: number; muted: boolean }

const KEY = 'couple-party:audio'
const BASE = `${import.meta.env.BASE_URL}audio`
const FADE_MS = 700

function loadSettings(): AudioSettings {
  try {
    const s = JSON.parse(store.getItem(KEY) ?? 'null') as Partial<AudioSettings> | null
    return { music: s?.music ?? 0.55, sfx: s?.sfx ?? 0.8, muted: s?.muted ?? false }
  } catch {
    return { music: 0.55, sfx: 0.8, muted: false }
  }
}

let settings = loadSettings()
const listeners = new Set<() => void>()
const music = new Map<Track, Howl>()
const sfxCache = new Map<SfxName, Howl>()
let current: Track | null = null

const musicVolume = () => (settings.muted ? 0 : settings.music)

function trackHowl(t: Track): Howl {
  let h = music.get(t)
  if (!h) {
    // Web Audio (bukan html5) supaya loop tanpa jeda
    h = new Howl({ src: [`${BASE}/music/${t}.ogg`], loop: true, volume: 0, preload: true })
    music.set(t, h)
  }
  return h
}

/** Putar musik latar; berganti lagu dengan crossfade. */
export function playMusic(t: Track) {
  if (current === t) return
  const prevTrack = current
  const prev = prevTrack ? music.get(prevTrack) : undefined
  current = t
  if (prev) {
    prev.fade(prev.volume(), 0, FADE_MS)
    // jeda setelah fade selesai, kecuali lagu itu sudah dipilih lagi
    prev.once('fade', () => {
      if (current !== prevTrack) prev.pause()
    })
  }
  const next = trackHowl(t)
  if (!next.playing()) next.play()
  next.fade(next.volume(), musicVolume(), FADE_MS)
}

/** Efek suara satu kali. `delay` dalam ms untuk merangkai beberapa suara. */
export function sfx(name: SfxName, opts: { delay?: number; rate?: number; volume?: number } = {}) {
  if (settings.muted || settings.sfx <= 0) return
  const fire = () => {
    let h = sfxCache.get(name)
    if (!h) {
      h = new Howl({ src: [`${BASE}/sfx/${name}.ogg`], preload: true })
      sfxCache.set(name, h)
    }
    const id = h.play()
    h.volume(settings.sfx * (opts.volume ?? 1), id)
    if (opts.rate) h.rate(opts.rate, id)
  }
  if (opts.delay) setTimeout(fire, opts.delay)
  else fire()
}

export function getSettings() {
  return settings
}

export function setSettings(patch: Partial<AudioSettings>) {
  settings = { ...settings, ...patch }
  store.setItem(KEY, JSON.stringify(settings))
  const h = current ? music.get(current) : undefined
  if (h) h.volume(musicVolume())
  listeners.forEach((l) => l())
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => settings,
  )
}

/** Layar menyatakan musik latarnya (null = biarkan layar anak yang menentukan). */
export function useMusic(t: Track | null) {
  useEffect(() => {
    if (t) playMusic(t)
  }, [t])
}

// App ke latar belakang (layar mati / pindah app) → jeda semua suara; kembali → lanjut.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const ctx = Howler.ctx
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else void ctx.resume()
  })
}
