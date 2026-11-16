import { useNodes, ViewportPortal } from '@xyflow/react'
import type { ReactNode } from 'react'
import type { FlowNode } from './flowTypes'
import { cardBounds, TITLE_GAP } from './titleLayout'

/**
 * The book's title, written on the map just above the web. It pans and zooms with the cards
 * and moves up if a card is dragged above it, so it never sits underneath anything.
 */
export function MapTitle({ children }: { children: ReactNode }) {
  const nodes = useNodes<FlowNode>()
  const bounds = cardBounds(nodes)
  if (!bounds) return null
  const x = bounds.x + bounds.width / 2
  const y = bounds.y - TITLE_GAP
  return (
    <ViewportPortal>
      <div className="map-title" style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -100%)` }}>
        {children}
      </div>
    </ViewportPortal>
  )
}
