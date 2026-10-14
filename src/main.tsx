import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Demo } from './Demo.tsx'
import type { Variant } from './games/uno/types'

const demo = import.meta.env.DEV ? (new URLSearchParams(location.search).get('demo') as Variant | null) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {demo ? <Demo variant={demo} /> : <App />}
  </StrictMode>,
)
