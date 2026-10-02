import { useEffect, useMemo, useRef, useState } from 'react'
import { avatarImageStyle, canConnectKin, displayInitials, kinCheckerFor, formatLifespan, fullName, kinLabels, kinOrder, sanitizeAvatarUrl, type Kinship, type Person, type PersonId, type PersonMap } from '../element'

type AddRelativeModalProps = {
  selected: Person
  people: PersonMap
  kin: Kinship
  onClose: () => void
  onConnect: (personId: PersonId, kin: Kinship) => void
  onCreateNew: (name: string, kin: Kinship) => void
}

export function AddRelativeModal({ selected, people, kin: initialKin, onClose, onConnect, onCreateNew }: AddRelativeModalProps) {
  const [kin, setKin] = useState<Kinship>(initialKin)
  const [query, setQuery] = useState('')
  const [candidateId, setCandidateId] = useState<PersonId | null>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeRef.current()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const chooseKin = (next: Kinship) => {
    setKin(next)
    setCandidateId(null)
  }

  const canLink = useMemo(() => kinCheckerFor(people, selected.id), [people, selected.id])
  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...people.values()]
      .filter((person) => {
        if (person.id === selected.id) return false
        if (!normalized) return true
        return fullName(person).toLowerCase().includes(normalized)
          || (person.altNames?.some((value) => value.toLowerCase().includes(normalized)) ?? false)
      })
      .filter((person) => canLink(person.id, kin))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .slice(0, 80)
  }, [canLink, kin, people, query, selected.id])

  const selectedCandidate = candidateId ? people.get(candidateId) : undefined
  const valid = Boolean(selectedCandidate && canConnectKin(people, selectedCandidate.id, selected.id, kin))
  const selectedName = fullName(selected)
  const kinLabel = kinLabels[kin].toLowerCase()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (selectedCandidate && valid) onConnect(selectedCandidate.id, kin)
    else if (!selectedCandidate && query.trim()) onCreateNew(query.trim(), kin)
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.currentTarget === event.target) onClose() }} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Add a ${kinLabel} to ${selectedName}`}>
        <div className="modal-header">
          <h2>Add {kinLabel}</h2>
          <p className="modal-subtitle" title={selectedName}>to {selectedName}</p>
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>
          <section className="form-section compact">
            <div className="relationship-options clean" role="group" aria-label="Relationship">
              {kinOrder.map((type) => (
                <button key={type} type="button" className={`relationship-option ${kin === type ? 'active' : ''}`} aria-pressed={kin === type} onClick={() => chooseKin(type)}>
                  {kinLabels[type]}
                </button>
              ))}
            </div>
          </section>
          <section className="form-section compact connect-search">
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCandidateId(null) }} placeholder="Search people or type a new name…" aria-label="Search people or type a new name" autoFocus />
            <div className="connect-candidates" role="listbox" aria-label="People">
              <button
                type="button"
                className="connect-candidate connect-create"
                onClick={() => onCreateNew(query.trim(), kin)}
              >
                <span className="connect-avatar" aria-hidden="true">+</span>
                <span className="connect-copy">
                  <span className="connect-name">{query.trim() ? `Create “${query.trim()}”` : 'Create a new person'}</span>
                  <span className="connect-life">New {kinLabel} of {selected.name.first || selectedName}</span>
                </span>
              </button>
              {candidates.length > 0 && <p className="connect-divider">Or choose someone already here</p>}
              {candidates.map((person) => {
                const safeAvatar = sanitizeAvatarUrl(person.avatar)
                const name = fullName(person)
                const span = formatLifespan(person)
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={candidateId === person.id}
                    data-gender={person.gender}
                    className={`connect-candidate ${candidateId === person.id ? 'active' : ''}`}
                    onClick={() => setCandidateId(person.id)}
                    onDoubleClick={() => onConnect(person.id, kin)}
                    title={name}
                  >
                    <span className="connect-avatar">
                      <span>{displayInitials(person)}</span>
                      {safeAvatar && <img src={safeAvatar} alt="" style={avatarImageStyle(person.avatarFocus)} referrerPolicy="no-referrer" loading="lazy" onError={(event) => event.currentTarget.classList.add('is-error')} />}
                    </span>
                    <span className="connect-copy">
                      <span className="connect-name">{name}</span>
                      {span && <span className="connect-life">{span}</span>}
                    </span>
                  </button>
                )
              })}
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
