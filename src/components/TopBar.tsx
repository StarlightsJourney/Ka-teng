import type { Person } from '../element'
import type { ThemeMode } from '../theme'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'

type TopBarProps = {
  query: string
  showAll: boolean
  theme: ThemeMode
  onSearch: (query: string) => void
  onSearchSubmit: () => void
  onSearchSelect: (id: string) => void
  onSearchDismiss: () => void
  suggestions: Person[]
  familyFirstName: string
  confirming: boolean
  onRequestShowAll: () => void
  onCancelShowAll: () => void
  onConfirmShowAll: () => void
  onThemeToggle: () => void
  shortcut: string
  inputRef: (input: HTMLInputElement | null) => void
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">Ka-teng</div>
      <SearchBox inputRef={props.inputRef} value={props.query} onChange={props.onSearch} onSubmit={props.onSearchSubmit} onSelect={props.onSearchSelect} onDismiss={props.onSearchDismiss} suggestions={props.suggestions} shortcut={props.shortcut} />
      <div className="toolbar">
        <button type="button" className={`show-all-toggle ${props.showAll ? 'active' : ''}`} onClick={props.onRequestShowAll}>
          {props.showAll ? 'Show less' : 'Show all'}
        </button>
        <ThemeToggle theme={props.theme} onToggle={props.onThemeToggle} />
      </div>
      {props.confirming && !props.showAll && (
        <div className="show-all-popover" role="dialog">
          <p>Show all of {props.familyFirstName}&apos;s family? Large trees can be slow to read.</p>
          <div><button type="button" onClick={props.onConfirmShowAll}>Show entire tree</button><button type="button" onClick={props.onCancelShowAll}>Cancel</button></div>
        </div>
      )}
    </header>
  )
}
