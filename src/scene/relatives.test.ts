import { describe, expect, it } from 'vitest'
import { hiddenRelativeCount } from './relatives'
import type { Person } from '../element'

const person: Person = {
  id: 'p',
  name: { first: 'Ada', last: 'Lovelace' },
  gender: 'F',
  parents: ['a', 'b'],
  children: ['c', 'd', 'a'],
}

describe('hiddenRelativeCount', () => {
  it('counts direct parents and children absent from the rendered tree once', () => {
    expect(hiddenRelativeCount(person, new Set(['p', 'a', 'c']))).toBe(2)
  })
})
