import { useEffect, useId, useRef, useState } from 'react'
import { MONTHS, avatarImageStyle, formatPartialDate, joinPartialDate, sanitizeAvatarUrl, splitPartialDate, type AvatarFocus, type Gender, type PartialDate } from '../element'
import { PhotoAdjuster } from './PhotoAdjuster'

const genderOptions: { value: Exclude<Gender, 'U'>; label: string }[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'X', label: 'Other' },
]

export function GenderField({ value, onChange }: { value: Gender; onChange: (gender: Gender) => void }) {
  return (
    <div className="field gender-field">
      <div className="segmented" role="group" aria-label="Gender">
        {genderOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            data-gender={option.value}
            className={value === option.value ? 'active' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(value === option.value ? 'U' : option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DateField({ label, value, onChange, hint }: { label: string; value: string | undefined; onChange: (value: string | undefined) => void; hint?: string }) {
  const id = useId()
  const [parts, setParts] = useState<PartialDate>(() => splitPartialDate(value))
  const update = (patch: Partial<PartialDate>) => {
    const next = { ...parts, ...patch }
    setParts(next)
    onChange(joinPartialDate(next))
  }
  const preview = joinPartialDate(parts)
  return (
    <div className="field date-field">
      <span className="field-label" id={`${id}-label`}>
        {label}
        <span className="field-hint">{hint ?? (preview ? formatPartialDate(preview) : 'Year is enough')}</span>
      </span>
      <div className="date-inputs" role="group" aria-labelledby={`${id}-label`}>
        <input
          aria-label={`${label} day`}
          className="date-day"
          inputMode="numeric"
          placeholder="Day"
          maxLength={2}
          value={parts.day}
          onChange={(event) => update({ day: event.target.value.replace(/\D/g, '').slice(0, 2) })}
        />
        <select aria-label={`${label} month`} className="date-month" value={parts.month} onChange={(event) => update({ month: event.target.value })}>
          <option value="">Month</option>
          {MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month.slice(0, 3)}</option>)}
        </select>
        <input
          aria-label={`${label} year`}
          className="date-year"
          inputMode="numeric"
          placeholder="Year"
          maxLength={4}
          value={parts.year}
          onChange={(event) => update({ year: event.target.value.replace(/\D/g, '').slice(0, 4) })}
        />
      </div>
    </div>
  )
}

export type LifeValue = {
  birthDate?: string
  deceased: boolean
  deathDate?: string
  restingPlace: string
}

export function LifeFields({ value, onChange, age }: { value: LifeValue; onChange: (value: LifeValue) => void; age?: number }) {
  const ageHint = age === undefined ? undefined : value.deceased ? `Died aged ${age}` : `Age ${age}`
  return (
    <div className="life-fields">
      <DateField label="Born" value={value.birthDate} hint={value.birthDate ? `${formatPartialDate(value.birthDate)}${ageHint ? ` · ${ageHint}` : ''}` : undefined} onChange={(birthDate) => onChange({ ...value, birthDate })} />
      <label className="switch-row">
        <input type="checkbox" role="switch" checked={value.deceased} onChange={(event) => onChange({ ...value, deceased: event.target.checked })} />
        <span className="switch-track" aria-hidden="true" />
        <span>Deceased</span>
      </label>
      {value.deceased && (
        <>
          <DateField label="Died" value={value.deathDate} onChange={(deathDate) => onChange({ ...value, deathDate })} />
          <label><span className="field-label">Resting place</span><input value={value.restingPlace} onChange={(event) => onChange({ ...value, restingPlace: event.target.value })} placeholder="Cemetery or memorial" /></label>
        </>
      )}
    </div>
  )
}

type PhotoNameRowProps = {
  avatar: string
  avatarFocus: AvatarFocus | undefined
  gender: Gender
  initials: string
  name: string
  showError: boolean
  onAvatarChange: (avatar: string) => void
  onAvatarFocusChange: (focus: AvatarFocus | undefined) => void
  onGenderChange: (gender: Gender) => void
  onNameChange: (name: string) => void
}

export function PhotoNameRow({ avatar, avatarFocus, gender, initials, name, showError, onAvatarChange, onAvatarFocusChange, onGenderChange, onNameChange }: PhotoNameRowProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const [adjusting, setAdjusting] = useState(false)
  useEffect(() => {
    if (showError) nameRef.current?.focus()
  }, [showError])
  const safeAvatar = sanitizeAvatarUrl(avatar)
  const handleUpload = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const safe = sanitizeAvatarUrl(typeof reader.result === 'string' ? reader.result : undefined)
      if (!safe) return
      onAvatarChange(safe)
      onAvatarFocusChange(undefined)
      setAdjusting(true)
    })
    reader.readAsDataURL(file)
  }
  return (
    <>
      <div className="person-quick-row">
        <div className="photo-column">
          <button type="button" className="photo-preview" data-gender={gender} onClick={() => fileRef.current?.click()} aria-label={safeAvatar ? 'Change photo' : 'Upload photo'} title={safeAvatar ? 'Change photo' : 'Add photo'}>
            {safeAvatar ? <img src={safeAvatar} alt="" style={avatarImageStyle(avatarFocus)} onError={() => onAvatarChange('')} /> : <span>{initials}</span>}
          </button>
          {safeAvatar && <button type="button" className="btn-link photo-adjust-link" aria-expanded={adjusting} onClick={() => setAdjusting((open) => !open)}>{adjusting ? 'Done' : 'Adjust'}</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} hidden />
        </div>
        <div className="identity-column">
          <label><span className="field-label">Name <span className="required-mark">*</span></span><input ref={nameRef} className={showError ? 'is-invalid' : undefined} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Full name" aria-invalid={showError || undefined} aria-describedby={showError ? errorId : undefined} autoFocus /></label>
          {showError && <p id={errorId} className="field-error" role="alert">Add a name to continue</p>}
          <GenderField value={gender} onChange={onGenderChange} />
        </div>
      </div>
      {adjusting && safeAvatar && <PhotoAdjuster src={safeAvatar} value={avatarFocus} onChange={onAvatarFocusChange} onDone={() => setAdjusting(false)} />}
    </>
  )
}
