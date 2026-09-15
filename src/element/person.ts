import type { Person } from './types'

export function fullName(person: Person): string {
  const name = `${person.name.first} ${person.name.last}`.trim()
  return name || person.name.chinese || person.name.pinyin || person.id
}

export function lifespan(person: Person): string {
  const birth = person.birth ? `★ ${person.birth}` : ''
  const death = person.death ? `† ${person.death}` : ''
  return [birth, death].filter(Boolean).join(' ')
}

export function displayInitials(person: Person): string {
  const first = person.name.first.trim().charAt(0)
  const last = person.name.last.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || person.name.chinese?.trim().slice(0, 2) || '?'
}
