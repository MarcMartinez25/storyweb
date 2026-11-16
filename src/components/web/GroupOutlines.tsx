import { useNodes, useStore, ViewportPortal } from '@xyflow/react'
import { useId, useMemo } from 'react'
import type { StoryGroup } from '../../types'
import { groupOutline } from '../../lib/shapes'
import type { FlowNode } from './flowTypes'

/**
 * Draws each group as a hand-drawn outline around its members, behind the cards and lines,
 * plus a little name tab on the outline's top edge. Outlines follow cards as they're dragged.
 */
export function GroupOutlines({
  groups,
  selectedId,
  matches,
  onSelect,
}: {
  groups: StoryGroup[]
  selectedId: string | null
  /** Ids matching the current search, or null when not searching. */
  matches: Set<string> | null
  onSelect: (groupId: string) => void
}) {
  const id = useId().replace(/:/g, '')
  const nodes = useNodes<FlowNode>()
  const [tx, ty, zoom] = useStore((s) => s.transform)

  const outlines = useMemo(() => {
    return groups.flatMap((g) => {
      const members = nodes.filter((n) => n.data.node.groupId === g.id && n.measured?.width && n.measured?.height)
      if (members.length === 0) return []
      const shape = groupOutline(
        members.map((n) => ({ x: n.position.x, y: n.position.y, w: n.measured!.width!, h: n.measured!.height! })),
      )
      const dimmed = matches ? !members.some((n) => matches.has(n.id)) : false
      return [{ group: g, count: members.length, dimmed, ...shape }]
    })
  }, [groups, nodes, matches])

  if (outlines.length === 0) return null

  return (
    <>
      <svg className="group-outlines" aria-hidden>
        <defs>
          <pattern id={`${id}-hatch`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#fff" strokeWidth="1.3" opacity="0.2" />
          </pattern>
          <pattern id={`${id}-dots`} width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.4" fill="#fff" opacity="0.28" />
          </pattern>
          <pattern id={`${id}-grid`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#fff" strokeWidth="1" opacity="0.14" />
          </pattern>
        </defs>
        <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
          {outlines.map(({ group, path, dimmed }) => {
            const selected = group.id === selectedId
            const fill =
              group.style === 'hatch' || group.style === 'dots' || group.style === 'grid'
                ? `url(#${id}-${group.style})`
                : 'rgb(255 255 255 / 0.06)'
            return (
              <g key={group.id} opacity={dimmed ? 0.25 : 1}>
                <path d={path} fill={fill} />
                <path
                  d={path}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={selected ? 2.6 : 2}
                  strokeDasharray={selected ? undefined : '9 7'}
                  strokeLinecap="round"
                  opacity={selected ? 0.95 : 0.6}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </g>
      </svg>

      <ViewportPortal>
        {outlines.map(({ group, count, top, centerX, dimmed }) => (
          <button
            key={group.id}
            type="button"
            className={`group-tag nodrag nopan${group.id === selectedId ? ' is-selected' : ''}`}
            style={{ transform: `translate(${centerX}px, ${top}px) translate(-50%, -50%)`, opacity: dimmed ? 0.3 : 1 }}
            onClick={() => onSelect(group.id)}
            title="Open this group"
          >
            {group.name || 'Unnamed group'}
            <span className="group-tag-count">{count}</span>
          </button>
        ))}
      </ViewportPortal>
    </>
  )
}
