// PostCard.tsx — Medium-style preview with description + Like/Share
import { useState } from 'react'
import { FiMoreHorizontal } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authtokenstore'
import Like from './Like'
import Share from './Share'
import './postcard.css'

/* ────────────────────────────────────────────────────────
   Types — matches SearchPosts' Story shape exactly
   ──────────────────────────────────────────────────────── */

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
  image_url: string | null
  created_at: string
  updated_at?: string
  author: StoryAuthor
}

interface PostCardProps {
  story: Story
  onOpen?: () => void
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

function plainText(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim()
}

function readTime(html: string) {
  const text = plainText(html)
  const words = text.split(/\s+/).filter(Boolean).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

function previewText(html: string) {
  return plainText(html).replace(/\s+/g, ' ').trim()
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function PostCard({ story, onOpen }: PostCardProps) {
  const { access } = useAuthStore()

  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgErrored, setImgErrored] = useState(false)

  const showImage = story.image_url && !imgErrored
  const preview = previewText(story.content)

  /* The logged-in user's id — adapt to your auth store */
  const userId: number =
    (access as unknown as { id?: number })?.id ??
    Number(localStorage.getItem('user_id') ?? 0)

  const handleOpen = () => {
    onOpen?.()
  }

  return (
    <article className="pc-card">
      {/* ── Author row ──────────────────────────────── */}
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
          onClick={(e) => e.stopPropagation()}
        >
          <FiMoreHorizontal />
        </button>
      </header>

      {/* ── Main row — text on left, thumb on right ── */}
      <div
        className="pc-main"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpen()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Open story: ${story.title}`}
      >
        <div className="pc-text">
          <h2 className="pc-title">{story.title}</h2>
          {preview && (
            <p className="pc-preview">{preview}</p>
          )}
        </div>

        {showImage && (
          <div className="pc-thumb">
            {!imgLoaded && (
              <div className="pc-thumb-skeleton" aria-hidden="true" />
            )}
            <img
              src={story.image_url as string}
              alt={story.title}
              loading="lazy"
              decoding="async"
              className={`pc-thumb-img ${
                imgLoaded
                  ? 'pc-thumb-img-loaded'
                  : 'pc-thumb-img-loading'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgErrored(true)
                setImgLoaded(true)
              }}
            />
          </div>
        )}
      </div>

      {/* ── Footer — Like + Share only ──────────────── */}
      <footer className="pc-actions">
        <Like
          postId={story.id}
          userId={userId}
          size="md"
        />

        <Share
          postId={story.id}
          userId={userId}
          postTitle={story.title}
          size="md"
        />
      </footer>
    </article>
  )
}

export default PostCard