// MyPosts.tsx — user's own posts list
import { useState } from 'react'
import {
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiHeart,
  FiMessageCircle,
  FiShare2,
} from 'react-icons/fi'
import './myposts.css'

interface Post {
  id: number
  author: string
  initials: string
  createdAt: string
  body: string
  imageUrl?: string
  likes: number
  comments: number
  shares: number
}

/* Placeholder data — replace with a useQuery when your API is ready */
const MOCK_POSTS: Post[] = [
  {
    id: 1,
    author: 'You',
    initials: 'ME',
    createdAt: '2h ago',
    body: "Just finished a full day of plumbing jobs around Westlands. If you need a reliable hand, hit me up — I'm booking for next week.",
    likes: 12,
    comments: 3,
    shares: 1,
  },
  {
    id: 2,
    author: 'You',
    initials: 'ME',
    createdAt: 'Yesterday',
    body: 'New listing is live! Check out my profile for the full service menu and pricing.',
    imageUrl:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
    likes: 34,
    comments: 8,
    shares: 5,
  },
]

function MyPosts() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    // TODO: replace with real refetch
    setTimeout(() => {
      setPosts(MOCK_POSTS)
      setRefreshing(false)
    }, 800)
  }

  const handleEdit = (post: Post) => {
    console.log('Edit post', post.id)
    // TODO: open edit form
  }

  const handleDelete = (post: Post) => {
    console.log('Delete post', post.id)
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  return (
    <div className="myposts-root">
      {/* Toolbar */}
      <div className="myposts-toolbar">
        <h2 className="myposts-toolbar-title">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </h2>
        <div className="myposts-toolbar-right">
          <button
            type="button"
            className="myposts-icon-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
          >
            <FiRefreshCw
              className={refreshing ? 'myposts-icon-spinning' : ''}
            />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="myposts-state">
          <FiInbox className="myposts-state-icon" />
          <h3 className="myposts-state-title">No posts yet</h3>
          <p className="myposts-state-text">
            Share an update, a photo, or something you're working on.
          </p>
        </div>
      )}

      {/* Post list */}
      {posts.length > 0 && (
        <div className="myposts-list">
          {posts.map((post) => (
            <article key={post.id} className="myposts-card">
              {/* Header */}
              <div className="myposts-card-header">
                <div className="myposts-card-meta">
                  <div className="myposts-card-avatar">
                    {post.initials}
                  </div>
                  <div className="myposts-card-author">
                    <span className="myposts-card-name">
                      {post.author}
                    </span>
                    <span className="myposts-card-time">
                      {post.createdAt}
                    </span>
                  </div>
                </div>

                <div className="myposts-card-actions">
                  <button
                    type="button"
                    className="myposts-card-icon"
                    onClick={() => handleEdit(post)}
                    aria-label="Edit post"
                    title="Edit"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    type="button"
                    className="myposts-card-icon myposts-card-icon-danger"
                    onClick={() => handleDelete(post)}
                    aria-label="Delete post"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              {/* Body */}
              <p className="myposts-card-body">{post.body}</p>

              {/* Optional image */}
              {post.imageUrl && (
                <div className="myposts-card-media">
                  <img src={post.imageUrl} alt="" loading="lazy" />
                </div>
              )}

              {/* Footer stats */}
              <div className="myposts-card-footer">
                <span className="myposts-card-stat">
                  <FiHeart /> {post.likes}
                </span>
                <span className="myposts-card-stat">
                  <FiMessageCircle /> {post.comments}
                </span>
                <span className="myposts-card-stat">
                  <FiShare2 /> {post.shares}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyPosts