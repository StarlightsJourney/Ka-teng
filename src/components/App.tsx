import { useMemo, useState, type KeyboardEvent } from 'react'
import familyData from '../data/big-tree.json'
import { personName, toFamilyGraph } from '../data/graph'
import { FamilyChart2D } from '../scene/FamilyChart2D'
import { FamilyGraph3D } from '../scene/FamilyGraph3D'
import type { Person } from '../types'

const people = familyData as Person[]
const peopleById = new Map(people.map((person) => [person.id, person]))
const graph = toFamilyGraph(people)

function relationIds(person: Person, relation: 'parents' | 'spouses' | 'children'): string[] {
  if (relation === 'parents') {
    return [
      ...(person.rels.parents ?? []),
      ...(person.rels.father ? [person.rels.father] : []),
      ...(person.rels.mother ? [person.rels.mother] : []),
    ]
  }
  return person.rels[relation] ?? []
}

function RelationList({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  if (ids.length === 0) return <p className="empty-relation">None listed</p>
  return (
    <div className="relation-list">
      {ids.map((id) => {
        const person = peopleById.get(id)
        if (!person) return null
        return (
          <button key={id} type="button" className="relation-link" onClick={() => onSelect(id)}>
            {personName(person)}
          </button>
        )
      })}
    </div>
  )
}

export function App() {
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [selectedId, setSelectedId] = useState(peopleById.has('Q43274') ? 'Q43274' : people[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [layered, setLayered] = useState(false)
  const selected = selectedId ? peopleById.get(selectedId) : undefined
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return people
    return people.filter((person) => personName(person).toLowerCase().includes(needle))
  }, [search])

  const selectPerson = (personId: string) => {
    if (peopleById.has(personId)) setSelectedId(personId)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && matches[0]) {
      selectPerson(matches[0].id)
      setSearch(personName(matches[0]))
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>Descent</span>
        </div>
        <label className="search-box">
          <span className="sr-only">Search people</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search people..."
          />
          <kbd>Enter</kbd>
        </label>
        <div className="toolbar">
          <div className="segmented-control" aria-label="Choose visualization">
            <button type="button" className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>2D</button>
            <button type="button" className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D</button>
          </div>
          {view === '3d' && (
            <label className="layered-toggle">
              <input type="checkbox" checked={layered} onChange={(event) => setLayered(event.target.checked)} />
              Layered
            </label>
          )}
        </div>
      </header>

      <section className="workspace">
        <div className="scene-panel">
          {view === '2d'
            ? <FamilyChart2D people={people} selectedId={selectedId} onSelect={selectPerson} />
            : <FamilyGraph3D graph={graph} selectedId={selectedId} layered={layered} onSelect={selectPerson} />}
        </div>
        {selected && (
          <aside className="details-panel">
            <div className="details-heading">
              <span className={`gender-dot gender-${selected.data.gender?.toLowerCase() ?? 'unknown'}`} />
              <div>
                <p className="eyebrow">Selected person</p>
                <h1>{personName(selected)}</h1>
              </div>
            </div>
            <dl className="metadata">
              <div><dt>Gender</dt><dd>{selected.data.gender === 'M' ? 'Male' : selected.data.gender === 'F' ? 'Female' : 'Unknown'}</dd></div>
              <div><dt>Birthday</dt><dd>{String(selected.data.birthday ?? 'Not listed')}</dd></div>
            </dl>
            <div className="relationship-section">
              <h2>Parents</h2>
              <RelationList ids={relationIds(selected, 'parents')} onSelect={selectPerson} />
            </div>
            <div className="relationship-section">
              <h2>Spouses</h2>
              <RelationList ids={relationIds(selected, 'spouses')} onSelect={selectPerson} />
            </div>
            <div className="relationship-section">
              <h2>Children</h2>
              <RelationList ids={relationIds(selected, 'children')} onSelect={selectPerson} />
            </div>
          </aside>
        )}
      </section>
    </main>
  )
}
