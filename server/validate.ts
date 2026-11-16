import {
  BOOK_STATUSES,
  LINK_KIND_IDS,
  NODE_KINDS,
  type Book,
  type BookPatch,
  type LibraryData,
  type LinkPatch,
  type NodePatch,
  type StoryLink,
  type StoryNode,
} from '../src/types.ts'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function obj(v: unknown, what: string): Obj {
  if (!isObj(v)) throw new HttpError(400, `${what} must be an object`)
  return v
}

function text(v: unknown, field: string, max: number, fallback?: string): string {
  if (v === undefined && fallback !== undefined) return fallback
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`)
  if (v.length > max) throw new HttpError(400, `${field} is too long (max ${max})`)
  return v
}

function id(v: unknown, field = 'id'): string {
  const s = text(v, field, 64)
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw new HttpError(400, `${field} is not a valid id`)
  return s
}

function oneOf<T extends string>(v: unknown, list: readonly T[], field: string, fallback?: T): T {
  if (v === undefined && fallback !== undefined) return fallback
  if (typeof v !== 'string' || !(list as readonly string[]).includes(v)) {
    throw new HttpError(400, `${field} must be one of: ${list.join(', ')}`)
  }
  return v as T
}

function num(v: unknown, field: string, fallback?: number): number {
  if (v === undefined && fallback !== undefined) return fallback
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new HttpError(400, `${field} must be a number`)
  return v
}

function position(v: unknown) {
  const p = obj(v, 'position')
  return { x: num(p.x, 'position.x'), y: num(p.y, 'position.y') }
}

/** Copy only the keys the client actually sent, validating each one. */
function patchOf<T>(body: unknown, fields: { [K in keyof T]-?: (v: unknown) => T[K] }): T {
  const b = obj(body, 'patch')
  const out: Partial<T> = {}
  for (const key of Object.keys(fields) as (keyof T)[]) {
    if (b[key as string] !== undefined) out[key] = fields[key](b[key as string])
  }
  if (Object.keys(out).length === 0) throw new HttpError(400, 'nothing to update')
  return out as T
}

const LIMITS = { title: 300, name: 200, short: 300, notes: 20_000, style: 32 }

export function parseNode(body: unknown): StoryNode {
  const b = obj(body, 'node')
  const now = Date.now()
  return {
    id: id(b.id),
    kind: oneOf(b.kind, NODE_KINDS, 'kind'),
    name: text(b.name, 'name', LIMITS.name, ''),
    role: text(b.role, 'role', LIMITS.short, ''),
    firstSeen: text(b.firstSeen, 'firstSeen', LIMITS.short, ''),
    notes: text(b.notes, 'notes', LIMITS.notes, ''),
    mark: text(b.mark, 'mark', LIMITS.style, 'solid'),
    position: b.position === undefined ? { x: 0, y: 0 } : position(b.position),
    createdAt: num(b.createdAt, 'createdAt', now),
  }
}

export function parseNodePatch(body: unknown): NodePatch {
  return patchOf<NodePatch>(body, {
    kind: (v) => oneOf(v, NODE_KINDS, 'kind'),
    name: (v) => text(v, 'name', LIMITS.name),
    role: (v) => text(v, 'role', LIMITS.short),
    firstSeen: (v) => text(v, 'firstSeen', LIMITS.short),
    notes: (v) => text(v, 'notes', LIMITS.notes),
    mark: (v) => text(v, 'mark', LIMITS.style),
    position,
  })
}

export function parseLink(body: unknown): StoryLink {
  const b = obj(body, 'link')
  const link: StoryLink = {
    id: id(b.id),
    source: id(b.source, 'source'),
    target: id(b.target, 'target'),
    kind: oneOf(b.kind, LINK_KIND_IDS, 'kind', 'other'),
    label: text(b.label, 'label', LIMITS.short, ''),
    notes: text(b.notes, 'notes', LIMITS.notes, ''),
    createdAt: num(b.createdAt, 'createdAt', Date.now()),
  }
  if (link.source === link.target) throw new HttpError(400, 'a connection needs two different ends')
  return link
}

export function parseLinkPatch(body: unknown): LinkPatch {
  return patchOf<LinkPatch>(body, {
    kind: (v) => oneOf(v, LINK_KIND_IDS, 'kind'),
    label: (v) => text(v, 'label', LIMITS.short),
    notes: (v) => text(v, 'notes', LIMITS.notes),
  })
}

export function parseBook(body: unknown): Book {
  const b = obj(body, 'book')
  const now = Date.now()
  const nodes = b.nodes === undefined ? [] : arr(b.nodes, 'nodes').map(parseNode)
  const links = b.links === undefined ? [] : arr(b.links, 'links').map(parseLink)
  return {
    id: id(b.id),
    title: text(b.title, 'title', LIMITS.title).trim() || 'Untitled',
    author: text(b.author, 'author', LIMITS.title, ''),
    status: oneOf(b.status, BOOK_STATUSES, 'status', 'reading'),
    pattern: text(b.pattern, 'pattern', LIMITS.style, 'ink'),
    createdAt: num(b.createdAt, 'createdAt', now),
    updatedAt: num(b.updatedAt, 'updatedAt', now),
    nodes,
    links,
  }
}

export function parseBookPatch(body: unknown): BookPatch {
  return patchOf<BookPatch>(body, {
    title: (v) => text(v, 'title', LIMITS.title),
    author: (v) => text(v, 'author', LIMITS.title),
    status: (v) => oneOf(v, BOOK_STATUSES, 'status'),
    pattern: (v) => text(v, 'pattern', LIMITS.style),
  })
}

export function parseLibrary(body: unknown): LibraryData {
  const b = obj(body, 'library')
  if (b.version !== 1) throw new HttpError(400, 'unsupported backup version')
  return { version: 1, books: arr(b.books, 'books').map(parseBook) }
}

function arr(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new HttpError(400, `${field} must be an array`)
  return v
}
