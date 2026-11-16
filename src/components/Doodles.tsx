import { useMemo, type SVGProps } from 'react'
import { blobPath } from '../lib/shapes'

/*
 * Hand-drawn, pen-and-ink illustrations. White fill + black ink so they read
 * both on the paper background and where they overlap the black ink blobs.
 */

const INK = '#121212'
const PAPER = '#ffffff'

type P = SVGProps<SVGSVGElement>
const stroke = { stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function OpenBook(props: P) {
  const lines = [0, 1, 2, 3, 4, 5, 6]
  return (
    <svg viewBox="0 40 200 126" fill="none" aria-hidden {...props}>
      <g {...stroke}>
        <path d="M8 62 L8 142 C40 134 76 136 100 148 C124 136 160 134 192 142 L192 62" fill={PAPER} strokeWidth="2.2" />
        <path d="M12 138 C44 130 78 132 100 144 C122 132 156 130 188 138" strokeWidth="1.2" />
        <path d="M100 54 C78 42 44 40 16 50 L16 134 C44 126 78 128 100 140 Z" fill={PAPER} strokeWidth="2.2" />
        <path d="M100 54 C122 42 156 40 184 50 L184 134 C156 126 122 128 100 140 Z" fill={PAPER} strokeWidth="2.2" />
        {lines.map((i) => {
          const y = 64 + i * 10
          const lw = i === 3 ? 30 : 56 - (i % 3) * 8
          return (
            <g key={i} strokeWidth="1.3">
              <path d={`M${28} ${y} C${40} ${y - 3} ${28 + lw * 0.7} ${y - 2} ${28 + lw} ${y + 2}`} />
              <path d={`M${172} ${y} C${160} ${y - 3} ${172 - lw * 0.7} ${y - 2} ${172 - lw} ${y + 2}`} />
            </g>
          )
        })}
        {/* bookmark ribbon */}
        <path d="M128 46 L128 160 L134 153 L140 160 L140 44" fill={INK} strokeWidth="1.6" />
      </g>
    </svg>
  )
}

export function Quill(props: P) {
  // Shaft as a cubic Bézier; barbs are combed off it on both sides.
  const P0 = [98, 6]
  const P1 = [80, 50]
  const P2 = [56, 100]
  const P3 = [36, 150]
  const at = (t: number) => {
    const u = 1 - t
    const x = u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0]
    const y = u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]
    const dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0])
    const dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1])
    const len = Math.hypot(dx, dy)
    return { x, y, nx: -dy / len, ny: dx / len }
  }
  const barbs = []
  for (let t = 0.06; t < 0.94; t += 0.045) {
    const { x, y, nx, ny } = at(t)
    const w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 22 + 4
    barbs.push(
      `M${x.toFixed(1)} ${y.toFixed(1)} l${(nx * w + 4).toFixed(1)} ${(ny * w + 6).toFixed(1)}`,
      `M${x.toFixed(1)} ${y.toFixed(1)} l${(-nx * w * 0.7 + 4).toFixed(1)} ${(-ny * w * 0.7 + 6).toFixed(1)}`,
    )
  }
  return (
    <svg viewBox="0 0 120 200" fill="none" aria-hidden {...props}>
      <g {...stroke}>
        <path
          d="M98 6 C70 16 34 60 22 120 C24 140 30 152 36 152 C60 130 70 116 78 96 C90 66 100 34 98 6 Z"
          fill={PAPER}
          strokeWidth="2.2"
        />
        <path d={barbs.join(' ')} strokeWidth="1" />
        <path d="M98 6 C80 50 56 100 36 150 L28 192" strokeWidth="2.4" />
        <path d="M31 176 L26 192 L33 182" fill={INK} strokeWidth="1.5" />
        <path d="M44 120 l-10 -4 M56 92 l-9 -2" strokeWidth="2" />
      </g>
    </svg>
  )
}

/** A black organic ink blob. Stretches to fill its box, so give it a size (it's absolutely positioned). */
export function InkBlob({
  seed,
  points = 9,
  wobble = 0.22,
  className,
}: {
  seed: number
  points?: number
  wobble?: number
  className?: string
}) {
  const d = useMemo(() => blobPath(seed, 1000, 600, points, wobble), [seed, points, wobble])
  return (
    <svg className={className} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill={INK} />
    </svg>
  )
}

export function SpiralLogo(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <path
        d="M17.5 16.5c0-1.4-1.6-2-2.8-1.2-1.6 1.1-1 3.6.7 4.3 2.6 1 5.2-1.1 5.2-3.8 0-3.6-3.6-5.9-6.9-5-4.3 1.1-6.1 6.1-4.2 9.9 2.3 4.7 8.5 6 12.7 3.3 4.9-3.1 5.5-10.2 1.9-14.5C20.3 4.9 12.2 4.4 7.2 8.6"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
