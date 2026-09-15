import type { FamilyGraph, GraphLink, Person } from '../types'

function parentIds(person: Person): string[] {
  return [
    ...(person.rels.parents ?? []),
    ...(person.rels.father ? [person.rels.father] : []),
    ...(person.rels.mother ? [person.rels.mother] : []),
  ]
}

export function personName(person: Person): string {
  const first = person.data['first name'] ?? ''
  const last = person.data['last name'] ?? ''
  return String(`${first} ${last}`.trim() || person.data.label || person.id)
}

export function toFamilyGraph(people: Person[]): FamilyGraph {
  const byId = new Map(people.map((person) => [person.id, person]))
  const roots = people.filter((person) => parentIds(person).every((id) => !byId.has(id)))
  const groups = new Map<string, string>()

  for (const root of roots) {
    if (groups.has(root.id)) continue
    const queue = [root.id]
    groups.set(root.id, root.id)

    while (queue.length > 0) {
      const currentId = queue.shift() as string
      const current = byId.get(currentId)
      if (!current) continue

      for (const spouseId of current.rels.spouses ?? []) {
        if (!groups.has(spouseId)) {
          groups.set(spouseId, root.id)
          queue.push(spouseId)
        }
      }
      for (const childId of current.rels.children ?? []) {
        if (!groups.has(childId)) {
          groups.set(childId, root.id)
          queue.push(childId)
        }
      }
    }
  }

  for (const person of people) {
    if (!groups.has(person.id)) groups.set(person.id, person.id)
  }

  const links: GraphLink[] = []
  const seenSpouses = new Set<string>()
  for (const person of people) {
    for (const childId of person.rels.children ?? []) {
      if (byId.has(childId)) links.push({ source: person.id, target: childId, kind: 'parent' })
    }
    for (const spouseId of person.rels.spouses ?? []) {
      const key = [person.id, spouseId].sort().join(':')
      if (byId.has(spouseId) && !seenSpouses.has(key)) {
        seenSpouses.add(key)
        links.push({ source: person.id, target: spouseId, kind: 'spouse' })
      }
    }
  }

  return {
    nodes: people.map((person) => ({
      id: person.id,
      name: personName(person),
      group: groups.get(person.id) as string,
      gender: person.data.gender,
    })),
    links,
  }
}
