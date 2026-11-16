import { useMemo, useSyncExternalStore } from 'react'

export type Route = { name: 'shelf' } | { name: 'book'; bookId: string }

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function parse(hash: string): Route {
  const match = hash.match(/^#\/book\/([^/?#]+)/)
  return match ? { name: 'book', bookId: decodeURIComponent(match[1]) } : { name: 'shelf' }
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parse(hash), [hash])
}

export const bookHref = (id: string) => `#/book/${encodeURIComponent(id)}`

export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, '')
}
