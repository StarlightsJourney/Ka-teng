import { displayInitials, fullName, lifespan } from '../element'
import type { Person } from '../element'

export function PersonCard({ person }: { person: Person }) {
  const gender = person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'
  return (
    <div className={`person-card gender-stripe-${person.gender.toLowerCase()}`}>
      <div className="person-avatar">
        {person.photo ? <img src={person.photo} alt="" /> : displayInitials(person)}
      </div>
      <div className="person-card-copy">
        <strong>{fullName(person)}</strong>
        <span className="person-dates">{gender}{lifespan(person) ? ` · ${lifespan(person)}` : ''}</span>
      </div>
    </div>
  )
}
