import { searchPeople } from '../scene'
import type { Action } from './types'

export function setSearch(query: string): Action {
  return {
    name: 'search:set',
    perform: (state) => ({ ...state, query }),
  }
}

export function searchAndSelect(query: string): Action {
  return {
    name: 'search:select',
    perform: (state) => {
      const result = searchPeople(query, state.peopleById)[0]
      return result
        ? { ...state, query, selectedId: result.id, expandedIds: new Set() }
        : { ...state, query }
    },
  }
}
