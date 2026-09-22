import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { addPerson, cancelEditing, clearSelection, connectPeople, editPerson, expandPerson, removePersonAction, selectPerson, selectSearchResult, searchAndSelect, setSearch, toggleExpandAll, updatePerson, type Action, type AppState } from '../actions'
import { loadBigTree } from '../data'
import { loadFriends } from '../data'
import { friendName, type Person, type RelationshipType } from '../element'
import { largestFamilyRoot, neighborOf, searchPeople, type NeighborDirection } from '../scene'
import { FamilyChart2D } from '../renderer/FamilyChart2D'
import { useTheme } from '../theme'

const SocialGraph3D = lazy(() => import('../renderer/SocialGraph3D').then((module) => ({ default: module.SocialGraph3D })))
import { AddPersonModal } from './AddPersonModal'
import { DetailsPanel } from './DetailsPanel'
import { FriendPanel } from './FriendPanel'
import { FriendsSidebar } from './FriendsSidebar'
import { TopBar } from './TopBar'

export type AppMode = 'ka-teng' | 'peng-yu'
const people = loadBigTree()
const friendGraph = loadFriends()
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
  const [mode, setMode] = useState<AppMode>('ka-teng')
  const [theme, toggleTheme] = useTheme()
  const [searchInput, setSearchInput] = useState<HTMLInputElement | null>(null)
  const [friendSelectedId, setFriendSelectedId] = useState<string | null>(null)
  const [friendQuery, setFriendQuery] = useState('')
  const [showAllConfirming, setShowAllConfirming] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)
  const [addPersonRelationship, setAddPersonRelationship] = useState<RelationshipType | null>(null)
  const perform = (action: Action) => setState((current) => action.perform(current))
  const selected = state.selectedId ? state.peopleById.get(state.selectedId) : undefined
  const currentPeople = useMemo(() => [...state.peopleById.values()], [state.peopleById])
  const defaultMainId = useMemo(
    () => largestFamilyRoot(currentPeople) ?? currentPeople[0]?.id ?? null,
    [currentPeople],
  )
  const matches = useMemo(() => searchPeople(state.query, state.peopleById), [state.query, state.peopleById])
  const friendSuggestions = useMemo(() => {
    const query = friendQuery.trim().toLocaleLowerCase()
    if (!query) return []
    return friendGraph.friends.filter((friend) => friendName(friend).toLocaleLowerCase().includes(query)).slice(0, 8)
  }, [friendQuery])
  const suggestions = mode === 'ka-teng'
    ? matches.slice(0, 8)
    : friendSuggestions.map((friend) => ({ id: friend.id, name: { first: friend.firstName, last: friend.lastName }, gender: 'U' as const, avatar: friend.avatar }))
  const currentMainId = state.selectedId ?? defaultMainId
  const currentMain = currentMainId ? state.peopleById.get(currentMainId) : undefined
  const shortcut = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent)) ? '⌘K' : 'Ctrl K'
  const requestShowAll = () => {
    if (state.showAll) perform(toggleExpandAll(false))
    else setShowAllConfirming(true)
  }
  const toggleMode = () => {
    setMode((current) => current === 'ka-teng' ? 'peng-yu' : 'ka-teng')
    setFriendSelectedId(null)
    setFriendQuery('')
    perform(setSearch(''))
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
        if (mode === 'peng-yu') setFriendSelectedId(null)
        else perform(clearSelection())
        return
      }
      if (isTextEntry) return
      if (mode === 'peng-yu' || !state.selectedId) return
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
  }, [mode, searchInput, state.peopleById, state.selectedId])

  const query = mode === 'ka-teng' ? state.query : friendQuery
  const selectedFriend = friendSelectedId ? friendGraph.friends.find((friend) => friend.id === friendSelectedId) : undefined

  return (
    <main className="app-shell">
      <TopBar
        query={query}
        showAll={mode === 'ka-teng' && state.showAll}
        theme={theme}
        onSearch={(value) => mode === 'ka-teng' ? perform(setSearch(value)) : setFriendQuery(value)}
        onSearchSubmit={() => {
          if (mode === 'ka-teng' && matches[0]) perform(searchAndSelect(state.query))
          else if (mode === 'peng-yu' && friendSuggestions[0]) setFriendSelectedId(friendSuggestions[0].id)
        }}
        onSearchSelect={(id) => {
          searchInput?.blur()
          if (mode === 'ka-teng') perform(selectSearchResult(id))
          else { setFriendSelectedId(id); setFriendQuery('') }
        }}
        onSearchDismiss={() => {
          searchInput?.blur()
          if (mode === 'ka-teng') perform(setSearch(''))
          else setFriendQuery('')
        }}
        suggestions={suggestions}
        familyFirstName={currentMain?.name.first || currentMain?.name.last || currentMain?.id || 'this person'}
        confirming={showAllConfirming}
        onRequestShowAll={requestShowAll}
        onCancelShowAll={() => setShowAllConfirming(false)}
        onConfirmShowAll={() => { setShowAllConfirming(false); perform(toggleExpandAll(true)) }}
        onThemeToggle={toggleTheme}
        shortcut={shortcut}
        inputRef={setSearchInput}
        mode={mode}
        onToggleMode={toggleMode}
        onAddPerson={() => setAddingPerson(true)}
        placeholder={mode === 'ka-teng' ? 'Search people…' : 'Search friends…'}
        hideShowAll={mode === 'peng-yu'}
      />
      <section className={`workspace ${mode === 'peng-yu' ? 'peng-yu-layout' : ''}`}>
        {mode === 'peng-yu' && <FriendsSidebar friends={friendGraph.friends} selectedId={friendSelectedId} onSelect={setFriendSelectedId} />}
        <div className="scene-panel">
          {mode === 'ka-teng' ? <FamilyChart2D
            people={currentPeople}
            defaultMainId={defaultMainId}
            selectedId={state.selectedId}
            showAll={state.showAll}
            expandedIds={state.expandedIds}
            onSelect={(id) => perform(selectPerson(id))}
            onExpand={(id) => perform(expandPerson(id))}
            onEdit={(id) => perform(editPerson(id))}
          /> : <Suspense fallback={<div className="social-graph" role="status"><span className="sr-only">Loading Peng-yu graph…</span></div>}>
            <SocialGraph3D friends={friendGraph.friends} links={friendGraph.links} selectedId={friendSelectedId} theme={theme} onSelect={(id) => setFriendSelectedId(id)} />
          </Suspense>}
        </div>
        {mode === 'ka-teng' && selected && <DetailsPanel
          person={selected}
          people={state.peopleById}
          editing={state.editing}
          onSelect={(id) => perform(selectPerson(id))}
          onEdit={() => perform(editPerson(selected.id))}
          onCancel={() => perform(cancelEditing())}
          onSave={(patch) => perform(updatePerson(selected.id, patch))}
          onRemove={() => perform(removePersonAction(selected.id))}
          onClose={() => perform(clearSelection())}
          onAddPerson={(relationship) => { setAddPersonRelationship(relationship); setAddingPerson(true) }}
        />}
        {mode === 'peng-yu' && selectedFriend && <FriendPanel friend={selectedFriend} friends={friendGraph.friends} links={friendGraph.links} onSelect={setFriendSelectedId} onClose={() => setFriendSelectedId(null)} />}
        <div className="navigation-hint">↑ ↓ ← → navigate · {shortcut} search</div>
      </section>
      {addingPerson && mode === 'ka-teng' && (
        <AddPersonModal
          anchorPerson={selected}
          initialRelationship={addPersonRelationship}
          onClose={() => { setAddingPerson(false); setAddPersonRelationship(null) }}
          onAdd={handleAddPerson}
        />
      )}
    </main>
  )
}
