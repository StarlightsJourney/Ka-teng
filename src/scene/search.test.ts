import { describe, expect, it } from 'vitest'
import { searchPeople } from './search'
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
})
