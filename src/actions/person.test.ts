import { describe, expect, it } from 'vitest'
import { updatePerson } from './person'
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
