export type FriendCircle = 5 | 15 | 50 | 150 | 500

export type Friend = {
  id: string
  firstName: string
  lastName: string
  avatar?: string
  circle: FriendCircle
  contexts: string[]
  note?: string
}

export type FriendLink = {
  source: string
  target: string
  context?: string
}

export type FriendGraph = {
  friends: Friend[]
  links: FriendLink[]
}

export const me: Friend = {
  id: 'me',
  firstName: 'You',
  lastName: '',
  circle: 5,
  contexts: [],
}

export function friendName(friend: Friend): string {
  return [friend.firstName, friend.lastName].filter(Boolean).join(' ')
}
