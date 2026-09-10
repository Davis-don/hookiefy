// ============================================================
// DefaultPostsdiv.tsx - Posts for non-authenticated users (Blurred images)
// ============================================================

import './defaultpostdiv.css'
import DefaultPostcard from './DefaultPostcard'
import { defaultUsers } from '../data/dafaultdata'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useState, useEffect } from 'react'
import Spinner from './Publicspinner/Spinner'

// ============================================================
// TYPES
// ============================================================

interface DefaultPostsdivProps {
  onConnectClick?: () => void
}

// ============================================================
// SHUFFLE FUNCTION
// ============================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultPostsdiv({ onConnectClick }: DefaultPostsdivProps) {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<typeof defaultUsers>([])

  // Shuffle users ONCE when component mounts
  useEffect(() => {
    const shuffledUsers = shuffleArray(defaultUsers)

    // Simulate loading delay
    const timer = setTimeout(() => {
      setUsers(shuffledUsers)
      setLoading(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  // ✅ Use the imported Spinner while loading
  if (loading) {
    return (
      <div className="overall-default-posts-container">
        <Spinner
          message="Loading posts"
          slowMessage="Almost there — fetching profiles…"
          slowAfter={3000}
        />
      </div>
    )
  }

  return (
    <div className="overall-default-posts-container">
      {users.map((user) => (
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