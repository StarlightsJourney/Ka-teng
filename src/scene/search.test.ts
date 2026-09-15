import { describe, expect, it } from 'vitest'
import { rankSearchPeople, searchPeople } from './search'
import type { Person } from '../element'

const people: Person[] = [
  { id: '1', name: { first: 'Li', last: 'Ming', chinese: '李明', pinyin: 'Li Ming' }, gender: 'M' },
  { id: '2', name: { first: 'Ada', last: 'Lovelace' }, gender: 'F' },
]

describe('searchPeople', () => {
  const map = new Map(people.map((person) => [person.id, person]))

  it('searches all supported name fields case-insensitively', () => {
    expect(searchPeople('LOVELACE', map).map((person) => person.id)).toEqual(['2'])
    expect(searchPeople('李明', map).map((person) => person.id)).toEqual(['1'])
    expect(searchPeople('li ming', map).map((person) => person.id)).toEqual(['1'])
  })

  it('ranks prefix matches before interior matches', () => {
    const ranked = new Map([
      ['1', people[0]],
      ['2', people[1]],
      ['3', { id: '3', name: { first: 'Charlie', last: 'Lima' }, gender: 'M' as const }],
    ])
    expect(rankSearchPeople('li', ranked).map((person) => person.id)).toEqual(['1', '3'])
  })
})
