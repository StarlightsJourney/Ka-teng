import { describe, expect, it } from 'vitest'
import { addRelationship, getChildren, getParents, getSpouses } from './family'
import type { Person } from './types'

function peopleMap(): Map<string, Person> {
  return new Map([
    ['a', { id: 'a', name: { first: 'A', last: '' }, gender: 'M', children: ['b', 'c'] }],
    ['b', { id: 'b', name: { first: 'B', last: '' }, gender: 'F', parents: ['a'], spouses: ['c'] }],
    ['c', { id: 'c', name: { first: 'C', last: '' }, gender: 'M', parents: ['a'], spouses: ['b'], children: ['d'] }],
    ['d', { id: 'd', name: { first: 'D', last: '' }, gender: 'U', parents: ['c'] }],
  ])
}

describe('addRelationship', () => {
  it('adds a parent relationship', () => {
    const map = peopleMap()
    const next = addRelationship(map, 'b', 'd', 'parent')
    expect(getParents(next.get('d')!, next)).toContainEqual(next.get('b'))
    expect(getChildren(next.get('b')!, next)).toContainEqual(next.get('d'))
  })

  it('adds a child relationship', () => {
    const map = peopleMap()
    const next = addRelationship(map, 'a', 'd', 'child')
    expect(getParents(next.get('a')!, next)).toContainEqual(next.get('d'))
    expect(getChildren(next.get('d')!, next)).toContainEqual(next.get('a'))
  })

  it('adds a spouse relationship', () => {
    const map = peopleMap()
    const next = addRelationship(map, 'a', 'd', 'spouse')
    expect(getSpouses(next.get('a')!, next)).toContainEqual(next.get('d'))
    expect(getSpouses(next.get('d')!, next)).toContainEqual(next.get('a'))
  })

  it('does not relate a person to itself', () => {
    const map = peopleMap()
    const next = addRelationship(map, 'a', 'a', 'spouse')
    expect(next).toBe(map)
  })
})
