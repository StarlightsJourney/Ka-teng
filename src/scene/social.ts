import type { Friend, FriendLink, FriendCircle } from '../element'

export const ringRadius: Record<FriendCircle, number> = {
  5: 80,
  15: 160,
  50: 260,
  150: 380,
  500: 520,
}

export function primaryContext(friend: Friend): string {
  return friend.contexts[0] ?? 'other'
}

export function neighbours(links: readonly FriendLink[], id: string): string[] {
  const result: string[] = []
  for (const link of links) {
    if (link.source === id) result.push(link.target)
    else if (link.target === id) result.push(link.source)
  }
  return [...new Set(result)]
}

export function mutuals(links: readonly FriendLink[], firstId: string, secondId: string): string[] {
  const first = new Set(neighbours(links, firstId))
  return neighbours(links, secondId).filter((id) => first.has(id))
}
