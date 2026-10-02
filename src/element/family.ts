import type { Family, Person, PersonId, PersonMap } from './types'

export type RelationshipType = 'parent' | 'spouse' | 'child'

function unique(ids: PersonId[]): PersonId[] {
  return [...new Set(ids)]
}

function hasRelationship(person: Person, otherId: PersonId, key: 'parents' | 'spouses' | 'children'): boolean {
  return (person[key] ?? []).includes(otherId)
}

function isAncestor(people: PersonMap, descendantId: PersonId, ancestorId: PersonId): boolean {
  const visited = new Set<PersonId>()
  const queue = [descendantId]
  while (queue.length) {
    const id = queue.shift()!
    if (id === ancestorId) return true
    if (visited.has(id)) continue
    visited.add(id)
    const person = people.get(id)
    if (person) queue.push(...(person.parents ?? []))
  }
  return false
}

function existingPeople(ids: PersonId[], people: PersonMap): Person[] {
  return unique(ids).map((id) => people.get(id)).filter((person): person is Person => Boolean(person))
}

export function canConnectRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): boolean {
  if (fromId === toId) return false
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to) return false
  if (type === 'spouse') {
    return !hasRelationship(from, toId, 'spouses')
      && !hasRelationship(from, toId, 'parents')
      && !hasRelationship(from, toId, 'children')
  }
  if (type === 'parent') {
    return !hasRelationship(to, fromId, 'parents')
      && !hasRelationship(from, toId, 'parents')
      && !hasRelationship(from, toId, 'spouses')
      && !isAncestor(people, fromId, toId)
  }
  // child
  return !hasRelationship(to, fromId, 'children')
    && !hasRelationship(from, toId, 'children')
    && !hasRelationship(from, toId, 'spouses')
    && !isAncestor(people, toId, fromId)
}

export function parentIds(person: Person): PersonId[] {
  return unique(person.parents ?? [])
}

export function addRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): PersonMap {
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to || fromId === toId) return people
  const next = new Map(people)
  const updateFrom = { ...from }
  const updateTo = { ...to }
  if (type === 'parent') {
    updateFrom.children = unique([...(from.children ?? []), toId])
    updateTo.parents = unique([...(to.parents ?? []), fromId])
  } else if (type === 'child') {
    updateFrom.parents = unique([...(from.parents ?? []), toId])
    updateTo.children = unique([...(to.children ?? []), fromId])
  } else if (type === 'spouse') {
    updateFrom.spouses = unique([...(from.spouses ?? []), toId])
    updateTo.spouses = unique([...(to.spouses ?? []), fromId])
  }
  next.set(fromId, updateFrom)
  next.set(toId, updateTo)
  return next
}



export function disconnectRelationship(
  people: PersonMap,
  fromId: PersonId,
  toId: PersonId,
  type: RelationshipType,
): PersonMap {
  const from = people.get(fromId)
  const to = people.get(toId)
  if (!from || !to) return people
  const next = new Map(people)
  const updateFrom = { ...from }
  const updateTo = { ...to }
  if (type === 'parent') {
    updateFrom.children = unique((from.children ?? []).filter((id) => id !== toId))
    updateTo.parents = unique((to.parents ?? []).filter((id) => id !== fromId))
  } else if (type === 'child') {
    updateFrom.parents = unique((from.parents ?? []).filter((id) => id !== toId))
    updateTo.children = unique((to.children ?? []).filter((id) => id !== fromId))
  } else {
    updateFrom.spouses = unique((from.spouses ?? []).filter((id) => id !== toId))
    updateTo.spouses = unique((to.spouses ?? []).filter((id) => id !== fromId))
  }
  next.set(fromId, updateFrom)
  next.set(toId, updateTo)
  return next
}

export type Kinship = RelationshipType

export type SuggestedLink = {
  fromId: PersonId
  toId: PersonId
  kin: RelationshipType
}

export const kinLabels: Record<RelationshipType, string> = {
  parent: 'Parent',
  spouse: 'Spouse',
  child: 'Child',
}

export const kinOrder: RelationshipType[] = ['parent', 'spouse', 'child']

export function parentIdsOf(people: PersonMap, id: PersonId): PersonId[] {
  const person = people.get(id)
  const reverse = [...people.values()].filter((other) => other.children?.includes(id)).map((other) => other.id)
  return unique([...(person?.parents ?? []), ...reverse]).filter((parentId) => parentId !== id && people.has(parentId))
}

export function spouseIdsOf(people: PersonMap, id: PersonId): PersonId[] {
  const person = people.get(id)
  const reverse = [...people.values()].filter((other) => other.spouses?.includes(id)).map((other) => other.id)
  return unique([...(person?.spouses ?? []), ...reverse]).filter((spouseId) => spouseId !== id && people.has(spouseId))
}

export function childIdsOf(people: PersonMap, id: PersonId): PersonId[] {
  const person = people.get(id)
  const reverse = [...people.values()].filter((other) => other.parents?.includes(id)).map((other) => other.id)
  return unique([...(person?.children ?? []), ...reverse]).filter((childId) => childId !== id && people.has(childId))
}

export type SiblingKind = 'full' | 'step'

const siblingKey = (kind: SiblingKind) => (kind === 'full' ? 'siblings' : 'stepSiblings')

export function linkedSiblingIdsOf(people: PersonMap, id: PersonId, kind: SiblingKind): PersonId[] {
  const key = siblingKey(kind)
  const person = people.get(id)
  const reverse = [...people.values()].filter((other) => other[key]?.includes(id)).map((other) => other.id)
  return unique([...(person?.[key] ?? []), ...reverse]).filter((otherId) => otherId !== id && people.has(otherId))
}

export function siblingIdsOf(people: PersonMap, id: PersonId): PersonId[] {
  const shared = parentIdsOf(people, id).flatMap((parentId) => childIdsOf(people, parentId))
  return unique([...shared, ...linkedSiblingIdsOf(people, id, 'full'), ...linkedSiblingIdsOf(people, id, 'step')]).filter((siblingId) => siblingId !== id)
}

function directlyRelated(people: PersonMap, a: PersonId, b: PersonId): boolean {
  return [...parentIdsOf(people, a), ...childIdsOf(people, a), ...spouseIdsOf(people, a)].includes(b)
}

export type SiblingOptions = { sameParents: boolean; stepSibling: boolean }

export function siblingOptions(people: PersonMap, fromId: PersonId, toId: PersonId): SiblingOptions {
  if (fromId === toId || !people.has(fromId) || !people.has(toId) || directlyRelated(people, fromId, toId) || siblingIdsOf(people, toId).includes(fromId)) {
    return { sameParents: false, stepSibling: false }
  }
  const bothHaveParents = parentIdsOf(people, fromId).length > 0 && parentIdsOf(people, toId).length > 0
  return { sameParents: !bothHaveParents, stepSibling: true }
}

export function canConnectSibling(people: PersonMap, fromId: PersonId, toId: PersonId, kind: SiblingKind): boolean {
  const options = siblingOptions(people, fromId, toId)
  return kind === 'full' ? options.sameParents : options.stepSibling
}

function addSiblingLink(people: PersonMap, a: PersonId, b: PersonId, kind: SiblingKind): PersonMap {
  const key = siblingKey(kind)
  const first = people.get(a)
  const second = people.get(b)
  if (!first || !second) return people
  const next = new Map(people)
  next.set(a, { ...first, [key]: unique([...(first[key] ?? []), b]) })
  next.set(b, { ...second, [key]: unique([...(second[key] ?? []), a]) })
  return next
}

export function connectSibling(people: PersonMap, fromId: PersonId, toId: PersonId, kind: SiblingKind): PersonMap {
  if (!canConnectSibling(people, fromId, toId, kind)) return people
  if (kind === 'step') return addSiblingLink(people, fromId, toId, 'step')
  const toParents = parentIdsOf(people, toId)
  const fromParents = parentIdsOf(people, fromId)
  const [childId, parents] = toParents.length ? [fromId, toParents] : fromParents.length ? [toId, fromParents] : [null, []]
  if (!childId) return addSiblingLink(people, fromId, toId, 'full')
  const linked = parents.reduce(
    (current, parentId) => canConnectRelationship(current, parentId, childId, 'parent') ? addRelationship(current, parentId, childId, 'parent') : current,
    people,
  )
  return linkCoParents(linked, childId)
}

export function disconnectSibling(people: PersonMap, a: PersonId, b: PersonId): PersonMap {
  const first = people.get(a)
  const second = people.get(b)
  if (!first || !second) return people
  const strip = (person: Person, otherId: PersonId): Person => ({
    ...person,
    siblings: person.siblings?.filter((id) => id !== otherId),
    stepSiblings: person.stepSiblings?.filter((id) => id !== otherId),
  })
  const next = new Map(people)
  next.set(a, strip(first, b))
  next.set(b, strip(second, a))
  return next
}

export function linkCoParents(people: PersonMap, childId: PersonId): PersonMap {
  const parents = parentIdsOf(people, childId)
  if (parents.length !== 2) return people
  const [first, second] = parents
  if (spouseIdsOf(people, first).includes(second)) return people
  return canConnectRelationship(people, first, second, 'spouse') ? addRelationship(people, first, second, 'spouse') : people
}

export function canConnectKin(people: PersonMap, fromId: PersonId, toId: PersonId, kin: RelationshipType): boolean {
  return canConnectRelationship(people, fromId, toId, kin) && !siblingIdsOf(people, toId).includes(fromId)
}

export function kinCheckerFor(people: PersonMap, toId: PersonId): (fromId: PersonId, kin: RelationshipType) => boolean {
  const siblings = new Set(siblingIdsOf(people, toId))
  return (fromId, kin) => !siblings.has(fromId) && canConnectRelationship(people, fromId, toId, kin)
}

export function connectKin(people: PersonMap, fromId: PersonId, toId: PersonId, kin: RelationshipType): PersonMap {
  if (!canConnectKin(people, fromId, toId, kin)) return people
  const next = addRelationship(people, fromId, toId, kin)
  if (kin === 'parent') return linkCoParents(next, toId)
  if (kin === 'child') return linkCoParents(next, fromId)
  return next
}

export function suggestFollowUps(people: PersonMap, fromId: PersonId, toId: PersonId, kin: RelationshipType): SuggestedLink[] {
  const suggestions: SuggestedLink[] = []
  const add = (link: SuggestedLink) => {
    if (suggestions.some((existing) => existing.fromId === link.fromId && existing.toId === link.toId)) return
    if (canConnectKin(people, link.fromId, link.toId, link.kin)) suggestions.push(link)
  }
  const needsParent = (id: PersonId) => parentIdsOf(people, id).length < 2
  if (kin === 'spouse') {
    for (const childId of childIdsOf(people, toId)) if (needsParent(childId)) add({ fromId: childId, toId: fromId, kin: 'child' })
    for (const childId of childIdsOf(people, fromId)) if (needsParent(childId)) add({ fromId: childId, toId, kin: 'child' })
  }
  if (kin === 'parent') {
    for (const otherParentId of parentIdsOf(people, toId).filter((id) => id !== fromId)) {
      for (const childId of childIdsOf(people, otherParentId)) {
        if (childId !== toId && needsParent(childId)) add({ fromId: childId, toId: fromId, kin: 'child' })
      }
    }
    if (needsParent(toId)) for (const spouseId of spouseIdsOf(people, fromId)) add({ fromId: spouseId, toId, kin: 'parent' })
    for (const siblingId of linkedSiblingIdsOf(people, toId, 'full')) if (needsParent(siblingId)) add({ fromId: siblingId, toId: fromId, kin: 'child' })
  }
  if (kin === 'child') {
    if (needsParent(fromId)) for (const spouseId of spouseIdsOf(people, toId)) add({ fromId: spouseId, toId: fromId, kin: 'parent' })
    for (const siblingId of linkedSiblingIdsOf(people, fromId, 'full')) if (needsParent(siblingId)) add({ fromId: siblingId, toId, kin: 'child' })
  }
  return suggestions
}

export function getParents(person: Person, people: PersonMap): Person[] {
  return existingPeople(parentIds(person), people)
}

export function getSpouses(person: Person, people: PersonMap): Person[] {
  return existingPeople(person.spouses ?? [], people)
}

export function getChildren(person: Person, people: PersonMap): Person[] {
  return existingPeople(person.children ?? [], people)
}

export function familyFor(person: Person): Family {
  return {
    id: `family:${person.id}`,
    parents: parentIds(person),
    children: unique(person.children ?? []),
  }
}
