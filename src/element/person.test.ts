import { describe, expect, it } from 'vitest'
import { ageOf, createPerson, displayInitials, formatLifespan, fullName, lifespan } from './person'
import type { Person } from './types'

describe('createPerson', () => {
  it('creates a person with a generated id and trimmed names', () => {
    const person = createPerson('  Ada  ', '  Lovelace  ', 'F')
    expect(person.id).toMatch(/^kt-person-/)
    expect(person.name).toEqual({ first: 'Ada', last: 'Lovelace' })
    expect(person.gender).toBe('F')
  })

  it('applies optional fields', () => {
    const person = createPerson('Grace', 'Hopper', 'F', { bio: 'Pioneer' })
    expect(person.bio).toBe('Pioneer')
  })
})

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
    expect(lifespan(person)).toBe('★ 1815 † 1852')
  })

  it('creates initials', () => {
    expect(displayInitials(person)).toBe('AL')
  })

  it('derives age from dates and calculates age at death', () => {
    expect(ageOf({ ...person, death: undefined, birthDate: '1815-12-10' }, new Date('1856-01-01T00:00:00Z'))).toBe(40)
    expect(ageOf({ ...person, birthDate: '1815-12-10', deathDate: '1852-11-27' }, new Date('1900-01-01T00:00:00Z'))).toBe(36)
  })

  it('formats date-backed lifespans using years', () => {
    expect(formatLifespan({ ...person, birthDate: '1815-12-10', deathDate: '1852-11-27' })).toBe('★ 1815 † 1852')
    expect(lifespan(person)).toBe('★ 1815 † 1852')
  })
})
