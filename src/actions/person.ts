import type { AvatarFocus, Gender, Person, PersonId, PersonMap, RelationshipType, SuggestedLink } from '../element'
import { canConnectKin, connectKin, connectSibling, disconnectRelationship, disconnectSibling, type SiblingKind } from '../element'
import { familyComponent } from '../scene'
import type { Action, AppState } from './types'

export type PersonPatch = {
  first?: string
  last?: string
  chinese?: string
  pinyin?: string
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
  avatarFocus?: AvatarFocus | null
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
      ? { ...state, selectedId: id, editing: true }
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
          ...(patch.chinese === undefined ? {} : { chinese: patch.chinese || undefined }),
          ...(patch.pinyin === undefined ? {} : { pinyin: patch.pinyin || undefined }),
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
        ...(patch.avatarFocus === undefined ? {} : { avatarFocus: patch.avatarFocus ?? undefined }),
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
      siblings: person.siblings?.filter((relatedId) => relatedId !== id),
      stepSiblings: person.stepSiblings?.filter((relatedId) => relatedId !== id),
    }))
}

export function detachPerson(people: readonly Person[], id: PersonId): Person[] {
  return people.map((person) => person.id === id
    ? { ...person, parents: [], spouses: [], children: [], siblings: [], stepSiblings: [] }
    : {
      ...person,
      parents: person.parents?.filter((relatedId) => relatedId !== id),
      spouses: person.spouses?.filter((relatedId) => relatedId !== id),
      children: person.children?.filter((relatedId) => relatedId !== id),
      siblings: person.siblings?.filter((relatedId) => relatedId !== id),
      stepSiblings: person.stepSiblings?.filter((relatedId) => relatedId !== id),
    })
}

export function relativesOf(people: PersonMap, id: PersonId): PersonId[] {
  const person = people.get(id)
  const direct = [...(person?.parents ?? []), ...(person?.spouses ?? []), ...(person?.children ?? []), ...(person?.siblings ?? []), ...(person?.stepSiblings ?? [])]
  const reverse = [...people.values()]
    .filter((other) => [...(other.parents ?? []), ...(other.spouses ?? []), ...(other.children ?? []), ...(other.siblings ?? []), ...(other.stepSiblings ?? [])].includes(id))
    .map((other) => other.id)
  return [...new Set([...direct, ...reverse])].filter((relatedId) => relatedId !== id && people.has(relatedId))
}

function fallbackFocus(state: AppState, id: PersonId): PersonId | null {
  if (state.focusId !== id) return state.focusId
  const relatives = relativesOf(state.peopleById, id)
  if (relatives.length < 2) return relatives[0] ?? null
  const after = detachPerson([...state.peopleById.values()], id)
  return relatives
    .map((relativeId) => ({ relativeId, size: familyComponent(after, relativeId).size }))
    .sort((a, b) => b.size - a.size)[0]?.relativeId ?? null
}

export function detachPersonAction(id: PersonId): Action {
  return {
    name: `person:detach:${id}`,
    perform: (state) => {
      if (!state.peopleById.has(id)) return state
      const focusId = fallbackFocus(state, id)
      const peopleById = new Map(detachPerson([...state.peopleById.values()], id).map((person) => [person.id, person]))
      return { ...state, peopleById, focusId, selectedId: null, editing: false, expandedIds: new Set() }
    },
  }
}

export function removePersonAction(id: PersonId): Action {
  return {
    name: `person:remove:${id}`,
    perform: (state) => {
      if (!state.peopleById.has(id)) return state
      const focusId = fallbackFocus(state, id)
      const peopleById = new Map(removePerson([...state.peopleById.values()], id).map((person) => [person.id, person]))
      return {
        ...state,
        peopleById,
        focusId,
        selectedId: state.selectedId === id ? null : state.selectedId,
        editing: state.selectedId === id ? false : state.editing,
        expandedIds: new Set(),
      }
    },
  }
}

export function addPerson(person: Person, options: { select?: boolean } = {}): Action {
  const select = options.select ?? true
  return {
    name: `person:add:${person.id}`,
    perform: (state) => {
      if (state.peopleById.has(person.id)) return state
      const peopleById = new Map(state.peopleById)
      peopleById.set(person.id, person)
      return { ...state, peopleById, selectedId: select ? person.id : state.selectedId, expandedIds: new Set(state.expandedIds) }
    },
  }
}

export function connectPeople(
  fromId: PersonId,
  toId: PersonId,
  kin: RelationshipType,
): Action {
  return {
    name: `person:connect:${fromId}:${toId}:${kin}`,
    perform: (state) => canConnectKin(state.peopleById, fromId, toId, kin)
      ? { ...state, peopleById: connectKin(state.peopleById, fromId, toId, kin) }
      : state,
  }
}

export function connectSuggestions(links: readonly SuggestedLink[]): Action {
  return {
    name: `person:connect-suggestions:${links.length}`,
    perform: (state) => {
      const peopleById = links.reduce(
        (people, link) => canConnectKin(people, link.fromId, link.toId, link.kin) ? connectKin(people, link.fromId, link.toId, link.kin) : people,
        state.peopleById,
      )
      return peopleById === state.peopleById ? state : { ...state, peopleById }
    },
  }
}

export function disconnectPeople(
  fromId: PersonId,
  toId: PersonId,
  relationship: RelationshipType,
): Action {
  return {
    name: `person:disconnect:${fromId}:${toId}:${relationship}`,
    perform: (state) => ({
      ...state,
      peopleById: disconnectRelationship(state.peopleById, fromId, toId, relationship),
    }),
  }
}

export function connectSiblings(fromId: PersonId, toId: PersonId, kind: SiblingKind): Action {
  return {
    name: `person:sibling:${fromId}:${toId}:${kind}`,
    perform: (state) => {
      const peopleById = connectSibling(state.peopleById, fromId, toId, kind)
      return peopleById === state.peopleById ? state : { ...state, peopleById }
    },
  }
}

export function disconnectSiblings(a: PersonId, b: PersonId): Action {
  return {
    name: `person:unsibling:${a}:${b}`,
    perform: (state) => ({ ...state, peopleById: disconnectSibling(state.peopleById, a, b) }),
  }
}

export type RemovalImpact = {
  connections: PersonId[]
  leaving: PersonId[]
}

export function removalImpact(people: PersonMap, id: PersonId, focusId: PersonId | null): RemovalImpact {
  const connections = relativesOf(people, id)
  const list = [...people.values()]
  const before = familyComponent(list, id)
  before.delete(id)
  if (!before.size) return { connections, leaving: [] }
  const after = detachPerson(list, id)
  const keepAnchor = focusId && focusId !== id && before.has(focusId)
    ? focusId
    : [...before].map((candidate) => ({ candidate, size: familyComponent(after, candidate).size }))
      .sort((a, b) => b.size - a.size)[0]?.candidate ?? null
  const kept = familyComponent(after, keepAnchor)
  return { connections, leaving: [...before].filter((personId) => !kept.has(personId)) }
}
