import type { Person } from '../element'
import type { CardMode, ViewMode } from '../renderer/FamilyGraph'
import type { ThemeMode } from '../theme'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'

type TopBarProps = {
  query: string
  theme: ThemeMode
  viewMode: ViewMode
  cardMode: CardMode
  hasTree: boolean
  canSave: boolean
  onSearch: (query: string) => void
  onSearchSubmit: () => void
  onSearchSelect: (id: string) => void
  onSearchDismiss: () => void
  suggestions: Person[]
  onViewModeChange: (mode: ViewMode) => void
  onCardModeToggle: () => void
  onFit: () => void
  onThemeToggle: () => void
  onSave: () => void
  onOpen: () => void
  inputRef: (input: HTMLInputElement | null) => void
}

const viewOptions: { value: ViewMode; label: string; hint: string }[] = [
  { value: 'focus', label: 'Focus', hint: 'Only the selected person’s close family' },
  { value: 'family', label: 'Family', hint: 'Everyone within three steps of the selected person' },
  { value: 'all', label: 'All', hint: 'The whole connected family' },
]

export function TopBar(props: TopBarProps) {
  const activeIndex = Math.max(0, viewOptions.findIndex((option) => option.value === props.viewMode))
  return (
    <header className="top-bar">
      <div className="brand">Ka-teng</div>
      <SearchBox
        inputRef={props.inputRef}
        value={props.query}
        onChange={props.onSearch}
        onSubmit={props.onSearchSubmit}
        onSelect={props.onSearchSelect}
        onDismiss={props.onSearchDismiss}
        suggestions={props.suggestions}
        placeholder="Search people…"
      />
      <div className="toolbar">
        <button type="button" className="icon-button" onClick={props.onOpen} aria-label="Open family file" data-tooltip="Open a saved file">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6.5V15a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 15V8a1.5 1.5 0 0 0-1.5-1.5H10L8.3 4.5H4.5A1.5 1.5 0 0 0 3 6Z" /></svg>
        </button>
        <button type="button" className="icon-button" onClick={props.onSave} disabled={!props.canSave} aria-label="Save family file" data-tooltip="Save to a file">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" /></svg>
        </button>
        <div className={`view-controls${props.hasTree ? '' : ' is-idle'}`} role="toolbar" aria-label="View controls">
          <div className="view-segmented" role="radiogroup" aria-label="Tree view" style={{ '--active': activeIndex } as React.CSSProperties}>
            <span className="view-segmented-indicator" aria-hidden="true" />
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={props.viewMode === option.value}
                className={props.viewMode === option.value ? 'active' : ''}
                data-tooltip={option.hint}
                onClick={() => props.onViewModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`icon-button card-mode-toggle is-${props.cardMode}`}
            onClick={props.onCardModeToggle}
            aria-label={props.cardMode === 'compact' ? 'Switch to photo cards' : 'Switch to compact cards'}
            aria-pressed={props.cardMode === 'photo'}
            data-tooltip={props.cardMode === 'compact' ? 'Photo cards' : 'Compact cards'}
          >
            <span className="card-shape" aria-hidden="true"><span className="card-shape-dot" /></span>
          </button>
          <button type="button" className="icon-button" onClick={props.onFit} disabled={!props.hasTree} aria-label="Fit whole tree" data-tooltip="Fit the tree on screen">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></svg>
          </button>
        </div>
        <ThemeToggle theme={props.theme} onToggle={props.onThemeToggle} />
      </div>
    </header>
  )
}
