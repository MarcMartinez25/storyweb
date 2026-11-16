import { useRef, useState } from 'react'
import { createSampleBook } from '../lib/sample'
import { bookHref, navigate } from '../lib/useHashRoute'
import { useLibrary } from '../store/library'
import { InkBlob, OpenBook, Quill } from './Doodles'
import { PlusIcon } from './Icons'
import { ReadingMap } from './ReadingMap'
import { TopNav } from './TopNav'

export function Bookshelf() {
  const { state, dispatch } = useLibrary()
  // Islands appear in the order you started each book, like levels.
  const books = [...state.books].sort((a, b) => a.createdAt - b.createdAt)
  const finishedCount = books.filter((b) => b.status === 'finished').length
  const shelfRef = useRef<HTMLElement>(null)
  const [adding, setAdding] = useState(false)

  const startAdding = () => {
    setAdding(true)
    shelfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const addSample = () => {
    const book = createSampleBook()
    dispatch({ type: 'addBook', book })
    navigate(bookHref(book.id))
  }

  return (
    <div className="page shelf-page">
      <TopNav>
        <a href="#/" className="nav-link is-active">
          Shelf
        </a>
      </TopNav>

      <section className="hero">
        <InkBlob seed={21} points={10} className="hero-blob" />
        <InkBlob seed={5} points={7} className="side-blob side-blob-left" />
        <InkBlob seed={9} points={8} className="side-blob side-blob-right" />

        <div className="hero-copy">
          <h1>Everyone you meet between the pages.</h1>
          <p>
            Keep track of the characters and places as they show up: who they are, where they live, and how
            they’re all tangled up together.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn light" onClick={startAdding}>
              <PlusIcon /> Start a new web
            </button>
            {state.books.length === 0 && (
              <button type="button" className="btn outline-light" onClick={addSample}>
                Peek at a sample
              </button>
            )}
          </div>
        </div>

        <OpenBook className="doodle doodle-book" />
        <Quill className="doodle doodle-quill" />
      </section>

      <section className="shelf-section" ref={shelfRef}>
        <div className="map-heading">
          <h2>Your reading map</h2>
          {books.length > 0 && (
            <span className="map-progress">
              {books.length} {books.length === 1 ? 'island' : 'islands'} · {finishedCount} finished
            </span>
          )}
        </div>
        <ReadingMap books={books} adding={adding} onAddingChange={setAdding} />
      </section>

      <footer className="shelf-footer">
        <span>Everything is saved as you go.</span>
      </footer>
    </div>
  )
}
