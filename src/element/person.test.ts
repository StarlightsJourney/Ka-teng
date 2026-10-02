import { describe, expect, it } from 'vitest'
import { ageOf, createPerson, describeDates, displayInitials, formatLifespan, formatPartialDate, fullName, joinPartialDate, lifespan, parseName, splitPartialDate } from './person'
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
    expect(lifespan(person)).toBe('1815 – 1852')
  })

  it('formats living, deceased and death-only lifespans without symbols', () => {
    expect(lifespan({ ...person, death: undefined })).toBe('Born 1815')
    expect(lifespan({ ...person, death: undefined, deceased: true })).toBe('1815 – ?')
    expect(lifespan({ ...person, birth: undefined })).toBe('Died 1852')
    expect(lifespan({ ...person, birth: undefined, death: undefined, deceased: true })).toBe('Deceased')
    expect(lifespan({ ...person, birth: undefined, death: undefined })).toBe('')
  })

  it('formats partial dates for people', () => {
    expect(formatPartialDate('1984-03-12')).toBe('12 March 1984')
    expect(formatPartialDate('1984-03-12', 'short')).toBe('12 Mar 1984')
    expect(formatPartialDate('1984-03')).toBe('March 1984')
    expect(formatPartialDate('1984')).toBe('1984')
  })

  it('splits and joins partial dates, dropping impossible days', () => {
    expect(splitPartialDate('1984-03-02')).toEqual({ year: '1984', month: '3', day: '2' })
    expect(joinPartialDate({ year: '1984', month: '3', day: '2' })).toBe('1984-03-02')
    expect(joinPartialDate({ year: '1984', month: '2', day: '30' })).toBe('1984-02')
    expect(joinPartialDate({ year: '1984', month: '', day: '5' })).toBe('1984')
    expect(joinPartialDate({ year: '84', month: '1', day: '1' })).toBeUndefined()
  })

  it('describes dates in words with age', () => {
    expect(describeDates({ ...person, birth: undefined, death: undefined, birthDate: '1990-06-01' }, new Date('2026-10-01T00:00:00Z'))).toEqual(['Born 1 June 1990 · age 36'])
    expect(describeDates({ ...person, birthDate: '1815-12-10', deathDate: '1852-11-27' }, new Date('2026-10-01T00:00:00Z'))).toEqual(['Born 10 December 1815', 'Died 27 November 1852 · aged 36'])
  })

  it('creates initials', () => {
    expect(displayInitials(person)).toBe('AL')
  })

  it('derives age from dates and calculates age at death', () => {
    expect(ageOf({ ...person, death: undefined, birthDate: '1815-12-10' }, new Date('1856-01-01T00:00:00Z'))).toBe(40)
    expect(ageOf({ ...person, birthDate: '1815-12-10', deathDate: '1852-11-27' }, new Date('1900-01-01T00:00:00Z'))).toBe(36)
  })

  it('formats date-backed lifespans using years', () => {
    expect(formatLifespan({ ...person, birthDate: '1815-12-10', deathDate: '1852-11-27' })).toBe('1815 – 1852')
  })

  it('parses a full name into first and last parts', () => {
    expect(parseName('Diana Frances Spencer')).toEqual({ first: 'Diana Frances', last: 'Spencer' })
    expect(parseName('Churchill')).toEqual({ first: 'Churchill', last: '' })
  })
})
