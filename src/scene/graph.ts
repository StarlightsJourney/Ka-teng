import { fullName, parentIds } from '../element'
import type { Person, PersonId } from '../element'

export type GraphNode = {
  id: PersonId
  name: string
  group: PersonId
  gender: string
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
}

export type GraphLink = {
  source: PersonId
  target: PersonId
  kind: 'parent' | 'spouse'
}

export type FamilyGraph = {
  nodes: GraphNode[]
  links: GraphLink[]
}

function spouseIds(person: Person, peopleById: Map<PersonId, Person>): PersonId[] {
  const reciprocal = [...peopleById.values()]
    .filter((candidate) => candidate.spouses?.includes(person.id))
    .map((candidate) => candidate.id)
  return [...new Set([...(person.spouses ?? []), ...reciprocal])]
}

export function toFamilyGraph(people: Person[]): FamilyGraph {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const groups = new Map<PersonId, PersonId>()
  const roots = people.filter((person) => parentIds(person).every((id) => !peopleById.has(id)))

  for (const root of roots) {
    if (groups.has(root.id)) continue
    groups.set(root.id, root.id)
    const queue = [root.id]
    while (queue.length) {
      const current = peopleById.get(queue.shift()!)
      if (!current) continue
      const related = [...spouseIds(current, peopleById), ...(current.children ?? [])]
      for (const id of related) {
        if (peopleById.has(id) && !groups.has(id)) {
          groups.set(id, root.id)
          queue.push(id)
        }
      }
    }
  }

  for (const person of people) {
    if (!groups.has(person.id)) groups.set(person.id, person.id)
  }

  const links: GraphLink[] = []
  const seen = new Set<string>()
  const addLink = (link: GraphLink) => {
    const key = `${link.kind}:${link.source}:${link.target}`
    if (!seen.has(key)) {
      seen.add(key)
      links.push(link)
    }
  }

  for (const person of people) {
    for (const childId of person.children ?? []) {
      if (peopleById.has(childId)) addLink({ source: person.id, target: childId, kind: 'parent' })
    }
    for (const child of people) {
      if (parentIds(child).includes(person.id)) addLink({ source: person.id, target: child.id, kind: 'parent' })
    }
    for (const spouseId of spouseIds(person, peopleById)) {
      if (peopleById.has(spouseId)) {
        const key = [person.id, spouseId].sort().join(':')
        if (!seen.has(`spouse:${key}`)) addLink({ source: person.id, target: spouseId, kind: 'spouse' })
      }
    }
  }

  return {
    nodes: people.map((person) => ({
      id: person.id,
      name: fullName(person),
      group: groups.get(person.id) ?? person.id,
      gender: person.gender,
    })),
    links,
  }
}
