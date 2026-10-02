import { describe, expect, it } from 'vitest'
import type { Person, PersonMap } from '../element'
import { layoutFamily, type FamilyLayout, type LayoutOptions } from './familyLayout'

const options: LayoutOptions = { cardWidth: 200, cardHeight: 60, spouseGap: 20, siblingGap: 30, groupGap: 60, rowGap: 80 }

const person = (id: string, relations: Partial<Person> = {}): Person => ({ id, name: { first: id, last: '' }, gender: 'U', ...relations })

const mapOf = (people: Person[]): PersonMap => new Map(people.map((entry) => [entry.id, entry]))

function family(): PersonMap {
  return mapOf([
    person('grandpa', { spouses: ['grandma'], children: ['dad', 'aunt'] }),
    person('grandma', { spouses: ['grandpa'], children: ['dad', 'aunt'] }),
    person('dad', { parents: ['grandpa', 'grandma'], spouses: ['mum'], children: ['me', 'sis'] }),
    person('aunt', { parents: ['grandpa', 'grandma'] }),
    person('mum', { spouses: ['dad'], children: ['me', 'sis'] }),
    person('me', { parents: ['dad', 'mum'] }),
    person('sis', { parents: ['dad', 'mum'] }),
  ])
}

const node = (layout: FamilyLayout, id: string) => {
  const found = layout.nodes.get(id)
  if (!found) throw new Error(`missing ${id}`)
  return found
}

function expectNoOverlaps(layout: FamilyLayout) {
  const rows = new Map<number, number[]>()
  for (const entry of layout.nodes.values()) rows.set(entry.y, [...(rows.get(entry.y) ?? []), entry.x])
  for (const xs of rows.values()) {
    const sorted = [...xs].sort((a, b) => a - b)
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index] - sorted[index - 1]).toBeGreaterThanOrEqual(options.cardWidth + options.spouseGap - 0.01)
    }
  }
}

describe('layoutFamily', () => {
  it('puts each generation on its own row, top to bottom', () => {
    const layout = layoutFamily(family(), 'me', options)
    expect(node(layout, 'grandpa').y).toBeLessThan(node(layout, 'dad').y)
    expect(node(layout, 'dad').y).toBeLessThan(node(layout, 'me').y)
    expect(node(layout, 'me').y).toBe(node(layout, 'sis').y)
    expect(node(layout, 'dad').y).toBe(node(layout, 'aunt').y)
  })

  it('keeps spouses side by side on the same row', () => {
    const layout = layoutFamily(family(), 'me', options)
    expect(node(layout, 'dad').y).toBe(node(layout, 'mum').y)
    expect(Math.abs(node(layout, 'dad').x - node(layout, 'mum').x)).toBeCloseTo(options.cardWidth + options.spouseGap)
    expect(layout.couples).toEqual(expect.arrayContaining([expect.objectContaining({ a: expect.any(String), b: expect.any(String) })]))
  })

  it('centres a couple above their children', () => {
    const layout = layoutFamily(family(), 'me', options)
    const parentsMid = (node(layout, 'dad').x + node(layout, 'mum').x) / 2
    const childrenMid = (node(layout, 'me').x + node(layout, 'sis').x) / 2
    expect(parentsMid).toBeCloseTo(childrenMid, 0)
  })

  it('never overlaps cards in a row', () => {
    expectNoOverlaps(layoutFamily(family(), 'me', options))
  })

  it('places the root person at x = 0', () => {
    expect(node(layoutFamily(family(), 'aunt', options), 'aunt').x).toBe(0)
  })

  it('groups children into one family per parent set', () => {
    const layout = layoutFamily(family(), 'me', options)
    const kids = layout.families.find((entry) => entry.childIds.includes('me'))
    expect(kids?.parentIds).toEqual(['dad', 'mum'])
    expect(kids?.childIds.sort()).toEqual(['me', 'sis'])
  })

  it('limits depth and reports hidden relatives', () => {
    const layout = layoutFamily(family(), 'me', { ...options, maxDepth: 1 })
    expect(layout.nodes.has('dad')).toBe(true)
    expect(layout.nodes.has('grandpa')).toBe(false)
    expect(layout.nodes.has('sis')).toBe(false)
    expect(node(layout, 'dad').hiddenCount).toBe(3)
  })

  it('can show a focused person’s close family including siblings', () => {
    const layout = layoutFamily(family(), 'me', { ...options, maxDepth: 1, includeSiblings: true })
    expect([...layout.nodes.keys()].sort()).toEqual(['dad', 'me', 'mum', 'sis'])
    expect(node(layout, 'dad').hiddenCount).toBe(2)
  })

  it('expands hidden relatives of expanded people', () => {
    const layout = layoutFamily(family(), 'me', { ...options, maxDepth: 1, expandedIds: new Set(['dad']) })
    expect(layout.nodes.has('grandpa')).toBe(true)
  })

  it('lays out a single person', () => {
    const layout = layoutFamily(mapOf([person('solo')]), 'solo', options)
    expect(node(layout, 'solo')).toMatchObject({ x: 0, y: options.cardHeight / 2, hiddenCount: 0 })
  })

  it('returns an empty layout without a root', () => {
    expect(layoutFamily(family(), null, options).nodes.size).toBe(0)
  })

  it('handles half-siblings from two partners without overlaps', () => {
    const people = mapOf([
      person('p', { spouses: ['a', 'b'] }),
      person('a', { spouses: ['p'] }),
      person('b', { spouses: ['p'] }),
      person('c1', { parents: ['p', 'a'] }),
      person('c2', { parents: ['p', 'b'] }),
      person('c3', { parents: ['p', 'b'] }),
    ])
    const layout = layoutFamily(people, 'p', options)
    expectNoOverlaps(layout)
    expect(layout.families).toHaveLength(2)
    expect(node(layout, 'c2').x).toBeGreaterThan(node(layout, 'c1').x)
  })
})

describe('layoutFamily siblings', () => {
  it('puts explicitly linked siblings side by side on the same row without a couple line', () => {
    const people = mapOf([
      person('me', { siblings: ['sis'] }),
      person('sis'),
      person('step', { stepSiblings: ['me'] }),
      person('partner', { spouses: ['me'] }),
    ])
    const layout = layoutFamily(people, 'me', options)
    expect(node(layout, 'sis').y).toBe(node(layout, 'me').y)
    expect(node(layout, 'step').y).toBe(node(layout, 'me').y)
    expect(layout.couples).toEqual([expect.objectContaining({ a: expect.any(String) })])
    expect(layout.couples).toHaveLength(1)
    expect(layout.siblingLinks).toEqual(expect.arrayContaining([
      { a: 'me', b: 'sis', kind: 'full' },
      { a: 'me', b: 'step', kind: 'step' },
    ]))
    expectNoOverlaps(layout)
  })

  it('does not draw a sibling bracket for siblings who already share a parent', () => {
    const people = mapOf([
      person('mum', { children: ['a', 'b'] }),
      person('a', { parents: ['mum'], siblings: ['b'] }),
      person('b', { parents: ['mum'], siblings: ['a'] }),
    ])
    expect(layoutFamily(people, 'a', options).siblingLinks).toEqual([])
  })
})
