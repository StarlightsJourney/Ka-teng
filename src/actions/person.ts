import type { Gender, Person, PersonId } from '../element'
import type { Action } from './types'

export type PersonPatch = {
  first?: string
  last?: string
  gender?: Gender
  birth?: string
  death?: string
  avatar?: string
}

export function startEditing(): Action {
  return {
    name: 'person:edit',
    perform: (state) => state.selectedId ? { ...state, editing: true } : state,
  }
}

export function editPerson(id: PersonId): Action {
  return {
    name: `person:edit:${id}`,
    perform: (state) => state.peopleById.has(id)
      ? { ...state, selectedId: id, expandedIds: new Set(), editing: true }
      : state,
  }
}

export function cancelEditing(): Action {
  return {
    name: 'person:edit-cancel',
    perform: (state) => ({ ...state, editing: false }),
  }
}

export function updatePerson(id: PersonId, patch: PersonPatch): Action {
  return {
    name: `person:update:${id}`,
    perform: (state) => {
      const person = state.peopleById.get(id)
      if (!person) return state
      const next: Person = {
        ...person,
        name: {
          ...person.name,
          ...(patch.first === undefined ? {} : { first: patch.first }),
          ...(patch.last === undefined ? {} : { last: patch.last }),
        },
        ...(patch.gender === undefined ? {} : { gender: patch.gender }),
        ...(patch.birth === undefined ? {} : { birth: patch.birth || undefined }),
        ...(patch.death === undefined ? {} : { death: patch.death || undefined }),
        ...(patch.avatar === undefined ? {} : { avatar: patch.avatar || undefined }),
      }
      const peopleById = new Map(state.peopleById)
      peopleById.set(id, next)
      return { ...state, peopleById, editing: false }
    },
  }
}
