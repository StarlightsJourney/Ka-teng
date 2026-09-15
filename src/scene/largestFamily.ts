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
    ]
    for (const relatedId of relatedIds) {
      if (!peopleById.has(relatedId)) continue
      neighbors.get(person.id)?.add(relatedId)
      neighbors.get(relatedId)?.add(person.id)
    }
  }
  return neighbors
}

export function connectedFamilySize(people: readonly Person[], personId: PersonId): number {
  const neighbors = familyNeighbors(people)
  if (!neighbors.has(personId)) return 0
  const visited = new Set<PersonId>([personId])
  const queue = [personId]
  while (queue.length) {
    const id = queue.shift() as PersonId
    for (const relatedId of neighbors.get(id) ?? []) {
      if (visited.has(relatedId)) continue
      visited.add(relatedId)
      queue.push(relatedId)
    }
  }
  return visited.size
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
