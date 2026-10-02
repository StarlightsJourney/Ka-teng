import { useEffect, useMemo, useState } from 'react'
import { avatarImageStyle, displayInitials, formatLifespan, fullName, sanitizeAvatarUrl, type Person, type PersonId } from '../element'
import type { WorkspaceKind } from '../actions'

type PeopleTrayProps = {
  people: Person[]
  hasTree: boolean
  selectedId: PersonId | null
  draggingId: PersonId | null
  dropActive: boolean
  panelOpen: boolean
  workspace: WorkspaceKind
  sampleDirty: boolean
  canStartOver: boolean
  onNewPerson: () => void
  onSelect: (id: PersonId) => void
  onBeginDrag: (id: PersonId, x: number, y: number) => void
  onDelete: (id: PersonId) => void
  onSwitchWorkspace: (kind: WorkspaceKind) => void
  onStartOver: () => void
}

const VISIBLE_LIMIT = 80
const EXIT_MS = 260
const CRAMPED_WIDTH = 1100

const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
const SMALL_QUERY = '(max-width: 720px)'

function useSmallScreen(): boolean {
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(SMALL_QUERY).matches))
  useEffect(() => {
    const query = window.matchMedia?.(SMALL_QUERY)
    if (!query) return
    const update = () => setSmall(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return small
}

function displayName(person: Person): string {
  return fullName(person) === person.id ? 'Unnamed person' : fullName(person)
}

function TrayAvatar({ person }: { person: Person }) {
  const avatar = sanitizeAvatarUrl(person.avatar)
  return (
    <span className="tray-avatar">
      <span>{displayInitials(person)}</span>
      {avatar && <img src={avatar} alt="" style={avatarImageStyle(person.avatarFocus)} referrerPolicy="no-referrer" draggable={false} onError={(event) => event.currentTarget.classList.add('is-error')} />}
    </span>
  )
}

export function PeopleTray(props: PeopleTrayProps) {
  const small = useSmallScreen()
  const [open, setOpen] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.(SMALL_QUERY).matches))
  const [filter, setFilter] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<PersonId | null>(null)
  const [confirming, setConfirming] = useState<'sample-discard' | 'start-over' | null>(null)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, prefersReducedMotion() ? 0 : EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [closing])
  const close = () => setClosing(true)
  const [seenPanelOpen, setSeenPanelOpen] = useState(props.panelOpen)
  if (seenPanelOpen !== props.panelOpen) {
    setSeenPanelOpen(props.panelOpen)
    if (props.panelOpen && open && !small && window.innerWidth < CRAMPED_WIDTH) setClosing(true)
  }
  const [seenDraggingId, setSeenDraggingId] = useState(props.draggingId)
  if (seenDraggingId !== props.draggingId) {
    setSeenDraggingId(props.draggingId)
    if (props.draggingId && small) setOpen(false)
  }
  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return props.people
    return props.people.filter((person) => fullName(person).toLowerCase().includes(query)
      || (person.altNames?.some((name) => name.toLowerCase().includes(query)) ?? false))
  }, [filter, props.people])
  const visible = filtered.slice(0, VISIBLE_LIMIT)
  const switchWorkspace = (kind: WorkspaceKind) => {
    if (kind === props.workspace) return
    if (props.workspace === 'sample' && props.sampleDirty) setConfirming('sample-discard')
    else props.onSwitchWorkspace(kind)
  }
  const beginDrag = (person: Person) => (event: React.PointerEvent) => {
    if (event.button !== 0) return
    props.onBeginDrag(person.id, event.clientX, event.clientY)
  }

  if (small && !open) {
    return (
      <nav className={`people-inventory${props.dropActive ? ' is-drop-target' : ''}`} aria-label="People" data-drop-tray>
        <button type="button" className="inventory-new" onClick={props.onNewPerson} aria-label="New person" data-tooltip="New person">+</button>
        <div className="inventory-strip" role="list">
          {props.people.slice(0, VISIBLE_LIMIT).map((person) => (
            <button
              key={person.id}
              type="button"
              role="listitem"
              data-gender={person.gender}
              data-tray-person-id={person.id}
              className={`inventory-chip tray-card-main${props.draggingId === person.id ? ' is-dragging' : ''}`}
              title={`${displayName(person)} — drag up onto the tree`}
              onPointerDown={beginDrag(person)}
              onClick={() => props.onSelect(person.id)}
            >
              <TrayAvatar person={person} />
              <span className="inventory-name">{displayName(person)}</span>
            </button>
          ))}
          {!props.people.length && <span className="inventory-empty">{props.hasTree ? 'Everyone is on the tree' : 'Add someone to start'}</span>}
        </div>
        <button type="button" className="inventory-expand" onClick={() => setOpen(true)} aria-label="Open people list">
          <span className="people-tray-count">{props.people.length}</span>
        </button>
      </nav>
    )
  }

  if (!open) {
    return (
      <button type="button" className="people-rail" onClick={() => setOpen(true)} aria-label="Open people list" data-drop-tray>
        <span className="people-rail-label">People</span>
        <span className="people-tray-count">{props.people.length}</span>
      </button>
    )
  }

  return (
    <aside className={`people-tray is-sheet${props.dropActive ? ' is-drop-target' : ''}${closing ? ' is-closing' : ''}`} aria-label="People" data-drop-tray>
      <header className="people-tray-header">
        <div>
          <h2>People <span className="people-tray-count">{props.people.length}</span></h2>
          <p>{props.hasTree ? 'Drag someone onto a card to connect them' : 'Add someone to start your tree'}</p>
        </div>
        <button type="button" className="panel-close" onClick={close} aria-label="Collapse people list" data-tooltip="Hide">{small ? '×' : '‹'}</button>
      </header>
      <button type="button" className="btn-primary people-tray-new" onClick={props.onNewPerson}>+ New person</button>
      {props.people.length > 6 && (
        <input className="people-tray-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter people…" aria-label="Filter people" />
      )}
      <div className="people-tray-list" role="list">
        {visible.map((person) => (
          <div
            key={person.id}
            role="listitem"
            data-gender={person.gender}
            className={`tray-card${props.selectedId === person.id ? ' is-selected' : ''}${props.draggingId === person.id ? ' is-dragging' : ''}`}
            data-tray-person-id={person.id}
          >
            {confirmDeleteId === person.id
              ? (
                <div className="tray-card-confirm">
                  <span>Delete {displayName(person)} permanently?</span>
                  <div>
                    <button type="button" className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    <button type="button" className="btn-danger" onClick={() => { setConfirmDeleteId(null); props.onDelete(person.id) }}>Delete</button>
                  </div>
                </div>
              )
              : (
                <>
                  <button type="button" className="tray-card-main" title={`${displayName(person)} — drag onto the tree`} onPointerDown={beginDrag(person)} onClick={() => props.onSelect(person.id)}>
                    <span className="tray-grip" aria-hidden="true">⠿</span>
                    <TrayAvatar person={person} />
                    <span className="tray-copy">
                      <span className={`tray-name${fullName(person) === person.id ? ' is-unnamed' : ''}`}>{displayName(person)}</span>
                      {formatLifespan(person) && <span className="tray-life">{formatLifespan(person)}</span>}
                    </span>
                  </button>
                  <button type="button" className="tray-card-delete" aria-label={`Delete ${displayName(person)}`} title="Delete permanently" onClick={() => setConfirmDeleteId(person.id)}>×</button>
                </>
              )}
          </div>
        ))}
        {!props.people.length && (
          <p className="people-tray-empty">{props.hasTree ? 'Everyone is on the tree. Create a new person to add more.' : 'No people yet. Create your first person.'}</p>
        )}
        {props.people.length > 0 && !filtered.length && <p className="people-tray-empty">No one matches “{filter}”.</p>}
        {filtered.length > VISIBLE_LIMIT && <p className="people-tray-empty">Showing {VISIBLE_LIMIT} of {filtered.length}. Type to filter.</p>}
      </div>
      <footer className="people-tray-footer">
        {confirming
          ? (
            <div className="tray-workspace-confirm">
              <span>{confirming === 'sample-discard' ? 'Leave the sample family? Changes you made to it are discarded — your own tree is kept.' : 'Start a new, empty tree? Your current tree is cleared from this browser — save it to a file first if you want to keep it.'}</span>
              <div>
                <button type="button" className="btn-secondary" onClick={() => setConfirming(null)}>Cancel</button>
                <button type="button" className="btn-danger" onClick={() => {
                  setConfirming(null)
                  if (confirming === 'sample-discard') props.onSwitchWorkspace('blank')
                  else props.onStartOver()
                }}>{confirming === 'sample-discard' ? 'Leave sample' : 'Start over'}</button>
              </div>
            </div>
          )
          : (
            <>
              <div className="workspace-switch" role="group" aria-label="Workspace">
                <button type="button" className={props.workspace === 'blank' ? 'active' : ''} aria-pressed={props.workspace === 'blank'} onClick={() => switchWorkspace('blank')}>My tree</button>
                <button type="button" className={props.workspace === 'sample' ? 'active' : ''} aria-pressed={props.workspace === 'sample'} onClick={() => switchWorkspace('sample')}>Sample family</button>
              </div>
              {props.workspace === 'blank' && props.canStartOver && (
                <button type="button" className="btn-link people-start-over" onClick={() => setConfirming('start-over')}>Start a new tree…</button>
              )}
            </>
          )}
      </footer>
    </aside>
  )
}
