import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { initials } from '../../lib/factory'
import { PinIcon } from '../Icons'
import type { FlowNode } from './flowTypes'

function StoryNodeCardImpl({ data, selected }: NodeProps<FlowNode>) {
  const { node, dimmed } = data
  const isPlace = node.kind === 'place'
  const classes = ['story-node', node.kind, selected && 'is-selected', dimmed && 'is-dimmed'].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {/* Invisible anchor so edges can attach; edges are drawn "floating" to the nearest side. */}
      <Handle type="target" position={Position.Left} className="node-anchor" isConnectable={false} />
      <div className={`node-avatar${isPlace ? '' : ` mark-${node.mark}`}`}>
        {isPlace ? <PinIcon width={18} height={18} /> : <span>{initials(node.name)}</span>}
      </div>
      <div className="node-text">
        <div className="node-name">{node.name || (isPlace ? 'Unnamed place' : 'Unnamed character')}</div>
        {node.role && <div className="node-role">{node.role}</div>}
      </div>
      {node.firstSeen && <span className="node-chip">{node.firstSeen}</span>}
      <Handle type="source" position={Position.Right} className="node-knob" title="Drag to another card to connect" />
    </div>
  )
}

export const StoryNodeCard = memo(StoryNodeCardImpl)
