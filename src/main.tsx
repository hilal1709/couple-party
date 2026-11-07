import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import type { Variant } from './games/uno/types'

// build QA (VITE_QA=1, scripts/qa-apk.mjs) juga membuka rute demo untuk uji di HP/emulator
const demo = import.meta.env.DEV || import.meta.env.VITE_QA === '1' ? (new URLSearchParams(location.search).get('demo') as Variant | 'draw' | 'remi' | 'domino' | 'monopoly' | 'ludo' | 'spy' | 'bom' | 'kart' | 'sport' | 'petak' | 'masak' | 'puncak' | 'tali' | 'sunyi' | 'jinak' | null) : null
const Demo = lazy(() => import('./Demo.tsx').then((m) => ({ default: m.Demo })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {demo ? (
      <Suspense>
        <Demo variant={demo} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
