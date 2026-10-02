import { describe, expect, it } from 'vitest'
import type { Person } from '../element'
import { familyComponent, largestFamilyRoot } from './largestFamily'

const person = (id: string, relationships: Partial<Person> = {}): Person => ({
  id,
  name: { first: id, last: '' },
  gender: 'U',
  ...relationships,
})

describe('largestFamilyRoot', () => {
  it('returns the first person in the largest connected family', () => {
    const people = [
      person('small', { spouses: ['small-partner'] }),
      person('small-partner'),
      person('large-root', { children: ['child'] }),
      person('child', { parents: ['large-root'], spouses: ['child-partner'] }),
      person('child-partner'),
    ]
    expect(largestFamilyRoot(people)).toBe('large-root')
  })

  it('returns null for an empty collection', () => {
    expect(largestFamilyRoot([])).toBeNull()
  })

})

describe('familyComponent', () => {
  it('collects everyone reachable through one-sided or two-sided links', () => {
    const people = [
      person('a', { children: ['b'] }),
      person('b'),
      person('c', { spouses: ['b'] }),
      person('loner'),
    ]
    expect([...familyComponent(people, 'b')].sort()).toEqual(['a', 'b', 'c'])
    expect([...familyComponent(people, 'loner')]).toEqual(['loner'])
  })

  it('is empty for a missing or null start', () => {
    expect(familyComponent([person('a')], null).size).toBe(0)
    expect(familyComponent([person('a')], 'missing').size).toBe(0)
  })
})
