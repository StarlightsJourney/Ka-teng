import type { PersonId, PersonMap } from '../element'

export type ViewMode = '2d' | '3d'

export type AppState = {
  peopleById: PersonMap
  selectedId: PersonId | null
  query: string
  view: ViewMode
  layered: boolean
}

export type Action = {
  name: string
  perform: (state: AppState) => AppState
}
