export type HierarchyNode<T extends { id: string; _ktHidden?: number }> = {
  data: T
  children?: HierarchyNode<T>[]
}

export type PruneHierarchyOptions = {
  isAncestry: boolean
  expandedIds: ReadonlySet<string>
  maxDepth?: number
  maxChildren?: number
}

export function pruneHierarchy<T extends { id: string; _ktHidden?: number }>(
  root: HierarchyNode<T>,
  { isAncestry, expandedIds, maxDepth = 2, maxChildren = 5 }: PruneHierarchyOptions,
): void {
  const seenIds = new Set<string>()

  const visit = (node: HierarchyNode<T>, depth: number) => {
    node.data._ktHidden = 0
    if (seenIds.has(node.data.id)) return
    seenIds.add(node.data.id)
    if (!node.children?.length) return

    const expanded = expandedIds.has(node.data.id)
    if (depth >= maxDepth && !expanded) {
      node.data._ktHidden += node.children.length
      delete node.children
      return
    }

    let children = node.children
    if (!isAncestry && !expanded && children.length > maxChildren) {
      node.data._ktHidden += children.length - maxChildren
      children = children.slice(0, maxChildren)
    }

    const uniqueChildren: HierarchyNode<T>[] = []
    for (const child of children) {
      if (seenIds.has(child.data.id)) {
        node.data._ktHidden = (node.data._ktHidden ?? 0) + 1
        continue
      }
      uniqueChildren.push(child)
      visit(child, depth + 1)
    }

    if (uniqueChildren.length) node.children = uniqueChildren
    else delete node.children
  }

  visit(root, 0)
}
