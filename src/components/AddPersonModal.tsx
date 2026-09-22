import { useMemo, useState } from 'react'
import { createPerson, displayInitials, fullName, sanitizeAvatarUrl, type Gender, type Person, type RelationshipType } from '../element'

type AddPersonModalProps = {
  anchorPerson?: Person
  initialRelationship?: RelationshipType | null
  onClose: () => void
  onAdd: (person: Person, relationship: RelationshipType | null) => void
}

const genders: { value: Gender; label: string }[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'X', label: 'Other' },
  { value: 'U', label: 'Unknown' },
]

const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
]

export function AddPersonModal({ anchorPerson, initialRelationship, onClose, onAdd }: AddPersonModalProps) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [gender, setGender] = useState<Gender>('U')
  const [birthDate, setBirthDate] = useState('')
  const [birth, setBirth] = useState('')
  const [avatar, setAvatar] = useState('')
  const [bio, setBio] = useState('')
  const [relationship, setRelationship] = useState<RelationshipType | null>(initialRelationship ?? (anchorPerson ? 'child' : null))
  const [touched, setTouched] = useState(false)

  const draft = useMemo<Person>(() => createPerson(first, last, gender, {
    birthDate: birthDate || undefined,
    birth: birth || undefined,
    bio: bio.slice(0, 500) || undefined,
    avatar: sanitizeAvatarUrl(avatar),
  }), [avatar, bio, birth, birthDate, first, gender, last])

  const isValid = first.trim() || last.trim()
  const safeAvatar = sanitizeAvatarUrl(avatar)

  const handleUpload = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const safe = sanitizeAvatarUrl(typeof reader.result === 'string' ? reader.result : undefined)
      if (safe) setAvatar(safe)
    })
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!isValid) return
    onAdd(draft, relationship)
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add a person">
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>Add a person</h2>
            <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <section className="modal-section">
            <h3>Identity</h3>
            <div className="modal-row">
              <label>First name<input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="First name" /></label>
              <label>Last name<input value={last} onChange={(event) => setLast(event.target.value)} placeholder="Last name" /></label>
            </div>
            <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
              {genders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
            {touched && !isValid && <p className="modal-error">Please enter a first or last name.</p>}
          </section>

          <section className="modal-section">
            <h3>Photo</h3>
            <div className="photo-edit-row">
              <span className="photo-preview">{safeAvatar ? <img src={safeAvatar} alt="" onError={() => setAvatar('')} /> : <span>{displayInitials(draft)}</span>}</span>
              <label>Photo URL<input value={avatar.startsWith('data:') ? '' : avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://…" /></label>
            </div>
            <label className="file-input">Upload photo<input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} /></label>
          </section>

          <section className="modal-section">
            <h3>Life</h3>
            <label>Birth date<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
            <label>Or birth year<input value={birth} onChange={(event) => setBirth(event.target.value)} placeholder="YYYY" /></label>
          </section>

          <section className="modal-section">
            <h3>About</h3>
            <label>Bio<textarea value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="Short biography…" /></label>
            <p className="bio-counter">{bio.length}/500</p>
          </section>

          {anchorPerson && (
            <section className="modal-section">
              <h3>Relationship to {fullName(anchorPerson)}</h3>
              <div className="relationship-options">
                {relationshipOptions.map((option) => (
                  <label key={option.value} className="relationship-option">
                    <input
                      type="radio"
                      name="relationship"
                      value={option.value}
                      checked={relationship === option.value}
                      onChange={() => setRelationship(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
                <label className="relationship-option">
                  <input type="radio" name="relationship" value="" checked={relationship === null} onChange={() => setRelationship(null)} />
                  No connection
                </label>
              </div>
            </section>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!isValid}>Add person</button>
          </div>
        </form>
      </div>
    </div>
  )
}
