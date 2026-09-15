import { displayInitials, fullName } from '../element'
import type { Person } from '../element'

export function PersonCard({ person }: { person: Person }) {
  return (
    <div className={`person-card gender-stripe-${person.gender.toLowerCase()}`}>
      <div className="person-avatar">
        {person.photo ? <img src={person.photo} alt="" /> : displayInitials(person)}
      </div>
      <div className="person-card-copy">
        <strong>{fullName(person)}</strong>
        <span className="person-dates">★{person.birth ?? '—'} †{person.death ?? '—'}</span>
      </div>
    </div>
  )
}
