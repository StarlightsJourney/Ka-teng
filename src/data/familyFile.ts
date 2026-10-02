import { clampAvatarFocus, sanitizeAvatarUrl, type Gender, type Person, type PersonId, type PersonMap } from '../element'

export const FAMILY_FILE_VERSION = 1
export const MAX_FAMILY_FILE_BYTES = 25 * 1024 * 1024
const MAX_PEOPLE = 20000
const MAX_TEXT = 500

export type FamilyFile = {
  app: 'ka-teng'
  version: number
  savedAt: string
  focusId: PersonId | null
  people: Person[]
}

export type LoadedFamily = {
  people: Person[]
  focusId: PersonId | null
}

const genders: readonly Gender[] = ['M', 'F', 'X', 'U']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function text(value: unknown, limit = 200): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, limit)
  return trimmed || undefined
}

function ids(value: unknown, known: ReadonlySet<string>, self: string): PersonId[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && known.has(entry) && entry !== self))]
  return list.length ? list : undefined
}

export function serializeFamily(people: PersonMap, focusId: PersonId | null, now = new Date()): string {
  const file: FamilyFile = {
    app: 'ka-teng',
    version: FAMILY_FILE_VERSION,
    savedAt: now.toISOString(),
    focusId: focusId && people.has(focusId) ? focusId : null,
    people: [...people.values()],
  }
  return JSON.stringify(file, null, 2)
}

export function familyFileName(now = new Date()): string {
  return `ka-teng-family-${now.toISOString().slice(0, 10)}.json`
}

export function parseFamilyFile(source: string): LoadedFamily {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const rawPeople = Array.isArray(parsed) ? parsed : isRecord(parsed) && parsed.app === 'ka-teng' ? parsed.people : undefined
  if (!Array.isArray(rawPeople)) throw new Error('This is not a Ka-teng family file.')
  if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > FAMILY_FILE_VERSION) {
    throw new Error('This file was saved by a newer version of Ka-teng.')
  }
  if (rawPeople.length > MAX_PEOPLE) throw new Error(`Files can hold at most ${MAX_PEOPLE} people.`)
  const records = rawPeople.filter(isRecord)
  const known = new Set<string>()
  for (const record of records) {
    const id = text(record.id, 120)
    if (!id) throw new Error('Every person needs an id.')
    if (known.has(id)) throw new Error(`The id “${id}” is used twice.`)
    known.add(id)
  }
  const people = records.map((record): Person => {
    const id = text(record.id, 120) as string
    const name = isRecord(record.name) ? record.name : {}
    const gender = genders.includes(record.gender as Gender) ? record.gender as Gender : 'U'
    const altNames = Array.isArray(record.altNames)
      ? record.altNames.map((value) => text(value, 120)).filter((value): value is string => Boolean(value)).slice(0, 20)
      : []
    return {
      id,
      name: {
        first: text(name.first, 120) ?? '',
        last: text(name.last, 120) ?? '',
        chinese: text(name.chinese, 60),
        pinyin: text(name.pinyin, 120),
      },
      gender,
      birth: text(record.birth, 40),
      death: text(record.death, 40),
      birthDate: text(record.birthDate, 40),
      deathDate: text(record.deathDate, 40),
      deceased: typeof record.deceased === 'boolean' ? record.deceased : undefined,
      restingPlace: text(record.restingPlace, 200),
      altNames: altNames.length ? altNames : undefined,
      bio: text(record.bio, MAX_TEXT),
      avatar: sanitizeAvatarUrl(typeof record.avatar === 'string' ? record.avatar : undefined),
      avatarFocus: isRecord(record.avatarFocus) ? clampAvatarFocus(record.avatarFocus) : undefined,
      parents: ids(record.parents, known, id),
      spouses: ids(record.spouses, known, id),
      children: ids(record.children, known, id),
      siblings: ids(record.siblings, known, id),
      stepSiblings: ids(record.stepSiblings, known, id),
    }
  })
  const focus = isRecord(parsed) ? text(parsed.focusId, 120) : undefined
  return { people, focusId: focus && known.has(focus) ? focus : people[0]?.id ?? null }
}
