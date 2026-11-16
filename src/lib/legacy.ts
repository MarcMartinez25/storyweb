import type { LibraryData } from '../types'
import { BOOK_PATTERNS, NODE_MARKS } from './constants'

/** Where the first (browser-only) version of Storyweb kept everything. */
const LEGACY_KEY = 'storyweb:v1'

type LegacyNode = Record<string, unknown> & { color?: string; kind?: string }
type LegacyBook = Record<string, unknown> & { color?: string; nodes: LegacyNode[]; links: unknown[] }

const pickBy = (seed: string, list: string[]) => {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return list[Math.abs(h) % list.length]
}

/** Read a library saved by the localStorage version, converting colors to ink styles. */
export function readLegacyLibrary(): LibraryData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: number; books?: LegacyBook[] }
    if (parsed.version !== 1 || !Array.isArray(parsed.books) || parsed.books.length === 0) return null
    const books = parsed.books.map(({ color, ...b }) => ({
      ...b,
      pattern: (b.pattern as string | undefined) ?? pickBy(color ?? String(b.id), BOOK_PATTERNS),
      nodes: b.nodes.map(({ color: nodeColor, ...n }) => ({
        ...n,
        mark: (n.mark as string | undefined) ?? (n.kind === 'place' ? 'outline' : pickBy(nodeColor ?? String(n.id), NODE_MARKS)),
      })),
    }))
    return { version: 1, books } as unknown as LibraryData
  } catch {
    return null
  }
}

/** Keep a copy under a different key rather than deleting, just in case. */
export function retireLegacyLibrary() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) localStorage.setItem(`${LEGACY_KEY}:migrated`, raw)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignore
  }
}
