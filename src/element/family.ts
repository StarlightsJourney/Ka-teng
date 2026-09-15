import type { Family, Person, PersonId, PersonMap } from './types'

function unique(ids: PersonId[]): PersonId[] {
  return [...new Set(ids)]
}

function existingPeople(ids: PersonId[], people: PersonMap): Person[] {
  return unique(ids).map((id) => people.get(id)).filter((person): person is Person => Boolean(person))
}

export function parentIds(person: Person): PersonId[] {
  return unique(person.parents ?? [])
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
