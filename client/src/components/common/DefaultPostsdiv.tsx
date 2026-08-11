// ============================================================
// DefaultPostsdiv.tsx - Posts for non-authenticated users (Blurred images)
// ============================================================

import './defaultpostdiv.css'
import DefaultPostcard from './DefaultPostcard'
import { defaultUsers } from '../../data/dafaultdata'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useState, useEffect } from 'react'

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
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [users, setUsers] = useState<typeof defaultUsers>([])

  useEffect(() => {
    // Simulate loading data and images
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(() => {
          setUsers(defaultUsers)
          setLoading(false)
        }, 500)
      }
      setLoadingProgress(progress)
    }, 300)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="overall-default-posts-container">
      {loading ? (
        <div className="spinner-load-container">
          <div className="spinner-border text-info spinner-big" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-4 loading-text">Loading posts...</p>
          <div className="loading-progress-bar-container">
            <div 
              className="loading-progress-bar" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="loading-progress-text">{loadingProgress}%</p>
        </div>
      ) : (
        users.map((user) => (
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
        ))
      )}
    </div>
  )
}

export default DefaultPostsdiv