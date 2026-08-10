// ============================================================
// DefaultPostsdiv.tsx - Posts for non-authenticated users (Blurred images)
// ============================================================

import './defaultpostdiv.css'
import DefaultPostcard from './DefaultPostcard'
import { defaultUsers } from '../../data/dafaultdata'

// ============================================================
// TYPES
// ============================================================

interface DefaultPostsdivProps {
  onConnectClick?: () => void
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultPostsdiv({ onConnectClick }: DefaultPostsdivProps) {
  return (
    <div className="overall-default-posts-container">
      {defaultUsers.map((user) => (
        <DefaultPostcard 
          key={user.id}
          id={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          time={user.time}
          location={user.location}
          image={user.image}
          avatar={user.avatar}
          bio={user.bio}
          gender={user.gender}
          interested_in={user.interested_in}
          min_age={user.min_age}
          max_age={user.max_age}
          onConnectClick={onConnectClick}
        />
      ))}
    </div>
  )
}

export default DefaultPostsdiv