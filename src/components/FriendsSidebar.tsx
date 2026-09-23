import { friendName, sanitizeAvatarUrl, type Friend, type FriendCircle } from '../element'

const circleLabels: Record<FriendCircle, string> = {
  5: 'Inner circle',
  15: 'Close friends',
  50: 'Regular friends',
  150: 'Acquaintances',
  500: 'Familiar faces',
}

type FriendsSidebarProps = {
  friends: Friend[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd?: () => void
}

function FriendRow({ friend, isSelected, onClick }: { friend: Friend; isSelected: boolean; onClick: () => void }) {
  const safeAvatar = sanitizeAvatarUrl(friend.avatar)
  const initials = `${friend.firstName[0] ?? ''}${friend.lastName[0] ?? ''}`
  return (
    <button type="button" className={`friend-row ${isSelected ? 'active' : ''}`} onClick={onClick} aria-current={isSelected ? 'true' : undefined}>
      <span className="friend-row-avatar">{safeAvatar ? <img src={safeAvatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.classList.add('is-error')} /> : initials}</span>
      <span className="friend-row-name">{friendName(friend)}</span>
      {friend.contexts[0] && <span className="friend-row-context">{friend.contexts[0]}</span>}
    </button>
  )
}

export function FriendsSidebar({ friends, selectedId, onSelect, onAdd }: FriendsSidebarProps) {
  const groups = friends.reduce<Record<FriendCircle, Friend[]>>((acc, friend) => {
    acc[friend.circle] = [...(acc[friend.circle] ?? []), friend]
    return acc
  }, { 5: [], 15: [], 50: [], 150: [], 500: [] })
  return (
    <nav className="friends-sidebar" aria-label="Friends">
      <div className="friends-sidebar-head">
        <div>
          <h2>Peng-yu</h2>
          <p>{friends.length} friends</p>
        </div>
        {onAdd && <button type="button" className="add-person-button" onClick={onAdd} aria-label="Add a friend" title="Add a friend">+</button>}
      </div>
      {(Object.keys(circleLabels) as unknown as FriendCircle[]).map((circle) => {
        const group = groups[circle]
        if (!group.length) return null
        return (
          <section key={circle} className="friends-group">
            <h3>{circleLabels[circle]} <span>{group.length}</span></h3>
            <div className="friend-row-list" role="list">
              {group.map((friend) => (
                <FriendRow key={friend.id} friend={friend} isSelected={friend.id === selectedId} onClick={() => onSelect(friend.id)} />
              ))}
            </div>
          </section>
        )
      })}
    </nav>
  )
}
