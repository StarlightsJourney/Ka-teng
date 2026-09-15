import { displayInitials, fullName, lifespan } from '../element'
import type { Person } from '../element'

type PersonCardProps = {
  person: Person
  onEdit: () => void
  onClose: () => void
}

export function PersonCard({ person, onEdit, onClose }: PersonCardProps) {
  const gender = person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'
  const initials = displayInitials(person)
  return (
    <div className={`person-card gender-stripe-${person.gender.toLowerCase()}`}>
      <div className="person-avatar">
        <span>{initials}</span>
        {person.avatar && <img src={person.avatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
      </div>
      <div className="person-card-copy">
        <strong>{fullName(person)}</strong>
        <span className="person-dates">{gender}{lifespan(person) ? ` · ${lifespan(person)}` : ''}</span>
      </div>
      <div className="person-card-actions">
        <button type="button" className="panel-edit" onClick={onEdit} aria-label="Edit person">✎</button>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close details">×</button>
      </div>
    </div>
  )
}
