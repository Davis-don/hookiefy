// ============================================================
// DefaultFeed.tsx - Feed shown to non-authenticated users (NO STORIES)
// ============================================================

import './defaultfeed.css'
import DefaultPostsdiv from '../common/DefaultPostsdiv'

// ============================================================
// TYPES
// ============================================================

interface DefaultFeedProps {
  onConnectClick?: () => void
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultFeed({ onConnectClick }: DefaultFeedProps) {
  return (
    <div className="default-feed-container">
      <div className="default-feed-header">
        <h4>Feed</h4>
      </div>
      <div className="default-feed-posts-data">
        <DefaultPostsdiv onConnectClick={onConnectClick} />
      </div>
    </div>
  )
}

export default DefaultFeed