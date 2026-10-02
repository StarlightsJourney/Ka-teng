import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addPerson, cancelEditing, clearSelection, connectPeople, connectSiblings, connectSuggestions, createLoadedState, createWorkspaceState, detachPersonAction, disconnectPeople, disconnectSiblings, editPerson, expandPerson, focusPerson, relativesOf, removePersonAction, selectPerson, selectSearchResult, searchAndSelect, setSearch, updatePerson, type Action, type WorkspaceKind } from '../actions'
import { MAX_FAMILY_FILE_BYTES, familyFileName, loadBigTree, parseFamilyFile, readAutosave, serializeFamily, writeAutosave } from '../data'
import { connectKin, connectSibling, fullName, parentIdsOf, suggestFollowUps, type Person, type PersonId, type PersonMap, type RelationshipType, type SiblingKind, type SuggestedLink } from '../element'
import { familyComponent, neighborOf, searchPeople, type NeighborDirection } from '../scene'
import { FamilyGraph, type CardMode, type ViewMode } from '../renderer/FamilyGraph'
import { useTheme } from '../theme'

import { AddPersonModal } from './AddPersonModal'
import { AddRelativeModal } from './AddRelativeModal'
import { DetailsPanel, EditPersonModal } from './DetailsPanel'
import { DropConnectPicker } from './DropConnectPicker'
import { FollowUpPrompt } from './FollowUpPrompt'
import { PeopleTray } from './PeopleTray'
import { Splash, type SplashMode } from './Splash'
import { Starfield } from './Starfield'
import { TopBar } from './TopBar'
import { useDragConnect, type DropResult } from './useDragConnect'

const samplePeople = loadBigTree()
const CARD_MODE_KEY = 'ka-teng:card-mode'
const VIEW_MODE_KEY = 'ka-teng:view-mode'
const RETURN_SPLASH_AFTER_MS = 45_000

function initialSplash(): SplashMode | null {
  if (typeof window === 'undefined') return null
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? null : 'launch'
}

function initialWorkspace(): WorkspaceKind {
  if (typeof window === 'undefined') return 'blank'
  return new URLSearchParams(window.location.search).has('sample') ? 'sample' : 'blank'
}

function writeWorkspaceToUrl(kind: WorkspaceKind) {
  const url = new URL(window.location.href)
  if (kind === 'sample') url.searchParams.set('sample', '')
  else url.searchParams.delete('sample')
  window.history.replaceState(null, '', `${url.pathname}${url.search.replace('sample=', 'sample')}${url.hash}`)
}

function readPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return allowed.find((option) => option === value) ?? fallback
  } catch {
    return fallback
  }
}

function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

type AddingState = { anchorId: PersonId | null; kin: RelationshipType | null; initialName?: string }
type PendingDrop = { draggedId: PersonId; targetId: PersonId; x: number; y: number }
type FollowUp = { title: string; suggestions: SuggestedLink[]; otherParentFor?: PersonId }
type Notice = { id: number; text: string }

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceKind>(initialWorkspace)
  const [state, setState] = useState(() => {
    if (workspace === 'blank') {
      const restored = readAutosave()
      if (restored) return createLoadedState(restored.people, restored.focusId)
    }
    return createWorkspaceState(workspace, samplePeople)
  })
  const [savedPeople, setSavedPeople] = useState<PersonMap>(state.peopleById)
  const [restoredCount] = useState(() => workspace === 'blank' ? state.peopleById.size : 0)
  const [savingChoice, setSavingChoice] = useState(false)
  const [fitSignal, setFitSignal] = useState(0)
  const autosaveWarnedRef = useRef(false)
  const [theme, toggleTheme] = useTheme()
  const [cardMode, setCardMode] = useState<CardMode>(() => readPreference(CARD_MODE_KEY, ['compact', 'photo'], 'compact'))
  const [viewMode, setViewMode] = useState<ViewMode>(() => readPreference(VIEW_MODE_KEY, ['focus', 'family', 'all'], workspace === 'sample' ? 'family' : 'all'))
  const [searchInput, setSearchInput] = useState<HTMLInputElement | null>(null)
  const [adding, setAdding] = useState<AddingState | null>(null)
  const [connecting, setConnecting] = useState<RelationshipType | null>(null)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [followUp, setFollowUp] = useState<FollowUp | null>(null)
  const [notice, setNotice] = useState<Notice | null>(() => restoredCount ? { id: Date.now(), text: `Welcome back — restored your tree of ${restoredCount} ${restoredCount === 1 ? 'person' : 'people'}` } : null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [splash, setSplash] = useState<SplashMode | null>(initialSplash)
  const endSplash = useCallback(() => setSplash(null), [])
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (hiddenAt && !reduce && Date.now() - hiddenAt >= RETURN_SPLASH_AFTER_MS) setSplash('return')
      hiddenAt = 0
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  const runHeavy = useCallback((label: string, work: () => void) => {
    setBusy(label)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      work()
      requestAnimationFrame(() => requestAnimationFrame(() => setBusy(null)))
    }))
  }, [])
  const perform = useCallback((action: Action) => setState((current) => action.perform(current)), [])
  const say = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])
  const selected = state.selectedId ? state.peopleById.get(state.selectedId) : undefined
  const [panelId, setPanelId] = useState(state.selectedId)
  const [panelClosing, setPanelClosing] = useState(false)
  if (state.selectedId && (state.selectedId !== panelId || panelClosing)) {
    setPanelId(state.selectedId)
    setPanelClosing(false)
  } else if (!state.selectedId && panelId && !panelClosing) {
    setPanelClosing(true)
  }
  useEffect(() => {
    if (!panelClosing) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      setPanelId(null)
      setPanelClosing(false)
    }, reduce ? 0 : 260)
    return () => window.clearTimeout(timer)
  }, [panelClosing])
  const panelPerson = panelId ? state.peopleById.get(panelId) : undefined
  const currentPeople = useMemo(() => [...state.peopleById.values()], [state.peopleById])
  const treeIds = useMemo(() => familyComponent(currentPeople, state.focusId), [currentPeople, state.focusId])
  const trayPeople = useMemo(() => {
    const unplaced = currentPeople.filter((person) => !treeIds.has(person.id)).reverse()
    const isNamed = (person: Person) => fullName(person) !== person.id
    return [...unplaced.filter(isNamed), ...unplaced.filter((person) => !isNamed(person))]
  }, [currentPeople, treeIds])
  const matches = useMemo(() => searchPeople(state.query, state.peopleById), [state.query, state.peopleById])
  const suggestions = useMemo(() => matches.slice(0, 8), [matches])
  const removingIds = useMemo(
    () => pendingRemoveId ? new Set([pendingRemoveId, ...relativesOf(state.peopleById, pendingRemoveId)]) : undefined,
    [pendingRemoveId, state.peopleById],
  )
  const currentMain = state.focusId ? state.peopleById.get(state.focusId) : undefined
  const selectedInTree = Boolean(selected && treeIds.has(selected.id))
  const unsaved = state.peopleById !== savedPeople && state.peopleById.size > 0

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => writePreference(CARD_MODE_KEY, cardMode), [cardMode])
  useEffect(() => writePreference(VIEW_MODE_KEY, viewMode), [viewMode])
  useEffect(() => {
    if (workspace !== 'blank') return
    const timer = window.setTimeout(() => {
      const ok = writeAutosave(state.peopleById, state.focusId)
      if (!ok && !autosaveWarnedRef.current) {
        autosaveWarnedRef.current = true
        setNotice({ id: Date.now(), text: 'This tree is too large to keep in the browser — use Save to keep a copy.' })
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [state.focusId, state.peopleById, workspace])

  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const linkPeople = useCallback((base: PersonMap, fromId: PersonId, toId: PersonId, kin: RelationshipType) => {
    const from = base.get(fromId)
    const to = base.get(toId)
    const next = connectKin(base, fromId, toId, kin)
    if (next === base || !from || !to) return
    perform(connectPeople(fromId, toId, kin))
    const title = `${fullName(from)} is now ${fullName(to)}’s ${kin}`
    const followUps = suggestFollowUps(next, fromId, toId, kin)
    const needsOtherParent = kin === 'parent' && parentIdsOf(next, toId).length === 1
      && !followUps.some((link) => link.kin === 'parent' && link.toId === toId)
    if (followUps.length || needsOtherParent) setFollowUp({ title, suggestions: followUps, otherParentFor: needsOtherParent ? toId : undefined })
    else say(title)
  }, [perform, say])

  const handleDrop = useCallback((drop: DropResult) => {
    const dragged = state.peopleById.get(drop.personId)
    if (!dragged) return
    if (drop.targetId) {
      setPendingDrop({ draggedId: drop.personId, targetId: drop.targetId, x: drop.x, y: drop.y })
      return
    }
    if (drop.source === 'tree' && drop.overTray) {
      setPendingRemoveId(null)
      perform(detachPersonAction(drop.personId))
      say(`${fullName(dragged)} moved to People`)
      return
    }
    if (drop.source === 'tray' && drop.overCanvas && !state.focusId) {
      perform(focusPerson(drop.personId))
      return
    }
    if (drop.source === 'tray' && drop.overCanvas) say('Drop onto a person card to connect')
  }, [perform, say, state.focusId, state.peopleById])
  const { drag, begin } = useDragConnect(handleDrop)

  const handleAddPerson = (person: Person) => {
    const anchorId = adding?.anchorId ?? null
    const kin = adding?.kin ?? null
    perform(addPerson(person, { select: false }))
    if (kin && anchorId && anchorId !== person.id) {
      const base = new Map(state.peopleById)
      base.set(person.id, person)
      linkPeople(base, person.id, anchorId, kin)
      perform(selectPerson(anchorId, { focus: treeIds.has(anchorId) }))
    } else if (!state.focusId) {
      perform(focusPerson(person.id))
      say(`${fullName(person)} is on the tree. Add relatives from their card, or drag people onto them.`)
    } else {
      say(`${fullName(person)} added to People — drag them onto the tree`)
    }
    setAdding(null)
  }
  const handleConnectPerson = (personId: PersonId, kin: RelationshipType) => {
    if (!selected) return
    linkPeople(state.peopleById, personId, selected.id, kin)
    if (treeIds.has(selected.id)) perform(focusPerson(selected.id))
    setConnecting(null)
  }
  const handleDisconnectPerson = (personId: PersonId, relationship: RelationshipType) => {
    if (!selected) return
    perform(disconnectPeople(personId, selected.id, relationship))
  }
  const handleRemovePerson = () => {
    if (!selected) return
    perform(detachPersonAction(selected.id))
    say(`${fullName(selected)} moved to People — drag them back any time`)
    setPendingRemoveId(null)
    setAdding(null)
    setConnecting(null)
  }
  const handleDeletePerson = (id: PersonId) => {
    const person = state.peopleById.get(id)
    perform(removePersonAction(id))
    if (person) say(`${fullName(person)} deleted`)
  }
  const handleChooseSibling = (kind: SiblingKind) => {
    if (!pendingDrop) return
    const dragged = state.peopleById.get(pendingDrop.draggedId)
    const target = state.peopleById.get(pendingDrop.targetId)
    const next = connectSibling(state.peopleById, pendingDrop.draggedId, pendingDrop.targetId, kind)
    if (next !== state.peopleById && dragged && target) {
      perform(connectSiblings(pendingDrop.draggedId, pendingDrop.targetId, kind))
      perform(focusPerson(pendingDrop.targetId))
      say(`${fullName(dragged)} and ${fullName(target)} are now ${kind === 'step' ? 'step-siblings' : 'siblings'}`)
    }
    setPendingDrop(null)
  }
  const handleAddOtherParent = (childId: PersonId) => {
    setFollowUp(null)
    perform(selectPerson(childId, { focus: treeIds.has(childId) }))
    setConnecting('parent')
  }
  const handleChooseDrop = (kin: RelationshipType) => {
    if (!pendingDrop) return
    linkPeople(state.peopleById, pendingDrop.draggedId, pendingDrop.targetId, kin)
    perform(focusPerson(pendingDrop.targetId))
    setPendingDrop(null)
  }
  const handleApplyFollowUps = (links: SuggestedLink[]) => {
    perform(connectSuggestions(links))
    say(`Added ${links.length} more ${links.length === 1 ? 'connection' : 'connections'}`)
    setFollowUp(null)
  }
  const closeDropPicker = useCallback(() => setPendingDrop(null), [])
  const resetTransient = () => {
    setAdding(null)
    setConnecting(null)
    setPendingDrop(null)
    setPendingRemoveId(null)
    setFollowUp(null)
  }
  const switchWorkspace = (kind: WorkspaceKind) => runHeavy(kind === 'sample' ? 'Opening the sample family…' : 'Opening your tree…', () => {
    const restored = kind === 'blank' ? readAutosave() : null
    const next = restored ? createLoadedState(restored.people, restored.focusId) : createWorkspaceState(kind, samplePeople)
    setViewMode(kind === 'sample' ? 'family' : 'all')
    setWorkspace(kind)
    setState(next)
    setSavedPeople(next.peopleById)
    resetTransient()
    writeWorkspaceToUrl(kind)
  })
  const familyOnScreen = useMemo(() => new Map([...state.peopleById].filter(([id]) => treeIds.has(id))), [state.peopleById, treeIds])
  const requestSave = () => {
    if (familyOnScreen.size && familyOnScreen.size < state.peopleById.size) setSavingChoice(true)
    else handleSave(state.peopleById)
  }
  const handleSave = (people: PersonMap) => {
    setSavingChoice(false)
    const blob = new Blob([serializeFamily(people, state.focusId)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = familyFileName()
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setSavedPeople(state.peopleById)
    say(`Saved ${people.size} ${people.size === 1 ? 'person' : 'people'} to ${link.download}`)
  }
  const handleOpenFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FAMILY_FILE_BYTES) {
      say('That file is too large to open.')
      return
    }
    try {
      const loaded = parseFamilyFile(await file.text())
      if (unsaved && !window.confirm('Opening a file replaces your current tree. Unsaved changes will be lost. Continue?')) return
      runHeavy('Opening your file…', () => {
        const next = createLoadedState(loaded.people, loaded.focusId)
        setWorkspace('blank')
        writeWorkspaceToUrl('blank')
        setState(next)
        setSavedPeople(next.peopleById)
        resetTransient()
        say(`Opened ${file.name} — ${loaded.people.length} ${loaded.people.length === 1 ? 'person' : 'people'}`)
      })
    } catch (error) {
      say(error instanceof Error ? error.message : 'That file could not be opened.')
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTextEntry = target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
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
  }, [perform, state.peopleById, state.selectedId])

  const draggedPerson = drag ? state.peopleById.get(drag.personId) : undefined
  const dropDragged = pendingDrop ? state.peopleById.get(pendingDrop.draggedId) : undefined
  const dropTarget = pendingDrop ? state.peopleById.get(pendingDrop.targetId) : undefined
  const addingAnchor = adding?.anchorId ? state.peopleById.get(adding.anchorId) : undefined
  const emptyState = (
    <div className={`canvas-empty${drag?.overCanvas ? ' is-drop-target' : ''}`}>
      <div className="canvas-empty-card">
        <h2>Start your family tree</h2>
        <p>{trayPeople.length ? 'Drag someone from People and drop them here.' : 'Add yourself or anyone in the family — they’ll appear here as the first card.'}</p>
        <div className="canvas-empty-actions">
          <button type="button" className="btn-primary" onClick={() => setAdding({ anchorId: null, kin: null })}>+ Add first person</button>
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Open a saved file</button>
          {workspace === 'blank' && state.peopleById.size === 0 && (
            <button type="button" className="btn-link" onClick={() => switchWorkspace('sample')}>Explore the sample family</button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <main className={`app-shell${drag ? ' is-dragging' : ''}${drag?.source === 'tray' ? ' is-dragging-from-tray' : ''}`}>
      <Starfield />
      {splash && <Splash key={splash} mode={splash} onDone={endSplash} />}
      <TopBar
        query={state.query}
        theme={theme}
        viewMode={viewMode}
        cardMode={cardMode}
        hasTree={Boolean(state.focusId)}
        onViewModeChange={(mode) => runHeavy('Arranging the tree…', () => setViewMode(mode))}
        onCardModeToggle={() => runHeavy('Resizing cards…', () => setCardMode((mode) => mode === 'compact' ? 'photo' : 'compact'))}
        onFit={() => setFitSignal((count) => count + 1)}
        onSearch={(value) => perform(setSearch(value))}
        onSearchSubmit={() => { if (matches[0]) perform(searchAndSelect(state.query)) }}
        onSearchSelect={(id) => { searchInput?.blur(); perform(selectSearchResult(id)) }}
        onSearchDismiss={() => { searchInput?.blur(); perform(setSearch('')) }}
        suggestions={suggestions}
        onThemeToggle={toggleTheme}
        onSave={requestSave}
        onOpen={() => fileInputRef.current?.click()}
        canSave={state.peopleById.size > 0}
        inputRef={setSearchInput}
      />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        aria-label="Open family file"
        data-testid="family-file-input"
        tabIndex={-1}
        onChange={(event) => {
          void handleOpenFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <section className="workspace">
        <div className="scene-panel">
          <FamilyGraph
            people={state.peopleById}
            mainId={state.focusId}
            panelOpen={Boolean(selected)}
            expandedIds={state.expandedIds}
            removingIds={removingIds}
            draggingId={drag?.source === 'tree' ? drag.personId : null}
            cardMode={cardMode}
            viewMode={viewMode}
            fitSignal={fitSignal}
            emptyState={emptyState}
            onSelect={(id) => perform(selectPerson(id))}
            onExpand={(id) => perform(expandPerson(id))}
            onEdit={(id) => { perform(selectPerson(id)); perform(editPerson(id)) }}
            onBeginDrag={(id, x, y) => begin(id, 'tree', x, y)}
          />
        </div>
        <PeopleTray
          people={trayPeople}
          hasTree={Boolean(state.focusId)}
          selectedId={state.selectedId}
          draggingId={drag?.source === 'tray' ? drag.personId : null}
          dropActive={Boolean(drag?.source === 'tree' && drag.overTray)}
          panelOpen={Boolean(selected)}
          workspace={workspace}
          sampleDirty={workspace === 'sample' && state.peopleById !== savedPeople}
          canStartOver={state.peopleById.size > 0}
          onStartOver={() => {
            const next = createWorkspaceState('blank', samplePeople)
            setState(next)
            setSavedPeople(next.peopleById)
            resetTransient()
            say('Started a new tree')
          }}
          onNewPerson={() => setAdding({ anchorId: null, kin: null })}
          onSelect={(id) => perform(selectPerson(id, { focus: false }))}
          onBeginDrag={(id, x, y) => begin(id, 'tray', x, y)}
          onDelete={handleDeletePerson}
          onSwitchWorkspace={switchWorkspace}
        />
        {panelPerson && <DetailsPanel
          person={panelPerson}
          closing={panelClosing}
          people={state.peopleById}
          onSelect={(id) => perform(selectPerson(id, { focus: treeIds.has(id) || selectedInTree }))}
          onEdit={() => perform(editPerson(panelPerson.id))}
          onClose={() => perform(clearSelection())}
          onAddPerson={(kin) => setConnecting(kin)}
          onDisconnectPerson={(id, relationship) => handleDisconnectPerson(id, relationship)}
        />}
        {notice && <div key={notice.id} className="app-notice" role="status"><span className="app-notice-dot" aria-hidden="true" />{notice.text}</div>}
        {busy && <div className="busy-pill" role="status" aria-live="polite"><span className="busy-spinner" aria-hidden="true" />{busy}</div>}
      </section>
      {selected && state.editing && (
        <EditPersonModal
          person={selected}
          people={state.peopleById}
          focusId={state.focusId}
          onCancel={() => { setPendingRemoveId(null); perform(cancelEditing()) }}
          onSave={(patch) => perform(updatePerson(selected.id, patch))}
          onRemove={handleRemovePerson}
          onDisconnectSibling={(id) => perform(disconnectSiblings(selected.id, id))}
          onPreviewRemove={setPendingRemoveId}
          onCancelRemove={() => setPendingRemoveId(null)}
        />
      )}
      {savingChoice && (
        <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.currentTarget === event.target) setSavingChoice(false) }}>
          <div className="modal save-modal" role="dialog" aria-modal="true" aria-label="Save to a file">
            <div className="modal-header">
              <h2>Save to a file</h2>
              <p className="modal-subtitle">{workspace === 'sample' ? 'You’re in the sample family — choose what to keep.' : 'Choose what goes into the file.'}</p>
            </div>
            <div className="drop-picker-choices">
              <button type="button" className="drop-picker-choice" onClick={() => handleSave(familyOnScreen)}>
                <strong>This family ({familyOnScreen.size} {familyOnScreen.size === 1 ? 'person' : 'people'})</strong>
                <span>Everyone connected to {currentMain ? fullName(currentMain) : 'the person on screen'}</span>
              </button>
              <button type="button" className="drop-picker-choice" onClick={() => handleSave(state.peopleById)}>
                <strong>Everything ({state.peopleById.size} people)</strong>
                <span>Every family and everyone in your People list</span>
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setSavingChoice(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {drag && draggedPerson && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <span className="drag-ghost-name">{fullName(draggedPerson)}</span>
          <span className="drag-ghost-hint">
            {drag.overId
              ? `Connect to ${fullName(state.peopleById.get(drag.overId) ?? draggedPerson)}`
              : drag.source === 'tree' && drag.overTray
                ? 'Remove from tree'
                : drag.overCanvas && !state.focusId
                  ? 'Place as first person'
                  : 'Drop on a card'}
          </span>
        </div>
      )}
      {pendingDrop && dropDragged && dropTarget && (
        <DropConnectPicker
          dragged={dropDragged}
          target={dropTarget}
          people={state.peopleById}
          x={pendingDrop.x}
          y={pendingDrop.y}
          onChoose={handleChooseDrop}
          onChooseSibling={handleChooseSibling}
          onClose={closeDropPicker}
        />
      )}
      {followUp && (
        <FollowUpPrompt
          people={state.peopleById}
          title={followUp.title}
          suggestions={followUp.suggestions}
          onApply={handleApplyFollowUps}
          otherParent={followUp.otherParentFor ? state.peopleById.get(followUp.otherParentFor) : undefined}
          onAddOtherParent={() => { if (followUp.otherParentFor) handleAddOtherParent(followUp.otherParentFor) }}
          onSkip={() => { say(followUp.title); setFollowUp(null) }}
        />
      )}
      {adding && (
        <AddPersonModal
          anchorPerson={addingAnchor}
          kin={adding.kin}
          initialName={adding.initialName}
          onClose={() => setAdding(null)}
          onAdd={handleAddPerson}
        />
      )}
      {selected && connecting && (
        <AddRelativeModal
          key={`${selected.id}:${connecting}`}
          selected={selected}
          people={state.peopleById}
          kin={connecting}
          onClose={() => setConnecting(null)}
          onConnect={handleConnectPerson}
          onCreateNew={(name, kin) => {
            setConnecting(null)
            setAdding({ anchorId: selected.id, kin, initialName: name })
          }}
        />
      )}
    </main>
  )
}
