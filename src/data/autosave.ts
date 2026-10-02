import type { PersonId, PersonMap } from '../element'
import { parseFamilyFile, serializeFamily, type LoadedFamily } from './familyFile'

export const AUTOSAVE_KEY = 'ka-teng:autosave'

export type AutosaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): AutosaveStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readAutosave(store: AutosaveStorage | null = storage()): LoadedFamily | null {
  const raw = store?.getItem(AUTOSAVE_KEY)
  if (!raw) return null
  try {
    const loaded = parseFamilyFile(raw)
    return loaded.people.length ? loaded : null
  } catch {
    return null
  }
}

export function writeAutosave(people: PersonMap, focusId: PersonId | null, store: AutosaveStorage | null = storage()): boolean {
  if (!store) return false
  try {
    if (people.size === 0) store.removeItem(AUTOSAVE_KEY)
    else store.setItem(AUTOSAVE_KEY, serializeFamily(people, focusId))
    return true
  } catch {
    return false
  }
}
