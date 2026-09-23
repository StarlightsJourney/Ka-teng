import type { Family, Person, PersonId, PersonMap } from './types'

export type RelationshipType = 'parent' | 'spouse' | 'child'

function unique(ids: PersonId[]): PersonId[] {
  return [...new Set(ids)]
}

function hasRelationship(person: Person, otherId: PersonId, key: 'parents' | 'spouses' | 'children'): boolean {
  return (person[key] ?? []).includes(otherId)
}

function isAncestor(people: PersonMap, descendantId: PersonId, ancestorId: PersonId): boolean {
  const visited = new Set<PersonId>()
  const queue = [descendantId]
  while (queue.length) {
    const id = queue.shift()!
    if (id === ancestorId) return true
    if (visited.has(id)) continue
    visited.add(id)
    const person = people.get(id)
    if (person) queue.push(...(person.parents ?? []))
  }
  return false
}

function existingPeople(ids: PersonId[], people: PersonMap): Person[] {
  return unique(ids).map((id) => people.get(id)).filter((person): person is Person => Boolean(person))
}

export function canConnectRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): boolean {
  if (fromId === toId) return false
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to) return false
  if (type === 'spouse') {
    return !hasRelationship(from, toId, 'spouses')
      && !hasRelationship(from, toId, 'parents')
      && !hasRelationship(from, toId, 'children')
  }
  if (type === 'parent') {
    return !hasRelationship(to, fromId, 'parents')
      && !hasRelationship(from, toId, 'parents')
      && !hasRelationship(from, toId, 'spouses')
      && !isAncestor(people, fromId, toId)
  }
  // child
  return !hasRelationship(to, fromId, 'children')
    && !hasRelationship(from, toId, 'children')
    && !hasRelationship(from, toId, 'spouses')
    && !isAncestor(people, toId, fromId)
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



export function disconnectRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): PersonMap {
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to) return people
  const next = new Map(people)
  const updateFrom = { ...from }
  const updateTo = { ...to }
  if (type === 'parent') {
    updateFrom.children = unique((from.children ?? []).filter((id) => id !== toId))
    updateTo.parents = unique((to.parents ?? []).filter((id) => id !== fromId))
  } else if (type === 'child') {
    updateFrom.parents = unique((from.parents ?? []).filter((id) => id !== toId))
    updateTo.children = unique((to.children ?? []).filter((id) => id !== fromId))
  } else {
    updateFrom.spouses = unique((from.spouses ?? []).filter((id) => id !== toId))
    updateTo.spouses = unique((to.spouses ?? []).filter((id) => id !== fromId))
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
