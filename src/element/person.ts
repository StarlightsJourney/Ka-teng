import type { Person } from './types'

export function fullName(person: Person): string {
  const name = `${person.name.first} ${person.name.last}`.trim()
  return name || person.name.chinese || person.name.pinyin || person.id
}

function datePart(value: string | undefined): string | undefined {
  return value?.match(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/)?.[0]
}

function dateValue(person: Person, type: 'birth' | 'death'): string | undefined {
  return datePart(type === 'birth' ? person.birthDate ?? person.birth : person.deathDate ?? person.death)
}

function dateObject(value: string): Date {
  return new Date(`${value}${value.length === 4 ? '-01-01' : value.length === 7 ? '-01' : ''}T00:00:00Z`)
}

export function ageOf(person: Person, today: Date): number | undefined {
  const birthValue = dateValue(person, 'birth')
  if (!birthValue) return undefined
  const birth = dateObject(birthValue)
  const endValue = dateValue(person, 'death')
  const end = endValue ? dateObject(endValue) : today
  let age = end.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday = end.getUTCMonth() < birth.getUTCMonth()
    || (end.getUTCMonth() === birth.getUTCMonth() && end.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return Math.max(0, age)
}

export function formatLifespan(person: Person): string {
  const birthValue = dateValue(person, 'birth')
  const deathValue = dateValue(person, 'death')
  const birth = birthValue ? `★ ${birthValue.slice(0, 4)}` : ''
  const death = deathValue ? `† ${deathValue.slice(0, 4)}` : ''
  return [birth, death].filter(Boolean).join(' ')
}

export function lifespan(person: Person): string {
  return formatLifespan(person)
}

export function displayInitials(person: Person): string {
  const first = person.name.first.trim().charAt(0)
  const last = person.name.last.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || person.name.chinese?.trim().slice(0, 2) || '?'
}
