// ============================================================
// DefaultFeed.tsx - Feed shown to non-authenticated users (NO STORIES)
// ============================================================

import './defaultfeed.css'

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultFeed() {
  return (
    <div className="default-feed-container">
      {/* Feed posts only - NO stories */}
      <div className="default-feed-posts">
        {/* Post 1 */}
        <div className="default-feed-post">
          <div className="default-post-header">
            <div className="default-post-avatar" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}></div>
            <div className="default-post-user-info">
              <h5>Hookiefy User</h5>
              <span>2 hours ago</span>
            </div>
          </div>
          <div className="default-post-image" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)' }}>
            <div className="default-post-image-placeholder">
              <span>📸</span>
              <p>Join Hookiefy to see posts</p>
            </div>
          </div>
          <div className="default-post-actions">
            <button>❤️</button>
            <button>💬</button>
            <button>📤</button>
          </div>
          <div className="default-post-likes">1,234 likes</div>
          <div className="default-post-caption">
            <strong>Hookiefy</strong> Welcome to Hookiefy! Login to connect with others.
          </div>
        </div>

        {/* Post 2 */}
        <div className="default-feed-post">
          <div className="default-post-header">
            <div className="default-post-avatar" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}></div>
            <div className="default-post-user-info">
              <h5>Community</h5>
              <span>4 hours ago</span>
            </div>
          </div>
          <div className="default-post-image" style={{ background: 'linear-gradient(135deg, #16213e, #0f3460)' }}>
            <div className="default-post-image-placeholder">
              <span>🌐</span>
              <p>Connect with people worldwide</p>
            </div>
          </div>
          <div className="default-post-actions">
            <button>❤️</button>
            <button>💬</button>
            <button>📤</button>
          </div>
          <div className="default-post-likes">856 likes</div>
          <div className="default-post-caption">
            <strong>Community</strong> Discover new connections and opportunities.
          </div>
        </div>

        {/* Post 3 */}
        <div className="default-feed-post">
          <div className="default-post-header">
            <div className="default-post-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}></div>
            <div className="default-post-user-info">
              <h5>Trending</h5>
              <span>6 hours ago</span>
            </div>
          </div>
          <div className="default-post-image" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)' }}>
            <div className="default-post-image-placeholder">
              <span>🔥</span>
              <p>Stay updated with the latest trends</p>
            </div>
          </div>
          <div className="default-post-actions">
            <button>❤️</button>
            <button>💬</button>
            <button>📤</button>
          </div>
          <div className="default-post-likes">2.1k likes</div>
          <div className="default-post-caption">
            <strong>Trending</strong> Check out what's happening in the community.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DefaultFeed;