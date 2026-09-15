import { getChildren, getParents, getSpouses, fullName } from '../element'
import type { Person, PersonMap } from '../element'
import { PersonCard } from './PersonCard'

type DetailsPanelProps = {
  person: Person
  people: PersonMap
  onSelect: (id: string) => void
}

function RelationList({ people, onSelect }: { people: Person[]; onSelect: (id: string) => void }) {
  if (!people.length) return <p className="empty-relation">None listed</p>
  return (
    <div className="relation-list">
      {people.map((person) => (
        <button key={person.id} type="button" className="relation-link" onClick={() => onSelect(person.id)}>
          {fullName(person)}
        </button>
      ))}
    </div>
  )
}

export function DetailsPanel({ person, people, onSelect }: DetailsPanelProps) {
  return (
    <aside className="details-panel">
      <PersonCard person={person} />
      <dl className="metadata">
        <div><dt>Gender</dt><dd>{person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'}</dd></div>
        <div><dt>Birthday</dt><dd>{person.birth ?? 'Not listed'}</dd></div>
        <div><dt>Death</dt><dd>{person.death ?? 'Not listed'}</dd></div>
      </dl>
      <div className="relationship-section"><h2>Parents</h2><RelationList people={getParents(person, people)} onSelect={onSelect} /></div>
      <div className="relationship-section"><h2>Spouses</h2><RelationList people={getSpouses(person, people)} onSelect={onSelect} /></div>
      <div className="relationship-section"><h2>Children</h2><RelationList people={getChildren(person, people)} onSelect={onSelect} /></div>
    </aside>
  )
}
