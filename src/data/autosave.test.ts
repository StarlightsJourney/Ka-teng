import { describe, expect, it } from 'vitest'
import type { Person } from '../element'
import { AUTOSAVE_KEY, readAutosave, writeAutosave, type AutosaveStorage } from './autosave'

function memoryStore(): AutosaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
  }
}

const people = new Map<string, Person>([
  ['a', { id: 'a', name: { first: 'Ada', last: '' }, gender: 'F', children: ['b'] }],
  ['b', { id: 'b', name: { first: 'Ben', last: '' }, gender: 'M', parents: ['a'] }],
])

describe('autosave', () => {
  it('round-trips the workspace through storage', () => {
    const store = memoryStore()
    expect(writeAutosave(people, 'b', store)).toBe(true)
    const loaded = readAutosave(store)
    expect(loaded?.people.map((person) => person.id)).toEqual(['a', 'b'])
    expect(loaded?.focusId).toBe('b')
  })

  it('clears storage when the workspace is empty', () => {
    const store = memoryStore()
    writeAutosave(people, 'a', store)
    writeAutosave(new Map(), null, store)
    expect(store.data.has(AUTOSAVE_KEY)).toBe(false)
    expect(readAutosave(store)).toBeNull()
  })

  it('ignores corrupt data and reports quota failures', () => {
    const store = memoryStore()
    store.setItem(AUTOSAVE_KEY, '{oops')
    expect(readAutosave(store)).toBeNull()
    const full: AutosaveStorage = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => undefined }
    expect(writeAutosave(people, 'a', full)).toBe(false)
  })
})
