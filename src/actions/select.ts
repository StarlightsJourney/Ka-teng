import type { PersonId } from '../element'
import type { Action } from './types'

export function selectPerson(id: PersonId): Action {
  return {
    name: `select:${id}`,
    perform: (state) => state.peopleById.has(id) ? { ...state, selectedId: id } : state,
  }
}
