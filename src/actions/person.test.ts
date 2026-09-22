import { describe, expect, it } from 'vitest'
import { addPerson, connectPeople, removePerson, updatePerson } from './person'
import type { AppState } from './types'

const state: AppState = {
  peopleById: new Map([
    ['one', { id: 'one', name: { first: 'One', last: 'Person' }, gender: 'U' }],
  ]),
  selectedId: 'one',
  query: '',
  showAll: false,
  expandedIds: new Set(),
  editing: true,
}

describe('updatePerson', () => {
  it('returns a new map with the requested fields updated', () => {
    const next = updatePerson('one', { first: 'Updated', birth: '1900', avatar: 'https://example.com/a.jpg' }).perform(state)
    expect(next.peopleById).not.toBe(state.peopleById)
    expect(next.peopleById.get('one')).toMatchObject({
      name: { first: 'Updated', last: 'Person' },
      birth: '1900',
      avatar: 'https://example.com/a.jpg',
    })
    expect(next.editing).toBe(false)
  })
})

describe('removePerson', () => {
  it('removes the person and detaches every relationship', () => {
    const people = [
      { id: 'one', name: { first: 'One', last: '' }, gender: 'U' as const, parents: ['parent'], spouses: ['two'] },
      { id: 'two', name: { first: 'Two', last: '' }, gender: 'U' as const, spouses: ['one'], children: ['one'] },
      { id: 'parent', name: { first: 'Parent', last: '' }, gender: 'U' as const, children: ['one'] },
    ]
    expect(removePerson(people, 'one')).toEqual([
      { id: 'two', name: { first: 'Two', last: '' }, gender: 'U', spouses: [], children: [] },
      { id: 'parent', name: { first: 'Parent', last: '' }, gender: 'U', children: [] },
    ])
  })
})

describe('addPerson', () => {
  it('adds a new person and selects them', () => {
    const person = { id: 'two', name: { first: 'Two', last: '' }, gender: 'U' as const }
    const next = addPerson(person).perform(state)
    expect(next.peopleById.has('two')).toBe(true)
    expect(next.selectedId).toBe('two')
  })
})

describe('connectPeople', () => {
  it('connects two existing people as parent and child', () => {
    const next = connectPeople('one', 'two', 'parent').perform({
      ...state,
      peopleById: new Map([
        ['one', { id: 'one', name: { first: 'One', last: '' }, gender: 'U' }],
        ['two', { id: 'two', name: { first: 'Two', last: '' }, gender: 'U' }],
      ]),
    })
    expect(next.peopleById.get('one')?.children).toContain('two')
    expect(next.peopleById.get('two')?.parents).toContain('one')
  })
})
