import type { ViewMode } from '../actions'
import type { ThemeMode } from '../theme'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'
import { ViewToggle } from './ViewToggle'

type TopBarProps = {
  query: string
  view: ViewMode
  layered: boolean
  showAll: boolean
  theme: ThemeMode
  onSearch: (query: string) => void
  onSearchSubmit: () => void
  onViewChange: (view: ViewMode) => void
  onLayeredChange: (layered: boolean) => void
  onShowAllChange: (showAll: boolean) => void
  onThemeToggle: () => void
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand"><span className="brand-mark">✦</span><span>Ka-teng</span></div>
      <SearchBox value={props.query} onChange={props.onSearch} onSubmit={props.onSearchSubmit} />
      <div className="toolbar">
        <ViewToggle view={props.view} onChange={props.onViewChange} />
        <button type="button" className={`show-all-toggle ${props.showAll ? 'active' : ''}`} onClick={() => props.onShowAllChange(!props.showAll)}>
          Show all
        </button>
        {props.view === '3d' && (
          <label className="layered-toggle">
            <input type="checkbox" checked={props.layered} onChange={(event) => props.onLayeredChange(event.target.checked)} />
            Layered
          </label>
        )}
        <ThemeToggle theme={props.theme} onToggle={props.onThemeToggle} />
      </div>
    </header>
  )
}
