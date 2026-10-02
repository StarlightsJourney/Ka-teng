import { describe, expect, it } from 'vitest'
import { clearSelection, focusPerson, selectPerson } from './select'
import type { AppState } from './types'

const state: AppState = {
  peopleById: new Map([
    ['one', { id: 'one', name: { first: 'One', last: 'Person' }, gender: 'U' }],
    ['two', { id: 'two', name: { first: 'Two', last: 'Person' }, gender: 'U' }],
  ]),
  selectedId: null,
  focusId: 'one',
  query: '',
  showAll: false,
  expandedIds: new Set(),
  editing: false,
}

describe('selectPerson', () => {
  it('returns a new state with a valid selection and focuses it', () => {
    const next = selectPerson('two').perform(state)
    expect(next).not.toBe(state)
    expect(next.selectedId).toBe('two')
    expect(next.focusId).toBe('two')
  })

  it('can select without moving the focus', () => {
    const next = selectPerson('two', { focus: false }).perform(state)
    expect(next.selectedId).toBe('two')
    expect(next.focusId).toBe('one')
  })

  it('ignores unknown ids', () => {
    expect(selectPerson('missing').perform(state)).toBe(state)
  })
})

describe('clearSelection', () => {
  it('closes the panel but keeps the camera focus on the last selected person', () => {
    const selected = selectPerson('two').perform(state)
    const cleared = clearSelection().perform(selected)
    expect(cleared.selectedId).toBeNull()
    expect(cleared.focusId).toBe('two')
  })
})

describe('focusPerson', () => {
  it('focuses a known person or clears focus', () => {
    expect(focusPerson('two').perform(state).focusId).toBe('two')
    expect(focusPerson(null).perform(state).focusId).toBeNull()
    expect(focusPerson('missing').perform(state)).toBe(state)
  })
})
