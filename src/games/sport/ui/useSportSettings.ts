import { useState } from 'react'
import { toast } from '@/components/feedback/toast'
import { store } from '@/net/transport'
import { saveQuality, savedQuality, type Quality } from '../render/stage'
import type { Look, SportAction } from '../types'
import { savedLook, saveLook } from './lookStore'

export type Input = 'buttons' | 'camera'

const INPUT_KEY = 'couple-party:sport-input'

/** Pengaturan yang sama di semua cabang: kontrol, grafis, dan karakter. */
export function useSportSettings(act: (a: SportAction) => void) {
  const [input, setInput] = useState<Input>(() => (store.getItem(INPUT_KEY) === 'camera' ? 'camera' : 'buttons'))
  const [quality, setQuality] = useState<Quality>(savedQuality)
  const [menu, setMenu] = useState(false)
  const [making, setMaking] = useState(() => !savedLook())

  const choose = (v: Input) => {
    store.setItem(INPUT_KEY, v)
    setInput(v)
    setMenu(false)
    if (v === 'camera') toast('Sandarkan HP, lalu mundur 2–3 langkah')
  }

  const saveMine = (l: Look) => {
    saveLook(l)
    setMaking(false)
    act({ type: 'look', look: l })
  }

  const downgraded = (q: Quality) => {
    saveQuality(q)
    setQuality(q)
  }

  return { input, choose, quality, setQuality, downgraded, menu, setMenu, making, setMaking, saveMine }
}

export type SportSettings = ReturnType<typeof useSportSettings>
