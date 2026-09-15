import type { ThemeMode } from '../theme'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'

type TopBarProps = {
  query: string
  showAll: boolean
  theme: ThemeMode
  onSearch: (query: string) => void
  onSearchSubmit: () => void
  onShowAllChange: (showAll: boolean) => void
  onThemeToggle: () => void
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand"><span className="brand-mark">✦</span><span>Ka-teng</span></div>
      <SearchBox value={props.query} onChange={props.onSearch} onSubmit={props.onSearchSubmit} />
      <div className="toolbar">
        <button type="button" className={`show-all-toggle ${props.showAll ? 'active' : ''}`} onClick={() => props.onShowAllChange(!props.showAll)}>
          Show all
        </button>
        <ThemeToggle theme={props.theme} onToggle={props.onThemeToggle} />
      </div>
    </header>
  )
}
