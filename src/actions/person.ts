import type { Gender, Person, PersonId } from '../element'
import type { Action } from './types'

export type PersonPatch = {
  first?: string
  last?: string
  gender?: Gender
  birth?: string
  death?: string
  birthDate?: string
  deathDate?: string
  deceased?: boolean
  restingPlace?: string
  altNames?: string[]
  bio?: string
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
        ...(patch.birthDate === undefined ? {} : { birthDate: patch.birthDate || undefined }),
        ...(patch.deathDate === undefined ? {} : { deathDate: patch.deathDate || undefined }),
        ...(patch.deceased === undefined ? {} : { deceased: patch.deceased }),
        ...(patch.restingPlace === undefined ? {} : { restingPlace: patch.restingPlace || undefined }),
        ...(patch.altNames === undefined ? {} : { altNames: patch.altNames.length ? patch.altNames : undefined }),
        ...(patch.bio === undefined ? {} : { bio: patch.bio.slice(0, 500) || undefined }),
        ...(patch.avatar === undefined ? {} : { avatar: patch.avatar || undefined }),
      }
      const peopleById = new Map(state.peopleById)
      peopleById.set(id, next)
      return { ...state, peopleById, editing: false }
    },
  }
}

export function removePerson(people: readonly Person[], id: PersonId): Person[] {
  return people
    .filter((person) => person.id !== id)
    .map((person) => ({
      ...person,
      parents: person.parents?.filter((relatedId) => relatedId !== id),
      spouses: person.spouses?.filter((relatedId) => relatedId !== id),
      children: person.children?.filter((relatedId) => relatedId !== id),
    }))
}

export function removePersonAction(id: PersonId): Action {
  return {
    name: `person:remove:${id}`,
    perform: (state) => {
      if (!state.peopleById.has(id)) return state
      const peopleById = new Map(removePerson([...state.peopleById.values()], id).map((person) => [person.id, person]))
      return { ...state, peopleById, selectedId: null, editing: false, expandedIds: new Set() }
    },
  }
}
