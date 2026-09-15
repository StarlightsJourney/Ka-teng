import { describe, expect, it } from 'vitest'
import { displayInitials, fullName, lifespan } from './person'
import type { Person } from './types'

const person: Person = {
  id: 'p1',
  name: { first: 'Ada', last: 'Lovelace' },
  gender: 'F',
  birth: '1815',
  death: '1852',
}

describe('person helpers', () => {
  it('formats names and lifespans', () => {
    expect(fullName(person)).toBe('Ada Lovelace')
    expect(lifespan(person)).toBe('1815–1852')
  })

  it('creates initials', () => {
    expect(displayInitials(person)).toBe('AL')
  })
})
