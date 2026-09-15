import type { Person, PersonMap } from '../element'

export function searchPeople(query: string, people: PersonMap): Person[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return [...people.values()]
  return [...people.values()].filter((person) => [
    person.name.first,
    person.name.last,
    person.name.chinese,
    person.name.pinyin,
  ].some((value) => value?.toLocaleLowerCase().includes(needle)))
}
