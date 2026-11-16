import type { Rect } from '@xyflow/react'
import type { FlowNode } from './flowTypes'

/**
 * Space kept between the top-most card and the title: room for a group outline's padding
 * and its name tab, plus a little air.
 */
export const TITLE_GAP = 96
/** Rough height of the title block, so fit-view can leave room for it. */
export const TITLE_HEIGHT = 120

/** Bounds of all measured cards in map coordinates, or null if none are measured yet. */
export function cardBounds(nodes: FlowNode[]): Rect | null {
  const measured = nodes.filter((n) => n.measured?.width && n.measured?.height)
  if (measured.length === 0) return null
  const minX = Math.min(...measured.map((n) => n.position.x))
  const minY = Math.min(...measured.map((n) => n.position.y))
  const maxX = Math.max(...measured.map((n) => n.position.x + n.measured!.width!))
  const maxY = Math.max(...measured.map((n) => n.position.y + n.measured!.height!))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
