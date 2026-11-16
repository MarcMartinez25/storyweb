import { useState, type FormEvent, type ReactNode } from 'react'
import type { Book, LinkKind, NodeKind, StoryLink, StoryNode } from '../../types'
import { LINK_KIND_ORDER, LINK_KINDS, NODE_MARKS } from '../../lib/constants'
import { createLink, createNode, findOpenSpot } from '../../lib/factory'
import { useLibrary, type LinkPatch, type NodePatch } from '../../store/library'
import { ConfirmButton } from '../ConfirmButton'
import { CloseIcon, LinkIcon, PersonIcon, PinIcon, TrashIcon } from '../Icons'
import type { Selection } from './flowTypes'

interface PanelProps {
  book: Book
  selection: Selection
  onSelectNode: (id: string) => void
  onSelectLink: (id: string) => void
  onClose: () => void
}

export function DetailPanel({ book, selection, onSelectNode, onSelectLink, onClose }: PanelProps) {
  if (!selection) return null
  if (selection.type === 'node') {
    const node = book.nodes.find((n) => n.id === selection.id)
    if (!node) return null
    return (
      <NodePanel key={node.id} book={book} node={node} onSelectNode={onSelectNode} onSelectLink={onSelectLink} onClose={onClose} />
    )
  }
  const link = book.links.find((l) => l.id === selection.id)
  if (!link) return null
  return <LinkPanel key={link.id} book={book} link={link} onSelectNode={onSelectNode} onClose={onClose} />
}

const displayName = (n: StoryNode | undefined) =>
  n?.name || (n?.kind === 'place' ? 'Unnamed place' : 'Unnamed character')

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <aside className="detail-panel" aria-label={title}>
      <div className="panel-head">
        <span className="panel-eyebrow">{title}</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
          <CloseIcon />
        </button>
      </div>
      <div className="panel-body">{children}</div>
    </aside>
  )
}

/* ------------------------------------------------------------------------ */
/* Character / place                                                         */
/* ------------------------------------------------------------------------ */

function NodePanel({
  book,
  node,
  onSelectNode,
  onSelectLink,
  onClose,
}: {
  book: Book
  node: StoryNode
  onSelectNode: (id: string) => void
  onSelectLink: (id: string) => void
  onClose: () => void
}) {
  const { dispatch } = useLibrary()
  const update = (patch: NodePatch) => dispatch({ type: 'updateNode', bookId: book.id, id: node.id, patch })
  const isPlace = node.kind === 'place'

  const connections = book.links
    .filter((l) => l.source === node.id || l.target === node.id)
    .map((link) => ({ link, other: book.nodes.find((n) => n.id === (link.source === node.id ? link.target : link.source)) }))

  return (
    <PanelShell title={isPlace ? 'Place' : 'Character'} onClose={onClose}>
      <div className="segmented" role="radiogroup" aria-label="Type">
        {(['character', 'place'] as NodeKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={node.kind === k}
            className={node.kind === k ? 'is-on' : ''}
            onClick={() => update({ kind: k })}
          >
            {k === 'character' ? <PersonIcon /> : <PinIcon />}
            {k === 'character' ? 'Character' : 'Place'}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Name</span>
        <input
          autoFocus={!node.name}
          value={node.name}
          placeholder={isPlace ? 'e.g. The Eolian' : 'e.g. Kvothe'}
          onChange={(e) => update({ name: e.target.value })}
        />
      </label>

      <label className="field">
        <span>{isPlace ? 'What kind of place?' : 'Who are they?'}</span>
        <input
          value={node.role}
          placeholder={isPlace ? 'e.g. tavern in Imre, hometown' : "e.g. narrator, the innkeeper's daughter"}
          onChange={(e) => update({ role: e.target.value })}
        />
      </label>

      <label className="field">
        <span>First {isPlace ? 'visited' : 'met'}</span>
        <input
          value={node.firstSeen}
          placeholder="e.g. Ch. 4, p. 112"
          onChange={(e) => update({ firstSeen: e.target.value })}
        />
      </label>

      {!isPlace && (
        <div className="field">
          <span>Ink</span>
          <div className="swatches">
            {NODE_MARKS.map((m) => (
              <button
                key={m}
                type="button"
                className={`swatch mark-${m}${node.mark === m ? ' is-on' : ''}`}
                aria-label={`Use the ${m} ink style`}
                aria-pressed={node.mark === m}
                onClick={() => update({ mark: m })}
              />
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={4}
          value={node.notes}
          placeholder={isPlace ? 'What happens here? What does it look like?' : 'Personality, secrets, things to remember…'}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>

      <div className="panel-section">
        <h3>
          Connections <span className="count">{connections.length}</span>
        </h3>
        {connections.length === 0 ? (
          <p className="muted">Not connected to anyone yet.</p>
        ) : (
          <ul className="connection-list">
            {connections.map(({ link, other }) => (
              <li key={link.id}>
                <button type="button" className="connection-row" onClick={() => onSelectLink(link.id)}>
                  <LineSample kind={link.kind} />
                  <span className="connection-label">{link.label || LINK_KINDS[link.kind].label}</span>
                  <span className="connection-other">{displayName(other)}</span>
                </button>
                {other && (
                  <button
                    type="button"
                    className="text-btn small"
                    onClick={() => onSelectNode(other.id)}
                    title={`Go to ${displayName(other)}`}
                  >
                    Go
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddConnection book={book} node={node} />
      </div>

      <ConfirmButton
        block
        className="btn danger-outline full"
        prompt={
          <>
            Remove {displayName(node)}
            {connections.length > 0 &&
              ` and ${connections.length === 1 ? 'their 1 connection' : `their ${connections.length} connections`}`}
            ? This can’t be undone.
          </>
        }
        onConfirm={() => {
          dispatch({ type: 'deleteNode', bookId: book.id, id: node.id })
          onClose()
        }}
      >
        <TrashIcon /> Remove {isPlace ? 'place' : 'character'}
      </ConfirmButton>
    </PanelShell>
  )
}

const NEW = '__new__'

function AddConnection({ book, node }: { book: Book; node: StoryNode }) {
  const { dispatch } = useLibrary()
  const [targetId, setTargetId] = useState('')
  const [kind, setKind] = useState<LinkKind>(node.kind === 'place' ? 'place' : 'friend')
  const [label, setLabel] = useState('')
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<NodeKind>('character')

  const others = book.nodes
    .filter((n) => n.id !== node.id)
    .sort((a, b) => displayName(a).localeCompare(displayName(b)))

  const pickKindFor = (otherKind: NodeKind | undefined) => {
    if (node.kind === 'place' || otherKind === 'place') setKind('place')
    else if (kind === 'place') setKind('friend')
  }

  const canSubmit = targetId === NEW ? newName.trim().length > 0 : targetId !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    let otherId = targetId
    if (targetId === NEW) {
      // Drop the newcomer near this card, somewhere with a bit of room.
      const spot = findOpenSpot(
        node.position,
        book.nodes.map((n) => n.position),
        [240, 340, 460, 600],
      )
      const other = createNode(newKind, spot, { name: newName.trim() })
      dispatch({ type: 'addNode', bookId: book.id, node: other })
      otherId = other.id
    }
    dispatch({ type: 'addLink', bookId: book.id, link: createLink(node.id, otherId, kind, label.trim()) })
    setTargetId('')
    setLabel('')
    setNewName('')
  }

  return (
    <form className="add-connection" onSubmit={submit}>
      <div className="add-connection-head">
        <LinkIcon /> Connect {displayName(node)} to…
      </div>
      <select
        value={targetId}
        onChange={(e) => {
          setTargetId(e.target.value)
          pickKindFor(e.target.value === NEW ? newKind : others.find((n) => n.id === e.target.value)?.kind)
        }}
      >
        <option value="">Choose who or where</option>
        <option value={NEW}>＋ Someone or somewhere new…</option>
        {others.length > 0 && (
          <optgroup label="Already on the web">
            {others.map((n) => (
              <option key={n.id} value={n.id}>
                {displayName(n)}
                {n.kind === 'place' ? ' (place)' : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {targetId === NEW && (
        <div className="new-inline">
          <input autoFocus value={newName} placeholder="Their name" onChange={(e) => setNewName(e.target.value)} />
          <div className="segmented small">
            {(['character', 'place'] as NodeKind[]).map((k) => (
              <button
                key={k}
                type="button"
                className={newKind === k ? 'is-on' : ''}
                onClick={() => {
                  setNewKind(k)
                  pickKindFor(k)
                }}
              >
                {k === 'character' ? 'Character' : 'Place'}
              </button>
            ))}
          </div>
        </div>
      )}

      {targetId !== '' && (
        <>
          <KindPicker value={kind} onChange={setKind} />
          <input
            value={label}
            placeholder={labelPlaceholder(kind)}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button type="submit" className="btn primary full" disabled={!canSubmit}>
            Add connection
          </button>
        </>
      )}
    </form>
  )
}

/* ------------------------------------------------------------------------ */
/* Connection                                                                */
/* ------------------------------------------------------------------------ */

function LinkPanel({
  book,
  link,
  onSelectNode,
  onClose,
}: {
  book: Book
  link: StoryLink
  onSelectNode: (id: string) => void
  onClose: () => void
}) {
  const { dispatch } = useLibrary()
  const update = (patch: LinkPatch) => dispatch({ type: 'updateLink', bookId: book.id, id: link.id, patch })
  const source = book.nodes.find((n) => n.id === link.source)
  const target = book.nodes.find((n) => n.id === link.target)

  return (
    <PanelShell title="Connection" onClose={onClose}>
      <div className="link-ends">
        {[source, target].map((n, i) => (
          <button
            key={n?.id ?? i}
            type="button"
            className="link-end"
            onClick={() => n && onSelectNode(n.id)}
          >
            {displayName(n)}
          </button>
        ))}
      </div>

      <div className="field">
        <span>What kind of connection?</span>
        <KindPicker value={link.kind} onChange={(kind) => update({ kind })} />
      </div>

      <label className="field">
        <span>How do they know each other?</span>
        <input
          autoFocus={!link.label}
          value={link.label}
          placeholder={labelPlaceholder(link.kind)}
          onChange={(e) => update({ label: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={5}
          value={link.notes}
          placeholder="History, tension, what you suspect…"
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>

      <button
        type="button"
        className="btn danger-outline full"
        onClick={() => {
          dispatch({ type: 'deleteLink', bookId: book.id, id: link.id })
          onClose()
        }}
      >
        <TrashIcon /> Remove connection
      </button>
    </PanelShell>
  )
}

function KindPicker({ value, onChange }: { value: LinkKind; onChange: (k: LinkKind) => void }) {
  return (
    <div className="kind-picker">
      {LINK_KIND_ORDER.map((k) => (
        <button
          key={k}
          type="button"
          className={`kind-chip${value === k ? ' is-on' : ''}`}
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          <LineSample kind={k} />
          {LINK_KINDS[k].label}
        </button>
      ))}
    </div>
  )
}

/** A short stroke drawn in the same style the connection uses on the web. */
function LineSample({ kind }: { kind: LinkKind }) {
  const { dash, width } = LINK_KINDS[kind]
  return (
    <svg className="line-sample" width="26" height="10" viewBox="0 0 26 10" aria-hidden>
      <line
        x1="3"
        y1="5"
        x2="23"
        y2="5"
        stroke="currentColor"
        strokeWidth={Math.min(width, 3)}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  )
}

function labelPlaceholder(kind: LinkKind) {
  switch (kind) {
    case 'family':
      return 'e.g. older brother, estranged mother'
    case 'romance':
      return 'e.g. married, secret crush'
    case 'friend':
      return 'e.g. childhood friends'
    case 'ally':
      return 'e.g. fight side by side'
    case 'mentor':
      return 'e.g. teaches her swordplay'
    case 'work':
      return 'e.g. his employer'
    case 'rival':
      return 'e.g. competing for the throne'
    case 'enemy':
      return 'e.g. killed his father'
    case 'place':
      return 'e.g. lives here, born here'
    default:
      return 'Describe the connection'
  }
}
