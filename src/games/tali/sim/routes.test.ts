import { describe, expect, it } from 'vitest'
import { init } from '../engine'
import { LEVELS } from '../levels'
import { Duo } from './duo'
import { ROUTES } from './routes'

describe('rute tiap level bisa diselesaikan berdua', () => {
  LEVELS.forEach((def, i) => {
    it(def.title, () => {
      const route = ROUTES[def.id]
      expect(route, 'rute belum ditulis').toBeDefined()
      const d = new Duo(init(1, { start: i, run: false }))
      d.trace = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.TRACE
      const ok = d.run(route!)
      if (!ok) console.log(d.log.slice(-16).join('\n'), d.clients.map((c) => [c.body.x.toFixed(2), c.body.y.toFixed(2), c.body.hold]))
      expect(ok).toBe(true)
      expect(d.state.phase).toBe('clear')
      expect(d.state.falls).toBe(0)
    })
  })
})
