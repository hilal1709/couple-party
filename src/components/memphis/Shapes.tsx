import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

const INK = '#121212'

/** Benda Memphis di latar Home: segitiga & setengah lingkaran (properti lain ada di ilustrasi Blender). */
export function Shapes() {
  const ref = useRef<SVGSVGElement>(null)
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.to('[data-bob]', {
        y: (i) => (i % 2 ? 8 : -8),
        rotation: (i) => (i % 2 ? 4 : -5),
        duration: (i) => 2.6 + i * 0.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    },
    { scope: ref },
  )
  return (
    <svg
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMin slice"
    >
      <defs>
      </defs>
      {/* segitiga pink */}
      <g data-bob style={{ transformOrigin: '335px 70px', transformBox: 'fill-box' }}>
        <polygon points="300,30 372,92 296,112" fill="#ff37a6" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      </g>
      {/* setengah lingkaran hijau */}
      <g data-bob>
        <path d="M262 214 a44 44 0 0 1 88 0 z" fill="#5cf64a" stroke={INK} strokeWidth="4" />
      </g>
    </svg>
  )
}
