import { useState, type FormEvent, type ReactNode } from 'react'
import type { Book, LinkKind, NodeKind, StoryGroup, StoryLink, StoryNode } from '../../types'
import { GROUP_STYLES, LINK_KIND_ORDER, LINK_KINDS, NODE_MARKS } from '../../lib/constants'
import { createGroup, createLink, createNode, findOpenSpot } from '../../lib/factory'
import { useLibrary, type GroupPatch, type LinkPatch, type NodePatch } from '../../store/library'
import { ConfirmButton } from '../ConfirmButton'
import { CloseIcon, GroupIcon, LinkIcon, PersonIcon, PinIcon, TrashIcon } from '../Icons'
import type { Selection } from './flowTypes'

interface PanelProps {
  book: Book
  selection: Selection
  onSelectNode: (id: string) => void
  onSelectLink: (id: string) => void
  onSelectGroup: (id: string) => void
  onClose: () => void
}

export function DetailPanel({ book, selection, onSelectNode, onSelectLink, onSelectGroup, onClose }: PanelProps) {
  if (!selection) return null
  if (selection.type === 'node') {
    const node = book.nodes.find((n) => n.id === selection.id)
    if (!node) return null
    return (
      <NodePanel
        key={node.id}
        book={book}
        node={node}
        onSelectNode={onSelectNode}
        onSelectLink={onSelectLink}
        onSelectGroup={onSelectGroup}
        onClose={onClose}
      />
    )
  }
  if (selection.type === 'group') {
    const group = book.groups.find((g) => g.id === selection.id)
    if (!group) return null
    return <GroupPanel key={group.id} book={book} group={group} onSelectNode={onSelectNode} onClose={onClose} />
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
  onSelectGroup,
  onClose,
}: {
  book: Book
  node: StoryNode
  onSelectNode: (id: string) => void
  onSelectLink: (id: string) => void
  onSelectGroup: (id: string) => void
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

      <GroupPicker book={book} node={node} onOpenGroup={onSelectGroup} />

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

const NEW_GROUP = '__new_group__'

/** "Which group are they in?" with an inline way to start a new group. */
function GroupPicker({ book, node, onOpenGroup }: { book: Book; node: StoryNode; onOpenGroup: (id: string) => void }) {
  const { dispatch } = useLibrary()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const current = book.groups.find((g) => g.id === node.groupId)

  const setGroup = (groupId: string | null) =>
    dispatch({ type: 'updateNode', bookId: book.id, id: node.id, patch: { groupId } })

  const create = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const group = createGroup(name.trim())
    dispatch({ type: 'addGroup', bookId: book.id, group })
    setGroup(group.id)
    setCreating(false)
    setName('')
  }

  return (
    <div className="field">
      <span>Group</span>
      {creating ? (
        <form className="inline-create" onSubmit={create}>
          <input autoFocus value={name} placeholder="e.g. The Peaky Blinders" onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn primary" disabled={!name.trim()}>
            Create
          </button>
          <button type="button" className="text-btn" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="inline-create">
          <select
            value={node.groupId ?? ''}
            onChange={(e) => {
              if (e.target.value === NEW_GROUP) setCreating(true)
              else setGroup(e.target.value || null)
            }}
          >
            <option value="">Not in a group</option>
            {book.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || 'Unnamed group'}
              </option>
            ))}
            <option value={NEW_GROUP}>＋ New group…</option>
          </select>
          {current && (
            <button type="button" className="text-btn" onClick={() => onOpenGroup(current.id)}>
              Open
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Group                                                                     */
/* ------------------------------------------------------------------------ */

function GroupPanel({
  book,
  group,
  onSelectNode,
  onClose,
}: {
  book: Book
  group: StoryGroup
  onSelectNode: (id: string) => void
  onClose: () => void
}) {
  const { dispatch } = useLibrary()
  const update = (patch: GroupPatch) => dispatch({ type: 'updateGroup', bookId: book.id, id: group.id, patch })
  const setMember = (nodeId: string, groupId: string | null) =>
    dispatch({ type: 'updateNode', bookId: book.id, id: nodeId, patch: { groupId } })

  const members = book.nodes.filter((n) => n.groupId === group.id)
  const others = book.nodes
    .filter((n) => n.groupId !== group.id)
    .sort((a, b) => displayName(a).localeCompare(displayName(b)))
  const groupName = (id: string | null) => book.groups.find((g) => g.id === id)?.name || 'another group'

  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<NodeKind>('character')
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const addNewMember = (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    // Drop the newcomer next to the rest of the group (or near the middle of the web if it's empty).
    const pool = members.length ? members : book.nodes
    const centre = pool.length
      ? {
          x: pool.reduce((s, n) => s + n.position.x, 0) / pool.length,
          y: pool.reduce((s, n) => s + n.position.y, 0) / pool.length,
        }
      : { x: 0, y: 0 }
    const spot = findOpenSpot(centre, book.nodes.map((n) => n.position), [0, 150, 230, 320, 440])
    const node = createNode(newKind, spot, { name, groupId: group.id })
    dispatch({ type: 'addNode', bookId: book.id, node })
    setNewName('')
    setJustAdded(name)
  }

  return (
    <PanelShell title="Group" onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input
          autoFocus={!group.name}
          value={group.name}
          placeholder="e.g. The Peaky Blinders, House Stark"
          onChange={(e) => update({ name: e.target.value })}
        />
      </label>

      <label className="field">
        <span>What brings them together?</span>
        <textarea
          rows={3}
          value={group.notes}
          placeholder="A gang, a family, a crew, a secret society…"
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>

      <div className="field">
        <span>Outline</span>
        <div className="swatches">
          {GROUP_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              className={`swatch group-style group-style-${s}${group.style === s ? ' is-on' : ''}`}
              aria-label={`Use the ${s} outline`}
              aria-pressed={group.style === s}
              onClick={() => update({ style: s })}
            />
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>
          Members <span className="count">{members.length}</span>
        </h3>
        {members.length === 0 ? (
          <p className="muted">Nobody yet. Add someone new or bring in someone already on the web.</p>
        ) : (
          <ul className="connection-list">
            {members.map((n) => (
              <li key={n.id}>
                <button type="button" className="connection-row" onClick={() => onSelectNode(n.id)}>
                  {n.kind === 'place' ? <PinIcon /> : <PersonIcon />}
                  <span className="connection-other">{displayName(n)}</span>
                  {n.role && <span className="connection-label member-role">{n.role}</span>}
                </button>
                <button type="button" className="text-btn small" onClick={() => setMember(n.id, null)} title="Take out of this group">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="add-connection" onSubmit={addNewMember}>
          <div className="add-connection-head">
            <GroupIcon /> Add a new member
          </div>
          <input value={newName} placeholder="Their name" onChange={(e) => setNewName(e.target.value)} />
          <div className="segmented small">
            {(['character', 'place'] as NodeKind[]).map((k) => (
              <button key={k} type="button" className={newKind === k ? 'is-on' : ''} onClick={() => setNewKind(k)}>
                {k === 'character' ? 'Character' : 'Place'}
              </button>
            ))}
          </div>
          <button type="submit" className="btn primary full" disabled={!newName.trim()}>
            Add to {group.name || 'group'}
          </button>
          {justAdded && <p className="added-note">Added {justAdded} ✓</p>}
        </form>

        {others.length > 0 && (
          <div className="field bring-in">
            <span>Bring in someone already on the web</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) setMember(e.target.value, group.id)
              }}
            >
              <option value="">Choose who…</option>
              {others.map((n) => (
                <option key={n.id} value={n.id}>
                  {displayName(n)}
                  {n.groupId ? ` (in ${groupName(n.groupId)})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ConfirmButton
        block
        className="btn danger-outline full"
        prompt={
          <>
            Remove this group?
            {members.length > 0 && ` ${members.length === 1 ? 'Its member stays' : `All ${members.length} members stay`} on the web.`}
          </>
        }
        onConfirm={() => {
          dispatch({ type: 'deleteGroup', bookId: book.id, id: group.id })
          onClose()
        }}
      >
        <TrashIcon /> Remove group
      </ConfirmButton>
    </PanelShell>
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
