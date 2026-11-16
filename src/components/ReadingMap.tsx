import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Book } from '../types'
import { BOOK_PATTERNS } from '../lib/constants'
import { createBook } from '../lib/factory'
import { smoothPath } from '../lib/shapes'
import { bookHref, navigate } from '../lib/useHashRoute'
import { useLibrary } from '../store/library'
import { ConfirmButton } from './ConfirmButton'
import { PlusIcon } from './Icons'
import { Island } from './Island'

/*
 * The shelf as a level-select map: one island per book, in the order you started them,
 * joined by a dotted trail that snakes back and forth across the page.
 */

const ITEM_W = 250 // width of one stop (island + name plate)
const ISLAND_CY = 96 // where the island's top surface sits inside a stop, i.e. where the trail passes
const ROW_H = 390
const MIN_CELL = 280

type Pt = { x: number; y: number }

function layout(width: number, count: number) {
  const cols = Math.max(1, Math.min(4, Math.floor(width / MIN_CELL)))
  const cellW = width / cols
  const sway = Math.min(56, width * 0.13) // single-column zig-zag

  const stops: Pt[] = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols)
    const k = i % cols
    const col = row % 2 === 0 ? k : cols - 1 - k
    const x = cols === 1 ? width / 2 + (i % 2 === 0 ? -sway : sway) : cellW * (col + 0.5)
    const wobble = (((i * 37) % 3) - 1) * 24 // a little up-and-down so rows don't look ruled
    return { x, y: row * ROW_H + 90 + wobble }
  })

  // Trail: through each island, swinging out past the side of the page at row turns
  // so it never cuts through a name plate.
  const trail: Pt[] = []
  stops.forEach((p, i) => {
    trail.push(p)
    const next = stops[i + 1]
    if (!next) return
    const sameRow = cols > 1 && Math.floor(i / cols) === Math.floor((i + 1) / cols)
    if (sameRow) return
    const side = cols === 1 ? Math.sign(next.x - p.x) || 1 : p.x > width / 2 ? 1 : -1
    const edgeX = side > 0 ? width - 14 : 14
    const outX = cols === 1 ? edgeX : Math.min(width - 14, Math.max(14, p.x + side * (cellW / 2 - 6)))
    trail.push({ x: outX, y: p.y + ROW_H * 0.52 })
  })

  const rows = Math.ceil(count / cols)
  return { stops, trail: smoothPath(trail), height: rows * ROW_H }
}

export function ReadingMap({
  books,
  adding,
  onAddingChange,
}: {
  books: Book[]
  adding: boolean
  onAddingChange: (open: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const count = books.length + 1 // + the uncharted island
  const map = useMemo(() => layout(width, count), [width, count])
  const place = (i: number) => ({ left: map.stops[i].x - ITEM_W / 2, top: map.stops[i].y - ISLAND_CY, width: ITEM_W })

  return (
    <div className="reading-map" ref={ref} style={{ height: map.height + (adding ? 120 : 0) }}>
      {width > 0 && (
        <>
          <svg className="map-trail" width={width} height={map.height} aria-hidden>
            <path d={map.trail} />
          </svg>
          {books.map((b, i) => (
            <IslandStop key={b.id} book={b} level={i + 1} style={place(i)} />
          ))}
          <NewIslandStop open={adding} onOpenChange={onAddingChange} style={place(books.length)} />
        </>
      )}
    </div>
  )
}

function IslandStop({ book, level, style }: { book: Book; level: number; style: CSSProperties }) {
  const { dispatch } = useLibrary()
  const characters = book.nodes.filter((n) => n.kind === 'character').length
  const places = book.nodes.length - characters
  const finished = book.status === 'finished'
  const nextPattern = BOOK_PATTERNS[(BOOK_PATTERNS.indexOf(book.pattern) + 1) % BOOK_PATTERNS.length]

  return (
    <article className={`island-stop${finished ? ' is-finished' : ''}`} style={style}>
      <a className="island-link" href={bookHref(book.id)}>
        <span className="level-badge" aria-label={`Island ${level}`}>
          {level}
        </span>
        <Island seed={book.id} pattern={book.pattern} finished={finished} delay={(level * 0.9) % 4} />
        <span className="name-plate">
          <span className="plate-title">{book.title || 'Untitled'}</span>
          {book.author && <span className="plate-author">{book.author}</span>}
        </span>
      </a>
      <div className="stop-meta">
        <span>
          {characters} {characters === 1 ? 'character' : 'characters'} · {places} {places === 1 ? 'place' : 'places'}
        </span>
        <div className="stop-actions">
          <button
            type="button"
            className="text-btn"
            onClick={() =>
              dispatch({ type: 'updateBook', id: book.id, patch: { status: finished ? 'reading' : 'finished' } })
            }
          >
            {finished ? 'Reading again' : 'Finished it'}
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => dispatch({ type: 'updateBook', id: book.id, patch: { pattern: nextPattern } })}
          >
            New island
          </button>
          <ConfirmButton
            className="text-btn danger"
            prompt="Sink this island and its whole web?"
            onConfirm={() => dispatch({ type: 'deleteBook', id: book.id })}
          >
            Remove
          </ConfirmButton>
        </div>
      </div>
    </article>
  )
}

function NewIslandStop({
  open,
  onOpenChange,
  style,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  style: CSSProperties
}) {
  const { dispatch } = useLibrary()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const book = createBook(title, author)
    dispatch({ type: 'addBook', book })
    navigate(bookHref(book.id))
  }

  return (
    <article className="island-stop is-new" style={style}>
      <button type="button" className="island-link" onClick={() => onOpenChange(true)} disabled={open}>
        <Island seed="uncharted" pattern="dots" uncharted />
        <span className="uncharted-plus">
          <PlusIcon width={26} height={26} />
        </span>
        {!open && (
          <span className="name-plate is-dashed">
            <span className="plate-title">Add a book</span>
            <span className="plate-author">uncharted island</span>
          </span>
        )}
      </button>
      {open && (
        <form className="name-plate new-island-form" onSubmit={submit}>
          <label>
            Title
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Name of the Wind" />
          </label>
          <label>
            Author
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Optional" />
          </label>
          <div className="form-row">
            <button type="button" className="btn ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!title.trim()}>
              Start web
            </button>
          </div>
        </form>
      )}
    </article>
  )
}
