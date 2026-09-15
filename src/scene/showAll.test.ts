import { describe, expect, it } from 'vitest'
import { createShowAllSnapshot, restoreShowAllSnapshot } from './showAll'

describe('show-all snapshots', () => {
  it('copies camera and expansion state instead of retaining mutable references', () => {
    const expanded = new Set(['one'])
    const snapshot = createShowAllSnapshot({ x: 4, y: 8, k: 0.75 }, 'main', expanded)
    expanded.add('two')
    expect(snapshot).toEqual({ transform: { x: 4, y: 8, k: 0.75 }, mainId: 'main', expandedIds: new Set(['one']) })
  })

  it('provides fallback state when no snapshot exists', () => {
    expect(restoreShowAllSnapshot(null, 'fallback', new Set(['expanded']))).toEqual({
      transform: { x: 0, y: 0, k: 1 },
      mainId: 'fallback',
      expandedIds: new Set(['expanded']),
    })
  })
})
