import { describe, expect, it } from 'vitest'
import type { Person } from '../element'
import { connectedFamilySize, largestFamilyRoot } from './largestFamily'

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

  it('counts only the connected family containing the requested person', () => {
    const people = [
      person('one', { spouses: ['two'] }),
      person('two'),
      person('three'),
    ]
    expect(connectedFamilySize(people, 'one')).toBe(2)
    expect(connectedFamilySize(people, 'missing')).toBe(0)
  })
})
