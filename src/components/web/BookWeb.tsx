import {
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type OnConnectEnd,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Book, LinkKind, NodeKind, StoryGroup } from '../../types'
import { createGroup, createLink, createNode, findOpenSpot } from '../../lib/factory'
import { useLibrary } from '../../store/library'
import { ArrowLeftIcon, GroupIcon, PersonIcon, PinIcon, SearchIcon } from '../Icons'
import { OpenBook } from '../Doodles'
import { TopNav } from '../TopNav'
import { DetailPanel } from './DetailPanel'
import { GroupOutlines } from './GroupOutlines'
import { FloatingEdge } from './FloatingEdge'
import { ParallaxDots } from './ParallaxDots'
import { StoryNodeCard } from './StoryNodeCard'
import type { FlowEdge, FlowNode, Selection } from './flowTypes'

const nodeTypes: NodeTypes = { story: StoryNodeCard }
const edgeTypes: EdgeTypes = { floating: FloatingEdge }
const PANEL_WIDTH = 380 // .detail-panel width plus the gap beside it, see index.css
/** A group nobody named, described or joined: safe to tidy away. */
const isAbandoned = (g: StoryGroup, book: Book) =>
  !g.name.trim() && !g.notes.trim() && !book.nodes.some((n) => n.groupId === g.id)

const isPhone = () => window.innerWidth <= 760 // matches the small-screen breakpoint in index.css

export function BookWeb({ book }: { book: Book }) {
  return (
    <ReactFlowProvider>
      <BookWebInner book={book} />
    </ReactFlowProvider>
  )
}

function BookWebInner({ book }: { book: Book }) {
  const { dispatch } = useLibrary()
  const rf = useReactFlow<FlowNode, FlowEdge>()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [query, setQuery] = useState('')

  const selectNode = useCallback((id: string) => setSelection({ type: 'node', id }), [])
  const selectLink = useCallback((id: string) => setSelection({ type: 'link', id }), [])
  const selectGroup = useCallback((id: string) => setSelection({ type: 'group', id }), [])

  // A group made with "+ Group" and then abandoned (no name, nobody in it) is tidied away
  // as soon as you look at something else, so it doesn't linger invisibly.
  const lastSelection = useRef<Selection>(null)
  useEffect(() => {
    const prev = lastSelection.current
    lastSelection.current = selection
    if (prev?.type !== 'group' || (selection?.type === 'group' && selection.id === prev.id)) return
    const g = book.groups.find((x) => x.id === prev.id)
    if (g && isAbandoned(g, book)) dispatch({ type: 'deleteGroup', bookId: book.id, id: g.id })
  }, [selection, book, dispatch])

  // Same tidy-up for any left behind last time (e.g. the tab was closed with the panel open).
  const tidiedOnOpen = useRef(false)
  useEffect(() => {
    if (tidiedOnOpen.current) return
    tidiedOnOpen.current = true
    for (const g of book.groups) {
      if (isAbandoned(g, book)) dispatch({ type: 'deleteGroup', bookId: book.id, id: g.id })
    }
  }, [book, dispatch])

  // --- search: dim everything that doesn't match -------------------------------
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const groupName = new Map(book.groups.map((g) => [g.id, g.name]))
    return new Set(
      book.nodes
        .filter((n) =>
          `${n.name} ${n.role} ${n.notes} ${n.firstSeen} ${(n.groupId && groupName.get(n.groupId)) || ''}`
            .toLowerCase()
            .includes(q),
        )
        .map((n) => n.id),
    )
  }, [book.nodes, book.groups, query])

  const linkCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of book.links) {
      counts.set(l.source, (counts.get(l.source) ?? 0) + 1)
      counts.set(l.target, (counts.get(l.target) ?? 0) + 1)
    }
    return counts
  }, [book.links])

  // --- nodes: React Flow keeps live drag state locally; the store is the source of truth
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return book.nodes.map((n): FlowNode => {
        const existing = prevById.get(n.id)
        return {
          ...existing,
          id: n.id,
          type: 'story',
          position: existing?.dragging ? existing.position : n.position,
          selected: selection?.type === 'node' && selection.id === n.id,
          data: { node: n, linkCount: linkCounts.get(n.id) ?? 0, dimmed: matches ? !matches.has(n.id) : false },
        }
      })
    })
  }, [book.nodes, linkCounts, matches, selection, setNodes])

  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) =>
      // Selection and deletion are driven by our own state and the side panel.
      onNodesChange(changes.filter((c) => c.type !== 'select' && c.type !== 'remove')),
    [onNodesChange],
  )

  const edges = useMemo(
    () =>
      book.links.map(
        (l): FlowEdge => ({
          id: l.id,
          source: l.source,
          target: l.target,
          type: 'floating',
          selected: selection?.type === 'link' && selection.id === l.id,
          data: {
            link: l,
            dimmed: matches ? !(matches.has(l.source) && matches.has(l.target)) : false,
            onSelect: selectLink,
          },
        }),
      ),
    [book.links, matches, selection, selectLink],
  )

  // --- creating things -----------------------------------------------------
  const addNode = (kind: NodeKind) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    // On wide screens the detail panel is about to open on the right and squeeze the canvas.
    const panelWidth = !selection && window.innerWidth > 760 ? PANEL_WIDTH : 0
    const visible = rect && { left: rect.left, top: rect.top, width: rect.width - panelWidth, height: rect.height }
    const center = visible
      ? rf.screenToFlowPosition({ x: visible.left + visible.width / 2, y: visible.top + visible.height / 2 })
      : { x: 0, y: 0 }
    const spot = findOpenSpot(
      { x: center.x - 100, y: center.y - 28 },
      book.nodes.map((n) => n.position),
    )
    const node = createNode(kind, spot)
    dispatch({ type: 'addNode', bookId: book.id, node })
    setQuery('')
    selectNode(node.id)

    if (isPhone()) {
      revealOnPhone(spot.x + 100, spot.y + 28)
    } else if (visible) {
      // If the open spot ended up off-screen, glide over to it.
      const s = rf.flowToScreenPosition(spot)
      const inView =
        s.x > visible.left + 20 &&
        s.x + 200 < visible.left + visible.width - 20 &&
        s.y > visible.top + 20 &&
        s.y + 60 < visible.top + visible.height - 20
      if (!inView) void rf.setCenter(spot.x + 100, spot.y + 28, { zoom: rf.getZoom(), duration: 400 })
    }
  }

  const addGroup = () => {
    const group = createGroup()
    dispatch({ type: 'addGroup', bookId: book.id, group })
    setQuery('')
    selectGroup(group.id)
  }

  const connect = useCallback(
    (source: string, target: string) => {
      if (source === target) return
      const kinds = [source, target].map((id) => book.nodes.find((n) => n.id === id)?.kind)
      const kind: LinkKind = kinds.includes('place') ? 'place' : 'other'
      const link = createLink(source, target, kind)
      dispatch({ type: 'addLink', bookId: book.id, link })
      selectLink(link.id)
    },
    [book.id, book.nodes, dispatch, selectLink],
  )

  const onConnect = useCallback((c: Connection) => connect(c.source, c.target), [connect])

  // Dropping a connection anywhere on a card (not only its little dot) should work too.
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, state) => {
      if (state.isValid || !state.fromNode) return
      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      const el = document.elementFromPoint(point.clientX, point.clientY)?.closest('.react-flow__node')
      const targetId = el?.getAttribute('data-id')
      if (targetId) connect(state.fromNode.id, targetId)
    },
    [connect],
  )

  // --- misc interactions ----------------------------------------------------
  /** On phones the panel is a bottom sheet; keep the point in the strip of canvas above it. */
  const revealOnPhone = (x: number, y: number, zoom = rf.getZoom()) => {
    const height = canvasRef.current?.clientHeight ?? window.innerHeight
    // The sheet covers up to ~62% of the canvas, so aim for the middle of the top ~38%.
    void rf.setCenter(x, y + (height * 0.31) / zoom, { zoom, duration: 350 })
  }

  const revealNode = (id: string, zoom?: number) => {
    const n = rf.getInternalNode(id)
    if (!n) return
    const { x, y } = n.internals.positionAbsolute
    revealOnPhone(x + (n.measured.width ?? 200) / 2, y + (n.measured.height ?? 56) / 2, zoom)
  }

  const focusNode = (id: string) => {
    selectNode(id)
    if (isPhone()) revealNode(id, Math.max(rf.getZoom(), 0.9))
    else void rf.fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.2 })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const characters = book.nodes.filter((n) => n.kind === 'character').length
  const places = book.nodes.length - characters

  return (
    <div className="page web-page">
      <TopNav>
        <a href="#/" className="nav-link hide-sm">
          <ArrowLeftIcon /> Shelf
        </a>
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Find someone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches && matches.size > 0) focusNode([...matches][0])
            }}
          />
        </label>
        <button type="button" className="btn primary" onClick={() => addNode('character')}>
          <PersonIcon /> <span>Character</span>
        </button>
        <button type="button" className="btn secondary" onClick={() => addNode('place')}>
          <PinIcon /> <span>Place</span>
        </button>
        <button type="button" className="btn secondary" onClick={addGroup}>
          <GroupIcon /> <span>Group</span>
        </button>
      </TopNav>

      <div className="web-body">
        <div className="web-stage">
          <div className="web-canvas" ref={canvasRef}>
            <ReactFlow<FlowNode, FlowEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={handleNodesChange}
              onNodeClick={(_, n) => {
                selectNode(n.id)
                if (isPhone()) revealNode(n.id)
              }}
              onEdgeClick={(_, e) => selectLink(e.id)}
              onPaneClick={() => setSelection(null)}
              onNodeDragStop={(_, __, dragged) => {
                for (const n of dragged) {
                  dispatch({ type: 'updateNode', bookId: book.id, id: n.id, patch: { position: n.position } })
                }
              }}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              connectionMode={ConnectionMode.Loose}
              connectionLineStyle={{ stroke: '#fff', strokeWidth: 2, strokeDasharray: '4 6', strokeLinecap: 'round' }}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              colorMode="dark"
            >
              <ParallaxDots />
              <GroupOutlines
                groups={book.groups}
                selectedId={selection?.type === 'group' ? selection.id : null}
                matches={matches}
                onSelect={selectGroup}
              />
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>

            <div className="canvas-title" aria-hidden={book.nodes.length > 0}>
              <h1>{book.title}</h1>
              <p>
                {book.author && <>by {book.author} · </>}
                {characters} {characters === 1 ? 'character' : 'characters'} · {places} {places === 1 ? 'place' : 'places'}
              </p>
            </div>

            {book.nodes.length === 0 && (
              <div className="empty-web">
                <OpenBook className="empty-book" />
                <h2>Who have you met so far?</h2>
                <p>Add the characters and places as they show up, then connect them as you learn how they fit together.</p>
                <div className="form-row">
                  <button type="button" className="btn light" onClick={() => addNode('character')}>
                    <PersonIcon /> Add a character
                  </button>
                  <button type="button" className="btn outline-light" onClick={() => addNode('place')}>
                    <PinIcon /> Add a place
                  </button>
                </div>
              </div>
            )}

            {book.nodes.length >= 2 && book.links.length === 0 && !selection && (
              <div className="canvas-hint">Tip: drag from the little dot on a card onto another card to connect them.</div>
            )}
          </div>
        </div>

        <DetailPanel
          book={book}
          selection={selection}
          onSelectNode={focusNode}
          onSelectLink={selectLink}
          onSelectGroup={selectGroup}
          onClose={() => setSelection(null)}
        />
      </div>
    </div>
  )
}
