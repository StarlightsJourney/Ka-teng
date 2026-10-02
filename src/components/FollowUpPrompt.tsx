import { useEffect, useRef, useState } from 'react'
import { displayInitials, fullName, type Person, type PersonMap, type SuggestedLink } from '../element'

type FollowUpPromptProps = {
  people: PersonMap
  title: string
  suggestions: SuggestedLink[]
  otherParent?: Person
  onApply: (links: SuggestedLink[]) => void
  onAddOtherParent: () => void
  onSkip: () => void
}

const keyOf = (link: SuggestedLink) => `${link.fromId}:${link.toId}:${link.kin}`

export function FollowUpPrompt({ people, title, suggestions, otherParent, onApply, onAddOtherParent, onSkip }: FollowUpPromptProps) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const skipRef = useRef(onSkip)
  useEffect(() => {
    skipRef.current = onSkip
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      skipRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const toggle = (key: string) => setChecked((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const selected = suggestions.filter((link) => checked.has(keyOf(link)))
  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.currentTarget === event.target) onSkip() }}>
      <div className="modal followup" role="dialog" aria-modal="true" aria-label="Other family connections">
        <div className="modal-header">
          <h2>{suggestions.length ? 'Any other connections?' : 'Add the other parent?'}</h2>
          <p className="modal-subtitle">{title}.{suggestions.length ? ' Tick anything else that’s true — nothing is assumed.' : ''}</p>
        </div>
        {suggestions.length > 0 && <div className="followup-list">
          {suggestions.map((link) => {
            const from = people.get(link.fromId)
            const to = people.get(link.toId)
            if (!from || !to) return null
            const key = keyOf(link)
            return (
              <label key={key} className={`followup-row${checked.has(key) ? ' is-checked' : ''}`}>
                <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} />
                <span className="followup-avatar" data-gender={from.gender} aria-hidden="true">{displayInitials(from)}</span>
                <span className="followup-text"><strong>{fullName(from)}</strong> is also <strong>{fullName(to)}</strong>’s {link.kin}</span>
              </label>
            )
          })}
        </div>}
        {otherParent && (
          <div className="followup-other-parent" data-gender={otherParent.gender}>
            <span className="followup-avatar" aria-hidden="true">{displayInitials(otherParent)}</span>
            <span className="followup-text"><strong>{fullName(otherParent)}</strong> has one parent so far.</span>
            <button type="button" className="btn-secondary followup-add-parent" onClick={onAddOtherParent}>+ Add other parent</button>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onSkip}>{suggestions.length ? 'No, that’s all' : 'Not now'}</button>
          {suggestions.length > 0 && (
            <button type="button" className="btn-primary" disabled={!selected.length} onClick={() => onApply(selected)}>
              Connect {selected.length || ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
