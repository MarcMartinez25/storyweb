import { useStore } from '@xyflow/react'
import { memo, useId, useMemo } from 'react'
import { dotField } from '../../lib/shapes'

type Layer = { tile: number; count: number; seed: number; speed: number }

/** Layers of scattered dots that drift at different speeds as you pan, for a little depth. */
const LAYERS: Layer[] = [
  { tile: 420, count: 38, seed: 3, speed: 0.25 },
  { tile: 760, count: 26, seed: 8, speed: 0.5 },
  { tile: 1150, count: 14, seed: 13, speed: 0.8 },
]

function ParallaxDotsImpl() {
  const id = useId().replace(/:/g, '')
  const [tx, ty, zoom] = useStore((s) => s.transform)
  const layers = useMemo(() => LAYERS.map((l) => ({ ...l, dots: dotField(l.seed, l.tile, l.tile, l.count) })), [])

  return (
    <svg className="parallax-dots" aria-hidden>
      <defs>
        {layers.map((l, i) => (
          <pattern
            key={i}
            id={`${id}-${i}`}
            width={l.tile}
            height={l.tile}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${tx * l.speed} ${ty * l.speed}) scale(${0.7 + Math.min(zoom, 2) * 0.3 * l.speed})`}
          >
            {l.dots.map(([x, y, r], j) => (
              <circle key={j} cx={x} cy={y} r={r * (0.6 + l.speed * 0.5)} fill="#fff" opacity={0.3 + l.speed * 0.5} />
            ))}
          </pattern>
        ))}
      </defs>
      {layers.map((_, i) => (
        <rect key={i} width="100%" height="100%" fill={`url(#${id}-${i})`} />
      ))}
    </svg>
  )
}

export const ParallaxDots = memo(ParallaxDotsImpl)
