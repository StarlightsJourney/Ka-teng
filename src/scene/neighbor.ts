import type { PersonId, PersonMap } from '../element'

export type NeighborDirection = 'up' | 'down' | 'left' | 'right'

export function neighborOf(people: PersonMap, id: PersonId, direction: NeighborDirection): PersonId | null {
  const person = people.get(id)
  if (!person) return null
  if (direction === 'up') return person.parents?.find((parentId) => people.has(parentId)) ?? null
  if (direction === 'down') return person.children?.find((childId) => people.has(childId)) ?? null

  const siblingOrder = (person.parents ?? [])
    .map((parentId) => people.get(parentId)?.children ?? [])
    .find((children) => children.includes(id))
  const index = siblingOrder?.indexOf(id) ?? -1
  const sibling = direction === 'left'
    ? (index > 0 ? siblingOrder?.slice(0, index).reverse().find((siblingId) => people.has(siblingId)) : undefined)
    : (index >= 0 ? siblingOrder?.slice(index + 1).find((siblingId) => people.has(siblingId)) : undefined)
  return sibling ?? person.spouses?.find((spouseId) => people.has(spouseId)) ?? null
}
