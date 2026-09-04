// Userfeed.tsx
// User Feed Component - Displays posts and adverts
// ============================================================

import './userfeed.css'
import Postsdiv from './Postsdiv'
import Advertcard from './Advertcard'
import { feedData } from '../data/firstrenderdata'

function Userfeed() {
  // Get the first item from feed data
  const feedItem = feedData[0];

  return (
    <div className="overall-user-feed-container">
      <div className="user-feed">
        <div className="user-feed-header">
          <h4>Feed</h4>
        </div>
      </div>
      <div className="user-feed-posts-data">
        {/* Pass the feed item data to Advertcard */}
        {feedItem && (
          <Advertcard
            id={feedItem.id}
            title={feedItem.title}
            description={feedItem.description}
            url={feedItem.url}
            mediaType={feedItem.mediaType}
            publicId={feedItem.publicId}
            created_at={feedItem.created_at}
            time={feedItem.time}
          />
        )}
        <Postsdiv />
      </div>
    </div>
  )
}

export default Userfeed