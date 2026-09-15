import type { PersonId, PersonMap } from '../element'

export type AppState = {
  peopleById: PersonMap
  selectedId: PersonId | null
  query: string
  showAll: boolean
  expandedIds: ReadonlySet<PersonId>
}

export type Action = {
  name: string
  perform: (state: AppState) => AppState
}
