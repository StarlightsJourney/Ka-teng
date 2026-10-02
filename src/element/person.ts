import type { AvatarFocus, Gender, Person, PersonId, PersonName } from './types'

let nextGeneratedId = 1

export function generatePersonId(): PersonId {
  return `kt-person-${nextGeneratedId++}`
}

export function createPerson(
  first: string,
  last: string,
  gender: Gender,
  options: Partial<Omit<Person, 'id' | 'name' | 'gender'>> & { name?: Partial<PersonName> } = {},
): Person {
  const nameOptions = options.name ?? {}
  const { name: _, ...rest } = options
  return {
    id: generatePersonId(),
    name: {
      first: nameOptions.first ?? first.trim(),
      last: nameOptions.last ?? last.trim(),
      chinese: nameOptions.chinese,
      pinyin: nameOptions.pinyin,
    },
    gender,
    ...rest,
  }
}

export function fullName(person: Person): string {
  const name = `${person.name.first} ${person.name.last}`.trim()
  return name || person.name.chinese || person.name.pinyin || person.id
}

export function parseName(full: string): { first: string; last: string } {
  const trimmed = full.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) return { first: trimmed, last: '' }
  const last = parts.at(-1) ?? ''
  return { first: parts.slice(0, -1).join(' '), last }
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

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

export type PartialDate = { year: string; month: string; day: string }

export function splitPartialDate(value: string | undefined): PartialDate {
  const match = value?.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/)
  return { year: match?.[1] ?? '', month: match?.[2] ? String(Number(match[2])) : '', day: match?.[3] ? String(Number(match[3])) : '' }
}

export function joinPartialDate({ year, month, day }: PartialDate): string | undefined {
  const y = year.trim()
  if (!/^\d{4}$/.test(y)) return undefined
  const m = Number(month)
  if (!Number.isInteger(m) || m < 1 || m > 12) return y
  const mm = String(m).padStart(2, '0')
  const d = Number(day)
  const daysInMonth = new Date(Date.UTC(Number(y), m, 0)).getUTCDate()
  if (!Number.isInteger(d) || d < 1 || d > daysInMonth) return `${y}-${mm}`
  return `${y}-${mm}-${String(d).padStart(2, '0')}`
}

export function formatPartialDate(value: string | undefined, style: 'long' | 'short' = 'long'): string {
  const parts = splitPartialDate(value)
  if (!parts.year) return value?.trim() ?? ''
  const monthIndex = Number(parts.month) - 1
  if (!parts.month || monthIndex < 0 || monthIndex > 11) return parts.year
  const month = style === 'short' ? MONTHS[monthIndex].slice(0, 3) : MONTHS[monthIndex]
  return parts.day ? `${Number(parts.day)} ${month} ${parts.year}` : `${month} ${parts.year}`
}

export function isDeceased(person: Person): boolean {
  return Boolean(person.deceased || person.death || person.deathDate)
}

export function formatLifespan(person: Person): string {
  const birth = dateValue(person, 'birth')?.slice(0, 4)
  const death = dateValue(person, 'death')?.slice(0, 4)
  if (birth && death) return `${birth} – ${death}`
  if (birth) return isDeceased(person) ? `${birth} – ?` : `Born ${birth}`
  if (death) return `Died ${death}`
  return isDeceased(person) ? 'Deceased' : ''
}

export function lifespan(person: Person): string {
  return formatLifespan(person)
}

export function describeDates(person: Person, today: Date): string[] {
  const birth = person.birthDate ?? person.birth
  const death = person.deathDate ?? person.death
  const age = ageOf(person, today)
  const lines: string[] = []
  if (birth) lines.push(`Born ${formatPartialDate(birth)}${age !== undefined && !isDeceased(person) ? ` · age ${age}` : ''}`)
  if (death) lines.push(`Died ${formatPartialDate(death)}${age !== undefined ? ` · aged ${age}` : ''}`)
  else if (isDeceased(person)) lines.push('Deceased')
  return lines
}

export function displayInitials(person: Person): string {
  const first = person.name.first.trim().charAt(0)
  const last = person.name.last.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || person.name.chinese?.trim().slice(0, 2) || '?'
}

export const DEFAULT_AVATAR_FOCUS: AvatarFocus = { x: 50, y: 50, zoom: 1 }

export function clampAvatarFocus(focus: Partial<AvatarFocus> | undefined): AvatarFocus {
  const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
  return {
    x: clamp(focus?.x, 0, 100, 50),
    y: clamp(focus?.y, 0, 100, 50),
    zoom: clamp(focus?.zoom, 1, 3, 1),
  }
}

export function avatarImageStyle(focus: AvatarFocus | undefined): { objectPosition: string; transformOrigin: string; transform?: string } {
  const { x, y, zoom } = clampAvatarFocus(focus)
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
  }
}
