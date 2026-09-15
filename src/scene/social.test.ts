import { describe, expect, it } from 'vitest'
import { neighbours, mutuals, primaryContext, ringRadius } from './social'
import type { Friend } from '../element'

describe('social scene helpers', () => {
  it('maps rings to radial shells and picks the primary context', () => {
    expect(ringRadius[5]).toBe(80)
    const friend: Friend = { id: 'a', firstName: 'A', lastName: 'B', circle: 15, contexts: ['travel', 'work'] }
    expect(primaryContext(friend)).toBe('travel')
  })
  it('finds neighbours and mutual friends without duplicates', () => {
    const links = [
      { source: 'a', target: 'b' }, { source: 'b', target: 'c' },
      { source: 'a', target: 'c' }, { source: 'a', target: 'b' },
    ]
    expect(neighbours(links, 'a')).toEqual(['b', 'c'])
    expect(mutuals(links, 'a', 'b')).toEqual(['c'])
  })
})
