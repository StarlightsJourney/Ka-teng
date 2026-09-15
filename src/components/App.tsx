import { useMemo, useState } from 'react'
import { selectPerson, searchAndSelect, setSearch, setView, toggleExpandAll, toggleLayered, type Action, type AppState } from '../actions'
import { loadBigTree } from '../data'
import { toFamilyGraph, searchPeople } from '../scene'
import { FamilyChart2D } from '../renderer/FamilyChart2D'
import { FamilyGraph3D } from '../renderer/FamilyGraph3D'
import { useTheme } from '../theme'
import { DetailsPanel } from './DetailsPanel'
import { TopBar } from './TopBar'

const people = loadBigTree()
const peopleById = new Map(people.map((person) => [person.id, person]))
const graph = toFamilyGraph(people)

const initialState: AppState = {
  peopleById,
  selectedId: peopleById.has('Q43274') ? 'Q43274' : people[0]?.id ?? null,
  query: '',
  view: '2d',
  layered: false,
  showAll: false,
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
        view={state.view}
        layered={state.layered}
        showAll={state.showAll}
        theme={theme}
        onSearch={(query) => perform(setSearch(query))}
        onSearchSubmit={() => matches[0] && perform(searchAndSelect(state.query))}
        onViewChange={(view) => perform(setView(view))}
        onLayeredChange={(layered) => perform(toggleLayered(layered))}
        onShowAllChange={(showAll) => perform(toggleExpandAll(showAll))}
        onThemeToggle={toggleTheme}
      />
      <section className="workspace">
        <div className="scene-panel">
          {state.view === '2d'
            ? <FamilyChart2D people={people} selectedId={state.selectedId} showAll={state.showAll} onSelect={(id) => perform(selectPerson(id))} />
            : <FamilyGraph3D graph={graph} selectedId={state.selectedId} layered={state.layered} theme={theme} onSelect={(id) => perform(selectPerson(id))} />}
        </div>
        {selected && <DetailsPanel person={selected} people={state.peopleById} onSelect={(id) => perform(selectPerson(id))} />}
      </section>
    </main>
  )
}
