// PostDetailModal.tsx — full post view
import { useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authtokenstore'
import Like from './Like'
import Share from './Share'
import './postdetailmodal.css'

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

interface PostDetailModalProps {
  story: Story | null
  onClose: () => void
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

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function PostDetailModal({ story, onClose }: PostDetailModalProps) {
  const { access } = useAuthStore()

  /* Lock body scroll + Escape to close */
  useEffect(() => {
    if (!story) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [story, onClose])

  if (!story) return null

  /* The logged-in user's id — adapt to your auth store */
  const userId: number =
    (access as unknown as { id?: number })?.id ??
    Number(localStorage.getItem('user_id') ?? 0)

  return (
    <div
      className="pdm-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdm-title"
    >
      <div
        className="pdm-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════
            HEADER — owner on the left, actions on the right
            ══════════════════════════════════════════ */}
        <header className="pdm-header">
          {/* ── Owner details ───────────────────── */}
          <div className="pdm-owner">
            <div className="pdm-avatar-wrap">
              {story.author.profile_image_url ? (
                <img
                  src={story.author.profile_image_url}
                  alt={story.author.full_name}
                  className="pdm-avatar"
                  loading="lazy"
                />
              ) : (
                <div className="pdm-avatar-fallback">
                  {initials(
                    story.author.first_name,
                    story.author.last_name
                  )}
                </div>
              )}
            </div>

            <div className="pdm-owner-meta">
              <span className="pdm-author">
                {story.author.full_name || 'Someone'}
              </span>
              <span className="pdm-submeta">
                {formatDate(story.created_at)}
              </span>
            </div>
          </div>

          {/* ── Actions — Like + Share + Close ──── */}
          <div className="pdm-header-actions">
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

            <button
              type="button"
              className="pdm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════
            BODY — scrollable
            ══════════════════════════════════════════ */}
        <div className="pdm-body">
          {/* Full-width image */}
          {story.image_url && (
            <div className="pdm-media">
              <img
                src={story.image_url}
                alt={story.title}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          {/* Title + content */}
          <div className="pdm-content-wrap">
            <h1 id="pdm-title" className="pdm-title">
              {story.title}
            </h1>

            <div
              className="pdm-content"
              dangerouslySetInnerHTML={{ __html: story.content }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostDetailModal