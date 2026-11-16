import type { Action } from '../store/library'

export type SaveStatus = 'saved' | 'saving' | 'offline'

type Request = { method: 'POST' | 'PATCH' | 'DELETE'; url: string; body?: unknown }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sends store actions to the API, in order.
 *
 * - Every request runs one after another, so "create node" always lands before "connect it".
 * - Rapid edits (typing, dragging) are merged per item and sent after a short pause.
 * - If the server can't be reached, it keeps retrying with backoff and reports "offline".
 */
export function createSync(onStatus: (s: SaveStatus) => void) {
  let chain: Promise<void> = Promise.resolve()
  let inFlight = 0
  let offline = false
  const pendingPatches = new Map<string, { url: string; body: Record<string, unknown> }>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastStatus: SaveStatus = 'saved'

  const report = () => {
    const status: SaveStatus = inFlight + pendingPatches.size === 0 ? 'saved' : offline ? 'offline' : 'saving'
    if (status !== lastStatus) {
      lastStatus = status
      onStatus(status)
    }
  }

  async function send({ method, url, body }: Request) {
    let delay = 1000
    for (;;) {
      try {
        const res = await fetch(url, {
          method,
          headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        if (res.ok) {
          offline = false
          return
        }
        if (res.status >= 400 && res.status < 500) {
          // The server understood and refused (e.g. already deleted). Retrying won't help.
          console.warn(`[storyweb] ${method} ${url} → ${res.status}`, await res.text().catch(() => ''))
          offline = false
          return
        }
        throw new Error(`HTTP ${res.status}`)
      } catch {
        offline = true
        report()
        await sleep(delay)
        delay = Math.min(delay * 2, 15_000)
      }
    }
  }

  function enqueue(req: Request) {
    inFlight++
    report()
    chain = chain
      .then(() => send(req))
      .finally(() => {
        inFlight--
        report()
      })
  }

  function flushPatches() {
    clearTimeout(timer)
    timer = undefined
    for (const { url, body } of pendingPatches.values()) enqueue({ method: 'PATCH', url, body })
    pendingPatches.clear()
  }

  function patch(url: string, body: object) {
    const prev = pendingPatches.get(url)
    pendingPatches.set(url, { url, body: { ...prev?.body, ...body } })
    clearTimeout(timer)
    timer = setTimeout(flushPatches, 400)
    report()
  }

  function request(req: Request) {
    flushPatches() // keep ordering: earlier edits go out before this
    enqueue(req)
  }

  const enc = encodeURIComponent

  return {
    push(action: Action) {
      switch (action.type) {
        case 'addBook':
          return request({ method: 'POST', url: '/api/books', body: action.book })
        case 'updateBook':
          return patch(`/api/books/${enc(action.id)}`, action.patch)
        case 'deleteBook':
          return request({ method: 'DELETE', url: `/api/books/${enc(action.id)}` })
        case 'addNode':
          return request({ method: 'POST', url: `/api/books/${enc(action.bookId)}/nodes`, body: action.node })
        case 'updateNode':
          return patch(`/api/nodes/${enc(action.id)}`, action.patch)
        case 'deleteNode':
          return request({ method: 'DELETE', url: `/api/nodes/${enc(action.id)}` })
        case 'addLink':
          return request({ method: 'POST', url: `/api/books/${enc(action.bookId)}/links`, body: action.link })
        case 'updateLink':
          return patch(`/api/links/${enc(action.id)}`, action.patch)
        case 'deleteLink':
          return request({ method: 'DELETE', url: `/api/links/${enc(action.id)}` })
        case 'hydrate':
          return // came from the server; nothing to send
      }
    },

    /** Best effort when the tab closes: fire any un-sent edits without waiting. */
    flushOnExit() {
      clearTimeout(timer)
      for (const { url, body } of pendingPatches.values()) {
        void fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true,
        })
      }
      pendingPatches.clear()
    },

    hasUnsaved: () => inFlight + pendingPatches.size > 0,
  }
}
