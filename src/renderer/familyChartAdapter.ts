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
      birthday: (person.birthDate ?? person.birth)?.slice(0, 4),
      death: (person.deathDate ?? person.death)?.slice(0, 4),
      avatar: person.avatar,
    },
    rels: {
      parents: person.parents ?? [],
      spouses: person.spouses ?? [],
      children: childrenByParent.get(person.id) ?? [],
    },
  })) as Data
}
