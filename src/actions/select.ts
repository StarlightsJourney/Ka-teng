import type { PersonId } from '../element'
import type { Action } from './types'

export function selectPerson(id: PersonId, options: { focus?: boolean } = {}): Action {
  const focus = options.focus ?? true
  return {
    name: `select:${id}`,
    perform: (state) => state.peopleById.has(id)
      ? { ...state, selectedId: id, focusId: focus ? id : state.focusId, expandedIds: focus ? new Set() : state.expandedIds, editing: false }
      : state,
  }
}

export function clearSelection(): Action {
  return {
    name: 'select:clear',
    perform: (state) => ({ ...state, selectedId: null, editing: false }),
  }
}

export function focusPerson(id: PersonId | null): Action {
  return {
    name: `focus:${id ?? 'none'}`,
    perform: (state) => id === null || state.peopleById.has(id)
      ? { ...state, focusId: id, expandedIds: new Set() }
      : state,
  }
}
