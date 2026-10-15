import { cn } from '@/lib/utils'
import { BOARD, GROUP_HEX, GROUP_NAME, squareName } from '../board'
import { CARDS } from '../cards'
import { mortgageValue, rentOf } from '../engine'
import { HOTEL, type MonopolyState } from '../types'
import { sprite } from './art'
import { money } from './copy'

const ROW = 'flex justify-between gap-3 text-[12px] font-semibold leading-tight'

/** Akta properti: harga, tabel sewa, nilai gadai, dan pemilik saat ini. */
export function PropertyCard({ s, sq, names, seat, className }: { s: MonopolyState; sq: number; names: string[]; seat: number; className?: string }) {
  const b = BOARD[sq]
  const o = s.owner[sq]
  const head = b.kind === 'street' ? GROUP_HEX[b.group] : b.kind === 'airport' ? '#121212' : '#fff4fa'
  const icon = b.kind === 'airport' ? 'icon-airport' : b.kind === 'utility' ? (sq === 12 ? 'icon-power' : 'icon-water') : b.kind === 'street' ? `landmark-${b.group}` : null
  return (
    <div className={cn('flex w-full flex-col border-[3px] border-ink bg-paper shadow-slab-sm', className)}>
      <div className="flex items-center gap-2 border-b-[3px] border-ink px-2 py-1" style={{ background: head }}>
        {icon && <img src={sprite(icon)} alt="" className="size-9 shrink-0 object-contain" draggable={false} />}
        <div className={cn('min-w-0', b.kind === 'airport' ? 'text-petal' : 'text-ink')}>
          <p className="truncate font-display text-[15px] uppercase leading-none">{squareName(sq)}</p>
          {b.kind === 'street' && <p className="text-[10px] font-bold uppercase opacity-80">{GROUP_NAME[b.group]}</p>}
        </div>
        {'price' in b && <span className="ml-auto shrink-0 border-2 border-ink bg-paper px-1 font-display text-[12px] text-ink">{money(b.price)}</span>}
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        {b.kind === 'street' && (
          <>
            <p className={ROW}>
              <span>Sewa</span>
              <span>{money(b.rent[0])}</span>
            </p>
            <p className={ROW}>
              <span>Satu komplek</span>
              <span>{money(b.rent[0] * 2)}</span>
            </p>
            {[1, 2, 3, 4].map((h) => (
              <p key={h} className={cn(ROW, s.houses[sq] === h && 'bg-electric')}>
                <span>{h} rumah</span>
                <span>{money(b.rent[h])}</span>
              </p>
            ))}
            <p className={cn(ROW, s.houses[sq] === HOTEL && 'bg-electric')}>
              <span>Hotel</span>
              <span>{money(b.rent[HOTEL])}</span>
            </p>
            <p className={cn(ROW, 'mt-0.5 text-ink/70')}>
              <span>Bangun rumah</span>
              <span>{money(b.house)}</span>
            </p>
          </>
        )}
        {b.kind === 'airport' &&
          [1, 2, 3, 4].map((n) => (
            <p key={n} className={ROW}>
              <span>Punya {n} bandara</span>
              <span>{money(25 * 2 ** (n - 1))}</span>
            </p>
          ))}
        {b.kind === 'utility' && (
          <>
            <p className={ROW}>
              <span>Punya 1</span>
              <span>4x dadu</span>
            </p>
            <p className={ROW}>
              <span>Punya 2</span>
              <span>10x dadu</span>
            </p>
          </>
        )}
        {b.kind === 'tax' && <p className={ROW}>Bayar {money(b.amount)} ke {s.opts.freeParking ? 'pot Parkir Bebas' : 'bank'}.</p>}
        {b.kind === 'card' && <p className={ROW}>Tarik kartu {b.deck === 'chance' ? 'Kesempatan' : 'Dana Umum'}. Isinya {CARDS[b.deck].length} kejutan.</p>}
        {b.kind === 'go' && <p className={ROW}>Lewat sini gajian $200.</p>}
        {b.kind === 'jail' && <p className={ROW}>Cuma mampir aman. Kalau dipenjara: dobel, bayar $50, atau pakai kartu.</p>}
        {b.kind === 'parking' && <p className={ROW}>{s.opts.freeParking ? `Jackpot sekarang ${money(s.pot)}.` : 'Istirahat gratis.'}</p>}
        {b.kind === 'gotojail' && <p className={ROW}>Langsung ke penjara, tanpa gaji START.</p>}
        {'price' in b && (
          <p className={cn(ROW, 'mt-0.5 border-t-2 border-dashed border-ink/40 pt-0.5')}>
            <span>{o === null ? 'Milik bank' : `Milik ${o === seat ? 'kamu' : names[o]}`}</span>
            <span>
              {s.mortgaged[sq] ? 'DIGADAI' : o !== null && o !== seat ? `sewa kini ${b.kind === 'utility' ? '×dadu' : money(rentOf(s, sq, 0))}` : `gadai ${money(mortgageValue(sq))}`}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
