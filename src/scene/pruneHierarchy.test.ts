import { hierarchy } from 'd3-hierarchy'
import { describe, expect, it } from 'vitest'
import { pruneHierarchy } from './pruneHierarchy'

type Datum = { id: string; _ktHidden?: number; children?: Datum[] }

function tree() {
  return hierarchy<Datum>({
    id: 'root',
    children: [{
      id: 'a',
      children: [{
        id: 'a1',
        children: [{ id: 'a1i' }, { id: 'a1ii' }],
      }],
    }, {
      id: 'b',
      children: [{ id: 'b1' }],
    }],
  })
}

describe('pruneHierarchy', () => {
  it('cuts descendants past the maximum depth and records the hidden count', () => {
    const root = tree()
    pruneHierarchy(root, { isAncestry: false, expandedIds: new Set(), maxDepth: 2 })

    expect(root.data._ktHidden).toBe(0)
    expect(root.children?.[0].children?.[0].children).toBeUndefined()
    expect(root.children?.[0].children?.[0].data._ktHidden).toBe(2)
  })

  it('caps progeny children while preserving order', () => {
    const root = hierarchy<Datum>({
      id: 'root',
      children: Array.from({ length: 7 }, (_, index) => ({ id: `child-${index}` })),
    })
    pruneHierarchy(root, { isAncestry: false, expandedIds: new Set(), maxChildren: 5 })

    expect(root.children?.map((node) => node.data.id)).toEqual(['child-0', 'child-1', 'child-2', 'child-3', 'child-4'])
    expect(root.data._ktHidden).toBe(2)
  })

  it('allows an expanded node to reveal its next generation', () => {
    const root = tree()
    pruneHierarchy(root, { isAncestry: false, expandedIds: new Set(['a1']), maxDepth: 2 })

    expect(root.children?.[0].children?.[0].children?.map((node) => node.data.id)).toEqual(['a1i', 'a1ii'])
  })

  it('counts duplicate descendants as hidden and keeps the first occurrence', () => {
    const root = hierarchy<Datum>({
      id: 'root',
      children: [{ id: 'person' }, { id: 'person' }, { id: 'other' }],
    })
    pruneHierarchy(root, { isAncestry: false, expandedIds: new Set() })

    expect(root.children?.map((node) => node.data.id)).toEqual(['person', 'other'])
    expect(root.data._ktHidden).toBe(1)
  })
})
