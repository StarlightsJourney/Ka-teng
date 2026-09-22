import { friendName, sanitizeAvatarUrl, type Friend, type FriendLink } from '../element'
import { mutuals } from '../scene'

type FriendPanelProps = { friend: Friend; friends: readonly Friend[]; links: readonly FriendLink[]; onSelect: (id: string) => void; onClose: () => void }
const ringLabel: Record<Friend['circle'], string> = { 5: 'Inner circle (5)', 15: 'Close friend (15)', 50: 'Regular friend (50)', 150: 'Acquaintance (150)', 500: 'Familiar face (500)' }
export function FriendPanel({ friend, friends, links, onSelect, onClose }: FriendPanelProps) {
  const byId = new Map(friends.map((item) => [item.id, item]))
  const mutual = mutuals(links, 'me', friend.id).map((id) => byId.get(id)).filter((item): item is Friend => Boolean(item))
  const safeAvatar = sanitizeAvatarUrl(friend.avatar)
  const initials = `${friend.firstName[0] ?? ''}${friend.lastName[0] ?? ''}`
  return <aside className="details-panel friend-panel">
    <div className="friend-panel-head"><div className="friend-panel-avatar">{safeAvatar ? <img src={safeAvatar} alt="" referrerPolicy="no-referrer" /> : initials}</div><div><h1>{friendName(friend)}</h1><p>{ringLabel[friend.circle]}</p></div><button type="button" className="panel-close" onClick={onClose} aria-label="Close friend details">×</button></div>
    <div className="friend-contexts">{friend.contexts.map((context) => <span key={context}>{context}</span>)}</div>
    {friend.note && <p className="friend-note">{friend.note}</p>}
    <section className="friend-mutuals"><h2>Mutual friends</h2>{mutual.length ? mutual.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)}>{friendName(item)}</button>) : <p>No mutual friends yet.</p>}</section>
  </aside>
}
