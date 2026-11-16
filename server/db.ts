import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
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
} from '../src/types.ts'
import { HttpError } from './validate.ts'

/**
 * Where the database lives:
 *  1. DATABASE_PATH if set
 *  2. inside a Railway volume, if one is attached
 *  3. ./data/storyweb.db for local development
 */
export function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return resolve(process.env.DATABASE_PATH)
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'storyweb.db')
  return resolve('data/storyweb.db')
}

/** Append-only. Each entry upgrades the schema by one version (tracked in PRAGMA user_version). */
const MIGRATIONS = [
  `
  CREATE TABLE books (
    id          TEXT PRIMARY KEY,
    title       TEXT    NOT NULL,
    author      TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'finished')),
    pattern     TEXT    NOT NULL DEFAULT 'ink',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE nodes (
    id          TEXT PRIMARY KEY,
    book_id     TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL CHECK (kind IN ('character', 'place')),
    name        TEXT    NOT NULL DEFAULT '',
    role        TEXT    NOT NULL DEFAULT '',
    first_seen  TEXT    NOT NULL DEFAULT '',
    notes       TEXT    NOT NULL DEFAULT '',
    mark        TEXT    NOT NULL DEFAULT 'solid',
    x           REAL    NOT NULL DEFAULT 0,
    y           REAL    NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX nodes_book ON nodes(book_id);

  CREATE TABLE links (
    id          TEXT PRIMARY KEY,
    book_id     TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    source      TEXT    NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target      TEXT    NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL DEFAULT 'other',
    label       TEXT    NOT NULL DEFAULT '',
    notes       TEXT    NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX links_book ON links(book_id);
  `,
  // v2: groups (gangs, families, factions…). A card belongs to at most one; deleting a group just ungroups.
  `
  CREATE TABLE node_groups (
    id          TEXT PRIMARY KEY,
    book_id     TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL DEFAULT '',
    notes       TEXT    NOT NULL DEFAULT '',
    style       TEXT    NOT NULL DEFAULT 'soft',
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX node_groups_book ON node_groups(book_id);
  ALTER TABLE nodes ADD COLUMN group_id TEXT REFERENCES node_groups(id) ON DELETE SET NULL;
  `,
]

export function openDb(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')

  const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number }
  for (let v = version; v < MIGRATIONS.length; v++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
    })
  }
  return db
}

function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Row <-> model mapping
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

const toBook = (r: Row): Book => ({
  id: r.id as string,
  title: r.title as string,
  author: r.author as string,
  status: r.status as Book['status'],
  pattern: r.pattern as string,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  nodes: [],
  links: [],
  groups: [],
})

const toNode = (r: Row): StoryNode => ({
  id: r.id as string,
  kind: r.kind as StoryNode['kind'],
  name: r.name as string,
  role: r.role as string,
  firstSeen: r.first_seen as string,
  notes: r.notes as string,
  mark: r.mark as string,
  groupId: (r.group_id as string | null) ?? null,
  position: { x: Number(r.x), y: Number(r.y) },
  createdAt: Number(r.created_at),
})

const toGroup = (r: Row): StoryGroup => ({
  id: r.id as string,
  name: r.name as string,
  notes: r.notes as string,
  style: r.style as string,
  createdAt: Number(r.created_at),
})

const toLink = (r: Row): StoryLink => ({
  id: r.id as string,
  source: r.source as string,
  target: r.target as string,
  kind: r.kind as StoryLink['kind'],
  label: r.label as string,
  notes: r.notes as string,
  createdAt: Number(r.created_at),
})

/** Turn a validated patch into `col = $col` assignments using a whitelist of columns. */
function setClause(patch: Record<string, unknown>, columns: Record<string, string>) {
  const sets: string[] = []
  const params: Record<string, SQLInputValue> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'position') {
      const p = value as { x: number; y: number }
      sets.push('x = $x', 'y = $y')
      params.x = p.x
      params.y = p.y
    } else if (columns[key]) {
      sets.push(`${columns[key]} = $${key}`)
      params[key] = value as SQLInputValue
    }
  }
  return { sql: sets.join(', '), params }
}

const BOOK_COLUMNS = { title: 'title', author: 'author', status: 'status', pattern: 'pattern' }
const NODE_COLUMNS = {
  kind: 'kind',
  name: 'name',
  role: 'role',
  firstSeen: 'first_seen',
  notes: 'notes',
  mark: 'mark',
  groupId: 'group_id',
}
const GROUP_COLUMNS = { name: 'name', notes: 'notes', style: 'style' }
const LINK_COLUMNS = { kind: 'kind', label: 'label', notes: 'notes' }

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type Store = ReturnType<typeof createStore>

export function createStore(db: DatabaseSync) {
  const insertBookStmt = db.prepare(
    `INSERT INTO books (id, title, author, status, pattern, created_at, updated_at)
     VALUES ($id, $title, $author, $status, $pattern, $createdAt, $updatedAt)`,
  )
  const insertNodeStmt = db.prepare(
    `INSERT INTO nodes (id, book_id, kind, name, role, first_seen, notes, mark, group_id, x, y, created_at)
     VALUES ($id, $bookId, $kind, $name, $role, $firstSeen, $notes, $mark, $groupId, $x, $y, $createdAt)`,
  )
  const insertGroupStmt = db.prepare(
    `INSERT INTO node_groups (id, book_id, name, notes, style, created_at)
     VALUES ($id, $bookId, $name, $notes, $style, $createdAt)`,
  )
  const insertLinkStmt = db.prepare(
    `INSERT INTO links (id, book_id, source, target, kind, label, notes, created_at)
     VALUES ($id, $bookId, $source, $target, $kind, $label, $notes, $createdAt)`,
  )
  const touchBook = db.prepare('UPDATE books SET updated_at = $now WHERE id = $id')

  const requireBook = (bookId: string) => {
    if (!db.prepare('SELECT 1 FROM books WHERE id = ?').get(bookId)) throw new HttpError(404, 'book not found')
  }

  const bookOf = (table: 'nodes' | 'links' | 'node_groups', id: string) => {
    const row = db.prepare(`SELECT book_id FROM ${table} WHERE id = ?`).get(id) as { book_id: string } | undefined
    if (!row) throw new HttpError(404, `${{ nodes: 'node', links: 'link', node_groups: 'group' }[table]} not found`)
    return row.book_id
  }

  /** A card can only join a group from its own book. */
  const requireGroupInBook = (groupId: string | null | undefined, bookId: string) => {
    if (!groupId) return
    if (!db.prepare('SELECT 1 FROM node_groups WHERE id = ? AND book_id = ?').get(groupId, bookId)) {
      throw new HttpError(400, 'group must belong to the same book')
    }
  }

  function insertGroup(bookId: string, g: StoryGroup) {
    insertGroupStmt.run({ id: g.id, bookId, name: g.name, notes: g.notes, style: g.style, createdAt: g.createdAt })
  }

  function insertBook(b: Book) {
    insertBookStmt.run({
      id: b.id,
      title: b.title,
      author: b.author,
      status: b.status,
      pattern: b.pattern,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })
  }

  function insertNode(bookId: string, n: StoryNode) {
    requireGroupInBook(n.groupId, bookId)
    insertNodeStmt.run({
      id: n.id,
      bookId,
      kind: n.kind,
      name: n.name,
      role: n.role,
      firstSeen: n.firstSeen,
      notes: n.notes,
      mark: n.mark,
      groupId: n.groupId,
      x: n.position.x,
      y: n.position.y,
      createdAt: n.createdAt,
    })
  }

  function insertLink(bookId: string, l: StoryLink) {
    // Both ends must belong to the same book.
    const ends = db
      .prepare('SELECT COUNT(*) AS n FROM nodes WHERE book_id = ? AND id IN (?, ?)')
      .get(bookId, l.source, l.target) as { n: number }
    if (Number(ends.n) !== 2) throw new HttpError(400, 'both ends must be on this book’s web')
    insertLinkStmt.run({
      id: l.id,
      bookId,
      source: l.source,
      target: l.target,
      kind: l.kind,
      label: l.label,
      notes: l.notes,
      createdAt: l.createdAt,
    })
  }

  return {
    library(): LibraryData {
      const books = (db.prepare('SELECT * FROM books ORDER BY created_at').all() as Row[]).map(toBook)
      const byId = new Map(books.map((b) => [b.id, b]))
      for (const r of db.prepare('SELECT * FROM nodes ORDER BY created_at').all() as Row[]) {
        byId.get(r.book_id as string)?.nodes.push(toNode(r))
      }
      for (const r of db.prepare('SELECT * FROM links ORDER BY created_at').all() as Row[]) {
        byId.get(r.book_id as string)?.links.push(toLink(r))
      }
      for (const r of db.prepare('SELECT * FROM node_groups ORDER BY created_at').all() as Row[]) {
        byId.get(r.book_id as string)?.groups.push(toGroup(r))
      }
      return { version: 1, books }
    },

    createBook(b: Book) {
      transaction(db, () => {
        insertBook(b)
        for (const g of b.groups) insertGroup(b.id, g)
        for (const n of b.nodes) insertNode(b.id, n)
        for (const l of b.links) insertLink(b.id, l)
      })
    },

    updateBook(id: string, patch: BookPatch) {
      const { sql, params } = setClause(patch, BOOK_COLUMNS)
      const res = db
        .prepare(`UPDATE books SET ${sql}, updated_at = $now WHERE id = $id`)
        .run({ ...params, now: Date.now(), id })
      if (res.changes === 0) throw new HttpError(404, 'book not found')
    },

    deleteBook(id: string) {
      db.prepare('DELETE FROM books WHERE id = ?').run(id)
    },

    createNode(bookId: string, n: StoryNode) {
      requireBook(bookId)
      transaction(db, () => {
        insertNode(bookId, n)
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    updateNode(id: string, patch: NodePatch) {
      const bookId = bookOf('nodes', id)
      requireGroupInBook(patch.groupId, bookId)
      const { sql, params } = setClause(patch, NODE_COLUMNS)
      transaction(db, () => {
        db.prepare(`UPDATE nodes SET ${sql} WHERE id = $id`).run({ ...params, id })
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    deleteNode(id: string) {
      const row = db.prepare('SELECT book_id FROM nodes WHERE id = ?').get(id) as { book_id: string } | undefined
      if (!row) return // already gone: deleting is idempotent
      transaction(db, () => {
        db.prepare('DELETE FROM nodes WHERE id = ?').run(id) // links cascade
        touchBook.run({ now: Date.now(), id: row.book_id })
      })
    },

    createGroup(bookId: string, g: StoryGroup) {
      requireBook(bookId)
      transaction(db, () => {
        insertGroup(bookId, g)
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    updateGroup(id: string, patch: GroupPatch) {
      const bookId = bookOf('node_groups', id)
      const { sql, params } = setClause(patch, GROUP_COLUMNS)
      transaction(db, () => {
        db.prepare(`UPDATE node_groups SET ${sql} WHERE id = $id`).run({ ...params, id })
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    /** Members stay on the web; their group_id is cleared by the foreign key. */
    deleteGroup(id: string) {
      db.prepare('DELETE FROM node_groups WHERE id = ?').run(id)
    },

    createLink(bookId: string, l: StoryLink) {
      requireBook(bookId)
      transaction(db, () => {
        insertLink(bookId, l)
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    updateLink(id: string, patch: LinkPatch) {
      const bookId = bookOf('links', id)
      const { sql, params } = setClause(patch, LINK_COLUMNS)
      transaction(db, () => {
        db.prepare(`UPDATE links SET ${sql} WHERE id = $id`).run({ ...params, id })
        touchBook.run({ now: Date.now(), id: bookId })
      })
    },

    deleteLink(id: string) {
      db.prepare('DELETE FROM links WHERE id = ?').run(id)
    },

    /** Used by "Import backup": swap the whole library atomically. */
    replaceAll(data: LibraryData) {
      transaction(db, () => {
        db.exec('DELETE FROM books') // cascades to nodes and links
        for (const b of data.books) {
          insertBook(b)
          for (const g of b.groups) insertGroup(b.id, g)
          for (const n of b.nodes) insertNode(b.id, n)
          for (const l of b.links) insertLink(b.id, l)
        }
      })
    },
  }
}
