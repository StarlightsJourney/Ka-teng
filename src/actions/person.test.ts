import { describe, expect, it } from 'vitest'
import type { Person } from '../element'
import { addPerson, connectPeople, detachPerson, detachPersonAction, removalImpact, removePerson, removePersonAction, updatePerson } from './person'
import type { AppState } from './types'
import { createWorkspaceState } from './workspace'

const state: AppState = {
  peopleById: new Map([
    ['one', { id: 'one', name: { first: 'One', last: 'Person' }, gender: 'U' }],
  ]),
  selectedId: 'one',
  focusId: 'one',
  query: '',
  showAll: false,
  expandedIds: new Set(),
  editing: true,
}

const family = (): Person[] => [
  { id: 'one', name: { first: 'One', last: '' }, gender: 'U', parents: ['parent'], spouses: ['two'] },
  { id: 'two', name: { first: 'Two', last: '' }, gender: 'U', spouses: ['one'], children: ['one'] },
  { id: 'parent', name: { first: 'Parent', last: '' }, gender: 'U', children: ['one'] },
]

const stateOf = (people: Person[], focusId: string | null): AppState => ({
  ...state,
  peopleById: new Map(people.map((person) => [person.id, person])),
  selectedId: focusId,
  focusId,
})

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
    expect(removePerson(family(), 'one')).toEqual([
      { id: 'two', name: { first: 'Two', last: '' }, gender: 'U', spouses: [], children: [] },
      { id: 'parent', name: { first: 'Parent', last: '' }, gender: 'U', children: [] },
    ])
  })

  it('moves focus to a relative when the focused person is deleted', () => {
    const next = removePersonAction('one').perform(stateOf(family(), 'one'))
    expect(next.peopleById.has('one')).toBe(false)
    expect(next.focusId).toBe('parent')
  })
})

describe('detachPerson', () => {
  it('keeps the person but clears every link on both sides', () => {
    const next = detachPerson(family(), 'one')
    expect(next.find((person) => person.id === 'one')).toMatchObject({ parents: [], spouses: [], children: [] })
    expect(next.find((person) => person.id === 'two')).toMatchObject({ spouses: [], children: [] })
    expect(next.find((person) => person.id === 'parent')).toMatchObject({ children: [] })
  })

  it('lets a removed person be reconnected as a spouse afterwards', () => {
    const detached = detachPersonAction('two').perform(stateOf(family(), 'one'))
    expect(detached.peopleById.has('two')).toBe(true)
    expect(detached.selectedId).toBeNull()
    expect(detached.focusId).toBe('one')
    const reconnected = connectPeople('one', 'two', 'spouse').perform(detached)
    expect(reconnected.peopleById.get('one')?.spouses).toContain('two')
    expect(reconnected.peopleById.get('two')?.spouses).toContain('one')
  })

  it('falls back to an empty canvas when a lone focused person is detached', () => {
    const lone: Person[] = [{ id: 'solo', name: { first: 'Solo', last: '' }, gender: 'U' }]
    expect(detachPersonAction('solo').perform(stateOf(lone, 'solo')).focusId).toBeNull()
  })
})

describe('addPerson', () => {
  it('adds a new person and selects them', () => {
    const person = { id: 'two', name: { first: 'Two', last: '' }, gender: 'U' as const }
    const next = addPerson(person).perform(state)
    expect(next.peopleById.has('two')).toBe(true)
    expect(next.selectedId).toBe('two')
  })

  it('can add an unplaced person without changing the selection', () => {
    const person = { id: 'two', name: { first: 'Two', last: '' }, gender: 'U' as const }
    const next = addPerson(person, { select: false }).perform(state)
    expect(next.peopleById.has('two')).toBe(true)
    expect(next.selectedId).toBe('one')
    expect(next.focusId).toBe('one')
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

  it('refuses invalid links such as cycles', () => {
    const current = stateOf(family(), 'one')
    expect(connectPeople('one', 'parent', 'parent').perform(current)).toBe(current)
  })
})

describe('createWorkspaceState', () => {
  it('starts blank with an empty canvas and the full tree visible', () => {
    const blank = createWorkspaceState('blank', family())
    expect(blank.peopleById.size).toBe(0)
    expect(blank.focusId).toBeNull()
    expect(blank.showAll).toBe(true)
  })

  it('loads the sample focused on its largest family', () => {
    const sample = createWorkspaceState('sample', family())
    expect(sample.peopleById.size).toBe(3)
    expect(sample.focusId).toBe('one')
    expect(sample.showAll).toBe(false)
  })
})

describe('removalImpact', () => {
  const chain = (): Person[] => [
    { id: 'gp', name: { first: 'Grand', last: '' }, gender: 'U', children: ['p'] },
    { id: 'p', name: { first: 'Parent', last: '' }, gender: 'U', parents: ['gp'], children: ['c'] },
    { id: 'c', name: { first: 'Child', last: '' }, gender: 'U', parents: ['p'] },
    { id: 'aunt', name: { first: 'Aunt', last: '' }, gender: 'U', parents: ['gp'] },
  ]
  const map = () => new Map(chain().map((person) => [person.id, person]))

  it('lists connections but nobody leaving when the tree stays connected', () => {
    const impact = removalImpact(map(), 'aunt', 'c')
    expect(impact.connections).toEqual(['gp'])
    expect(impact.leaving).toEqual([])
  })

  it('reports who would be cut off from the focused part of the tree', () => {
    const impact = removalImpact(map(), 'p', 'c')
    expect(impact.connections.sort()).toEqual(['c', 'gp'])
    expect(impact.leaving.sort()).toEqual(['aunt', 'gp'])
  })

  it('keeps the largest remaining group when the focused person is removed', () => {
    const impact = removalImpact(map(), 'p', 'p')
    expect(impact.leaving).toEqual(['c'])
  })
})
