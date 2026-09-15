import { useMemo, useState } from 'react'
import { expandPerson, selectPerson, searchAndSelect, setSearch, toggleExpandAll, type Action, type AppState } from '../actions'
import { loadBigTree } from '../data'
import { searchPeople } from '../scene'
import { FamilyChart2D } from '../renderer/FamilyChart2D'
import { useTheme } from '../theme'
import { DetailsPanel } from './DetailsPanel'
import { TopBar } from './TopBar'

const people = loadBigTree()
const peopleById = new Map(people.map((person) => [person.id, person]))

const initialState: AppState = {
  peopleById,
  selectedId: peopleById.has('Q43274') ? 'Q43274' : people[0]?.id ?? null,
  query: '',
  showAll: false,
  expandedIds: new Set(),
}

export function App() {
  const [state, setState] = useState(initialState)
  const [theme, toggleTheme] = useTheme()
  const perform = (action: Action) => setState((current) => action.perform(current))
  const selected = state.selectedId ? state.peopleById.get(state.selectedId) : undefined
  const matches = useMemo(() => searchPeople(state.query, state.peopleById), [state.query, state.peopleById])

  return (
    <main className="app-shell">
      <TopBar
        query={state.query}
        showAll={state.showAll}
        theme={theme}
        onSearch={(query) => perform(setSearch(query))}
        onSearchSubmit={() => matches[0] && perform(searchAndSelect(state.query))}
        onShowAllChange={(showAll) => perform(toggleExpandAll(showAll))}
        onThemeToggle={toggleTheme}
      />
      <section className="workspace">
        <div className="scene-panel">
          <FamilyChart2D
            people={people}
            selectedId={state.selectedId}
            showAll={state.showAll}
            expandedIds={state.expandedIds}
            onSelect={(id) => perform(selectPerson(id))}
            onExpand={(id) => perform(expandPerson(id))}
          />
        </div>
        {selected && <DetailsPanel person={selected} people={state.peopleById} onSelect={(id) => perform(selectPerson(id))} />}
      </section>
    </main>
  )
}
