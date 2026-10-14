import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import type { Variant } from './games/uno/types'

const demo = import.meta.env.DEV ? (new URLSearchParams(location.search).get('demo') as Variant | null) : null
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
