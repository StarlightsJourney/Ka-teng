export type CameraTransform = {
  x: number
  y: number
  k: number
}

export type ShowAllSnapshot = {
  transform: CameraTransform
  mainId: string
  expandedIds: ReadonlySet<string>
}

export function createShowAllSnapshot(
  transform: CameraTransform,
  mainId: string,
  expandedIds: ReadonlySet<string>,
): ShowAllSnapshot {
  return { transform: { ...transform }, mainId, expandedIds: new Set(expandedIds) }
}

export function restoreShowAllSnapshot(
  snapshot: ShowAllSnapshot | null,
  fallbackMainId: string,
  fallbackExpandedIds: ReadonlySet<string>,
): ShowAllSnapshot {
  return snapshot ?? {
    transform: { x: 0, y: 0, k: 1 },
    mainId: fallbackMainId,
    expandedIds: new Set(fallbackExpandedIds),
  }
}
