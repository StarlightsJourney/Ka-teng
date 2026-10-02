import type { PersonId, PersonMap } from '../element'

export type LayoutOptions = {
  cardWidth: number
  cardHeight: number
  spouseGap: number
  siblingGap: number
  groupGap: number
  rowGap: number
  maxDepth?: number
  expandedIds?: ReadonlySet<PersonId>
  includeSiblings?: boolean
}

export type LayoutNode = {
  id: PersonId
  x: number
  y: number
  generation: number
  hiddenCount: number
}

export type LayoutFamily = {
  id: string
  parentIds: PersonId[]
  childIds: PersonId[]
}

export type LayoutCouple = {
  a: PersonId
  b: PersonId
}

export type LayoutSiblingLink = {
  a: PersonId
  b: PersonId
  kind: 'full' | 'step'
}

export type FamilyLayout = {
  nodes: Map<PersonId, LayoutNode>
  families: LayoutFamily[]
  couples: LayoutCouple[]
  siblingLinks: LayoutSiblingLink[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
}

type Relations = {
  parents: Map<PersonId, Set<PersonId>>
  children: Map<PersonId, Set<PersonId>>
  spouses: Map<PersonId, Set<PersonId>>
  siblings: Map<PersonId, Map<PersonId, 'full' | 'step'>>
}

type Unit = {
  members: PersonId[]
  generation: number
  discovery: number
  left: number
}

const RELAX_ITERATIONS = 8

function buildRelations(people: PersonMap): Relations {
  const relations: Relations = { parents: new Map(), children: new Map(), spouses: new Map(), siblings: new Map() }
  const linkSibling = (a: PersonId, b: PersonId, kind: 'full' | 'step') => {
    if (a === b || !people.has(a) || !people.has(b)) return
    for (const [from, to] of [[a, b], [b, a]]) {
      const links = relations.siblings.get(from) ?? new Map<PersonId, 'full' | 'step'>()
      if (!links.has(to) || kind === 'full') links.set(to, kind)
      relations.siblings.set(from, links)
    }
  }
  const bucket = (map: Map<PersonId, Set<PersonId>>, id: PersonId) => {
    let set = map.get(id)
    if (!set) {
      set = new Set()
      map.set(id, set)
    }
    return set
  }
  const linkParent = (parentId: PersonId, childId: PersonId) => {
    if (parentId === childId || !people.has(parentId) || !people.has(childId)) return
    bucket(relations.children, parentId).add(childId)
    bucket(relations.parents, childId).add(parentId)
  }
  for (const person of people.values()) {
    for (const parentId of person.parents ?? []) linkParent(parentId, person.id)
    for (const childId of person.children ?? []) linkParent(person.id, childId)
    for (const siblingId of person.siblings ?? []) linkSibling(person.id, siblingId, 'full')
    for (const siblingId of person.stepSiblings ?? []) linkSibling(person.id, siblingId, 'step')
    for (const spouseId of person.spouses ?? []) {
      if (spouseId === person.id || !people.has(spouseId)) continue
      bucket(relations.spouses, person.id).add(spouseId)
      bucket(relations.spouses, spouseId).add(person.id)
    }
  }
  return relations
}

const listOf = (map: Map<PersonId, Set<PersonId>>, id: PersonId) => [...(map.get(id) ?? [])]

function collectVisible(relations: Relations, rootId: PersonId, options: LayoutOptions) {
  const visited = new Map<PersonId, { depth: number; generation: number; order: number }>()
  const deque: Array<{ id: PersonId; depth: number; generation: number }> = [{ id: rootId, depth: 0, generation: 0 }]
  let order = 0
  while (deque.length) {
    const current = deque.shift() as { id: PersonId; depth: number; generation: number }
    if (visited.has(current.id)) continue
    visited.set(current.id, { depth: current.depth, generation: current.generation, order: order++ })
    for (const spouseId of listOf(relations.spouses, current.id)) {
      if (!visited.has(spouseId)) deque.unshift({ id: spouseId, depth: current.depth, generation: current.generation })
    }
    const canExpand = options.maxDepth === undefined || current.depth < options.maxDepth || options.expandedIds?.has(current.id)
    if (!canExpand) {
      if (options.includeSiblings && relations.children.get(current.id)?.has(rootId)) {
        for (const childId of listOf(relations.children, current.id)) {
          if (!visited.has(childId)) deque.push({ id: childId, depth: current.depth + 1, generation: current.generation + 1 })
        }
      }
      continue
    }
    for (const parentId of listOf(relations.parents, current.id)) {
      if (!visited.has(parentId)) deque.push({ id: parentId, depth: current.depth + 1, generation: current.generation - 1 })
    }
    for (const childId of listOf(relations.children, current.id)) {
      if (!visited.has(childId)) deque.push({ id: childId, depth: current.depth + 1, generation: current.generation + 1 })
    }
    for (const siblingId of relations.siblings.get(current.id)?.keys() ?? []) {
      if (!visited.has(siblingId)) deque.push({ id: siblingId, depth: current.depth + 1, generation: current.generation })
    }
  }
  return visited
}

function buildUnits(relations: Relations, visible: Map<PersonId, { generation: number; order: number }>): Unit[] {
  const assigned = new Set<PersonId>()
  const units: Unit[] = []
  const ids = [...visible.keys()].sort((a, b) => (visible.get(a)?.order ?? 0) - (visible.get(b)?.order ?? 0))
  for (const id of ids) {
    if (assigned.has(id)) continue
    const generation = visible.get(id)?.generation ?? 0
    const group: PersonId[] = []
    const queue = [id]
    assigned.add(id)
    while (queue.length) {
      const current = queue.shift() as PersonId
      group.push(current)
      for (const spouseId of listOf(relations.spouses, current)) {
        if (assigned.has(spouseId) || visible.get(spouseId)?.generation !== generation) continue
        assigned.add(spouseId)
        queue.push(spouseId)
      }
    }
    const inGroup = new Set(group)
    const degree = (member: PersonId) => listOf(relations.spouses, member).filter((spouseId) => inGroup.has(spouseId)).length
    const start = [...group].sort((a, b) => degree(a) - degree(b))[0]
    const ordered: PersonId[] = []
    const walk = (member: PersonId) => {
      if (ordered.includes(member)) return
      ordered.push(member)
      for (const spouseId of listOf(relations.spouses, member)) if (inGroup.has(spouseId)) walk(spouseId)
    }
    walk(start)
    units.push({ members: ordered, generation, discovery: Math.min(...group.map((member) => visible.get(member)?.order ?? 0)), left: 0 })
  }
  return units
}

export function layoutFamily(people: PersonMap, rootId: PersonId | null, options: LayoutOptions): FamilyLayout {
  const empty: FamilyLayout = { nodes: new Map(), families: [], couples: [], siblingLinks: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } }
  if (!rootId || !people.has(rootId)) return empty
  const relations = buildRelations(people)
  const visible = collectVisible(relations, rootId, options)
  const units = buildUnits(relations, visible)
  const unitOf = new Map<PersonId, Unit>()
  units.forEach((unit) => unit.members.forEach((member) => unitOf.set(member, unit)))
  const generations = [...new Set(units.map((unit) => unit.generation))].sort((a, b) => a - b)
  const rows = new Map<number, Unit[]>(generations.map((generation) => [generation, units.filter((unit) => unit.generation === generation).sort((a, b) => a.discovery - b.discovery)]))
  const pitch = options.cardWidth + options.spouseGap
  const unitWidth = (unit: Unit) => unit.members.length * options.cardWidth + (unit.members.length - 1) * options.spouseGap
  const memberX = (member: PersonId) => {
    const unit = unitOf.get(member)
    if (!unit) return 0
    return unit.left + unit.members.indexOf(member) * pitch + options.cardWidth / 2
  }
  const visibleParents = (id: PersonId) => listOf(relations.parents, id).filter((parentId) => visible.has(parentId))
  const visibleChildren = (id: PersonId) => listOf(relations.children, id).filter((childId) => visible.has(childId))
  const rowIndex = (member: PersonId) => {
    const unit = unitOf.get(member)
    if (!unit) return 0
    const row = rows.get(unit.generation) ?? []
    return row.indexOf(unit) + unit.members.indexOf(member) / Math.max(1, unit.members.length)
  }
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

  const sortRow = (generation: number, related: (member: PersonId) => PersonId[]) => {
    const row = rows.get(generation)
    if (!row) return
    const keyed = row.map((unit, index) => {
      const references = unit.members.flatMap(related).map(rowIndex)
      return { unit, key: references.length ? average(references) : index }
    })
    keyed.sort((a, b) => a.key - b.key)
    rows.set(generation, keyed.map((entry) => entry.unit))
  }
  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (const generation of generations.slice(1)) sortRow(generation, visibleParents)
    for (const generation of [...generations].reverse().slice(1)) sortRow(generation, visibleChildren)
  }
  const siblingLinked = (a: Unit, b: Unit) => a.members.some((member) => b.members.some((other) => relations.siblings.get(member)?.has(other)))
  const siblingGroup = new Map<Unit, number>()
  for (const generation of generations) {
    const row = rows.get(generation) ?? []
    const placed = new Set<Unit>()
    const grouped: Unit[] = []
    for (const unit of row) {
      if (placed.has(unit)) continue
      const group = [unit]
      placed.add(unit)
      for (let index = 0; index < group.length; index += 1) {
        for (const other of row) {
          if (!placed.has(other) && siblingLinked(group[index], other)) {
            placed.add(other)
            group.push(other)
          }
        }
      }
      if (group.length > 1) {
        const groupId = siblingGroup.size
        group.forEach((member) => siblingGroup.set(member, groupId))
      }
      grouped.push(...group.sort((a, b) => row.indexOf(a) - row.indexOf(b)))
    }
    rows.set(generation, grouped)
  }
  for (const unit of units) {
    if (unit.members.length !== 2) continue
    const key = (member: PersonId) => {
      const references = visibleParents(member).map(rowIndex)
      return references.length ? average(references) : undefined
    }
    const [first, second] = unit.members
    const firstKey = key(first)
    const secondKey = key(second)
    if (firstKey !== undefined && secondKey !== undefined ? firstKey > secondKey : secondKey !== undefined && firstKey === undefined) {
      unit.members = [second, first]
    }
  }

  const sharesParent = (a: Unit, b: Unit) => a.members.some((member) => {
    const parents = new Set(visibleParents(member))
    return b.members.some((other) => visibleParents(other).some((parentId) => parents.has(parentId)))
  })
  const sameSiblingGroup = (a: Unit, b: Unit) => siblingGroup.has(a) && siblingGroup.get(a) === siblingGroup.get(b)
  const gapBetween = (a: Unit, b: Unit) => sharesParent(a, b) || sameSiblingGroup(a, b) ? options.siblingGap : options.groupGap
  const placeRow = (row: Unit[], desired: Array<number | undefined>) => {
    const count = row.length
    if (!count) return
    const target = row.map((unit, index) => desired[index] ?? unit.left)
    const forward = [...target]
    for (let index = 1; index < count; index += 1) {
      forward[index] = Math.max(forward[index], forward[index - 1] + unitWidth(row[index - 1]) + gapBetween(row[index - 1], row[index]))
    }
    const backward = [...target]
    for (let index = count - 2; index >= 0; index -= 1) {
      backward[index] = Math.min(backward[index], backward[index + 1] - unitWidth(row[index]) - gapBetween(row[index], row[index + 1]))
    }
    row.forEach((unit, index) => { unit.left = (forward[index] + backward[index]) / 2 })
  }

  for (const generation of generations) {
    const row = rows.get(generation) ?? []
    let cursor = 0
    row.forEach((unit, index) => {
      if (index > 0) cursor += gapBetween(row[index - 1], unit)
      unit.left = cursor
      cursor += unitWidth(unit)
    })
  }

  const parentKey = (id: PersonId) => visibleParents(id).sort().join('+')
  const downPass = () => {
    for (const generation of generations.slice(1)) {
      const row = rows.get(generation) ?? []
      const siblingsByFamily = new Map<string, PersonId[]>()
      row.forEach((unit) => unit.members.forEach((member) => {
        const key = parentKey(member)
        if (!key) return
        siblingsByFamily.set(key, [...(siblingsByFamily.get(key) ?? []), member])
      }))
      const memberTarget = new Map<PersonId, number>()
      for (const [key, siblings] of siblingsByFamily) {
        const center = average(key.split('+').map(memberX))
        const span = (siblings.length - 1) * (options.cardWidth + options.siblingGap)
        siblings.forEach((member, index) => memberTarget.set(member, center - span / 2 + index * (options.cardWidth + options.siblingGap)))
      }
      placeRow(row, row.map((unit) => {
        const lefts = unit.members
          .filter((member) => memberTarget.has(member))
          .map((member) => (memberTarget.get(member) ?? 0) - unit.members.indexOf(member) * pitch - options.cardWidth / 2)
        return lefts.length ? average(lefts) : undefined
      }))
    }
  }
  const upPass = () => {
    for (const generation of [...generations].reverse().slice(1)) {
      const row = rows.get(generation) ?? []
      placeRow(row, row.map((unit) => {
        const members = new Set(unit.members)
        const children = [...new Set(unit.members.flatMap(visibleChildren))]
        if (!children.length) return undefined
        const lefts = children.map((childId) => {
          const parents = visibleParents(childId).filter((parentId) => members.has(parentId))
          const parentOffset = average(parents.map((parentId) => unit.members.indexOf(parentId) * pitch + options.cardWidth / 2))
          return memberX(childId) - parentOffset
        })
        return average(lefts)
      }))
    }
  }
  for (let iteration = 0; iteration < RELAX_ITERATIONS; iteration += 1) {
    downPass()
    upPass()
  }
  downPass()

  const minGeneration = generations[0] ?? 0
  const rowPitch = options.cardHeight + options.rowGap
  const nodes = new Map<PersonId, LayoutNode>()
  for (const unit of units) {
    for (const member of unit.members) {
      const relatives = [...listOf(relations.parents, member), ...listOf(relations.children, member), ...listOf(relations.spouses, member), ...(relations.siblings.get(member)?.keys() ?? [])]
      nodes.set(member, {
        id: member,
        x: memberX(member),
        y: (unit.generation - minGeneration) * rowPitch + options.cardHeight / 2,
        generation: unit.generation - minGeneration,
        hiddenCount: new Set(relatives.filter((relativeId) => !visible.has(relativeId))).size,
      })
    }
  }
  const root = nodes.get(rootId)
  if (root) {
    const offsetX = root.x
    for (const node of nodes.values()) node.x -= offsetX
  }

  const familyMap = new Map<string, LayoutFamily>()
  for (const id of nodes.keys()) {
    const parents = visibleParents(id).sort()
    if (!parents.length) continue
    const key = parents.join('+')
    const family = familyMap.get(key) ?? { id: key, parentIds: parents, childIds: [] }
    family.childIds.push(id)
    familyMap.set(key, family)
  }
  for (const family of familyMap.values()) family.childIds.sort((a, b) => (nodes.get(a)?.x ?? 0) - (nodes.get(b)?.x ?? 0))

  const couples: LayoutCouple[] = []
  for (const unit of units) {
    for (let index = 1; index < unit.members.length; index += 1) {
      const a = unit.members[index - 1]
      const b = unit.members[index]
      if (relations.spouses.get(a)?.has(b)) couples.push({ a, b })
    }
  }

  const siblingLinks: LayoutSiblingLink[] = []
  for (const [a, links] of relations.siblings) {
    for (const [b, kind] of links) {
      if (a >= b || !nodes.has(a) || !nodes.has(b)) continue
      const shareParent = visibleParents(a).some((parentId) => visibleParents(b).includes(parentId))
      if (!shareParent) siblingLinks.push({ a, b, kind })
    }
  }

  const xs = [...nodes.values()].map((node) => node.x)
  const ys = [...nodes.values()].map((node) => node.y)
  return {
    nodes,
    families: [...familyMap.values()],
    couples,
    siblingLinks,
    bounds: {
      minX: Math.min(...xs) - options.cardWidth / 2,
      maxX: Math.max(...xs) + options.cardWidth / 2,
      minY: Math.min(...ys) - options.cardHeight / 2,
      maxY: Math.max(...ys) + options.cardHeight / 2,
    },
  }
}
