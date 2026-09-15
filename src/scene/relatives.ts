import type { Person } from '../element'

export function hiddenRelativeCount(person: Person, visibleIds: ReadonlySet<string>): number {
  const relatives = new Set([...(person.parents ?? []), ...(person.children ?? [])])
  return [...relatives].filter((id) => !visibleIds.has(id)).length
}
