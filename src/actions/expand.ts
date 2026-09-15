import type { PersonId } from '../element'
import type { Action } from './types'

export function toggleExpandAll(showAll: boolean): Action {
  return {
    name: `expand-all:${showAll}`,
    perform: (state) => ({ ...state, showAll }),
  }
}

export function expandPerson(id: PersonId): Action {
  return {
    name: `expand:${id}`,
    perform: (state) => ({
      ...state,
      expandedIds: new Set([...state.expandedIds, id]),
    }),
  }
}
