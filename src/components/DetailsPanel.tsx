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
}

function RelationList({ people, onSelect }: { people: Person[]; onSelect: (id: string) => void }) {
  if (!people.length) return <p className="empty-relation">None listed</p>
  return (
    <div className="relation-list">
      {people.map((person) => {
        const safeAvatar = sanitizeAvatarUrl(person.avatar)
        return (
          <button key={person.id} type="button" className="relation-row" onClick={() => onSelect(person.id)}>
            <span className="relation-avatar">
              <span>{displayInitials(person)}</span>
              {safeAvatar && <img src={safeAvatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
            </span>
            <span>{fullName(person)}</span>
          </button>
        )
      })}
    </div>
  )
}

function EditForm({ person, onCancel, onSave, onRemove, onClose }: { person: Person; onCancel: () => void; onSave: (patch: PersonPatch) => void; onRemove: () => void; onClose: () => void }) {
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
  const handleSaveAndCloseRef = useRef(handleSaveAndClose)
  useEffect(() => {
    handleSaveAndCloseRef.current = handleSaveAndClose
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleSaveAndCloseRef.current()
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
      <section className="form-section"><h3>Identity</h3>
        <div className="form-row">
          <label>First name<input value={first} onChange={(event) => setFirst(event.target.value)} /></label>
          <label>Last name<input value={last} onChange={(event) => setLast(event.target.value)} /></label>
        </div>
        <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}><option value="M">Male</option><option value="F">Female</option><option value="X">Other</option><option value="U">Unknown</option></select></label>
        <label>Alternative names<input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Comma-separated names" /></label>
        <label>Chinese name<input value={chinese} onChange={(event) => setChinese(event.target.value)} /></label>
        <label>Pinyin<input value={pinyin} onChange={(event) => setPinyin(event.target.value)} /></label>
      </section>
      <section className="form-section"><h3>Photo</h3>
        <div className="photo-edit-row"><span className="photo-preview">{sanitizeAvatarUrl(avatar) ? <img src={sanitizeAvatarUrl(avatar)} alt="" onError={() => setAvatar('')} /> : <span>{displayInitials(draft)}</span>}</span><label>Photo URL<input value={avatar.startsWith('data:') ? '' : avatar} onChange={(event) => setAvatar(event.target.value)} /></label></div>
        <label className="file-input">Upload<input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} /></label>
      </section>
      <section className="form-section"><h3>Life</h3>
        <div className="form-row">
          <label>Birth date<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
          <label>Birth year only<input value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="YYYY" /></label>
        </div>
        <label className="toggle-row"><input type="checkbox" checked={deceased} onChange={(event) => setDeceased(event.target.checked)} /> Deceased</label>
        {deceased && <>
          <div className="form-row">
            <label>Death date<input type="date" value={deathDate} onChange={(event) => setDeathDate(event.target.value)} /></label>
            <label>Death year only<input value={deathYear} onChange={(event) => setDeathYear(event.target.value)} placeholder="YYYY" /></label>
          </div>
          <label>Resting place / cemetery<input value={restingPlace} onChange={(event) => setRestingPlace(event.target.value)} /></label>
        </>}
        {age !== undefined && <p className="computed-age">{deceased ? `Died aged ${age}` : `Age ${age}`}</p>}
      </section>
      <section className="form-section"><h3>About</h3><label>Bio<textarea value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} /></label><div className="bio-counter">{bio.length}/500</div></section>
      <div className="form-actions"><button type="submit" className="btn-primary">Save</button><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button></div>
      {!confirmingRemove ? <button type="button" className="remove-person-link" onClick={() => setConfirmingRemove(true)}>Remove person…</button> : <div className="remove-confirm"><p>This removes {fullName(person)} and detaches them from {(person.parents?.length ?? 0) + (person.spouses?.length ?? 0) + (person.children?.length ?? 0)} parents/spouses/children. This cannot be undone. Type their full name to confirm.</p><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-label="Confirm person removal" /><button type="button" className="btn-danger" disabled={confirmation !== fullName(person)} onClick={onRemove}>Remove person</button></div>}
    </form>
  )
}

export function DetailsPanel({ person, people, editing, onSelect, onEdit, onCancel, onSave, onRemove, onClose, onAddPerson }: DetailsPanelProps) {
  const age = ageOf(person, new Date())
  return (
    <aside className="details-panel">
      {editing
        ? <EditForm key={person.id} person={person} onCancel={onCancel} onSave={onSave} onRemove={onRemove} onClose={onClose} />
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
            <RelationList people={getParents(person, people)} onSelect={onSelect} />
            <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('parent')}>+ Add parent</button>
          </div>
          <div className="relationship-section">
            <h2>Spouses</h2>
            <RelationList people={getSpouses(person, people)} onSelect={onSelect} />
            <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('spouse')}>+ Add spouse</button>
          </div>
          <div className="relationship-section">
            <h2>Children</h2>
            <RelationList people={getChildren(person, people)} onSelect={onSelect} />
            <button type="button" className="add-relationship-btn" onClick={() => onAddPerson('child')}>+ Add child</button>
          </div>
        </>
      )}
    </aside>
  )
}
