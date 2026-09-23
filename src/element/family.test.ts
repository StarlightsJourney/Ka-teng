import { describe, expect, it } from 'vitest'
import { addRelationship, canConnectRelationship, getChildren, getParents, getSpouses } from './family'
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

describe('canConnectRelationship', () => {
  it('allows a new parent relationship', () => {
    const map = peopleMap()
    expect(canConnectRelationship(map, 'b', 'd', 'parent')).toBe(true)
  })

  it('disallows connecting a child as a spouse', () => {
    const map = peopleMap()
    expect(canConnectRelationship(map, 'a', 'b', 'spouse')).toBe(false)
  })

  it('disallows connecting a parent as a child', () => {
    const map = peopleMap()
    expect(canConnectRelationship(map, 'a', 'b', 'child')).toBe(false)
  })

  it('disallows duplicate relationships', () => {
    const map = peopleMap()
    expect(canConnectRelationship(map, 'a', 'c', 'parent')).toBe(false)
    expect(canConnectRelationship(map, 'b', 'c', 'spouse')).toBe(false)
  })

  it('disallows parent relationships that would create a cycle', () => {
    const map = peopleMap()
    // a is already an ancestor of d, so d cannot become a parent of a.
    expect(canConnectRelationship(map, 'd', 'a', 'parent')).toBe(false)
  })

  it('disallows child relationships that would create a cycle', () => {
    const map = peopleMap()
    // a is already an ancestor of d, so a cannot become a child of d.
    expect(canConnectRelationship(map, 'a', 'd', 'child')).toBe(false)
  })
})
