import { describe, expect, it } from 'vitest'
import { addRelationship, canConnectKin, canConnectSibling, connectSibling, disconnectSibling, linkedSiblingIdsOf, siblingOptions, canConnectRelationship, childIdsOf, connectKin, disconnectRelationship, getChildren, getParents, getSpouses, parentIdsOf, spouseIdsOf, suggestFollowUps } from './family'
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

const person = (id: string): Person => ({ id, name: { first: id, last: '' }, gender: 'U' })
const mapOf = (list: Person[]) => new Map(list.map((entry) => [entry.id, entry]))

function household(): Map<string, Person> {
  return new Map<string, Person>([
    ['me', { id: 'me', name: { first: 'Me', last: '' }, gender: 'U', parents: ['mum'] }],
    ['mum', { id: 'mum', name: { first: 'Mum', last: '' }, gender: 'F', children: ['me'] }],
    ['dad', { id: 'dad', name: { first: 'Dad', last: '' }, gender: 'M' }],
    ['sib', { id: 'sib', name: { first: 'Sib', last: '' }, gender: 'U' }],
    ['partner', { id: 'partner', name: { first: 'Partner', last: '' }, gender: 'U' }],
  ])
}

describe('connectKin', () => {
  it('links a newly added second parent to the existing parent as partners', () => {
    const next = connectKin(household(), 'dad', 'me', 'parent')
    expect(parentIdsOf(next, 'me').sort()).toEqual(['dad', 'mum'])
    expect(spouseIdsOf(next, 'dad')).toContain('mum')
    expect(spouseIdsOf(next, 'mum')).toContain('dad')
  })

  it('does not guess children when two people become spouses', () => {
    const next = connectKin(household(), 'dad', 'mum', 'spouse')
    expect(spouseIdsOf(next, 'dad')).toEqual(['mum'])
    expect(parentIdsOf(next, 'me')).toEqual(['mum'])
  })

  it('refuses to make siblings each other’s parent, child or spouse', () => {
    const withSibling = addRelationship(household(), 'mum', 'sib', 'parent')
    expect(canConnectKin(withSibling, 'sib', 'me', 'child')).toBe(false)
    expect(canConnectKin(withSibling, 'sib', 'me', 'parent')).toBe(false)
    expect(canConnectKin(withSibling, 'sib', 'me', 'spouse')).toBe(false)
  })
})

describe('suggestFollowUps', () => {
  it('asks whether the new spouse is also a parent of the other spouse’s children', () => {
    const next = connectKin(household(), 'dad', 'mum', 'spouse')
    expect(suggestFollowUps(next, 'dad', 'mum', 'spouse')).toEqual([{ fromId: 'me', toId: 'dad', kin: 'child' }])
  })

  it('asks whether a new parent is also the parent of the other parent’s children', () => {
    const withSibling = addRelationship(household(), 'mum', 'sib', 'parent')
    const next = connectKin(withSibling, 'dad', 'me', 'parent')
    expect(suggestFollowUps(next, 'dad', 'me', 'parent')).toEqual([{ fromId: 'sib', toId: 'dad', kin: 'child' }])
  })

  it('asks whether a new child also belongs to the parent’s spouse', () => {
    const couple = connectKin(household(), 'dad', 'partner', 'spouse')
    const next = connectKin(couple, 'sib', 'dad', 'child')
    expect(suggestFollowUps(next, 'sib', 'dad', 'child')).toEqual([{ fromId: 'partner', toId: 'sib', kin: 'parent' }])
  })

  it('asks whether a new parent’s spouse is also a parent when the child has no other parent', () => {
    const couple = connectKin(household(), 'dad', 'partner', 'spouse')
    const next = connectKin(couple, 'dad', 'sib', 'parent')
    expect(suggestFollowUps(next, 'dad', 'sib', 'parent')).toEqual([{ fromId: 'partner', toId: 'sib', kin: 'parent' }])
  })

  it('does not suggest a parent for someone who already has two', () => {
    const full = connectKin(household(), 'dad', 'me', 'parent')
    const next = connectKin(full, 'partner', 'mum', 'spouse')
    expect(suggestFollowUps(next, 'partner', 'mum', 'spouse')).toEqual([])
    expect(childIdsOf(next, 'partner')).toEqual([])
  })
})

describe('disconnectRelationship', () => {
  it('removes a parent link when called from the listed parent to the child', () => {
    const next = disconnectRelationship(household(), 'mum', 'me', 'parent')
    expect(parentIdsOf(next, 'me')).toEqual([])
    expect(next.get('mum')?.children).toEqual([])
  })

  it('removes an accidental child link in the same direction the list shows it', () => {
    const accidental = addRelationship(household(), 'dad', 'me', 'child')
    expect(parentIdsOf(accidental, 'dad')).toEqual(['me'])
    const next = disconnectRelationship(accidental, 'dad', 'me', 'child')
    expect(parentIdsOf(next, 'dad')).toEqual([])
    expect(next.get('me')?.children).toEqual([])
  })
})

describe('siblings', () => {
  it('joins a new sibling to the existing parents when they share them', () => {
    const withDad = connectKin(household(), 'dad', 'me', 'parent')
    const next = connectSibling(withDad, 'sib', 'me', 'full')
    expect(parentIdsOf(next, 'sib').sort()).toEqual(['dad', 'mum'])
    expect(spouseIdsOf(next, 'sib')).toEqual([])
    expect(next.get('sib')?.siblings).toBeUndefined()
  })

  it('works in either direction when only the dragged person has parents', () => {
    const next = connectSibling(household(), 'me', 'sib', 'full')
    expect(parentIdsOf(next, 'sib')).toEqual(['mum'])
  })

  it('records an explicit sibling link when nobody has parents yet', () => {
    const people = mapOf([person('a'), person('b')])
    const next = connectSibling(people, 'a', 'b', 'full')
    expect(linkedSiblingIdsOf(next, 'a', 'full')).toEqual(['b'])
    expect(linkedSiblingIdsOf(next, 'b', 'full')).toEqual(['a'])
    expect(spouseIdsOf(next, 'a')).toEqual([])
  })

  it('records step-siblings without touching parents or spouses', () => {
    const next = connectSibling(household(), 'sib', 'me', 'step')
    expect(linkedSiblingIdsOf(next, 'me', 'step')).toEqual(['sib'])
    expect(parentIdsOf(next, 'sib')).toEqual([])
    expect(spouseIdsOf(next, 'sib')).toEqual([])
  })

  it('offers “same parents” only when at most one side already has parents', () => {
    const people = household()
    expect(siblingOptions(people, 'sib', 'me')).toEqual({ sameParents: true, stepSibling: true })
    const bothParented = addRelationship(people, 'dad', 'sib', 'parent')
    expect(siblingOptions(bothParented, 'sib', 'me')).toEqual({ sameParents: false, stepSibling: true })
  })

  it('refuses siblings who are already related', () => {
    const people = household()
    expect(siblingOptions(people, 'mum', 'me')).toEqual({ sameParents: false, stepSibling: false })
    const linked = connectSibling(people, 'sib', 'me', 'step')
    expect(canConnectSibling(linked, 'sib', 'me', 'full')).toBe(false)
    expect(canConnectKin(linked, 'sib', 'me', 'spouse')).toBe(false)
  })

  it('asks whether a new parent also belongs to an explicitly linked sibling', () => {
    const people = connectSibling(mapOf([person('a'), person('b'), person('p')]), 'a', 'b', 'full')
    const next = connectKin(people, 'p', 'a', 'parent')
    expect(suggestFollowUps(next, 'p', 'a', 'parent')).toEqual([{ fromId: 'b', toId: 'p', kin: 'child' }])
  })

  it('can remove sibling links', () => {
    const linked = connectSibling(household(), 'sib', 'me', 'step')
    expect(linkedSiblingIdsOf(disconnectSibling(linked, 'me', 'sib'), 'me', 'step')).toEqual([])
  })
})
