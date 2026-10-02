import type { Person, PersonId } from '../element'

function familyNeighbors(people: readonly Person[]): Map<PersonId, Set<PersonId>> {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const neighbors = new Map<PersonId, Set<PersonId>>(
    people.map((person) => [person.id, new Set()]),
  )

  for (const person of people) {
    const relatedIds = [
      ...(person.parents ?? []),
      ...(person.spouses ?? []),
      ...(person.children ?? []),
      ...(person.siblings ?? []),
      ...(person.stepSiblings ?? []),
    ]
    for (const relatedId of relatedIds) {
      if (!peopleById.has(relatedId)) continue
      neighbors.get(person.id)?.add(relatedId)
      neighbors.get(relatedId)?.add(person.id)
    }
  }
  return neighbors
}

export function familyComponent(people: readonly Person[], startId: PersonId | null): Set<PersonId> {
  const component = new Set<PersonId>()
  if (!startId || !people.some((person) => person.id === startId)) return component
  const neighbors = familyNeighbors(people)
  const queue = [startId]
  component.add(startId)
  while (queue.length) {
    const id = queue.shift() as PersonId
    for (const relatedId of neighbors.get(id) ?? []) {
      if (component.has(relatedId)) continue
      component.add(relatedId)
      queue.push(relatedId)
    }
  }
  return component
}

export function largestFamilyRoot(people: readonly Person[]): PersonId | null {
  const neighbors = familyNeighbors(people)
  const visited = new Set<PersonId>()
  let largest: PersonId[] = []
  for (const person of people) {
    if (visited.has(person.id)) continue
    const component: PersonId[] = []
    const queue = [person.id]
    visited.add(person.id)
    while (queue.length) {
      const id = queue.shift() as PersonId
      component.push(id)
      for (const relatedId of neighbors.get(id) ?? []) {
        if (visited.has(relatedId)) continue
        visited.add(relatedId)
        queue.push(relatedId)
      }
    }
    if (component.length > largest.length) largest = component
  }

  return largest[0] ?? null
}
