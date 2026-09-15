import rawPeople from './big-tree.json'
import type { Gender, Person, PersonId } from '../element'

type RawPerson = {
  id: PersonId
  data?: Record<string, unknown>
  rels?: {
    father?: PersonId
    mother?: PersonId
    parents?: PersonId[]
    spouses?: PersonId[]
    children?: PersonId[]
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function ids(values: (PersonId | undefined)[]): PersonId[] | undefined {
  const result = [...new Set(values.filter((id): id is PersonId => Boolean(id)))]
  return result.length ? result : undefined
}

export function normalizeWikidata(source: RawPerson[]): Person[] {
  return source.map((raw) => {
    const data = raw.data ?? {}
    const rels = raw.rels ?? {}
    const gender = text(data.gender)
    return {
      id: raw.id,
      name: {
        first: text(data['first name']) ?? text(data.fn) ?? '',
        last: text(data['last name']) ?? text(data.ln) ?? '',
        chinese: text(data.chinese),
        pinyin: text(data.pinyin),
      },
      gender: (gender === 'F' || gender === 'M' || gender === 'X' ? gender : 'U') as Gender,
      birth: text(data.birthday) ?? text(data.birth),
      death: text(data.death),
      avatar: text(data.avatar) ?? text(data.photo),
      parents: ids([...(rels.parents ?? []), rels.father, rels.mother]),
      spouses: ids(rels.spouses ?? []),
      children: ids(rels.children ?? []),
    }
  })
}

export function loadBigTree(): Person[] {
  return normalizeWikidata(rawPeople as RawPerson[])
}
