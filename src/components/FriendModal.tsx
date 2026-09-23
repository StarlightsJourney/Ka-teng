import { useMemo, useState } from 'react'
import { sanitizeAvatarUrl, type Friend, type FriendCircle } from '../element'

type FriendModalProps = {
  friend?: Friend
  onClose: () => void
  onSave: (friend: Friend) => void
  onRemove?: () => void
}

const circles: { value: FriendCircle; label: string }[] = [
  { value: 5, label: 'Inner circle' },
  { value: 15, label: 'Close friends' },
  { value: 50, label: 'Regular friends' },
  { value: 150, label: 'Acquaintances' },
  { value: 500, label: 'Familiar faces' },
]

const contextOptions = ['work', 'university', 'travel', 'childhood', 'online', 'family friend', 'other']

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function FriendModal({ friend, onClose, onSave, onRemove }: FriendModalProps) {
  const isEditing = Boolean(friend)
  const [firstName, setFirstName] = useState(friend?.firstName ?? '')
  const [lastName, setLastName] = useState(friend?.lastName ?? '')
  const [circle, setCircle] = useState<FriendCircle>(friend?.circle ?? 50)
  const [contexts, setContexts] = useState<string[]>(friend?.contexts ?? [])
  const [contextInput, setContextInput] = useState('')
  const [note, setNote] = useState(friend?.note ?? '')
  const [avatar, setAvatar] = useState(friend?.avatar ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const draft = useMemo<Friend>(() => {
    const base: Friend = {
      id: 'temp',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      circle,
      contexts,
      note,
      avatar: sanitizeAvatarUrl(avatar),
    }
    return friend ? { ...base, id: friend.id } : base
  }, [avatar, circle, contexts, firstName, friend, lastName, note])

  const safeAvatar = sanitizeAvatarUrl(avatar)
  const isValid = firstName.trim() || lastName.trim()

  const toggleContext = (context: string) => {
    setContexts((current) => current.includes(context) ? current.filter((value) => value !== context) : [...current, context])
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    onSave(draft)
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal friend-modal" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit friend' : 'Add a friend'}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit friend' : 'Add a friend'}</h2>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-sheet" onSubmit={handleSubmit}>

          <section className="form-section">
            <h3>Identity</h3>
            <div className="form-row">
              <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" /></label>
              <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" /></label>
            </div>
            <label>Circle<select value={circle} onChange={(event) => setCircle(Number(event.target.value) as FriendCircle)}>
              {circles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
          </section>

          <section className="form-section">
            <h3>Photo</h3>
            <div className="photo-edit-row">
              <span className="photo-preview">{safeAvatar ? <img src={safeAvatar} alt="" onError={() => setAvatar('')} /> : <span>{initials(firstName, lastName)}</span>}</span>
              <label>Photo URL<input value={avatar.startsWith('data:') ? '' : avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://…" /></label>
            </div>
          </section>

          <section className="form-section">
            <h3>Contexts</h3>
            {contexts.length > 0 && (
              <div className="context-chips">
                {contexts.map((context) => (
                  <button key={context} type="button" className="context-chip active" onClick={() => setContexts((current) => current.filter((value) => value !== context))}>
                    {context} ×
                  </button>
                ))}
              </div>
            )}
            <div className="context-chips">
              {contextOptions.filter((context) => !contexts.includes(context)).map((context) => (
                <button key={context} type="button" className="context-chip" onClick={() => toggleContext(context)}>
                  + {context}
                </button>
              ))}
            </div>
            <label>Or type a context<input value={contextInput} onChange={(event) => setContextInput(event.target.value)} onBlur={(event) => {
              const values = event.target.value.split(',').map((value) => value.trim()).filter(Boolean)
              if (values.length) setContexts((current) => [...new Set([...current, ...values])])
              setContextInput('')
            }} onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              const values = contextInput.split(',').map((value) => value.trim()).filter(Boolean)
              if (values.length) setContexts((current) => [...new Set([...current, ...values])])
              setContextInput('')
            }} placeholder="e.g. book club" /></label>
          </section>

          <section className="form-section">
            <h3>Note</h3>
            <label>Note<textarea value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} placeholder="How you met…" /></label>
            <p className="bio-counter">{note.length}/300</p>
          </section>

          <div className="modal-actions">
            {isEditing && onRemove && (
              <button type="button" className="btn-danger" onClick={() => confirmingRemove ? onRemove() : setConfirmingRemove(true)}>
                {confirmingRemove ? 'Confirm remove' : 'Remove'}
              </button>
            )}
            <span className="form-actions-spacer" />
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!isValid}>Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
