// Shared by the React app and the API server (server imports this file directly),
// so keep it free of imports.

export const NODE_KINDS = ['character', 'place'] as const
export type NodeKind = (typeof NODE_KINDS)[number]

export const LINK_KIND_IDS = [
  'family',
  'romance',
  'friend',
  'ally',
  'mentor',
  'work',
  'rival',
  'enemy',
  'place',
  'other',
] as const
export type LinkKind = (typeof LINK_KIND_IDS)[number]

export const BOOK_STATUSES = ['reading', 'finished'] as const
export type BookStatus = (typeof BOOK_STATUSES)[number]

export interface XY {
  x: number
  y: number
}

/** A character or a place living on a book's web. */
export interface StoryNode {
  id: string
  kind: NodeKind
  name: string
  /** Short descriptor: "the innkeeper's daughter", "castle", "protagonist". */
  role: string
  /** Where you first met them, e.g. "Ch. 3" or "p. 112". */
  firstSeen: string
  notes: string
  /** Ink style of the avatar: solid, outline, dots, stripes, hatch, half. */
  mark: string
  position: XY
  createdAt: number
}

/** How two nodes are connected. */
export interface StoryLink {
  id: string
  source: string
  target: string
  kind: LinkKind
  /** Free text, e.g. "older sister", "sworn enemies", "grew up here". */
  label: string
  notes: string
  createdAt: number
}

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
  /** Cover pattern: ink, stripes, dots, checks, waves, grid. */
  pattern: string
  createdAt: number
  updatedAt: number
  nodes: StoryNode[]
  links: StoryLink[]
}

export interface LibraryData {
  version: 1
  books: Book[]
}

export type BookPatch = Partial<Pick<Book, 'title' | 'author' | 'status' | 'pattern'>>
export type NodePatch = Partial<Omit<StoryNode, 'id' | 'createdAt'>>
export type LinkPatch = Partial<Omit<StoryLink, 'id' | 'createdAt' | 'source' | 'target'>>
