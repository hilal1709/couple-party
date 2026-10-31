import * as THREE from 'three'
import type { Body } from './body'
import { encodeLinear, PaintSurface, type Dab, type Pattern } from './paint'
import type { World } from './world'

export type Tool = 'kuas' | 'cap' | 'pipet' | 'hapus'

export const SIZES = [0.05, 0.1, 0.2]
export const ROTATIONS = [0, Math.PI / 2, Math.PI / 4]
const ERASE = new THREE.Vector3(0.9, 0.9, 0.9)

export type PainterView = { tool: Tool; size: number; mirror: boolean; rot: number; swatch: string; hasPattern: boolean; canUndo: boolean }

type Hit = { p: THREE.Vector3; n: THREE.Vector3 }

/** alat cat pemain: sentuhan layar → goresan di kulit bunglon */
export class Painter {
  readonly surface: PaintSurface
  private world: World
  private body: Body
  private ray = new THREE.Raycaster()
  private last: Hit | null = null
  private active = false
  private color = new THREE.Vector3(0.05, 0.3, 0.1)
  private pattern: Pattern | null = null
  private onChange: () => void
  view: PainterView = { tool: 'kuas', size: 1, mirror: true, rot: 0, swatch: '#3f9d4d', hasPattern: false, canUndo: false }

  constructor(world: World, body: Body, onChange: () => void) {
    this.world = world
    this.body = body
    this.onChange = onChange
    this.surface = new PaintSurface(world.renderer, body.skin.geometry)
    body.setPaint(this.surface.texture)
  }

  private bump(patch: Partial<PainterView>) {
    this.view = { ...this.view, ...patch }
    this.onChange()
  }

  set(patch: Partial<Pick<PainterView, 'tool' | 'size' | 'mirror' | 'rot'>>) {
    this.bump(patch)
  }

  private brush() {
    const v = this.view
    this.surface.setBrush({
      radius: SIZES[v.size],
      color: v.tool === 'hapus' ? ERASE : this.color,
      pattern: v.tool === 'cap' ? this.pattern : null,
      rotation: ROTATIONS[v.rot],
    })
  }

  private hit(px: number, py: number): Hit | null {
    const rect = this.world.renderer.domElement.getBoundingClientRect()
    this.ray.setFromCamera(new THREE.Vector2((px / rect.width) * 2 - 1, -(py / rect.height) * 2 + 1), this.world.camera)
    const hit = this.ray.intersectObject(this.body.skin, false)[0] as (THREE.Intersection & { barycoord?: THREE.Vector3 }) | undefined
    if (!hit?.face || !hit.barycoord) return null
    const g = this.body.skin.geometry
    const { a, b, c } = hit.face
    const p = new THREE.Vector3()
    const n = new THREE.Vector3()
    THREE.Triangle.getInterpolatedAttribute(g.attributes.position as THREE.BufferAttribute, a, b, c, hit.barycoord, p)
    THREE.Triangle.getInterpolatedAttribute(g.attributes.normal as THREE.BufferAttribute, a, b, c, hit.barycoord, n)
    return { p, n: n.normalize() }
  }

  private dabs(from: Hit, to: Hit): Dab[] {
    const d: Dab[] = [{ a: from.p, b: to.p, n: to.n }]
    if (this.view.mirror) {
      const m = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, v.z)
      d.push({ a: m(from.p), b: m(to.p), n: m(to.n) })
    }
    return d
  }

  /** true = sentuhan dipakai alat; false = kena udara, jadi layar boleh memutar kamera */
  down(px: number, py: number): boolean {
    if (this.view.tool === 'pipet') {
      const got = this.world.pick(px, py)
      if (got) {
        this.color.copy(got.color)
        this.pattern = got.pattern
        const b = (v: number) => Math.round(encodeLinear(v) * 255)
        this.bump({ swatch: `rgb(${b(got.color.x)} ${b(got.color.y)} ${b(got.color.z)})`, hasPattern: !!got.pattern, tool: got.pattern ? 'cap' : 'kuas' })
      }
      return true
    }
    this.body.skin.computeBoundingSphere()
    this.body.skin.computeBoundingBox()
    const hit = this.hit(px, py)
    if (!hit) return false
    this.brush()
    this.surface.snapshot()
    this.surface.stroke(this.dabs(hit, hit))
    this.last = hit
    this.active = true
    if (!this.view.canUndo) this.bump({ canUndo: true })
    return true
  }

  move(px: number, py: number) {
    if (!this.active) return
    const hit = this.hit(px, py)
    if (!hit) return
    this.surface.stroke(this.dabs(this.last ?? hit, hit))
    this.last = hit
  }

  /** true = cat berubah */
  up(): boolean {
    const was = this.active
    this.active = false
    this.last = null
    return was
  }

  fill() {
    this.brush()
    this.surface.snapshot()
    this.surface.fill()
    this.bump({ canUndo: true })
  }

  undo() {
    this.surface.undoLast()
    this.bump({ canUndo: this.surface.canUndo })
  }

  dispose() {
    this.surface.dispose()
  }
}
