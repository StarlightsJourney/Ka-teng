import { useMemo, useRef, useState } from 'react'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [chinese, setChinese] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [gender, setGender] = useState<Gender>('U')
  const [birthDate, setBirthDate] = useState('')
  const [birth, setBirth] = useState('')
  const [avatar, setAvatar] = useState('')
  const [altNames, setAltNames] = useState('')
  const [bio, setBio] = useState('')
  const [relationship, setRelationship] = useState<RelationshipType | null>(initialRelationship ?? (anchorPerson ? 'child' : null))
  const [touched, setTouched] = useState(false)

  const draft = useMemo<Person>(() => createPerson(first, last, gender, {
    name: { first: first.trim(), last: last.trim(), chinese: chinese.trim() || undefined, pinyin: pinyin.trim() || undefined },
    birthDate: birthDate || undefined,
    birth: birth || undefined,
    bio: bio.slice(0, 500) || undefined,
    avatar: sanitizeAvatarUrl(avatar),
    altNames: altNames.split(',').map((value) => value.trim()).filter(Boolean),
  }), [altNames, avatar, bio, birth, birthDate, chinese, first, gender, last, pinyin])

  const isValid = Boolean(first.trim() || last.trim())
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
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add a person">
        <div className="modal-header">
          <h2>{relationshipHeading}</h2>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>
          <div className="form-section compact">
            <div className="photo-edit-row centered">
              <button type="button" className="photo-preview" onClick={() => fileRef.current?.click()} aria-label="Upload photo">
                {safeAvatar ? <img src={safeAvatar} alt="" onError={() => setAvatar('')} /> : <span>{displayInitials(draft)}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} hidden />
            </div>
            <label className="file-upload-label">
              <input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
              Upload photo
            </label>
            <label>Photo URL<input value={avatar.startsWith('data:') ? '' : avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="Image address" /></label>
          </div>

          <div className="form-section compact">
            <div className="form-row">
              <label>First name <span className="field-required">(required)</span><input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="First name" /></label>
              <label>Last name <span className="field-required">(required)</span><input value={last} onChange={(event) => setLast(event.target.value)} placeholder="Last name" /></label>
            </div>
            <div className="form-row">
              <label>Chinese name <span className="field-optional">(optional)</span><input value={chinese} onChange={(event) => setChinese(event.target.value)} placeholder="中文名" /></label>
              <label>Pinyin <span className="field-optional">(optional)</span><input value={pinyin} onChange={(event) => setPinyin(event.target.value)} placeholder="Pinyin" /></label>
            </div>
            <div className="form-row short">
              <label>Also known as <span className="field-optional">(optional)</span><input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Nicknames, separated by commas" /></label>
            </div>
            <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
              {genders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
            {touched && !isValid && <p className="modal-error">Please enter a first or last name.</p>}
          </div>

          <div className="form-section compact">
            <div className="form-row">
              <label>Birth date <span className="field-optional">(optional)</span><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
              <label>Birth year <span className="field-optional">(optional)</span><input value={birth} onChange={(event) => setBirth(event.target.value)} placeholder="YYYY" pattern="\\d{0,4}" /></label>
            </div>
          </div>

          <div className="form-section compact">
            <label>Bio <span className="field-optional">(optional)</span><textarea value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="Short biography…" /></label>
            <p className="bio-counter">{bio.length}/500</p>
          </div>

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
