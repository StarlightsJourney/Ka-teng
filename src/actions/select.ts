import type { PersonId } from '../element'
import type { Action } from './types'

export function selectPerson(id: PersonId): Action {
  return {
    name: `select:${id}`,
    perform: (state) => state.peopleById.has(id)
      ? { ...state, selectedId: id, expandedIds: new Set(), editing: false }
      : state,
  }
}

export function clearSelection(): Action {
  return {
    name: 'select:clear',
    perform: (state) => ({ ...state, selectedId: null, editing: false }),
  }
}
