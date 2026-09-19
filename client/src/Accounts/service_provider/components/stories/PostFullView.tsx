// PostFullView.tsx — full post page
// Order: top bar → byline → image → title → content
import { useEffect } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authtokenstore'
import Like from './Like'
import Share from './Share'
import './postfullview.css'

/* ────────────────────────────────────────────────────────
   Types
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

interface PostFullViewProps {
  story: Story
  onBack: () => void
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function initials(first?: string, last?: string) {
  const f = (first || '?').charAt(0).toUpperCase()
  const l = (last || '?').charAt(0).toUpperCase()
  return `${f}${l}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function PostFullView({ story, onBack }: PostFullViewProps) {
  const { access } = useAuthStore()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [story.id])

  const userId: number =
    (access as unknown as { id?: number })?.id ??
    Number(localStorage.getItem('user_id') ?? 0)

  return (
    <article className="pfv-root">
      {/* ── Top bar — back arrow only ───────────────── */}
      <header className="pfv-topbar">
        <button
          type="button"
          className="pfv-back-btn"
          onClick={onBack}
          aria-label="Back to stories"
        >
          <FiArrowLeft />
        </button>
      </header>

      {/* ══════════════════════════════════════════
          1. BYLINE — author + date + Like/Share
          ══════════════════════════════════════════ */}
      <div className="pfv-article-head">
        <div className="pfv-byline">
          <div className="pfv-avatar-wrap">
            {story.author.profile_image_url ? (
              <img
                src={story.author.profile_image_url}
                alt={story.author.full_name}
                className="pfv-avatar"
                loading="lazy"
              />
            ) : (
              <div className="pfv-avatar-fallback">
                {initials(
                  story.author.first_name,
                  story.author.last_name
                )}
              </div>
            )}
          </div>

          <div className="pfv-byline-meta">
            <span className="pfv-author-name">
              {story.author.full_name || 'Someone'}
            </span>
            <span className="pfv-author-sub">
              {formatDate(story.created_at)} ·{' '}
              {readTime(story.content)}
            </span>
          </div>

          <div className="pfv-byline-actions">
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
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          2. IMAGE — full-bleed
          ══════════════════════════════════════════ */}
      {story.image_url && (
        <div className="pfv-media">
          <img
            src={story.image_url}
            alt={story.title}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* ══════════════════════════════════════════
          3. TITLE — below the image
          ══════════════════════════════════════════ */}
      <div className="pfv-title-wrap">
        <h1 className="pfv-title">{story.title}</h1>
      </div>

      {/* ══════════════════════════════════════════
          4. CONTENT
          ══════════════════════════════════════════ */}
      <div className="pfv-content-wrap">
        <div
          className="pfv-content"
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
      </div>
    </article>
  )
}

export default PostFullView