/** Tiny seeded RNG so decorative shapes look random but stay put between renders. */
export function seeded(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Pt = [number, number]
const f = (n: number) => n.toFixed(1)

/** A smooth organic blob filling roughly a w×h box (closed Catmull-Rom spline). */
export function blobPath(seed: number, w: number, h: number, points = 9, wobble = 0.2): string {
  const rnd = seeded(seed)
  const cx = w / 2
  const cy = h / 2
  const pts: Pt[] = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2 + (rnd() - 0.5) * 0.35
    const r = 1 - wobble + rnd() * wobble
    return [cx + Math.cos(a) * (w / 2) * r, cy + Math.sin(a) * (h / 2) * r]
  })
  const at = (i: number) => pts[(i + points) % points]
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < points; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

/** Scattered dots: [x, y, radius]. Mostly tiny, a few larger ones. */
export function dotField(seed: number, w: number, h: number, count: number): [number, number, number][] {
  const rnd = seeded(seed)
  return Array.from({ length: count }, () => {
    const big = rnd() > 0.9
    return [rnd() * w, rnd() * h, big ? 1.8 + rnd() * 1.4 : 0.6 + rnd() * 1.1]
  })
}

/** A smooth open curve through the given points (Catmull-Rom → cubic Béziers). */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${f(points[0].x)} ${f(points[0].y)}`
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]
  let d = `M${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d +=
      `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)}` +
      ` ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`
  }
  return d
}

type Rect = { x: number; y: number; w: number; h: number }

/** Convex hull (Andrew's monotone chain), counter-clockwise. */
function convexHull(points: { x: number; y: number }[]) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (pts.length < 3) return pts
  const cross = (o: Pt2, a: Pt2, b: Pt2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Pt2[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt2[] = []
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}
type Pt2 = { x: number; y: number }

/** Evenly spaced points around a closed polygon, so smoothing spreads each bend into a gentle curve. */
function resampleClosed(poly: Pt2[], spacing: number): Pt2[] {
  if (poly.length < 3) return poly
  const segs = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length]
    return { p, q, len: Math.hypot(q.x - p.x, q.y - p.y) }
  })
  const total = segs.reduce((s, g) => s + g.len, 0)
  const count = Math.max(8, Math.round(total / spacing))
  const step = total / count
  const out: Pt2[] = []
  let seg = 0
  let into = 0
  for (let k = 0; k < count; k++) {
    let d = k * step - into
    while (seg < segs.length - 1 && d > segs[seg].len) {
      d -= segs[seg].len
      into += segs[seg].len
      seg++
    }
    const { p, q, len } = segs[seg]
    const t = len === 0 ? 0 : Math.min(1, d / len)
    out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
  }
  return out
}

/**
 * A soft outline around a set of cards: each card is padded into a rounded rectangle,
 * the convex hull of all of them is taken, then smoothed into a closed curve.
 */
export function groupOutline(rects: Rect[], pad = 40) {
  const pts: Pt2[] = []
  for (const r of rects) {
    const corners = [
      { cx: r.x + r.w, cy: r.y + r.h, from: 0 },
      { cx: r.x, cy: r.y + r.h, from: 90 },
      { cx: r.x, cy: r.y, from: 180 },
      { cx: r.x + r.w, cy: r.y, from: 270 },
    ]
    for (const c of corners) {
      for (const deg of [0, 15, 30, 45, 60, 75, 90]) {
        const a = ((c.from + deg) * Math.PI) / 180
        pts.push({ x: c.cx + Math.cos(a) * pad, y: c.cy + Math.sin(a) * pad })
      }
    }
  }
  const hull = resampleClosed(convexHull(pts), 64)
  const n = hull.length
  const at = (i: number) => hull[(i + n) % n]
  let d = `M${f(hull[0].x)} ${f(hull[0].y)}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d +=
      `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)}` +
      ` ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`
  }
  const minY = Math.min(...hull.map((p) => p.y))
  const minX = Math.min(...hull.map((p) => p.x))
  const maxX = Math.max(...hull.map((p) => p.x))
  return { path: d + 'Z', top: minY, centerX: (minX + maxX) / 2 }
}
