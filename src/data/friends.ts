import raw from './friends.json'
import type { FriendGraph } from '../element'

export function loadFriends(): FriendGraph {
  const graph = raw as FriendGraph
  const closeLinks = graph.friends
    .filter((friend) => friend.circle === 5)
    .map((friend) => ({ source: 'me', target: friend.id, context: friend.contexts[0] }))
  return { friends: graph.friends, links: [...graph.links, ...closeLinks] }
}
