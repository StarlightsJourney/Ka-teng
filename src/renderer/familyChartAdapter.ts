import type { Data } from 'family-chart'
import type { Person } from '../element'

export function toFamilyChartData(people: Person[]): Data {
  const childrenByParent = new Map(
    people.map((person) => [
      person.id,
      people.filter((child) => child.parents?.includes(person.id)).map((child) => child.id),
    ]),
  )
  return people.map((person) => ({
    id: person.id,
    data: {
      'first name': person.name.first,
      'last name': person.name.last,
      gender: person.gender,
      birthday: person.birth,
      death: person.death,
      avatar: person.photo,
    },
    rels: {
      parents: person.parents ?? [],
      spouses: person.spouses ?? [],
      children: childrenByParent.get(person.id) ?? [],
    },
  })) as Data
}
