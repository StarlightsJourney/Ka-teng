import { describe, expect, it } from 'vitest'
import { selectPerson } from './select'
import type { AppState } from './types'

const state: AppState = {
  peopleById: new Map([
    ['one', { id: 'one', name: { first: 'One', last: 'Person' }, gender: 'U' }],
  ]),
  selectedId: null,
  query: '',
  view: '2d',
  layered: false,
}

describe('selectPerson', () => {
  it('returns a new state with a valid selection', () => {
    const next = selectPerson('one').perform(state)
    expect(next).not.toBe(state)
    expect(next.selectedId).toBe('one')
  })

  it('ignores unknown ids', () => {
    expect(selectPerson('missing').perform(state)).toBe(state)
  })
})
