import raw from './friends.json'
import type { FriendGraph } from '../element'
import { sanitizeAvatarUrl } from '../element'

export function loadFriends(): FriendGraph {
  const graph = raw as FriendGraph
  const friends = graph.friends.map((friend) => ({
    ...friend,
    avatar: sanitizeAvatarUrl(friend.avatar),
  }))
  const closeLinks = friends
    .filter((friend) => friend.circle === 5)
    .map((friend) => ({ source: 'me', target: friend.id, context: friend.contexts[0] }))
  return { friends, links: [...graph.links, ...closeLinks] }
}
