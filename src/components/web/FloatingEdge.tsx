import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react'
import { LINK_KINDS } from '../../lib/constants'
import type { FlowEdge } from './flowTypes'

type Box = { cx: number; cy: number; hw: number; hh: number }

function box(node: InternalNode): Box | null {
  const w = node.measured.width
  const h = node.measured.height
  if (!w || !h) return null
  const { x, y } = node.internals.positionAbsolute
  return { cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2 }
}

/** Point where the line from this box's centre towards (tx, ty) leaves the box. */
function exitPoint(b: Box, tx: number, ty: number, gap = 4) {
  const dx = tx - b.cx
  const dy = ty - b.cy
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy }
  const sx = dx === 0 ? Infinity : (b.hw + gap) / Math.abs(dx)
  const sy = dy === 0 ? Infinity : (b.hh + gap) / Math.abs(dy)
  const s = Math.min(sx, sy)
  return { x: b.cx + dx * s, y: b.cy + dy * s }
}

export function FloatingEdge({ id, source, target, data, selected }: EdgeProps<FlowEdge>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode || !targetNode || !data) return null

  const a = box(sourceNode)
  const b = box(targetNode)
  if (!a || !b) return null

  const from = exitPoint(a, b.cx, b.cy)
  const to = exitPoint(b, a.cx, a.cy)
  const [path, labelX, labelY] = getStraightPath({ sourceX: from.x, sourceY: from.y, targetX: to.x, targetY: to.y })

  const { link, dimmed, onSelect } = data
  const kind = LINK_KINDS[link.kind] ?? LINK_KINDS.other
  const opacity = dimmed ? 0.12 : 1

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        style={{
          stroke: '#fff',
          strokeWidth: kind.width + (selected ? 1.2 : 0),
          strokeDasharray: kind.dash,
          strokeLinecap: 'round',
          opacity: opacity * (selected ? 1 : 0.78),
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`edge-label nodrag nopan${selected ? ' is-selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, opacity }}
          onClick={() => onSelect(link.id)}
        >
          {link.label || kind.label}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
