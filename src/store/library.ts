import { createContext, useContext } from 'react'
import type {
  Book,
  BookPatch,
  GroupPatch,
  LibraryData,
  LinkPatch,
  NodePatch,
  StoryGroup,
  StoryLink,
  StoryNode,
} from '../types'
import type { SaveStatus } from '../lib/sync'

export type { BookPatch, GroupPatch, LinkPatch, NodePatch }

export type Action =
  | { type: 'hydrate'; data: LibraryData }
  | { type: 'addBook'; book: Book }
  | { type: 'updateBook'; id: string; patch: BookPatch }
  | { type: 'deleteBook'; id: string }
  | { type: 'addNode'; bookId: string; node: StoryNode }
  | { type: 'updateNode'; bookId: string; id: string; patch: NodePatch }
  | { type: 'deleteNode'; bookId: string; id: string }
  | { type: 'addLink'; bookId: string; link: StoryLink }
  | { type: 'updateLink'; bookId: string; id: string; patch: LinkPatch }
  | { type: 'deleteLink'; bookId: string; id: string }
  | { type: 'addGroup'; bookId: string; group: StoryGroup }
  | { type: 'updateGroup'; bookId: string; id: string; patch: GroupPatch }
  | { type: 'deleteGroup'; bookId: string; id: string }

function withBook(state: LibraryData, bookId: string, fn: (book: Book) => Book): LibraryData {
  return {
    ...state,
    books: state.books.map((b) => (b.id === bookId ? { ...fn(b), updatedAt: Date.now() } : b)),
  }
}

export function libraryReducer(state: LibraryData, action: Action): LibraryData {
  switch (action.type) {
    case 'hydrate':
      return action.data
    case 'addBook':
      return { ...state, books: [...state.books, action.book] }
    case 'updateBook':
      return withBook(state, action.id, (b) => ({ ...b, ...action.patch }))
    case 'deleteBook':
      return { ...state, books: state.books.filter((b) => b.id !== action.id) }
    case 'addNode':
      return withBook(state, action.bookId, (b) => ({ ...b, nodes: [...b.nodes, action.node] }))
    case 'updateNode':
      return withBook(state, action.bookId, (b) => ({
        ...b,
        nodes: b.nodes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
      }))
    case 'deleteNode':
      return withBook(state, action.bookId, (b) => ({
        ...b,
        nodes: b.nodes.filter((n) => n.id !== action.id),
        links: b.links.filter((l) => l.source !== action.id && l.target !== action.id),
      }))
    case 'addLink':
      return withBook(state, action.bookId, (b) => ({ ...b, links: [...b.links, action.link] }))
    case 'updateLink':
      return withBook(state, action.bookId, (b) => ({
        ...b,
        links: b.links.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      }))
    case 'deleteLink':
      return withBook(state, action.bookId, (b) => ({
        ...b,
        links: b.links.filter((l) => l.id !== action.id),
      }))
    case 'addGroup':
      return withBook(state, action.bookId, (b) => ({ ...b, groups: [...b.groups, action.group] }))
    case 'updateGroup':
      return withBook(state, action.bookId, (b) => ({
        ...b,
        groups: b.groups.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      }))
    case 'deleteGroup':
      // Members stay on the web, just ungrouped (the server does the same).
      return withBook(state, action.bookId, (b) => ({
        ...b,
        groups: b.groups.filter((g) => g.id !== action.id),
        nodes: b.nodes.map((n) => (n.groupId === action.id ? { ...n, groupId: null } : n)),
      }))
  }
}

export function isLibraryData(value: unknown): value is LibraryData {
  if (!value || typeof value !== 'object') return false
  const v = value as { version?: unknown; books?: unknown }
  return (
    v.version === 1 &&
    Array.isArray(v.books) &&
    v.books.every(
      (b) =>
        b && typeof b === 'object' && typeof b.id === 'string' && Array.isArray(b.nodes) && Array.isArray(b.links),
    )
  )
}

export type LoadState = 'loading' | 'ready' | 'error'

export interface LibraryContextValue {
  state: LibraryData
  dispatch: (action: Action) => void
  loadState: LoadState
  saveStatus: SaveStatus
  retryLoad: () => void
}

export const LibraryContext = createContext<LibraryContextValue | null>(null)

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>')
  return ctx
}
