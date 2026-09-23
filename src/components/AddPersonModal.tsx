import { useMemo, useRef, useState } from 'react'
import { createPerson, displayInitials, fullName, parseName, sanitizeAvatarUrl, type Gender, type Person, type RelationshipType } from '../element'

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

function isDateLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function AddPersonModal({ anchorPerson, initialRelationship, onClose, onAdd }: AddPersonModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('U')
  const [birthValue, setBirthValue] = useState('')
  const [avatar, setAvatar] = useState('')
  const [bio, setBio] = useState('')
  const [relationship, setRelationship] = useState<RelationshipType | null>(initialRelationship ?? (anchorPerson ? 'child' : null))
  const [showMore, setShowMore] = useState(false)
  const [chinese, setChinese] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [altNames, setAltNames] = useState('')
  const [touched, setTouched] = useState(false)

  const parsedName = useMemo(() => parseName(name), [name])
  const draft = useMemo<Person>(() => createPerson(parsedName.first, parsedName.last, gender, {
    name: { first: parsedName.first, last: parsedName.last, chinese: chinese.trim() || undefined, pinyin: pinyin.trim() || undefined },
    ...(birthValue.trim()
      ? isDateLike(birthValue.trim()) ? { birthDate: birthValue.trim() } : { birth: birthValue.trim() }
      : {}),
    bio: bio.slice(0, 500) || undefined,
    avatar: sanitizeAvatarUrl(avatar),
    altNames: altNames.split(',').map((value) => value.trim()).filter(Boolean),
  }), [altNames, avatar, bio, birthValue, chinese, gender, parsedName, pinyin])

  const isValid = Boolean(name.trim())
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

  const relationshipHeading = anchorPerson && relationship
    ? `Add as ${relationship} of ${fullName(anchorPerson)}`
    : 'Add a person'

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal modal-compact" role="dialog" aria-modal="true" aria-label="Add a person">
        <div className="modal-header">
          <h2>{relationshipHeading}</h2>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>
          <div className="form-section compact">
            <div className="person-quick-row">
              <button type="button" className="photo-preview" onClick={() => fileRef.current?.click()} aria-label="Upload photo">
                {safeAvatar ? <img src={safeAvatar} alt="" onError={() => setAvatar('')} /> : <span>{displayInitials(draft)}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} hidden />
              <div className="person-quick-fields">
                <label>Name <span className="required-mark">*</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" autoFocus /></label>
                <div className="form-row short">
                  <label>Birth<input value={birthValue} onChange={(event) => setBirthValue(event.target.value)} placeholder="YYYY or date" /></label>
                  <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                    {genders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select></label>
                </div>
              </div>
            </div>
            {touched && !isValid && <p className="modal-error">Please enter a name.</p>}
          </div>

          <div className="form-section compact">
            <label>Bio<textarea value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="Short description…" /></label>
            <p className="bio-counter">{bio.length}/500</p>
          </div>

          <button type="button" className="more-details-toggle" onClick={() => setShowMore((current) => !current)} aria-expanded={showMore}>
            {showMore ? '▾ Fewer details' : '▸ More details'}
          </button>
          {showMore && (
            <div className="form-section compact">
              <div className="form-row">
                <label>Chinese name<input value={chinese} onChange={(event) => setChinese(event.target.value)} placeholder="中文名" /></label>
                <label>Pinyin<input value={pinyin} onChange={(event) => setPinyin(event.target.value)} placeholder="Pinyin" /></label>
              </div>
              <label>Also known as<input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Nicknames, separated by commas" /></label>
            </div>
          )}

          {anchorPerson && (
            <div className="form-section compact">
              <div className="relationship-options clean">
                {relationshipOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`relationship-option ${relationship === option.value ? 'active' : ''}`}
                    onClick={() => setRelationship(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
