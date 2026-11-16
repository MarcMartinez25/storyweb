import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createStore, openDb, resolveDbPath } from './db.ts'
import { apiRouter } from './routes.ts'

const dbPath = resolveDbPath()
const db = openDb(dbPath)
const store = createStore(db)

const app = express()
app.disable('x-powered-by')
app.use('/api', apiRouter(store))

// In production the same server hands out the built React app.
const dist = join(import.meta.dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(
    '/assets',
    express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y' }), // hashed filenames
  )
  app.use(express.static(dist))
  app.get('/{*splat}', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 3001)
const server = app.listen(port, () => {
  console.log(`Storyweb API listening on http://localhost:${port} (db: ${dbPath})`)
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
