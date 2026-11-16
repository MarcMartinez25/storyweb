import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { readLegacyLibrary, retireLegacyLibrary } from '../lib/legacy'
import { createSync, type SaveStatus } from '../lib/sync'
import { LibraryContext, isLibraryData, libraryReducer, type Action, type LoadState } from './library'

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(libraryReducer, { version: 1, books: [] })
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [attempt, setAttempt] = useState(0)

  const [sync] = useState(() => createSync(setSaveStatus))

  // Load the library from the server once (and again if the user hits "try again").
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/library')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: unknown = await res.json()
        if (!isLibraryData(data)) throw new Error('unexpected response')
        if (cancelled) return

        // First run against the server: bring over anything saved by the browser-only version.
        const legacy = data.books.length === 0 ? readLegacyLibrary() : null
        if (legacy) {
          const put = await fetch('/api/library', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(legacy),
          })
          if (put.ok) {
            retireLegacyLibrary()
            if (!cancelled) localDispatch({ type: 'hydrate', data: legacy })
          } else {
            console.warn('[storyweb] could not migrate browser data', await put.text())
            if (!cancelled) localDispatch({ type: 'hydrate', data })
          }
        } else {
          localDispatch({ type: 'hydrate', data })
        }
        if (!cancelled) setLoadState('ready')
      } catch (err) {
        console.error('[storyweb] failed to load library', err)
        if (!cancelled) setLoadState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attempt])

  // Don't lose the last few keystrokes when the tab closes.
  useEffect(() => {
    const onHide = () => sync.flushOnExit()
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sync.hasUnsaved()) e.preventDefault()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [sync])

  const dispatch = useCallback(
    (action: Action) => {
      localDispatch(action) // optimistic: the UI updates immediately
      sync.push(action)
    },
    [sync],
  )

  const retryLoad = useCallback(() => {
    setLoadState('loading')
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, loadState, saveStatus, retryLoad }),
    [state, dispatch, loadState, saveStatus, retryLoad],
  )
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
