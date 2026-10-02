import { useEffect, useMemo, useRef, useState } from 'react'
import { ageOf, createPerson, displayInitials, fullName, parseName, sanitizeAvatarUrl, type AvatarFocus, type Gender, type Kinship, type Person } from '../element'
import { LifeFields, PhotoNameRow, type LifeValue } from './PersonFields'

type AddPersonModalProps = {
  anchorPerson?: Person
  kin?: Kinship | null
  initialName?: string
  onClose: () => void
  onAdd: (person: Person) => void
}

export function AddPersonModal({ anchorPerson, kin, initialName = '', onClose, onAdd }: AddPersonModalProps) {
  const [name, setName] = useState(initialName)
  const [gender, setGender] = useState<Gender>('U')
  const [life, setLife] = useState<LifeValue>({ deceased: false, restingPlace: '' })
  const [avatar, setAvatar] = useState('')
  const [avatarFocus, setAvatarFocus] = useState<AvatarFocus | undefined>(undefined)
  const [bio, setBio] = useState('')
  const relationship = anchorPerson ? kin ?? null : null
  const [showMore, setShowMore] = useState(false)
  const [chinese, setChinese] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [altNames, setAltNames] = useState('')
  const [touched, setTouched] = useState(false)

  const parsedName = useMemo(() => parseName(name), [name])
  const draft = useMemo<Person>(() => createPerson(parsedName.first, parsedName.last, gender, {
    name: { first: parsedName.first, last: parsedName.last, chinese: chinese.trim() || undefined, pinyin: pinyin.trim() || undefined },
    birthDate: life.birthDate,
    deceased: life.deceased || undefined,
    deathDate: life.deceased ? life.deathDate : undefined,
    restingPlace: life.deceased ? life.restingPlace.trim() || undefined : undefined,
    bio: bio.slice(0, 500) || undefined,
    avatar: sanitizeAvatarUrl(avatar),
    avatarFocus: sanitizeAvatarUrl(avatar) ? avatarFocus : undefined,
    altNames: altNames.split(',').map((value) => value.trim()).filter(Boolean),
  }), [altNames, avatar, avatarFocus, bio, chinese, gender, life, parsedName, pinyin])

  const isValid = Boolean(name.trim())

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!isValid) return
    onAdd(draft)
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose()
  }

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

  const heading = anchorPerson && relationship ? `New ${relationship}` : 'New person'
  const anchorName = anchorPerson ? fullName(anchorPerson) : ''

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal modal-compact" role="dialog" aria-modal="true" aria-label={anchorPerson && relationship ? `Add ${relationship} of ${anchorName}` : 'Add a person'}>
        <div className="modal-header">
          <h2>{heading}</h2>
          {anchorPerson && relationship && <p className="modal-subtitle" title={anchorName}>of {anchorName}</p>}
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>
          <div className="form-section compact">
            <PhotoNameRow
              avatar={avatar}
              avatarFocus={avatarFocus}
              gender={gender}
              initials={displayInitials(draft)}
              name={name}
              showError={touched && !isValid}
              onAvatarChange={setAvatar}
              onAvatarFocusChange={setAvatarFocus}
              onGenderChange={setGender}
              onNameChange={setName}
            />
            <LifeFields value={life} onChange={setLife} age={ageOf(draft, new Date())} />
            <label><span className="field-label">Bio<span className="field-hint">{bio.length}/500</span></span><textarea value={bio} maxLength={500} rows={2} onChange={(event) => setBio(event.target.value)} placeholder="Short description…" /></label>
          </div>

          <button type="button" className="more-details-toggle" onClick={() => setShowMore((current) => !current)} aria-expanded={showMore}>
            {showMore ? '▾ Fewer details' : '▸ More details'}
          </button>
          {showMore && (
            <div className="form-section compact">
              <div className="form-row">
                <label><span className="field-label">Chinese name</span><input value={chinese} onChange={(event) => setChinese(event.target.value)} placeholder="中文名" /></label>
                <label><span className="field-label">Pinyin</span><input value={pinyin} onChange={(event) => setPinyin(event.target.value)} placeholder="Pinyin" /></label>
              </div>
              <label><span className="field-label">Also known as</span><input value={altNames} onChange={(event) => setAltNames(event.target.value)} placeholder="Nicknames, separated by commas" /></label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn-primary${isValid ? '' : ' is-incomplete'}`}>{relationship ? `Add ${relationship}` : 'Add person'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
