# Storyweb

A quiet little web app for keeping a visual map of the people and places in the books you're reading.
Black-and-white and hand-drawn, like ink on paper.

- **Bookshelf**: add the books you're reading; mark them finished, change their cover pattern.
- **A web per book**: characters and places are cards on an ink-black canvas you can pan, zoom and rearrange.
- **Connections**: link any two cards (family, romance, friends, rivals, "lives here"…). Each type has its own line style, and you can add your own label and notes.
- **Quick adds while reading**: from any character, "Connect to… → Someone new" creates the new person *and* the relationship in one go.
- **Find someone**: search dims everything except matching cards; Enter jumps to the first match.

## Running locally

Requires Node 24+ (the server uses Node's built-in `node:sqlite` and runs TypeScript directly).

```bash
npm install
npm run dev
```

That starts two processes:

| | URL | |
|---|---|---|
| web (Vite) | http://localhost:5175 | proxies `/api` to the API |
| api (Express) | http://localhost:3001 | SQLite at `./data/storyweb.db` |

Other scripts: `npm run build` (type-check + production build), `npm start` (production server), `npm run lint`.

## Deploying to Railway

The app is a single service: Express serves the API under `/api` and the built React app for everything else.
`railway.json` already sets the build command, start command and health check.

**Live:** https://storyweb-production-9d7c6398.up.railway.app. The Railway service is connected to this
repo, so **every push to `main` deploys automatically**. (`railway up` from this folder also works for
deploying uncommitted changes.)

To set it up from scratch:

1. Create a service from this repo (or `railway up` from this folder).
2. **Attach a volume** to the service, mounted at e.g. `/data`. This is what keeps your data across deploys.
   The server automatically stores the database in the volume (it reads `RAILWAY_VOLUME_MOUNT_PATH`),
   or you can set `DATABASE_PATH=/data/storyweb.db` explicitly.
3. Generate a domain under the service's Networking settings.

> ⚠️ There's no login yet: anyone with the URL can view and edit your shelf.

### Environment variables

| Variable | Default | |
|---|---|---|
| `PORT` | `3001` | Set by Railway automatically |
| `DATABASE_PATH` | `$RAILWAY_VOLUME_MOUNT_PATH/storyweb.db`, else `./data/storyweb.db` | Where the SQLite file lives |

## How it's put together

- **Client**: React 19 + TypeScript + Vite, [React Flow](https://reactflow.dev) for the canvas
  - `src/store/`: reducer + context. Edits apply instantly, then `src/lib/sync.ts` sends them to the API in order, merging rapid edits (typing, dragging) and retrying if the server is unreachable. The top nav shows *All saved / Saving… / Offline*.
  - `src/components/Bookshelf.tsx`: the shelf; `src/components/web/`: the per-book canvas (`BookWeb`, `StoryNodeCard`, `FloatingEdge`, `ParallaxDots`, `DetailPanel`)
  - `src/components/Doodles.tsx`: the hand-drawn SVG illustrations; `src/lib/shapes.ts`: seeded blob/dot generators
- **Server**: `server/` (Express 5 + `node:sqlite`)
  - `db.ts`: schema migrations (tracked with `PRAGMA user_version`) and queries
  - `routes.ts`: REST API (`GET /api/library`, `POST/PATCH/DELETE` for books, nodes, links; `PUT /api/library` replaces everything and is used for the one-time browser-data import)
  - `validate.ts`: request validation
- `src/types.ts` is shared by both sides.
- Data saved by the earlier browser-only version (localStorage) is imported into the database automatically the first time the app loads against an empty database.
