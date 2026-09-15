import { useEffect, useRef, useState, type KeyboardEvent, type FocusEvent } from 'react'
import { displayInitials, fullName } from '../element'
import type { Person } from '../element'

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  suggestions: Person[]
  onSelect: (id: string) => void
  onDismiss: () => void
  shortcut: string
  inputRef: (input: HTMLInputElement | null) => void
  placeholder?: string
}

function HighlightedName({ person, query }: { person: Person; query: string }) {
  const name = fullName(person)
  const needle = query.trim()
  if (!needle) return <>{name}</>
  const index = name.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
  if (index < 0) return <>{name}</>
  return <>{name.slice(0, index)}<strong>{name.slice(index, index + needle.length)}</strong>{name.slice(index + needle.length)}</>
}

export function SearchBox({ value, onChange, onSubmit, suggestions = [], onSelect, onDismiss, shortcut, inputRef, placeholder = 'Search people…' }: SearchBoxProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const boxRef = useRef<HTMLLabelElement>(null)
  const selectedIndex = suggestions.length ? Math.min(activeIndex, suggestions.length - 1) : 0
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setDismissed(true)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])
  const handleBlur = (event: FocusEvent<HTMLLabelElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDismissed(true)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (suggestions[selectedIndex]) onSelect(suggestions[selectedIndex].id)
      else onSubmit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onDismiss()
    }
  }
  return (
    <label ref={boxRef} className="search-box" onBlur={handleBlur} onPointerDown={() => setDismissed(false)}>
      <span className="sr-only">Search people</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setDismissed(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      <kbd>{shortcut}</kbd>
      {value.trim() && suggestions.length > 0 && !dismissed && (
        <div className="search-suggestions" role="listbox">
          {suggestions.map((person, index) => (
            <button key={person.id} type="button" className={index === selectedIndex ? 'active' : ''} role="option" aria-selected={index === selectedIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(person.id)}>
              <span className="suggestion-avatar"><span>{displayInitials(person)}</span>{person.avatar && <img src={person.avatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} />}</span>
              <span className="suggestion-name"><HighlightedName person={person} query={value} /></span>
            </button>
          ))}
        </div>
      )}
    </label>
  )
}
