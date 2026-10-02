import type { Person } from '../element'
import { largestFamilyRoot } from '../scene'
import type { AppState } from './types'

export type WorkspaceKind = 'blank' | 'sample'

export function createLoadedState(people: readonly Person[], focusId: string | null): AppState {
  return {
    peopleById: new Map(people.map((person) => [person.id, person])),
    selectedId: null,
    focusId: focusId ?? people[0]?.id ?? null,
    query: '',
    showAll: true,
    expandedIds: new Set(),
    editing: false,
  }
}

export function createWorkspaceState(kind: WorkspaceKind, samplePeople: readonly Person[]): AppState {
  const people = kind === 'sample' ? samplePeople : []
  return {
    peopleById: new Map(people.map((person) => [person.id, person])),
    selectedId: null,
    focusId: kind === 'sample' ? largestFamilyRoot(people) ?? people[0]?.id ?? null : null,
    query: '',
    showAll: kind === 'blank',
    expandedIds: new Set(),
    editing: false,
  }
}
