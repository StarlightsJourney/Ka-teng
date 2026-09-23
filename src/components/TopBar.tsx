import type { Person } from '../element'
import type { ThemeMode } from '../theme'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'
import type { AppMode } from './App'

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
  mode: AppMode
  onToggleMode: () => void
  onAddPerson: () => void
  onAddFriend: () => void
  placeholder?: string
  hideShowAll?: boolean
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="top-bar">
      <button type="button" className="brand brand-button" onClick={props.onToggleMode} title={props.mode === 'ka-teng' ? 'Switch to Peng-yu' : 'Switch to Ka-teng'} aria-label={props.mode === 'ka-teng' ? 'Switch to Peng-yu friends mode' : 'Switch to Ka-teng family mode'}>{props.mode === 'ka-teng' ? 'Ka-teng' : 'Peng-yu'}</button>
      <SearchBox inputRef={props.inputRef} value={props.query} onChange={props.onSearch} onSubmit={props.onSearchSubmit} onSelect={props.onSearchSelect} onDismiss={props.onSearchDismiss} suggestions={props.suggestions} shortcut={props.shortcut} placeholder={props.placeholder} />
      <div className="toolbar">
        {props.mode === 'ka-teng' && <button type="button" className="add-person-button" onClick={props.onAddPerson} aria-label="Add a person" title="Add a person">+</button>}
        {props.mode === 'peng-yu' && <button type="button" className="add-person-button" onClick={props.onAddFriend} aria-label="Add a friend" title="Add a friend">+</button>}
        {!props.hideShowAll && <button type="button" className={`show-all-toggle ${props.showAll ? 'active' : ''}`} title={props.showAll ? 'Show less' : 'Show all'} aria-label={props.showAll ? 'Show less' : 'Show all'} onClick={props.onRequestShowAll}>
          {props.showAll ? 'Show less' : 'Show all'}
        </button>}
        <ThemeToggle theme={props.theme} onToggle={props.onThemeToggle} />
      </div>
      {props.mode === 'ka-teng' && props.confirming && !props.showAll && (
        <div className="show-all-popover" role="dialog">
          <p>Show all of {props.familyFirstName}&apos;s family? Large trees can be slow to read.</p>
          <div><button type="button" onClick={props.onConfirmShowAll}>Show entire tree</button><button type="button" onClick={props.onCancelShowAll}>Cancel</button></div>
        </div>
      )}
    </header>
  )
}
