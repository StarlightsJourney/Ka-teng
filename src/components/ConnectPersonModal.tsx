import { useMemo, useState } from 'react'
import { canConnectRelationship, displayInitials, formatLifespan, fullName, type Person, type PersonMap, type RelationshipType } from '../element'

type ConnectPersonModalProps = {
  selected: Person
  people: PersonMap
  relationship: RelationshipType
  onClose: () => void
  onConnect: (personId: string, relationship: RelationshipType) => void
}

const labels: Record<RelationshipType, string> = {
  parent: 'parent',
  spouse: 'spouse',
  child: 'child',
}

export function ConnectPersonModal({ selected, people, relationship, onClose, onConnect }: ConnectPersonModalProps) {
  const [chosen, setChosen] = useState<RelationshipType>(relationship)
  const [query, setQuery] = useState('')
  const [candidateId, setCandidateId] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...people.values()]
      .filter((person) => person.id !== selected.id && canConnectRelationship(people, selected.id, person.id, chosen))
      .filter((person) => {
        if (!normalized) return true
        const name = fullName(person).toLowerCase()
        return name.includes(normalized) || (person.altNames?.some((value) => value.toLowerCase().includes(normalized)) ?? false)
      })
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
  }, [chosen, people, query, selected.id])

  const selectedCandidate = candidateId ? people.get(candidateId) : undefined
  const valid = selectedCandidate && canConnectRelationship(people, selected.id, selectedCandidate.id, chosen)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCandidate) return
    onConnect(selectedCandidate.id, chosen)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Connect an existing ${labels[chosen]}`}>
        <div className="modal-header">
          <h2>Connect existing {labels[chosen]}</h2>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>
          <section className="form-section compact">
            <div className="relationship-options clean">
              {(['parent', 'spouse', 'child'] as RelationshipType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`relationship-option ${chosen === type ? 'active' : ''}`}
                  onClick={() => { setChosen(type); setCandidateId(null) }}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>
          <section className="form-section">
            <h3>Search</h3>
            <input value={query} onChange={(event) => { setQuery(event.target.value); setCandidateId(null) }} placeholder="Type a name…" autoFocus />
            <div className="connect-candidates">
              {candidates.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`connect-candidate ${candidateId === person.id ? 'active' : ''}`}
                  onClick={() => setCandidateId(person.id)}
                >
                  <span className="connect-avatar">{displayInitials(person)}</span>
                  <span className="connect-name">{fullName(person)}</span>
                  <span className="connect-life">{formatLifespan(person)}</span>
                </button>
              ))}
              {candidates.length === 0 && <p className="empty-relation">No matching people can be connected as a {labels[chosen]}.</p>}
            </div>
          </section>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!valid}>Connect</button>
          </div>
        </form>
      </div>
    </div>
  )
}
