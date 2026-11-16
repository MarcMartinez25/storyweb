import { useEffect } from 'react'
import { Bookshelf } from './components/Bookshelf'
import { OpenBook } from './components/Doodles'
import { BookWeb } from './components/web/BookWeb'
import { useHashRoute } from './lib/useHashRoute'
import { useLibrary } from './store/library'

export default function App() {
  const route = useHashRoute()
  const { state, loadState, retryLoad } = useLibrary()
  const book = route.name === 'book' ? state.books.find((b) => b.id === route.bookId) : undefined

  useEffect(() => {
    document.title = book ? `${book.title} · Storyweb` : 'Storyweb'
  }, [book])

  // Each page starts at the top (the shelf scrolls; the web page is full-height).
  const pageKey = route.name === 'book' ? route.bookId : 'shelf'
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pageKey])

  if (loadState !== 'ready') {
    return (
      <div className="splash">
        <OpenBook className={`splash-book${loadState === 'loading' ? ' is-loading' : ''}`} />
        {loadState === 'loading' ? (
          <p>Opening your shelf…</p>
        ) : (
          <>
            <p>Couldn’t reach the Storyweb server.</p>
            <button type="button" className="btn primary" onClick={retryLoad}>
              Try again
            </button>
          </>
        )}
      </div>
    )
  }

  if (book) return <BookWeb key={book.id} book={book} />
  return <Bookshelf />
}
