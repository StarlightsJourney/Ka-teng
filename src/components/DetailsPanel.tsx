import { useEffect, useMemo, useRef, useState } from 'react'
import { ageOf, displayInitials, fullName, getChildren, getParents, getSpouses, sanitizeAvatarUrl } from '../element'
import type { Gender, Person, PersonMap, RelationshipType } from '../element'
import type { PersonPatch } from '../actions'
import { PersonCard } from './PersonCard'

type DetailsPanelProps = {
  person: Person
  people: PersonMap
  editing: boolean
  onSelect: (id: string) => void
  onEdit: () => void
  onCancel: () => void
  onSave: (patch: PersonPatch) => void
  onRemove: () => void
  onClose: () => void
  onAddPerson: (relationship: RelationshipType) => void
  onConnectPerson: (relationship: RelationshipType) => void
  onDisconnectPerson: (id: string, relationship: RelationshipType) => void
  onPreviewRemove?: (id: string) => void
  onCancelRemove?: () => void
}

function RelationList({ people, type, onSelect, onDisconnect }: { people: Person[]; type: RelationshipType; onSelect: (id: string) => void; onDisconnect: (id: string, type: RelationshipType) => void }) {
  if (!people.length) return <p className="empty-relation">None listed</p>
  return (
    <div className="relation-list">
      {people.map((person) => {
        const safeAvatar = sanitizeAvatarUrl(person.avatar)
        return (
          <div key={person.id} className="relation-row">
            <button type="button" className="relation-row-main" onClick={() => onSelect(person.id)}>
              <span className="relation-avatar">
                <span>{displayInitials(person)}</span>
                {safeAvatar && <img src={safeAvatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
              </span>
              <span className="relation-row-name">{fullName(person)}</span>
            </button>
            <button type="button" className="relation-row-remove" aria-label={`Remove ${type}`} title={`Remove ${type}`} onClick={() => onDisconnect(person.id, type)}>×</button>
          </div>
        )
      })}
    </div>
  )
}

function EditForm({ person, people, onCancel, onSave, onRemove, onClose, onPreviewRemove, onCancelRemove }: { person: Person; people: PersonMap; onCancel: () => void; onSave: (patch: PersonPatch) => void; onRemove: () => void; onClose: () => void; onPreviewRemove?: (id: string) => void; onCancelRemove?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [first, setFirst] = useState(person.name.first)
  const [last, setLast] = useState(person.name.last)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [altNames, setAltNames] = useState((person.altNames ?? []).join(', '))
  const [chinese, setChinese] = useState(person.name.chinese ?? '')
  const [pinyin, setPinyin] = useState(person.name.pinyin ?? '')
  const [avatar, setAvatar] = useState(person.avatar ?? '')
  const [birthDate, setBirthDate] = useState(person.birthDate ?? '')
  const [birthYear, setBirthYear] = useState(person.birthDate ? '' : person.birth ?? '')
  const [deceased, setDeceased] = useState(person.deceased ?? Boolean(person.deathDate ?? person.death))
  const [deathDate, setDeathDate] = useState(person.deathDate ?? '')
  const [deathYear, setDeathYear] = useState(person.deathDate ? '' : person.death ?? '')
  const [restingPlace, setRestingPlace] = useState(person.restingPlace ?? '')
  const [bio, setBio] = useState(person.bio ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  useEffect(() => {
    if (confirmingRemove) onPreviewRemove?.(person.id)
    else onCancelRemove?.()
  }, [confirmingRemove, onPreviewRemove, onCancelRemove, person.id])
  const draft = useMemo<Person>(() => ({
    ...person,
    name: { ...person.name, first, last, chinese: chinese || undefined, pinyin: pinyin || undefined },
    gender, birth: birthYear || undefined, death: deathYear || undefined,
    birthDate: birthDate || undefined, deathDate: deathDate || undefined, deceased,
    restingPlace: restingPlace || undefined,
    altNames: altNames.split(',').map((value) => value.trim()).filter(Boolean),
    bio: bio || undefined, avatar: avatar || undefined,
  }), [altNames, avatar, bio, birthDate, birthYear, chinese, deathDate, deathYear, deceased, first, gender, last, person, pinyin, restingPlace])
  const age = ageOf(draft, new Date())
  const buildPatch = (): PersonPatch => ({
    first,
    last,
    chinese,
    pinyin,
    gender,
    birth: birthYear,
    death: deathYear,
    birthDate,
    deathDate,
    deceased,
    restingPlace,
    altNames: draft.altNames,
    bio,
    avatar,
  })
  const handleUpload = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const safe = sanitizeAvatarUrl(typeof reader.result === 'string' ? reader.result : undefined)
      if (safe) setAvatar(safe)
    })
    reader.readAsDataURL(file)
  }
  const handleSaveAndClose = () => {
    onSave(buildPatch())
    onClose()
  }
  const handleCancelRef = useRef(onCancel)
  useEffect(() => {
    handleCancelRef.current = onCancel
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleCancelRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
  return (
    <form className="form-sheet" onSubmit={(event) => {
      event.preventDefault()
      onSave(buildPatch())
    }}>
      <div className="person-edit-header"><strong>Edit person</strong><button type="button" className="panel-close" onClick={handleSaveAndClose} aria-label="Save and close details">×</button></div>
      <section className="form-section compact">
        <div className="form-row">
          <label>First name <span className="field-required">(required)</span><input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="First name" /></label>
          <label>Last name <span className="field-required">(required)</span><input value={last} onChange={(event) => setLast(event.target.value)} placeholder="Last name" /></label>
        </div>
        <div className="form-row">
          <label>Chinese name <span className="field-optional">(optional)</span><input value={chinese} onChange={(event) => setChinese(event.target.value)} placeholder="中文名" /></label>
          <label>Pinyin <span className="field-optional">(optional)</span><input value={pinyin} onChange={(event) => setPinyin(event.target.value)} placeholder="Pinyin" /></label>
        </div>
        <div className="form-row short">
          <label>Also known as <span className="field-optional">(optional)</span><input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Nicknames, separated by commas" /></label>
        </div>
        <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}><option value="M">Male</option><option value="F">Female</option><option value="X">Other</option><option value="U">Unknown</option></select></label>
      </section>
      <section className="form-section compact">
        <div className="photo-edit-row centered">
          <button type="button" className="photo-preview" onClick={() => fileRef.current?.click()} aria-label="Upload photo">
            {sanitizeAvatarUrl(avatar) ? <img src={sanitizeAvatarUrl(avatar)} alt="" onError={() => setAvatar('')} /> : <span>{displayInitials(draft)}</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} hidden />
        </div>
        <label className="file-upload-label">
          <input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
          Upload photo
        </label>
        <label>Photo URL <span className="field-optional">(optional)</span><input value={avatar.startsWith('data:') ? '' : avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="Image address" /></label>
      </section>
      <section className="form-section compact">
        <div className="form-row">
          <label>Birth date <span className="field-optional">(optional)</span><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
          <label>Birth year <span className="field-optional">(optional)</span><input value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="YYYY" pattern="\d{0,4}" /></label>
        </div>
        <label className="toggle-row"><input type="checkbox" checked={deceased} onChange={(event) => setDeceased(event.target.checked)} /> Deceased</label>
        {deceased && <>
          <div className="form-row">
            <label>Death date <span className="field-optional">(optional)</span><input type="date" value={deathDate} onChange={(event) => setDeathDate(event.target.value)} /></label>
            <label>Death year <span className="field-optional">(optional)</span><input value={deathYear} onChange={(event) => setDeathYear(event.target.value)} placeholder="YYYY" pattern="\d{0,4}" /></label>
          </div>
          <label>Resting place <span className="field-optional">(optional)</span><input value={restingPlace} onChange={(event) => setRestingPlace(event.target.value)} placeholder="Cemetery or memorial" /></label>
        </>}
        {age !== undefined && <p className="computed-age">{deceased ? `Died aged ${age}` : `Age ${age}`}</p>}
      </section>
      <section className="form-section compact">
        <label>Bio <span className="field-optional">(optional)</span><textarea value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="Short biography…" /></label>
        <p className="bio-counter">{bio.length}/500</p>
      </section>
      <div className="form-actions"><button type="submit" className="btn-primary">Save</button><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button></div>
      {!confirmingRemove
        ? <button type="button" className="remove-person-link" onClick={() => setConfirmingRemove(true)}>Remove person…</button>
        : (
          <div className="remove-confirm">
            <p><strong>Remove {fullName(person)}?</strong> This will detach them from the family tree. The people below will lose this connection.</p>
            <ul className="remove-affected">
              {[...(person.parents ?? []), ...(person.spouses ?? []), ...(person.children ?? [])].map((id) => {
                const affected = people.get(id)
                return affected ? <li key={id}>{fullName(affected)}</li> : null
              }).filter(Boolean)}
            </ul>
            <label>Type their full name to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={fullName(person)} /></label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirmingRemove(false)}>Cancel</button>
              <button type="button" className="btn-danger" disabled={confirmation !== fullName(person)} onClick={onRemove}>Remove person</button>
            </div>
          </div>
        )}
    </form>
  )
}

export function DetailsPanel({ person, people, editing, onSelect, onEdit, onCancel, onSave, onRemove, onClose, onAddPerson, onConnectPerson, onDisconnectPerson, onPreviewRemove, onCancelRemove }: DetailsPanelProps) {
  const age = ageOf(person, new Date())
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
    <aside ref={panelRef} className="details-panel">
      <div
        className="details-panel-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {editing
        ? <EditForm key={person.id} person={person} people={people} onCancel={onCancel} onSave={onSave} onRemove={onRemove} onClose={onClose} onPreviewRemove={onPreviewRemove} onCancelRemove={onCancelRemove} />
        : <PersonCard person={person} onEdit={onEdit} onClose={onClose} />}
      {!editing && (
        <>
          {(person.altNames?.length || person.bio || person.restingPlace || age !== undefined) && <div className="person-extra">
            {age !== undefined && <p className="age-line">{person.death || person.deathDate ? `Died aged ${age}` : `Age ${age}`}</p>}
            {person.altNames?.length ? <p><strong>Also known as:</strong> {person.altNames.join(', ')}</p> : null}
            {person.restingPlace && <p><strong>Resting place:</strong> {person.restingPlace}</p>}
            {person.bio && <p className="person-bio">{person.bio}</p>}
          </div>}
          <div className="relationship-section">
            <h2>Parents</h2>
            <RelationList people={getParents(person, people)} type="parent" onSelect={onSelect} onDisconnect={onDisconnectPerson} />
            <div className="relationship-actions">
              <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('parent')}>+ Add parent</button>
              <button type="button" className="add-relationship-btn" onClick={() => onConnectPerson('parent')}>↔ Connect parent</button>
            </div>
          </div>
          <div className="relationship-section">
            <h2>Spouses</h2>
            <RelationList people={getSpouses(person, people)} type="spouse" onSelect={onSelect} onDisconnect={onDisconnectPerson} />
            <div className="relationship-actions">
              <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('spouse')}>+ Add spouse</button>
              <button type="button" className="add-relationship-btn" onClick={() => onConnectPerson('spouse')}>↔ Connect spouse</button>
            </div>
          </div>
          <div className="relationship-section">
            <h2>Children</h2>
            <RelationList people={getChildren(person, people)} type="child" onSelect={onSelect} onDisconnect={onDisconnectPerson} />
            <div className="relationship-actions">
              <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('child')}>+ Add child</button>
              <button type="button" className="add-relationship-btn" onClick={() => onConnectPerson('child')}>↔ Connect child</button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
