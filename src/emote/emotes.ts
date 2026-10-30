import kaget from '@/assets/emote/kaget.webp'
import kagetAnim from '@/assets/emote/kaget-anim.webp'
import keren from '@/assets/emote/keren.webp'
import kerenAnim from '@/assets/emote/keren-anim.webp'
import naksir from '@/assets/emote/naksir.webp'
import naksirAnim from '@/assets/emote/naksir-anim.webp'
import nangis from '@/assets/emote/nangis.webp'
import nangisAnim from '@/assets/emote/nangis-anim.webp'
import ngakak from '@/assets/emote/ngakak.webp'
import ngakakAnim from '@/assets/emote/ngakak-anim.webp'
import ngambek from '@/assets/emote/ngambek.webp'
import ngambekAnim from '@/assets/emote/ngambek-anim.webp'
import ngantuk from '@/assets/emote/ngantuk.webp'
import ngantukAnim from '@/assets/emote/ngantuk-anim.webp'
import sip from '@/assets/emote/sip.webp'
import sipAnim from '@/assets/emote/sip-anim.webp'

export type Emote =
  | { id: string; kind: 'sticker'; label: string; art: string; anim: string }
  | { id: string; kind: 'text'; label: string }

const sticker = (id: string, label: string, art: string, anim: string): Emote => ({ id, kind: 'sticker', label, art, anim })
const text = (id: string, label: string): Emote => ({ id, kind: 'text', label })

export const EMOTES: Emote[] = [
  sticker('ngakak', 'Ngakak', ngakak, ngakakAnim),
  sticker('nangis', 'Nangis', nangis, nangisAnim),
  sticker('ngambek', 'Ngambek', ngambek, ngambekAnim),
  sticker('naksir', 'Naksir', naksir, naksirAnim),
  sticker('kaget', 'Kaget', kaget, kagetAnim),
  sticker('keren', 'Keren', keren, kerenAnim),
  sticker('ngantuk', 'Ngantuk', ngantuk, ngantukAnim),
  sticker('sip', 'Sip', sip, sipAnim),
  text('hahaha', 'Hahaha!'),
  text('ayo', 'Ayo dong!'),
  text('cepetan', 'Cepetan!'),
  text('curang', 'Curang!'),
  text('awas', 'Awas kamu!'),
  text('mantap', 'Mantap!'),
  text('kasian', 'Yah, kasian'),
  text('maaf', 'Maaf ya'),
]

/** id dari HP lain tidak dipercaya: yang tidak ada di katalog mengembalikan undefined */
export const emoteById = (id: string) => EMOTES.find((e) => e.id === id)

export type Rect = { left: number; top: number; width: number; height: number }

/**
 * Titik kiri-atas gelembung berukuran `w`×`h`: di atas elemen kursi kalau muat, kalau tidak di
 * bawahnya, dan di sisi atas kursi kalau kursinya setinggi layar. Hasilnya dijepit agar tetap
 * di dalam layar. Tanpa kursi: tengah atas layar.
 */
export function bubbleSpot(seat: Rect | null, w: number, h: number, vw: number, vh: number, margin = 8) {
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
  if (!seat) return { x: clamp((vw - w) / 2, margin, vw - w - margin), y: margin }
  const above = seat.top - h - 4
  const below = seat.top + seat.height + 4
  const y = above >= margin ? above : below + h <= vh - margin ? below : seat.top + 26
  return { x: clamp(seat.left + seat.width / 2 - w / 2, margin, vw - w - margin), y: clamp(y, margin, vh - h - margin) }
}
