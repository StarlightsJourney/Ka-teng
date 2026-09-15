import { useState } from 'react'
import { displayInitials, getChildren, getParents, getSpouses, fullName } from '../element'
import type { Gender, Person, PersonMap } from '../element'
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
  onClose: () => void
}

function RelationList({ people, onSelect }: { people: Person[]; onSelect: (id: string) => void }) {
  if (!people.length) return <p className="empty-relation">None listed</p>
  return (
    <div className="relation-list">
      {people.map((person) => (
        <button key={person.id} type="button" className="relation-row" onClick={() => onSelect(person.id)}>
          <span className="relation-avatar">
            <span>{displayInitials(person)}</span>
            {person.avatar && <img src={person.avatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
          </span>
          <span>{fullName(person)}</span>
        </button>
      ))}
    </div>
  )
}

function EditForm({ person, onCancel, onSave, onClose }: { person: Person; onCancel: () => void; onSave: (patch: PersonPatch) => void; onClose: () => void }) {
  const [first, setFirst] = useState(person.name.first)
  const [last, setLast] = useState(person.name.last)
  const [gender, setGender] = useState<Gender>(person.gender)
  const [birth, setBirth] = useState(person.birth ?? '')
  const [death, setDeath] = useState(person.death ?? '')
  const [avatar, setAvatar] = useState(person.avatar ?? '')
  return (
    <form className="person-edit" onSubmit={(event) => {
      event.preventDefault()
      onSave({ first, last, gender, birth, death, avatar })
    }}>
      <div className="person-edit-header"><strong>Edit person</strong><button type="button" className="panel-close" onClick={onClose} aria-label="Close details">×</button></div>
      <label>First name<input value={first} onChange={(event) => setFirst(event.target.value)} /></label>
      <label>Last name<input value={last} onChange={(event) => setLast(event.target.value)} /></label>
      <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}><option value="M">Male</option><option value="F">Female</option><option value="U">Unknown</option></select></label>
      <label>Birth year<input value={birth} onChange={(event) => setBirth(event.target.value)} /></label>
      <label>Death year<input value={death} onChange={(event) => setDeath(event.target.value)} /></label>
      <label>Photo URL<input value={avatar} onChange={(event) => setAvatar(event.target.value)} /></label>
      <div className="person-edit-actions"><button type="submit">Save</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}

export function DetailsPanel({ person, people, editing, onSelect, onEdit, onCancel, onSave, onClose }: DetailsPanelProps) {
  return (
    <aside className="details-panel">
      {editing
        ? <EditForm key={person.id} person={person} onCancel={onCancel} onSave={onSave} onClose={onClose} />
        : <PersonCard person={person} onEdit={onEdit} onClose={onClose} />}
      {!editing && (
        <>
          <div className="relationship-section"><h2>Parents</h2><RelationList people={getParents(person, people)} onSelect={onSelect} /></div>
          <div className="relationship-section"><h2>Spouses</h2><RelationList people={getSpouses(person, people)} onSelect={onSelect} /></div>
          <div className="relationship-section"><h2>Children</h2><RelationList people={getChildren(person, people)} onSelect={onSelect} /></div>
        </>
      )}
    </aside>
  )
}
