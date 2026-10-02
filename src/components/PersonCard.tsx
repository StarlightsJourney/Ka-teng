import { useState } from 'react'
import { avatarImageStyle, describeDates, displayInitials, fullName, sanitizeAvatarUrl } from '../element'
import type { Person } from '../element'

type PersonCardProps = {
  person: Person
  onEdit: () => void
  onClose: () => void
}

const BIO_PREVIEW = 160

export function PersonCard({ person, onEdit, onClose }: PersonCardProps) {
  const [bioOpen, setBioOpen] = useState(false)
  const safeAvatar = sanitizeAvatarUrl(person.avatar)
  const name = fullName(person)
  const dates = describeDates(person, new Date())
  const altName = [person.name.chinese, person.name.pinyin].filter(Boolean).join(' · ')
  const bio = person.bio?.trim()
  const longBio = Boolean(bio && bio.length > BIO_PREVIEW)
  return (
    <div className="person-card" data-gender={person.gender}>
      <div className="person-card-top">
        <div className="person-avatar">
          <span>{displayInitials(person)}</span>
          {safeAvatar && <img src={safeAvatar} alt="" style={avatarImageStyle(person.avatarFocus)} referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}
        </div>
        <div className="person-card-actions">
          <button type="button" className="panel-edit" onClick={onEdit} aria-label="Edit person" title="Edit">✎</button>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close details" title="Close">×</button>
        </div>
      </div>
      <div className="person-identity">
        <strong className="person-card-name" title={name}>{name}</strong>
        {altName && <span className="person-card-alt">{altName}</span>}
        {person.altNames?.length ? <span className="person-card-aka">Also known as {person.altNames.join(', ')}</span> : null}
      </div>
      {(dates.length > 0 || person.restingPlace) && (
        <ul className="person-facts-list">
          {dates.map((line) => <li key={line}>{line}</li>)}
          {person.restingPlace && <li>Resting at {person.restingPlace}</li>}
        </ul>
      )}
      {bio && (
        <div className={`person-bio${longBio && !bioOpen ? ' is-clamped' : ''}`}>
          <p>{bio}</p>
          {longBio && <button type="button" className="btn-link person-bio-toggle" onClick={() => setBioOpen((open) => !open)} aria-expanded={bioOpen}>{bioOpen ? 'Show less' : 'Read more'}</button>}
        </div>
      )}
    </div>
  )
}
