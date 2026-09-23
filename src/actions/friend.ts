import type { Friend, FriendCircle, FriendGraph } from '../element'

export type FriendPatch = {
  firstName?: string
  lastName?: string
  circle?: FriendCircle
  contexts?: string[]
  note?: string
  avatar?: string
}

function nextId(friends: Friend[]): string {
  const prefix = 'friend-'
  const numbers = friends
    .map((friend) => {
      const match = friend.id.match(/^friend-(\d+)$/)
      return match ? Number(match[1]) : 0
    })
    .filter((number) => number > 0)
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `${prefix}${next}`
}

export function createFriend(
  firstName: string,
  lastName: string,
  circle: FriendCircle,
  extras: Omit<FriendPatch, 'firstName' | 'lastName' | 'circle'> = {},
): Friend {
  return {
    id: 'temp',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    circle,
    contexts: extras.contexts ?? [],
    note: extras.note,
    avatar: extras.avatar,
  }
}

export function addFriend(graph: FriendGraph, friend: Friend): FriendGraph {
  if (graph.friends.some((existing) => existing.id === friend.id)) return graph
  const friendWithId = friend.id === 'temp' ? { ...friend, id: nextId(graph.friends) } : friend
  return { friends: [...graph.friends, friendWithId], links: graph.links }
}

export function updateFriend(graph: FriendGraph, id: string, patch: FriendPatch): FriendGraph {
  if (!graph.friends.some((friend) => friend.id === id)) return graph
  return {
    friends: graph.friends.map((friend) => friend.id === id ? { ...friend, ...patch } : friend),
    links: graph.links,
  }
}

export function removeFriend(graph: FriendGraph, id: string): FriendGraph {
  return {
    friends: graph.friends.filter((friend) => friend.id !== id),
    links: graph.links.filter((link) => link.source !== id && link.target !== id),
  }
}

export function addFriendLink(graph: FriendGraph, source: string, target: string, context?: string): FriendGraph {
  if (source === target) return graph
  const exists = graph.links.some(
    (link) => (link.source === source && link.target === target) || (link.source === target && link.target === source),
  )
  if (exists) return graph
  return { friends: graph.friends, links: [...graph.links, { source, target, context }] }
}

export function removeFriendLink(graph: FriendGraph, source: string, target: string): FriendGraph {
  return {
    friends: graph.friends,
    links: graph.links.filter(
      (link) => !((link.source === source && link.target === target) || (link.source === target && link.target === source)),
    ),
  }
}
