import type { Edge, Node } from '@xyflow/react'
import type { StoryLink, StoryNode } from '../../types'

export type StoryNodeData = {
  node: StoryNode
  linkCount: number
  dimmed: boolean
}

export type LinkEdgeData = {
  link: StoryLink
  dimmed: boolean
  onSelect: (id: string) => void
}

export type FlowNode = Node<StoryNodeData, 'story'>
export type FlowEdge = Edge<LinkEdgeData, 'floating'>

export type Selection = { type: 'node' | 'link'; id: string } | null
