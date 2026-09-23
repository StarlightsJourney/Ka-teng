import { useEffect, useMemo, useState } from 'react'
import { addPerson, cancelEditing, clearSelection, connectPeople, disconnectPeople, editPerson, expandPerson, removePersonAction, selectPerson, selectSearchResult, searchAndSelect, setSearch, toggleExpandAll, updatePerson, type Action, type AppState } from '../actions'
import { loadBigTree } from '../data'
import { type Person, type RelationshipType } from '../element'
import { largestFamilyRoot, neighborOf, searchPeople, type NeighborDirection } from '../scene'
import { FamilyChart2D } from '../renderer/FamilyChart2D'
import { useTheme } from '../theme'

import { AddPersonModal } from './AddPersonModal'
import { ConnectPersonModal } from './ConnectPersonModal'
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
  const [addingPerson, setAddingPerson] = useState(false)
  const [addPersonRelationship, setAddPersonRelationship] = useState<RelationshipType | null>(null)
  const [connectingRelationship, setConnectingRelationship] = useState<RelationshipType | null>(null)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const perform = (action: Action) => setState((current) => action.perform(current))
  const selected = state.selectedId ? state.peopleById.get(state.selectedId) : undefined
  const currentPeople = useMemo(() => [...state.peopleById.values()], [state.peopleById])
  const defaultMainId = useMemo(
    () => largestFamilyRoot(currentPeople) ?? currentPeople[0]?.id ?? null,
    [currentPeople],
  )
  const matches = useMemo(() => searchPeople(state.query, state.peopleById), [state.query, state.peopleById])
  const suggestions = useMemo(() => matches.slice(0, 8), [matches])
  const currentMainId = state.selectedId ?? defaultMainId
  const currentMain = currentMainId ? state.peopleById.get(currentMainId) : undefined
  const shortcut = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)) ? '⌘K' : 'Ctrl K'
  const requestShowAll = () => {
    if (state.showAll) perform(toggleExpandAll(false))
    else setShowAllConfirming(true)
  }
  const handleAddPerson = (person: Person, relationship: RelationshipType | null) => {
    perform(addPerson(person))
    if (relationship && selected && selected.id !== person.id) {
      if (relationship === 'parent') {
        perform(connectPeople(person.id, selected.id, 'parent'))
      } else if (relationship === 'child') {
        perform(connectPeople(selected.id, person.id, 'parent'))
      } else {
        perform(connectPeople(selected.id, person.id, 'spouse'))
      }
    }
    setAddingPerson(false)
  }
  const handleConnectPerson = (personId: string, relationship: RelationshipType) => {
    if (!selected) return
    perform(connectPeople(selected.id, personId, relationship))
    setConnectingRelationship(null)
  }
  const handleDisconnectPerson = (personId: string, relationship: RelationshipType) => {
    if (!selected) return
    perform(disconnectPeople(selected.id, personId, relationship))
  }
  const handleRemovePerson = () => {
    if (!selected) return
    perform(removePersonAction(selected.id))
    setPendingRemoveId(null)
    setAddingPerson(false)
    setConnectingRelationship(null)
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
      if (isTextEntry || !state.selectedId) return
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
        onSearch={(value) => perform(setSearch(value))}
        onSearchSubmit={() => { if (matches[0]) perform(searchAndSelect(state.query)) }}
        onSearchSelect={(id) => { searchInput?.blur(); perform(selectSearchResult(id)) }}
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
            pendingRemoveId={pendingRemoveId}
            onSelect={(id) => perform(selectPerson(id))}
            onExpand={(id) => perform(expandPerson(id))}
            onEdit={(id) => perform(editPerson(id))}
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
          onRemove={handleRemovePerson}
          onClose={() => perform(clearSelection())}
          onAddPerson={(relationship) => { setAddPersonRelationship(relationship); setAddingPerson(true) }}
          onConnectPerson={(relationship) => setConnectingRelationship(relationship)}
          onDisconnectPerson={(id, relationship) => handleDisconnectPerson(id, relationship)}
          onPreviewRemove={setPendingRemoveId}
          onCancelRemove={() => setPendingRemoveId(null)}
        />}
        <div className="navigation-hint">↑ ↓ ← → navigate · {shortcut} search</div>
      </section>
      {addingPerson && (
        <AddPersonModal
          anchorPerson={selected}
          initialRelationship={addPersonRelationship}
          onClose={() => { setAddingPerson(false); setAddPersonRelationship(null) }}
          onAdd={handleAddPerson}
        />
      )}
      {selected && connectingRelationship && (
        <ConnectPersonModal
          selected={selected}
          people={state.peopleById}
          relationship={connectingRelationship}
          onClose={() => setConnectingRelationship(null)}
          onConnect={handleConnectPerson}
        />
      )}
    </main>
  )
}
