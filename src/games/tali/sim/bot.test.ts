import { describe, expect, it } from 'vitest'
import { init } from '../engine'
import { LEVELS } from '../levels'
import { Duo } from './duo'
import { ROUTES } from './routes'
import { Runner, type RunnerView } from './runner'

function view(d: Duo, seat: 0 | 1): RunnerView {
  const me = d.clients[seat]
  return { me: me.body, other: d.clients[1 - seat].body, rt: me.rt, rope: me.rope, levers: d.state.levers, spawnId: d.state.spawnId, checkpoint: d.state.checkpoint }
}

/** pemain "manusia" memakai rute yang sama tapi melamun acak sebelum tiap langkah; bot memainkan Klepon */
function play(level: number, seed: number, maxSecs = 900) {
  let s = seed
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const d = new Duo(init(1, { start: level, run: false }), 0)
  const route = ROUTES[LEVELS[level].id]!
  const human = new Runner(0, route, false, () => (rnd() < 0.45 ? rnd() * 2.5 : 0))
  const bot = new Runner(1, route, true)
  human.peer = () => bot.idx
  for (let i = 0; i < maxSecs * 60 && d.state.phase === 'play'; i++) {
    d.step([human.step(view(d, 0), 1 / 60), bot.step(view(d, 1), 1 / 60)])
  }
  return { d, human, bot }
}

describe('bot pasangan menamatkan tiap level bersama pemain yang lambat', () => {
  LEVELS.forEach((def, i) => {
    it(def.title, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { d, human, bot } = play(i, seed)
        if (d.state.phase === 'play')
          console.log(def.id, seed, 'langkah', human.idx, bot.idx, '/', ROUTES[def.id]!.length, d.clients.map((c) => [c.body.x.toFixed(2), c.body.y.toFixed(2), c.body.hold]), 'jatuh', d.state.falls)
        expect(d.state.phase, `seed ${seed}`).toBe('clear')
      }
    })
  })
})
