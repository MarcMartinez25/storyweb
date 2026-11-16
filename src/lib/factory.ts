import type { Book, LinkKind, NodeKind, StoryLink, StoryNode, XY } from '../types'
import { BOOK_PATTERNS, NODE_MARKS } from './constants'

export const uid = () => crypto.randomUUID()

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export function createBook(title: string, author: string): Book {
  const now = Date.now()
  return {
    id: uid(),
    title: title.trim(),
    author: author.trim(),
    status: 'reading',
    pattern: pick(BOOK_PATTERNS),
    createdAt: now,
    updatedAt: now,
    nodes: [],
    links: [],
  }
}

export function createNode(kind: NodeKind, position: XY, fields: Partial<StoryNode> = {}): StoryNode {
  return {
    id: uid(),
    kind,
    name: '',
    role: '',
    firstSeen: '',
    notes: '',
    mark: kind === 'place' ? 'outline' : pick(NODE_MARKS),
    position,
    createdAt: Date.now(),
    ...fields,
  }
}

export function createLink(
  source: string,
  target: string,
  kind: LinkKind = 'other',
  label = '',
  notes = '',
): StoryLink {
  return { id: uid(), source, target, kind, label, notes, createdAt: Date.now() }
}

/**
 * Find a spot near `near` that isn't on top of an existing card.
 * Tries rings of candidate points (closest ring first) starting at a random angle.
 */
export function findOpenSpot(near: XY, existing: XY[], radii = [0, 220, 340, 460]): XY {
  const roomy = 140 // in "card-shaped" units: cards are much wider than tall
  const distance = (p: XY) =>
    existing.length === 0
      ? Infinity
      : Math.min(...existing.map((e) => Math.hypot((e.x - p.x) / 1.6, e.y - p.y)))

  let best = near
  let bestDistance = -1
  const start = Math.random() * Math.PI * 2
  for (const r of radii) {
    const steps = r === 0 ? 1 : 14
    for (let i = 0; i < steps; i++) {
      const a = start + (i / steps) * Math.PI * 2
      const p = { x: near.x + Math.cos(a) * r * 1.3, y: near.y + Math.sin(a) * r * 0.8 }
      const d = distance(p)
      if (d >= roomy) return p
      if (d > bestDistance) {
        bestDistance = d
        best = p
      }
    }
  }
  return best
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  // Skip honorifics so "Mr. Darcy" becomes "D", not "MD".
  const meaningful = parts.filter((p) => !/^(mr|mrs|ms|miss|dr|sir|lady|lord)\.?$/i.test(p))
  const use = meaningful.length ? meaningful : parts
  const first = use[0][0] ?? ''
  const last = use.length > 1 ? use[use.length - 1][0] : ''
  return (first + last).toUpperCase()
}
