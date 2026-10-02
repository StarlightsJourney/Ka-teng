import { useEffect, useMemo, useRef, useState } from 'react'
import { avatarImageStyle, ageOf, childIdsOf, displayInitials, fullName, isDeceased, lifespan, linkedSiblingIdsOf, parentIdsOf, parseName, sanitizeAvatarUrl, spouseIdsOf } from '../element'
import type { AvatarFocus, Gender, Kinship, Person, PersonMap, RelationshipType } from '../element'
import { removalImpact, type PersonPatch } from '../actions'

import { PersonCard } from './PersonCard'
import { LifeFields, PhotoNameRow, type LifeValue } from './PersonFields'

type DetailsPanelProps = {
  person: Person
  people: PersonMap
  closing?: boolean
  onSelect: (id: string) => void
  onEdit: () => void
  onClose: () => void
  onAddPerson: (kin: Kinship) => void
  onDisconnectPerson: (id: string, relationship: RelationshipType) => void
}

const RELATION_PREVIEW = 4

function RelationList({ people, type, onSelect, onDisconnect }: { people: Person[]; type: Kinship; onSelect: (id: string) => void; onDisconnect?: (id: string, type: RelationshipType) => void }) {
  const [expanded, setExpanded] = useState(false)
  if (!people.length) return <p className="empty-relation">None listed</p>
  const collapsible = people.length > RELATION_PREVIEW + 1
  const shown = collapsible && !expanded ? people.slice(0, RELATION_PREVIEW) : people
  return (
    <div className="relation-list">
      {shown.map((person) => {
        const safeAvatar = sanitizeAvatarUrl(person.avatar)
        const name = fullName(person)
        const span = lifespan(person)
        return (
          <div key={person.id} className="relation-row" data-gender={person.gender}>
            <button type="button" className="relation-row-main" onClick={() => onSelect(person.id)} title={name}>
              <span className="relation-avatar">
                <span>{displayInitials(person)}</span>
                {safeAvatar && <img src={safeAvatar} alt="" style={avatarImageStyle(person.avatarFocus)} referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
              </span>
              <span className="relation-row-copy">
                <span className="relation-row-name">{name}</span>
                {span && <span className="relation-row-life">{span}</span>}
              </span>
            </button>
            {onDisconnect && <button type="button" className="relation-row-remove" aria-label={`Remove ${type} ${name}`} title={`Unlink ${type}`} onClick={() => onDisconnect(person.id, type)}>×</button>}
          </div>
        )
      })}
      {collapsible && (
        <button type="button" className="relation-toggle" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Show fewer' : `Show all ${people.length}`}
        </button>
      )}
    </div>
  )
}

function RelationshipSection({ title, type, people, onSelect, onDisconnect, onAdd }: { title: string; type: Kinship; people: Person[]; onSelect: (id: string) => void; onDisconnect?: (id: string, type: RelationshipType) => void; onAdd: (type: Kinship) => void }) {
  return (
    <section className="relationship-section">
      <div className="relationship-heading">
        <h2>{title}</h2>
        <span className="relationship-count">{people.length}</span>
        <button type="button" className="add-relationship-btn" onClick={() => onAdd(type)} aria-label={`Add ${type}`}>+ Add {type}</button>
      </div>
      <RelationList people={people} type={type} onSelect={onSelect} onDisconnect={onDisconnect} />
    </section>
  )
}

type EditPersonModalProps = {
  person: Person
  people: PersonMap
  focusId: string | null
  onCancel: () => void
  onSave: (patch: PersonPatch) => void
  onRemove: () => void
  onDisconnectSibling: (id: string) => void
  onPreviewRemove?: (id: string) => void
  onCancelRemove?: () => void
}

function PeopleChips({ ids, people, tone }: { ids: string[]; people: PersonMap; tone?: 'leaving' }) {
  return (
    <ul className={`remove-affected${tone === 'leaving' ? ' is-leaving' : ''}`}>
      {byIds(ids, people).map((relative) => <li key={relative.id} data-gender={relative.gender} title={fullName(relative)}>{fullName(relative)}</li>)}
    </ul>
  )
}

export function EditPersonModal(props: EditPersonModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.currentTarget === event.target) props.onCancel() }}>
      <div className="modal edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${fullName(props.person)}`}>
        <EditForm key={props.person.id} {...props} />
      </div>
    </div>
  )
}

function EditForm({ person, people, focusId, onCancel, onSave, onRemove, onDisconnectSibling, onPreviewRemove, onCancelRemove }: EditPersonModalProps) {
  const initialName = `${person.name.first} ${person.name.last}`.trim()
  const [name, setName] = useState(initialName)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [life, setLife] = useState<LifeValue>(() => ({
    birthDate: person.birthDate ?? person.birth,
    deceased: isDeceased(person),
    deathDate: person.deathDate ?? person.death,
    restingPlace: person.restingPlace ?? '',
  }))
  const [avatar, setAvatar] = useState(person.avatar ?? '')
  const [avatarFocus, setAvatarFocus] = useState<AvatarFocus | undefined>(person.avatarFocus)
  const [bio, setBio] = useState(person.bio ?? '')
  const [showMore, setShowMore] = useState(false)
  const [chinese, setChinese] = useState(person.name.chinese ?? '')
  const [pinyin, setPinyin] = useState(person.name.pinyin ?? '')
  const [altNames, setAltNames] = useState((person.altNames ?? []).join(', '))
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (confirmingRemove) onPreviewRemove?.(person.id)
    else onCancelRemove?.()
  }, [confirmingRemove, onPreviewRemove, onCancelRemove, person.id])
  const parsedName = useMemo(() => parseName(name), [name])
  const draft = useMemo<Person>(() => ({
    ...person,
    name: { first: parsedName.first, last: parsedName.last, chinese: chinese || undefined, pinyin: pinyin || undefined },
    gender,
    birth: undefined,
    birthDate: life.birthDate,
    death: undefined,
    deathDate: life.deceased ? life.deathDate : undefined,
    deceased: life.deceased,
    restingPlace: life.deceased ? life.restingPlace || undefined : undefined,
    altNames: altNames.split(',').map((value) => value.trim()).filter(Boolean),
    bio: bio || undefined, avatar: avatar || undefined, avatarFocus: avatar ? avatarFocus : undefined,
  }), [altNames, avatar, avatarFocus, bio, chinese, gender, life, parsedName, person, pinyin])
  const age = ageOf(draft, new Date())
  const buildPatch = (): PersonPatch => ({
    first: parsedName.first,
    last: parsedName.last,
    chinese,
    pinyin,
    gender,
    birth: '',
    birthDate: life.birthDate ?? '',
    death: '',
    deathDate: life.deceased ? life.deathDate ?? '' : '',
    deceased: life.deceased,
    restingPlace: life.deceased ? life.restingPlace : '',
    altNames: draft.altNames,
    bio,
    avatar,
    avatarFocus: avatar ? avatarFocus ?? null : null,
  })
  const handleCancelRef = useRef(onCancel)
  const confirmingRef = useRef(confirmingRemove)
  useEffect(() => {
    handleCancelRef.current = onCancel
    confirmingRef.current = confirmingRemove
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (confirmingRef.current) setConfirmingRemove(false)
        else handleCancelRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
  const impact = useMemo(() => confirmingRemove ? removalImpact(people, person.id, focusId) : { connections: [], leaving: [] }, [confirmingRemove, focusId, people, person.id])
  const personName = fullName(person)
  const siblingLinks = (['full', 'step'] as const).flatMap((kind) => linkedSiblingIdsOf(people, person.id, kind)
    .map((id) => people.get(id))
    .filter((relative): relative is Person => Boolean(relative))
    .map((relative) => ({ relative, kind })))
  return (
    <form className="form-sheet edit-sheet" onSubmit={(event) => {
      event.preventDefault()
      if (!name.trim()) {
        setTouched(true)
        return
      }
      onSave(buildPatch())
    }}>
      <div className="person-edit-header">
        <strong>Edit person</strong>
      </div>
      <section className="form-section compact">
        <PhotoNameRow
          avatar={avatar}
          avatarFocus={avatarFocus}
          gender={gender}
          initials={displayInitials(draft)}
          name={name}
          showError={touched && !name.trim()}
          onAvatarChange={setAvatar}
          onAvatarFocusChange={setAvatarFocus}
          onGenderChange={setGender}
          onNameChange={setName}
        />
        <LifeFields value={life} onChange={setLife} age={age} />
        <label><span className="field-label">Bio<span className="field-hint">{bio.length}/500</span></span><textarea value={bio} maxLength={500} rows={2} onChange={(event) => setBio(event.target.value)} placeholder="Short description…" /></label>
      </section>
      <button type="button" className="more-details-toggle" onClick={() => setShowMore((current) => !current)} aria-expanded={showMore}>
        {showMore ? '▾ Fewer details' : '▸ More details'}
      </button>
      {showMore && (
        <section className="form-section compact">
          <div className="form-row">
            <label><span className="field-label">Chinese name</span><input value={chinese} onChange={(event) => setChinese(event.target.value)} placeholder="中文名" /></label>
            <label><span className="field-label">Pinyin</span><input value={pinyin} onChange={(event) => setPinyin(event.target.value)} placeholder="Pinyin" /></label>
          </div>
          <label><span className="field-label">Also known as</span><input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Nicknames, separated by commas" /></label>
        </section>
      )}
      {siblingLinks.length > 0 && (
        <section className="form-section compact sibling-links">
          <span className="field-label">Sibling links</span>
          <div className="sibling-link-chips">
            {siblingLinks.map(({ relative, kind }) => (
              <span key={relative.id} className="sibling-link-chip" data-gender={relative.gender}>
                {fullName(relative)}{kind === 'step' ? ' · step' : ''}
                <button type="button" aria-label={`Unlink ${fullName(relative)}`} title="Unlink" onClick={() => onDisconnectSibling(relative.id)}>×</button>
              </span>
            ))}
          </div>
        </section>
      )}
      {confirmingRemove
        ? (
          <div className="remove-confirm" role="alertdialog" aria-label={`Remove ${personName} from the tree`}>
            <p className="remove-confirm-title">Remove {personName} from the tree?</p>
            <p>{person.name.first || personName} moves to your People list, so you can reconnect them later.</p>
            {impact.connections.length > 0 && (
              <>
                <p className="remove-confirm-label">These connections are removed — the people stay:</p>
                <PeopleChips ids={impact.connections} people={people} />
              </>
            )}
            {impact.leaving.length > 0
              ? (
                <>
                  <p className="remove-confirm-label">Without {person.name.first || personName}, these people are no longer connected to the rest of the tree and also move to People:</p>
                  <PeopleChips ids={impact.leaving} people={people} tone="leaving" />
                </>
              )
              : impact.connections.length > 0 && <p className="remove-confirm-label">Everyone else stays in the tree.</p>}
            <div className="remove-confirm-actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirmingRemove(false)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={onRemove}>Remove from tree</button>
            </div>
          </div>
        )
        : (
          <div className="form-actions">
            <button type="button" className="remove-person-link" onClick={() => setConfirmingRemove(true)}>Remove from tree…</button>
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        )}
    </form>
  )
}

function byIds(ids: string[], people: PersonMap): Person[] {
  return ids.map((id) => people.get(id)).filter((person): person is Person => Boolean(person))
}

export function DetailsPanel({ person, people, closing = false, onSelect, onEdit, onClose, onAddPerson, onDisconnectPerson }: DetailsPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth > 720) return
    dragRef.current = { startY: event.clientY, startHeight: panelRef.current?.offsetHeight ?? 0 }
    panelRef.current?.classList.add('dragging')
    ;(event.target as HTMLDivElement).setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !panelRef.current) return
    const delta = dragRef.current.startY - event.clientY
    const maxHeight = window.innerHeight * 0.85
    const newHeight = Math.max(200, Math.min(maxHeight, dragRef.current.startHeight + delta))
    panelRef.current.style.height = `${newHeight}px`
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    panelRef.current?.classList.remove('dragging')
    ;(event.target as HTMLDivElement).releasePointerCapture?.(event.pointerId)
  }

  return (
    <aside ref={panelRef} className={`details-panel${closing ? ' is-closing' : ''}`} aria-hidden={closing || undefined}>
      <div
        className="details-panel-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <PersonCard person={person} onEdit={onEdit} onClose={onClose} />
      <RelationshipSection title="Parents" type="parent" people={byIds(parentIdsOf(people, person.id), people)} onSelect={onSelect} onDisconnect={onDisconnectPerson} onAdd={onAddPerson} />
      <RelationshipSection title="Spouses" type="spouse" people={byIds(spouseIdsOf(people, person.id), people)} onSelect={onSelect} onDisconnect={onDisconnectPerson} onAdd={onAddPerson} />
      <RelationshipSection title="Children" type="child" people={byIds(childIdsOf(people, person.id), people)} onSelect={onSelect} onDisconnect={onDisconnectPerson} onAdd={onAddPerson} />
    </aside>
  )
}
