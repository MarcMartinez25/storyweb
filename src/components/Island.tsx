import { memo, useId, useMemo, type CSSProperties, type ReactNode } from 'react'
import { blobPath, seeded } from '../lib/shapes'

/*
 * A little floating island, drawn in pen and ink, for the shelf's level map.
 * Shape is seeded from the book, so every island is different but stays put.
 */

const INK = '#121212'
const PAPER = '#ffffff'

export type IslandLandmark = 'tower' | 'pines' | 'grove' | 'cottage' | 'lighthouse' | 'hills'

/**
 * Books store a `pattern` string (from the earlier cover designs). It now picks the island's landmark;
 * the stored values are kept so existing data doesn't need migrating.
 */
const LANDMARK_BY_PATTERN: Record<string, IslandLandmark> = {
  ink: 'tower',
  stripes: 'pines',
  dots: 'grove',
  checks: 'cottage',
  waves: 'lighthouse',
  grid: 'hills',
}

const hash = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

const ink = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Island art is drawn in a 220×190 box; the top surface sits around y = 92. */
const BASE = 92

function Landmark({ kind }: { kind: IslandLandmark }) {
  switch (kind) {
    case 'tower':
      return (
        <g {...ink} fill={PAPER}>
          <path d="M96 92 V50 h5 v-7 h5 v7 h8 v-7 h5 v7 h5 V92 Z" />
          <path d="M105 92 v-11 a5 5 0 0 1 10 0 v11" />
          <path d="M108 64 v-6 a2 2 0 0 1 4 0 v6 z" fill={INK} />
          <path d="M98 74 h6 M114 70 h7 M100 84 h5 M116 82 h5" strokeWidth="1.2" />
          <path d="M110 43 V28" />
          <path d="M110 28 l12 4 l-12 4 z" fill={INK} />
        </g>
      )
    case 'pines': {
      const tree = (x: number, h: number) => {
        const top = BASE - 6 - h
        return (
          <g key={x}>
            <path d={`M${x} ${BASE} v-7`} />
            <path
              d={`M${x} ${top} L${x - h * 0.28} ${top + h * 0.5} H${x - h * 0.14} L${x - h * 0.4} ${BASE - 6} H${x + h * 0.4} L${x + h * 0.14} ${top + h * 0.5} H${x + h * 0.28} Z`}
              fill={PAPER}
            />
            <path d={`M${x + 2} ${top + h * 0.62} l${h * 0.16} ${h * 0.22} M${x + 3} ${top + h * 0.2} l${h * 0.1} ${h * 0.18}`} strokeWidth="1.1" />
          </g>
        )
      }
      return <g {...ink}>{[tree(84, 34), tree(110, 50), tree(136, 28)]}</g>
    }
    case 'grove': {
      const tree = (x: number, r: number) => (
        <g key={x}>
          <path d={`M${x} ${BASE} v-${r + 4}`} />
          <circle cx={x} cy={BASE - r * 2 - 2} r={r} fill={PAPER} />
          <path
            d={`M${x - r * 0.4} ${BASE - r * 2 + r * 0.3} q ${r * 0.3} ${-r * 0.4} ${r * 0.7} 0 M${x + r * 0.1} ${BASE - r * 2.5} q ${r * 0.25} ${-r * 0.2} ${r * 0.45} ${r * 0.1}`}
            strokeWidth="1.1"
          />
        </g>
      )
      return (
        <g {...ink}>
          {[tree(90, 12), tree(116, 16), tree(140, 10)]}
          <path d="M70 92 q4 -10 10 -6 q5 -6 10 2" fill={PAPER} />
        </g>
      )
    }
    case 'cottage':
      return (
        <g {...ink} fill={PAPER}>
          <path d="M120 58 v-10 h7 v16" />
          <path d="M123 42 q-4 -5 1 -9 q5 -4 1 -9" fill="none" strokeWidth="1.3" />
          <path d="M92 92 V70 H128 V92 Z" />
          <path d="M86 72 L110 50 L134 72 Z" fill={INK} />
          <path d="M106 92 v-12 h8 v12" />
          <path d="M96 76 h6 v6 h-6 z M118 76 h6 v6 h-6 z" />
        </g>
      )
    case 'lighthouse':
      return (
        <g {...ink} fill={PAPER}>
          <path d="M101 92 L105 50 H115 L119 92 Z" />
          <path d="M103.2 70 L116.8 70 L117.6 79 L102.4 79 Z" fill={INK} />
          <path d="M104.4 56 L115.6 56 L116.2 62 L103.8 62 Z" fill={INK} />
          <path d="M103 50 V41 H117 V50" />
          <path d="M101 41 L110 33 L119 41 Z" fill={INK} />
          <path d="M96 44 l-12 -4 M96 48 l-12 4 M124 44 l12 -4 M124 48 l12 4" strokeWidth="1.3" />
        </g>
      )
    case 'hills':
      return (
        <g {...ink} fill={PAPER}>
          <path d="M64 92 Q84 58 106 92 Z" />
          <path d="M92 92 Q120 46 150 92 Z" />
          <path d="M126 70 l8 18 M131 64 l9 22 M137 64 l7 18" strokeWidth="1.1" />
          <path d="M80 74 l5 12 M86 70 l4 12" strokeWidth="1.1" />
          <path d="M152 92 v-14 M146 80 h13 l3 3 l-3 3 h-13 z" />
        </g>
      )
  }
}

export const Island = memo(function Island({
  seed,
  pattern,
  finished = false,
  uncharted = false,
  delay = 0,
  className,
  children,
}: {
  /** Anything stable per book (its id). */
  seed: string
  pattern: string
  finished?: boolean
  /** A dashed, empty island: the "add a book" spot at the end of the trail. */
  uncharted?: boolean
  /** Seconds to offset the bobbing, so neighbours don't move in lockstep. */
  delay?: number
  className?: string
  children?: ReactNode
}) {
  const id = useId().replace(/:/g, '')
  const landmark = LANDMARK_BY_PATTERN[pattern] ?? 'grove'

  const geo = useMemo(() => {
    const s = hash(seed + pattern)
    const rnd = seeded(s)
    const top = blobPath(s, 184, 52, 9, 0.14)
    const tip = 104 + (rnd() - 0.5) * 36
    const depth = 160 + rnd() * 18
    const l = 124 + rnd() * 12
    const r = 124 + rnd() * 12
    const under =
      `M22 ${BASE + 8} C26 ${l} ${tip - 52} ${depth - 18} ${tip - 6} ${depth}` +
      ` C${tip - 2} ${depth + 6} ${tip + 6} ${depth + 4} ${tip + 10} ${depth - 6}` +
      ` C${tip + 44} ${depth - 24} 194 ${r} 198 ${BASE + 8} Z`
    const strata = [0.28, 0.5, 0.72].map((t) => {
      const y = BASE + 6 + (depth - BASE) * t
      const half = (1 - t) * 74
      return `M${(tip - half).toFixed(1)} ${y.toFixed(1)} q ${(half * 0.5).toFixed(1)} ${(3 + rnd() * 5).toFixed(1)} ${half.toFixed(1)} 0 t ${half.toFixed(1)} 0`
    })
    const hatch = Array.from({ length: 12 }, (_, k) => `M${(tip + 2 + k * 8).toFixed(1)} ${BASE + 4} l-16 ${depth - BASE}`)
    const tufts = Array.from({ length: 5 }, (_, k) => {
      const x = 44 + k * 32 + rnd() * 10
      const y = 106 + rnd() * 5
      return `M${x.toFixed(1)} ${y.toFixed(1)} l2 -5 l2 5 l2 -4 l2 4`
    })
    // short soil strokes on the visible rim between the grass top and the cliffs
    const rim = Array.from({ length: 9 }, (_, k) => {
      const x = 34 + k * 19 + rnd() * 6
      return `M${x.toFixed(1)} ${(BASE + 21 + rnd() * 3).toFixed(1)} v${(4 + rnd() * 4).toFixed(1)}`
    })
    return { top, under, strata, hatch, tufts, rim, tip, depth }
  }, [seed, pattern])

  return (
    <svg
      viewBox="0 0 220 190"
      className={`island${uncharted ? ' is-uncharted' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--bob-delay': `${-delay}s` } as CSSProperties}
      aria-hidden
    >
      <defs>
        <clipPath id={`${id}-under`}>
          <path d={geo.under} />
        </clipPath>
      </defs>

      <ellipse className="island-shadow" cx={geo.tip} cy="186" rx="40" ry="4" fill={INK} />

      <g className="island-float">
        {uncharted ? (
          <g fill="none" stroke={INK} strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round">
            <path d={geo.under} />
            <path d={geo.top} transform={`translate(18 ${BASE - 26 + 10})`} />
            <path d={geo.top} transform={`translate(18 ${BASE - 26})`} fill="var(--paper)" />
          </g>
        ) : (
          <>
            <path d={geo.under} fill={PAPER} {...ink} strokeWidth="2.4" />
            <g clipPath={`url(#${id}-under)`} {...ink}>
              <path d={geo.hatch.join(' ')} strokeWidth="1" />
              <path d={geo.strata.join(' ')} strokeWidth="1.4" fill="none" />
            </g>
            <path d={geo.top} transform={`translate(18 ${BASE - 26 + 10})`} fill={PAPER} {...ink} strokeWidth="2.4" />
            <path d={geo.rim.join(' ')} {...ink} strokeWidth="1.2" />
            <path d={geo.top} transform={`translate(18 ${BASE - 26})`} fill={PAPER} {...ink} strokeWidth="2.4" />
            <path d={geo.tufts.join(' ')} {...ink} strokeWidth="1.3" fill="none" />
            <g transform={`translate(110 ${BASE}) scale(1.22) translate(-110 -${BASE})`}>
              <Landmark kind={landmark} />
            </g>
            {finished && (
              <g {...ink}>
                <path d="M158 96 V46" strokeWidth="2.2" />
                <path d="M158 46 L184 53 L158 60 Z" fill={INK} />
                <path d="M163 53 l3 3 l6 -6" stroke={PAPER} strokeWidth="1.8" />
              </g>
            )}
          </>
        )}
        {children}
      </g>
    </svg>
  )
})
