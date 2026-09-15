import type { KeyboardEvent } from 'react'

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function SearchBox({ value, onChange, onSubmit }: SearchBoxProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSubmit()
  }
  return (
    <label className="search-box">
      <span className="sr-only">Search people</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search people…"
      />
      <kbd>Enter</kbd>
    </label>
  )
}
