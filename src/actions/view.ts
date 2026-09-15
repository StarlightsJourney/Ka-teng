import type { Action, ViewMode } from './types'

export function setView(view: ViewMode): Action {
  return {
    name: `view:${view}`,
    perform: (state) => ({ ...state, view }),
  }
}

export function toggleLayered(layered: boolean): Action {
  return {
    name: `layered:${layered}`,
    perform: (state) => ({ ...state, layered }),
  }
}

export function toggleExpandAll(showAll: boolean): Action {
  return {
    name: `expand-all:${showAll}`,
    perform: (state) => ({ ...state, showAll }),
  }
}
