import { friendName, sanitizeAvatarUrl, type Friend, type FriendLink } from '../element'
import { mutuals } from '../scene'

const ringLabel: Record<Friend['circle'], string> = {
  5: 'Inner circle',
  15: 'Close friend',
  50: 'Regular friend',
  150: 'Acquaintance',
  500: 'Familiar face',
}

type FriendPanelProps = {
  friend: Friend
  friends: readonly Friend[]
  links: readonly FriendLink[]
  onSelect: (id: string) => void
  onClose: () => void
}

export function FriendPanel({ friend, friends, links, onSelect, onClose }: FriendPanelProps) {
  const byId = new Map(friends.map((item) => [item.id, item]))
  const mutual = mutuals(links, 'me', friend.id).map((id) => byId.get(id)).filter((item): item is Friend => Boolean(item))
  const safeAvatar = sanitizeAvatarUrl(friend.avatar)
  const initials = `${friend.firstName[0] ?? ''}${friend.lastName[0] ?? ''}`

  return (
    <aside className="details-panel friend-panel">
      <div className="friend-panel-head">
        <div className="friend-panel-avatar">{safeAvatar ? <img src={safeAvatar} alt="" referrerPolicy="no-referrer" /> : initials}</div>
        <div className="friend-panel-title">
          <h1>{friendName(friend)}</h1>
          <p>{ringLabel[friend.circle]}</p>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close friend details">×</button>
      </div>

      {friend.contexts.length > 0 && (
        <section className="friend-section">
          <h2>Contexts</h2>
          <div className="friend-contexts">{friend.contexts.map((context) => <span key={context}>{context}</span>)}</div>
        </section>
      )}

      {friend.note && (
        <section className="friend-section">
          <h2>Note</h2>
          <p className="friend-note">{friend.note}</p>
        </section>
      )}

      <section className="friend-section">
        <h2>Mutual friends</h2>
        {mutual.length > 0 ? (
          <div className="friend-mutuals">
            {mutual.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
                {friendName(item)}
              </button>
            ))}
          </div>
        ) : (
          <p className="friend-empty">No mutual friends yet.</p>
        )}
      </section>
    </aside>
  )
}
