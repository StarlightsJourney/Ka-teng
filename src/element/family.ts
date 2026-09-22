import type { Family, Person, PersonId, PersonMap } from './types'

export type RelationshipType = 'parent' | 'spouse' | 'child'

function unique(ids: PersonId[]): PersonId[] {
  return [...new Set(ids)]
}

function existingPeople(ids: PersonId[], people: PersonMap): Person[] {
  return unique(ids).map((id) => people.get(id)).filter((person): person is Person => Boolean(person))
}

export function parentIds(person: Person): PersonId[] {
  return unique(person.parents ?? [])
}

export function addRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): PersonMap {
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to || fromId === toId) return people
  const next = new Map(people)
  const updateFrom = { ...from }
  const updateTo = { ...to }
  if (type === 'parent') {
    updateFrom.children = unique([...(from.children ?? []), toId])
    updateTo.parents = unique([...(to.parents ?? []), fromId])
  } else if (type === 'child') {
    updateFrom.parents = unique([...(from.parents ?? []), toId])
    updateTo.children = unique([...(to.children ?? []), fromId])
  } else if (type === 'spouse') {
    updateFrom.spouses = unique([...(from.spouses ?? []), toId])
    updateTo.spouses = unique([...(to.spouses ?? []), fromId])
  }
  next.set(fromId, updateFrom)
  next.set(toId, updateTo)
  return next
}



export function getParents(person: Person, people: PersonMap): Person[] {
  return existingPeople(parentIds(person), people)
}

export function getSpouses(person: Person, people: PersonMap): Person[] {
  return existingPeople(person.spouses ?? [], people)
}

export function getChildren(person: Person, people: PersonMap): Person[] {
  return existingPeople(person.children ?? [], people)
}

export function familyFor(person: Person): Family {
  return {
    id: `family:${person.id}`,
    parents: parentIds(person),
    children: unique(person.children ?? []),
  }
}
