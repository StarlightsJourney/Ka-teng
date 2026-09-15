import { describe, expect, it } from 'vitest'
import { neighborOf } from './neighbor'
import type { Person } from '../element'

const people = new Map<string, Person>([
  ['parent', { id: 'parent', name: { first: 'Parent', last: '' }, gender: 'M', children: ['one', 'two', 'three'] }],
  ['one', { id: 'one', name: { first: 'One', last: '' }, gender: 'M', parents: ['parent'], spouses: ['spouse'] }],
  ['two', { id: 'two', name: { first: 'Two', last: '' }, gender: 'F', parents: ['parent'] }],
  ['three', { id: 'three', name: { first: 'Three', last: '' }, gender: 'U', parents: ['parent'] }],
  ['spouse', { id: 'spouse', name: { first: 'Spouse', last: '' }, gender: 'F' }],
])

describe('neighborOf', () => {
  it('navigates parents and children', () => {
    expect(neighborOf(people, 'one', 'up')).toBe('parent')
    expect(neighborOf(people, 'one', 'down')).toBeNull()
  })

  it('navigates siblings and falls back to a spouse at an edge', () => {
    expect(neighborOf(people, 'two', 'left')).toBe('one')
    expect(neighborOf(people, 'two', 'right')).toBe('three')
    expect(neighborOf(people, 'one', 'left')).toBe('spouse')
  })
})
