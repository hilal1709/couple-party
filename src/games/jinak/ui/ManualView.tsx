import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BUTTON_RULES,
  LOCK_LAMPS,
  LOCK_RULES,
  LOCK_SHAPES,
  LOCK_TABLE,
  MAZE_MARKERS,
  MAZE_SIZE,
  RELEASE_DIGIT,
  SYMBOL_COLUMNS,
  WIRE_RULES,
  WORDS,
  mazeOpen,
} from '../modules'
import type { ModuleKind } from '../types'
import { MODULE_TITLE } from './copy'
import { SYMBOL_PATH, SYMBOL_TITLE } from './symbols'
import paperUrl from '@/assets/jinak/tex/paper.webp'

type Page = 'awal' | ModuleKind
const PAGES: { id: Page; title: string }[] = [
  { id: 'awal', title: 'Baca dulu' },
  { id: 'kabel', title: 'Kabel' },
  { id: 'tombol', title: 'Tombol' },
  { id: 'simbol', title: 'Simbol' },
  { id: 'labirin', title: 'Labirin' },
  { id: 'sandi', title: 'Sandi' },
  { id: 'gembok', title: 'Gembok' },
]

const SWATCH: Record<string, string> = { merah: '#e0262f', biru: '#1f5fe0', kuning: '#f4c21b', hijau: '#2fbf3a', putih: '#f2f2ee', hitam: '#1b1b1d' }

function Sym({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-label={SYMBOL_TITLE[id]} role="img">
      <path d={SYMBOL_PATH[id]} fill="none" stroke="currentColor" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Rules({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1 text-[13px] leading-snug">
      {items.map((r, i) => (
        <li key={i} className="flex gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink/80 font-display text-[10px]">{i + 1}</span>
          <span>{r}</span>
        </li>
      ))}
    </ol>
  )
}

function Maze({ index }: { index: number }) {
  const N = MAZE_SIZE
  const c = 20
  const lines: string[] = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!mazeOpen(index, [x, y], 'r') && x < N - 1) lines.push(`M${(x + 1) * c} ${y * c} V${(y + 1) * c}`)
      if (!mazeOpen(index, [x, y], 'd') && y < N - 1) lines.push(`M${x * c} ${(y + 1) * c} H${(x + 1) * c}`)
    }
  return (
    <figure className="flex flex-col items-center gap-0.5">
      <svg viewBox={`-4 -4 ${N * c + 8} ${N * c + 8}`} className="w-full max-w-[150px]" role="img" aria-label={`Labirin ${index + 1}`}>
        <rect x={0} y={0} width={N * c} height={N * c} fill="none" stroke="#121212" strokeWidth={3} />
        {Array.from({ length: N * N }, (_, i) => (
          <circle key={i} cx={(i % N) * c + c / 2} cy={Math.floor(i / N) * c + c / 2} r={1.6} fill="#12121255" />
        ))}
        <path d={lines.join(' ')} stroke="#121212" strokeWidth={3} strokeLinecap="round" />
        {MAZE_MARKERS[index].map(([x, y], i) => (
          <circle key={i} cx={x * c + c / 2} cy={y * c + c / 2} r={6.5} fill="none" stroke="#2f7a2a" strokeWidth={2.6} />
        ))}
      </svg>
      <figcaption className="font-display text-[11px] uppercase">Labirin {index + 1}</figcaption>
    </figure>
  )
}

function PageBody({ page }: { page: Page }) {
  switch (page) {
    case 'awal':
      return (
        <div className="flex flex-col gap-2 text-[13px] leading-snug">
          <p>
            Kamu <b>tidak bisa melihat bom</b>. Penjinak yang lihat. Tugasmu: tanya apa yang kelihatan, cari aturannya di buku ini, lalu bilang harus ngapain. Bom punya beberapa
            modul; tiap modul punya lampu kecil yang jadi hijau kalau beres.
          </p>
          <p className="font-display text-sm uppercase">Info casing yang sering ditanya</p>
          <ul className="flex flex-col gap-1">
            <li>
              <b>Nomor seri</b>: pelat putih di sisi kanan bom. Enam karakter, digit terakhir selalu angka. Huruf vokal = A, I, U, E, O.
            </li>
            <li>
              <b>Baterai</b>: tabung pink di atas bom. Hitung jumlahnya (bisa nol).
            </li>
            <li>
              <b>Stiker</b>: tempelan di sisi kiri: KOPI, BATIK, SATE, BEMO, atau JAMU. Bisa juga nggak ada.
            </li>
          </ul>
          <p>
            Tiap salah tercatat di bawah timer. Kebanyakan salah atau waktu habis = DUAR. Di level Panik, tiap salah bikin jam jalan lebih cepat.
          </p>
        </div>
      )
    case 'kabel':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-snug">
            Ada 3 sampai 6 kabel. Hitung <b>dari atas</b>. Potong cuma <b>satu</b> kabel yang benar. Pakai aturan pertama yang cocok.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SWATCH).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1 text-[11px] font-bold uppercase">
                <span className="size-3 rounded-full border border-ink" style={{ background: v }} />
                {k}
              </span>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {WIRE_RULES.map((g) => (
              <section key={g.title} className="border-2 border-dashed border-ink/40 p-2">
                <h4 className="mb-1 font-display text-sm uppercase">{g.title}</h4>
                <Rules items={g.rules} />
              </section>
            ))}
          </div>
        </div>
      )
    case 'tombol':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-snug">Tombol bulat besar dengan tulisan. Tanya warna tombol & tulisannya. Pakai aturan pertama yang cocok:</p>
          <Rules items={BUTTON_RULES} />
          <p className="font-display text-sm uppercase">Kalau harus ditahan</p>
          <p className="text-[13px] leading-snug">Tahan terus, lampu strip di sebelah tombol akan menyala. Lepas saat timer menampilkan angka ini di posisi mana saja:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RELEASE_DIGIT).map(([c, d]) => (
              <span key={c} className="flex items-center gap-1.5 border-2 border-ink bg-paper/70 px-2 py-0.5 text-[12px] font-bold uppercase">
                <span className="size-3 rounded-full border border-ink" style={{ background: SWATCH[c] }} />
                strip {c} → angka {d}
              </span>
            ))}
          </div>
        </div>
      )
    case 'simbol':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-snug">
            Empat tuts bergambar. Cari <b>satu kolom</b> yang memuat keempat gambar itu, lalu tekan sesuai urutan kolom dari atas ke bawah. Salah tekan = ulang dari awal.
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {SYMBOL_COLUMNS.map((col, i) => (
              <ul key={i} className="flex flex-col items-center gap-1 border-2 border-ink/50 bg-paper/50 py-1">
                <li className="font-display text-[11px]">{i + 1}</li>
                {col.map((s) => (
                  <li key={s} title={SYMBOL_TITLE[s]} className="flex flex-col items-center text-ink">
                    <Sym id={s} size={30} />
                    <span className="text-[8px] font-bold uppercase leading-none text-ink/70">{SYMBOL_TITLE[s]}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )
    case 'labirin':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-snug">
            Layar hijau 6×6 dengan dua lingkaran. Cocokkan letak lingkarannya dengan labirin di bawah. Kotak putih = posisi penjinak, segitiga merah = tujuan. Tembok tidak terlihat di
            bom, jadi pandu dengan "atas / bawah / kiri / kanan". Nabrak tembok = salah.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MAZE_MARKERS.map((_, i) => (
              <Maze key={i} index={i} />
            ))}
          </div>
        </div>
      )
    case 'sandi':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-snug">
            Lima huruf yang bisa diputar naik-turun. Tiap kolom punya enam pilihan huruf. Cuma satu kata di daftar ini yang bisa dibentuk. Tanya huruf-huruf di kolom pertama & kedua
            dulu biar cepat, lalu suruh tekan KIRIM.
          </p>
          <ul className="grid grid-cols-5 gap-1 font-mono text-[14px] font-bold tracking-widest">
            {WORDS.map((w) => (
              <li key={w} className="border border-ink/30 bg-paper/50 px-1 text-center">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'gembok':
      return (
        <div className="flex flex-col gap-2">
          <Rules items={LOCK_RULES} />
          <table className="w-full border-collapse text-center text-[14px] font-bold">
            <thead>
              <tr>
                <th className="border-2 border-ink p-1 text-[10px] uppercase">lampu \ bentuk</th>
                {LOCK_SHAPES.map((s) => (
                  <th key={s} className="border-2 border-ink p-1">
                    <span className="flex flex-col items-center">
                      <Sym id={s} size={24} />
                      <span className="text-[9px] uppercase">{s}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOCK_LAMPS.map((l, r) => (
                <tr key={l}>
                  <th className="border-2 border-ink p-1 text-[11px] uppercase">
                    <span className="flex items-center justify-center gap-1">
                      <span className="size-3 rounded-full border border-ink" style={{ background: SWATCH[l] }} />
                      {l}
                    </span>
                  </th>
                  {LOCK_TABLE[r].map((code, c) => (
                    <td key={c} className="border-2 border-ink p-1 font-mono tracking-[0.2em]">
                      {code}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

/** Buku panduan pakar: kertas lusuh hasil bake Blender, lipatan & noda kopi dari CSS. */
export function ManualView({ className }: { className?: string }) {
  const [page, setPage] = useState<Page>('awal')
  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1.5', className)}>
      <nav className="flex shrink-0 gap-1 overflow-x-auto pb-0.5" aria-label="Halaman buku panduan">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            aria-current={page === p.id}
            className={cn('shrink-0 border-[3px] border-ink px-2.5 py-1 font-display text-[12px] uppercase', page === p.id ? 'bg-rose text-paper' : 'bg-paper shadow-slab-sm')}
          >
            {p.title}
          </button>
        ))}
      </nav>
      <article
        className="relative min-h-0 flex-1 overflow-y-auto border-[3px] border-ink px-4 py-3 text-ink shadow-slab"
        style={{
          backgroundImage: `linear-gradient(90deg, #0000 48.6%, #5a3a1a22 49.6%, #fff6 50.2%, #0000 51.5%), radial-gradient(circle at 86% 14%, #8a5a2b00 9%, #8a5a2b40 10%, #8a5a2b18 11.5%, #8a5a2b00 13%), radial-gradient(120% 90% at 50% 40%, #0000 60%, #5a3a1a33), url(${paperUrl})`,
          backgroundSize: 'auto, auto, auto, 520px',
          backgroundAttachment: 'local',
        }}
      >
        <header className="mb-2 flex items-baseline justify-between gap-2 border-b-2 border-ink/60 pb-1">
          <h3 className="font-display text-lg uppercase leading-none">{page === 'awal' ? 'Buku Panduan Penjinakan' : MODULE_TITLE[page]}</h3>
          <span className="text-[10px] font-bold uppercase text-ink/60">Rahasia · jangan diintip penjinak</span>
        </header>
        <PageBody page={page} />
      </article>
    </div>
  )
}
