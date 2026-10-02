import { describe, expect, it } from 'vitest'
import type { Person } from '../element'
import { familyFileName, parseFamilyFile, serializeFamily } from './familyFile'

const people: Person[] = [
  { id: 'a', name: { first: 'Ada', last: 'Tan' }, gender: 'F', spouses: ['b'], children: ['c'], avatar: 'data:image/png;base64,AAAA' },
  { id: 'b', name: { first: 'Ben', last: 'Tan' }, gender: 'M', spouses: ['a'], children: ['c'] },
  { id: 'c', name: { first: 'Cara', last: 'Tan' }, gender: 'U', parents: ['a', 'b'], bio: 'Hello' },
]

describe('family file', () => {
  it('round-trips people, relationships and focus', () => {
    const map = new Map(people.map((person) => [person.id, person]))
    const loaded = parseFamilyFile(serializeFamily(map, 'c', new Date('2026-01-02T00:00:00Z')))
    expect(loaded.focusId).toBe('c')
    expect(loaded.people.map((person) => person.id)).toEqual(['a', 'b', 'c'])
    expect(loaded.people[0]).toMatchObject({ name: { first: 'Ada', last: 'Tan' }, spouses: ['b'], children: ['c'], avatar: 'data:image/png;base64,AAAA' })
    expect(loaded.people[2]).toMatchObject({ parents: ['a', 'b'], bio: 'Hello' })
  })

  it('names files by date', () => {
    expect(familyFileName(new Date('2026-03-04T10:00:00Z'))).toBe('ka-teng-family-2026-03-04.json')
  })

  it('rejects non-JSON and foreign JSON', () => {
    expect(() => parseFamilyFile('not json')).toThrow('not valid JSON')
    expect(() => parseFamilyFile('{"hello":1}')).toThrow('not a Ka-teng family file')
  })

  it('rejects duplicate or missing ids', () => {
    expect(() => parseFamilyFile(JSON.stringify([{ id: 'x', name: {} }, { id: 'x', name: {} }]))).toThrow('used twice')
    expect(() => parseFamilyFile(JSON.stringify([{ name: {} }]))).toThrow('needs an id')
  })

  it('drops unsafe avatars, unknown links and bad genders', () => {
    const loaded = parseFamilyFile(JSON.stringify({
      app: 'ka-teng',
      version: 1,
      people: [{ id: 'x', name: { first: 'X' }, gender: 'Q', avatar: 'javascript:alert(1)', parents: ['ghost', 'x'], bio: 'b'.repeat(900) }],
    }))
    expect(loaded.people[0]).toMatchObject({ gender: 'U', avatar: undefined, parents: undefined })
    expect(loaded.people[0].bio).toHaveLength(500)
    expect(loaded.focusId).toBe('x')
  })

  it('refuses files from a newer version', () => {
    expect(() => parseFamilyFile(JSON.stringify({ app: 'ka-teng', version: 99, people: [] }))).toThrow('newer version')
  })
})
