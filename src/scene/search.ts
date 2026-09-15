import type { Person, PersonMap } from '../element'

function searchableFields(person: Person): string[] {
  return [
    person.name.first,
    person.name.last,
    person.name.chinese,
    person.name.pinyin,
  ].filter((value): value is string => Boolean(value))
}

export function rankSearchPeople(query: string, people: PersonMap): Person[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return [...people.values()]
  return [...people.values()]
    .map((person, index) => {
      const fields = searchableFields(person).map((field) => field.toLocaleLowerCase())
      const prefix = fields.some((field) => field.startsWith(needle))
      const match = fields.some((field) => field.includes(needle))
      return { person, index, rank: prefix ? 0 : match ? 1 : 2 }
    })
    .filter((entry) => entry.rank < 2)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.person)
}

export function searchPeople(query: string, people: PersonMap): Person[] {
  return rankSearchPeople(query, people)
}
