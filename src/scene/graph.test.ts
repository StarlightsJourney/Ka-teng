import { describe, expect, it } from 'vitest'
import { toFamilyGraph } from './graph'
import type { Person } from '../element'

const people: Person[] = [
  { id: 'a', name: { first: 'A', last: 'Root' }, gender: 'M', spouses: ['b'], children: ['c', 'd'] },
  { id: 'b', name: { first: 'B', last: 'Root' }, gender: 'F', spouses: ['a'], children: ['c', 'd'] },
  { id: 'c', name: { first: 'C', last: 'Child' }, gender: 'M', parents: ['a', 'b'], spouses: ['e'], children: ['f'] },
  { id: 'd', name: { first: 'D', last: 'Child' }, gender: 'F', parents: ['a', 'b'] },
  { id: 'e', name: { first: 'E', last: 'Spouse' }, gender: 'F', spouses: ['c'], children: ['f'] },
  { id: 'f', name: { first: 'F', last: 'Grandchild' }, gender: 'U', parents: ['c', 'e'] },
]

describe('toFamilyGraph', () => {
  it('groups a root couple subtree and emits relationship links', () => {
    const graph = toFamilyGraph(people)
    expect(new Set(graph.nodes.map((node) => node.group))).toEqual(new Set(['a']))
    expect(graph.links).toContainEqual({ source: 'a', target: 'c', kind: 'parent' })
    expect(graph.links).toContainEqual({ source: 'c', target: 'e', kind: 'spouse' })
    expect(graph.links).toContainEqual({ source: 'c', target: 'f', kind: 'parent' })
  })
})
