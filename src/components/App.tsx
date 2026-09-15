import { useEffect, useMemo, useState } from 'react'
import { cancelEditing, clearSelection, editPerson, expandPerson, removePersonAction, selectPerson, selectSearchResult, searchAndSelect, setSearch, toggleExpandAll, updatePerson, type Action, type AppState } from '../actions'
import { loadBigTree } from '../data'
import { largestFamilyRoot, neighborOf, searchPeople, type NeighborDirection } from '../scene'
import { FamilyChart2D } from '../renderer/FamilyChart2D'
import { useTheme } from '../theme'
import { DetailsPanel } from './DetailsPanel'
import { TopBar } from './TopBar'

const people = loadBigTree()
const peopleById = new Map(people.map((person) => [person.id, person]))
const initialState: AppState = {
  peopleById,
  selectedId: null,
  query: '',
  showAll: false,
  expandedIds: new Set(),
  editing: false,
}

export function App() {
  const [state, setState] = useState(initialState)
  const [theme, toggleTheme] = useTheme()
  const [searchInput, setSearchInput] = useState<HTMLInputElement | null>(null)
  const [showAllConfirming, setShowAllConfirming] = useState(false)
  const [hasHiddenRelatives, setHasHiddenRelatives] = useState(false)
  const perform = (action: Action) => setState((current) => action.perform(current))
  const selected = state.selectedId ? state.peopleById.get(state.selectedId) : undefined
  const currentPeople = useMemo(() => [...state.peopleById.values()], [state.peopleById])
  const defaultMainId = useMemo(
    () => largestFamilyRoot(currentPeople) ?? currentPeople[0]?.id ?? null,
    [currentPeople],
  )
  const matches = useMemo(() => searchPeople(state.query, state.peopleById), [state.query, state.peopleById])
  const suggestions = matches.slice(0, 8)
  const currentMainId = state.selectedId ?? defaultMainId
  const currentMain = currentMainId ? state.peopleById.get(currentMainId) : undefined
  const shortcut = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)) ? '⌘K' : 'Ctrl K'
  const requestShowAll = () => {
    if (state.showAll) perform(toggleExpandAll(false))
    else setShowAllConfirming(true)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTextEntry = target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput?.focus()
        return
      }
      if (event.key === 'Escape') {
        perform(clearSelection())
        return
      }
      if (isTextEntry) return
      if (!state.selectedId) return
      const direction: NeighborDirection | undefined = event.key === 'ArrowUp'
        ? 'up'
        : event.key === 'ArrowDown'
          ? 'down'
          : event.key === 'ArrowLeft'
            ? 'left'
            : event.key === 'ArrowRight'
              ? 'right'
              : undefined
      if (!direction) return
      const id = neighborOf(state.peopleById, state.selectedId, direction)
      if (id) {
        event.preventDefault()
        perform(selectPerson(id))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchInput, state.peopleById, state.selectedId])

  return (
    <main className="app-shell">
      <TopBar
        query={state.query}
        showAll={state.showAll}
        theme={theme}
        onSearch={(query) => perform(setSearch(query))}
        onSearchSubmit={() => matches[0] && perform(searchAndSelect(state.query))}
        onSearchSelect={(id) => perform(selectSearchResult(id))}
        onSearchDismiss={() => { searchInput?.blur(); perform(setSearch('')) }}
        suggestions={suggestions}
        familyFirstName={currentMain?.name.first || currentMain?.name.last || currentMain?.id || 'this person'}
        confirming={showAllConfirming}
        onRequestShowAll={requestShowAll}
        onCancelShowAll={() => setShowAllConfirming(false)}
        onConfirmShowAll={() => { setShowAllConfirming(false); perform(toggleExpandAll(true)) }}
        onThemeToggle={toggleTheme}
        shortcut={shortcut}
        inputRef={setSearchInput}
      />
      <section className="workspace">
        <div className="scene-panel">
          <FamilyChart2D
            people={currentPeople}
            defaultMainId={defaultMainId}
            selectedId={state.selectedId}
            showAll={state.showAll}
            expandedIds={state.expandedIds}
            onSelect={(id) => perform(selectPerson(id))}
            onExpand={(id) => perform(expandPerson(id))}
            onEdit={(id) => perform(editPerson(id))}
            onHiddenChange={setHasHiddenRelatives}
          />
        </div>
        {selected && <DetailsPanel
          person={selected}
          people={state.peopleById}
          editing={state.editing}
          onSelect={(id) => perform(selectPerson(id))}
          onEdit={() => perform(editPerson(selected.id))}
          onCancel={() => perform(cancelEditing())}
          onSave={(patch) => perform(updatePerson(selected.id, patch))}
          onRemove={() => perform(removePersonAction(selected.id))}
          onClose={() => perform(clearSelection())}
        />}
        {hasHiddenRelatives && !state.showAll && <button type="button" className="expand-pill" onClick={requestShowAll}>Expand · show the whole family</button>}
        <div className="navigation-hint">↑ ↓ ← → navigate · {shortcut} search</div>
      </section>
    </main>
  )
}
