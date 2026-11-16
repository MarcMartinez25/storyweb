import express, { type ErrorRequestHandler, type Router } from 'express'
import type { Store } from './db.ts'
import {
  HttpError,
  parseBook,
  parseBookPatch,
  parseLibrary,
  parseLink,
  parseLinkPatch,
  parseNode,
  parseNodePatch,
} from './validate.ts'

export function apiRouter(store: Store): Router {
  const api = express.Router()
  api.use(express.json({ limit: '10mb' }))

  api.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  // Whole library in one go: it's small (text only) and keeps the client simple.
  api.get('/library', (_req, res) => {
    res.json(store.library())
  })

  api.put('/library', (req, res) => {
    store.replaceAll(parseLibrary(req.body))
    res.status(204).end()
  })

  // Books
  api.post('/books', (req, res) => {
    store.createBook(parseBook(req.body))
    res.status(201).end()
  })
  api.patch('/books/:id', (req, res) => {
    store.updateBook(req.params.id, parseBookPatch(req.body))
    res.status(204).end()
  })
  api.delete('/books/:id', (req, res) => {
    store.deleteBook(req.params.id)
    res.status(204).end()
  })

  // Characters and places
  api.post('/books/:bookId/nodes', (req, res) => {
    store.createNode(req.params.bookId, parseNode(req.body))
    res.status(201).end()
  })
  api.patch('/nodes/:id', (req, res) => {
    store.updateNode(req.params.id, parseNodePatch(req.body))
    res.status(204).end()
  })
  api.delete('/nodes/:id', (req, res) => {
    store.deleteNode(req.params.id)
    res.status(204).end()
  })

  // Connections
  api.post('/books/:bookId/links', (req, res) => {
    store.createLink(req.params.bookId, parseLink(req.body))
    res.status(201).end()
  })
  api.patch('/links/:id', (req, res) => {
    store.updateLink(req.params.id, parseLinkPatch(req.body))
    res.status(204).end()
  })
  api.delete('/links/:id', (req, res) => {
    store.deleteLink(req.params.id)
    res.status(204).end()
  })

  api.use((_req, _res, next) => next(new HttpError(404, 'no such endpoint')))
  api.use(errorHandler)
  return api
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  // express.json() parse errors
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'invalid JSON' })
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'request too large' })
    return
  }
  // SQLite constraint violations (duplicate id, missing parent, bad enum value)
  const message = String(err?.message ?? '')
  if (err?.code === 'ERR_SQLITE_ERROR' && /constraint/i.test(message)) {
    res.status(409).json({ error: message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'something went wrong' })
}
