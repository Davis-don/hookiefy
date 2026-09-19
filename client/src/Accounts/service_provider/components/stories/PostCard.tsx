// PostCard.tsx — single story card, Medium-style
import { useState } from 'react'
import {
  FiHeart,
  FiBookmark,
  FiShare2,
  FiMoreHorizontal,
} from 'react-icons/fi'
import './postcard.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type StoryCategory = 'ideas' | 'success' | 'fun'

interface StoryAuthor {
  id: number
  first_name: string
  last_name: string
  full_name: string
  profile_image_url: string | null
  role: string
}

interface Story {
  id: number
  title: string
  content: string
  category: StoryCategory
  image_url: string | null
  created_at: string
  updated_at?: string
  author: StoryAuthor
}

interface PostCardProps {
  story: Story
}

/* ────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<StoryCategory, string> = {
  ideas: 'Ideas & Tips',
  success: 'Success Stories',
  fun: 'Fun',
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function initials(first?: string, last?: string) {
  const f = (first || '?').charAt(0).toUpperCase()
  const l = (last || '?').charAt(0).toUpperCase()
  return `${f}${l}`
}

function timeAgo(iso: string) {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)

    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`

    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`

    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`

    const years = Math.floor(days / 365)
    return `${years}y ago`
  } catch {
    return ''
  }
}

/* Rough reading time from HTML content */
function readTime(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = tmp.textContent || ''
  const words = text.trim().split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function PostCard({ story }: PostCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgErrored, setImgErrored] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const showImage = story.image_url && !imgErrored

  return (
    <article className="pc-card">
      {/* ── Header — avatar + author + time ─────────── */}
      <header className="pc-header">
        <div className="pc-avatar-wrap">
          {story.author.profile_image_url ? (
            <img
              src={story.author.profile_image_url}
              alt={story.author.full_name}
              className="pc-avatar"
              loading="lazy"
            />
          ) : (
            <div className="pc-avatar-fallback">
              {initials(
                story.author.first_name,
                story.author.last_name
              )}
            </div>
          )}
        </div>

        <div className="pc-meta">
          <span className="pc-author">
            {story.author.full_name || 'Someone'}
          </span>
          <span className="pc-submeta">
            {timeAgo(story.created_at)} · {readTime(story.content)}
          </span>
        </div>

        <button
          type="button"
          className="pc-more-btn"
          aria-label="More options"
        >
          <FiMoreHorizontal />
        </button>
      </header>

      {/* ── Image — edge-to-edge, no crop ───────────── */}
      {showImage && (
        <div className="pc-media">
          {!imgLoaded && (
            <div className="pc-media-skeleton" aria-hidden="true" />
          )}
          <img
            src={story.image_url as string}
            alt={story.title}
            loading="lazy"
            decoding="async"
            className={`pc-media-img ${
              imgLoaded
                ? 'pc-media-img-loaded'
                : 'pc-media-img-loading'
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgErrored(true)
              setImgLoaded(true)
            }}
          />
        </div>
      )}

      {/* ── Body — title + rich HTML content ────────── */}
      <div className="pc-body">
        <span
          className={`pc-cat-pill pc-cat-${story.category}`}
        >
          {CATEGORY_LABELS[story.category]}
        </span>

        <h2 className="pc-title">{story.title}</h2>

        <div
          className="pc-content"
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
      </div>

      {/* ── Footer actions ──────────────────────────── */}
      <footer className="pc-actions">
        <button
          type="button"
          className={`pc-action ${liked ? 'pc-action-liked' : ''}`}
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <FiHeart />
        </button>

        <button
          type="button"
          className={`pc-action ${saved ? 'pc-action-saved' : ''}`}
          onClick={() => setSaved((v) => !v)}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <FiBookmark />
        </button>

        <button
          type="button"
          className="pc-action"
          aria-label="Share"
        >
          <FiShare2 />
        </button>
      </footer>
    </article>
  )
}

export default PostCard