// StoryInfo.tsx — public standalone viewer for a single story
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiTag,
  FiCalendar,
  FiUser,
} from 'react-icons/fi'
import DOMPurify from 'dompurify'
import Spinner from '../components/Publicspinner/Spinner'

// ⚠️ VERIFY THESE PATHS
import Like from '../Accounts/service_provider/components/stories/Like'
import Share from '../Accounts/service_provider/components/stories/Share'

import './storyinfo.css'

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
  image_url: string
  created_at: string
  updated_at: string
  author: StoryAuthor | null
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
}

const CATEGORY_LABEL: Record<StoryCategory, string> = {
  ideas: 'Ideas',
  success: 'Success',
  fun: 'Fun',
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function getAuthorName(author: StoryAuthor | null | undefined): string {
  if (!author) return 'Youpata user'
  return (
    author.full_name ||
    `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() ||
    `User #${author.id}`
  )
}

function getAuthorInitial(author: StoryAuthor | null | undefined): string {
  const name = getAuthorName(author)
  return name.charAt(0).toUpperCase() || 'Y'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return formatDate(iso)
}

/* ────────────────────────────────────────────────────────
   Fetch
   ──────────────────────────────────────────────────────── */

const API = import.meta.env.VITE_API_URL

async function fetchPublicStory(id: string): Promise<Story> {
  const res = await fetch(`${API}/stories/${id}/`, {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Story not found')
  }
  return data.story as Story
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function StoryInfo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: story,
    isLoading,
    isError,
    error,
  } = useQuery<Story, Error>({
    queryKey: ['public-story', id],
    queryFn: () => fetchPublicStory(id as string),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  })

  useEffect(() => {
    if (story) document.title = `${story.title} · Youpata`
    else document.title = 'Youpata · Story'
    return () => {
      document.title = 'Youpata'
    }
  }, [story])

  if (isLoading) {
    return (
      <div className="stv-screen">
        <StoryHeader onBack={() => navigate(-1)} />
        <div className="stv-loader">
          <Spinner
            message="Loading story"
            slowMessage="Just a moment…"
            slowAfter={4000}
          />
        </div>
      </div>
    )
  }

  if (isError || !story) {
    return (
      <div className="stv-screen">
        <StoryHeader onBack={() => navigate(-1)} />
        <div className="stv-error">
          <div className="stv-error-icon">🔍</div>
          <h1 className="stv-error-title">Story not found</h1>
          <p className="stv-error-text">
            {error?.message || 'This story may have been removed.'}
          </p>
          <button
            type="button"
            className="stv-error-btn"
            onClick={() => navigate('/')}
          >
            <FiArrowLeft /> Go to Youpata
          </button>
        </div>
      </div>
    )
  }

  const safeHtml = DOMPurify.sanitize(story.content || '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'a',
      'h1', 'h2', 'h3', 'h4',
      'code', 'pre', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

  /* ── CTA → login with redirect back here ──────────── */
  const goToLogin = () => {
    const here = window.location.pathname + window.location.search
    navigate(`/login?redirect=${encodeURIComponent(here)}`)
  }

  return (
    <div className="stv-screen">
      <StoryHeader onBack={() => navigate(-1)} />

      <article className="stv-root">
        {/* ── Hero image ─────────────────────────── */}
        {story.image_url && (
          <div className="stv-hero">
            <img src={story.image_url} alt="" draggable={false} />
          </div>
        )}

        {/* ── Content ────────────────────────────── */}
        <div className="stv-content">
          {/* Author row */}
          <div className="stv-author-row">
            <div className="stv-avatar">
              {story.author?.profile_image_url ? (
                <img src={story.author.profile_image_url} alt="" />
              ) : (
                <span>{getAuthorInitial(story.author)}</span>
              )}
            </div>
            <div className="stv-author-meta">
              <span className="stv-author-name">
                {getAuthorName(story.author)}
              </span>
              <span className="stv-author-time">
                {timeAgo(story.created_at)}
              </span>
            </div>
          </div>

          {/* Pills + title */}
          <header className="stv-header-block">
            <div className="stv-pill-row">
              <span className="stv-pill stv-pill-cat">
                <FiTag /> {CATEGORY_LABEL[story.category] || 'Story'}
              </span>
            </div>

            <h1 className="stv-title">
              {story.title || 'Untitled story'}
            </h1>
          </header>

          {/* ── Action bar — Like + Share ────────── */}
          <div className="stv-actions">
            <Like
              postId={story.id}
              userId={story.author?.id}
              contentType="story"
              size="md"
              showCount
            />

            <Share
              postId={story.id}
              userId={story.author?.id}
              postTitle={story.title}
              contentType="story"
              size="md"
            />
          </div>

          {/* ── Story body ───────────────────────── */}
          <section className="stv-section">
            <div
              className="stv-richtext"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </section>

          {/* ── Details ──────────────────────────── */}
          <section className="stv-section">
            <h2 className="stv-section-title">Details</h2>
            <div className="stv-details">
              <div className="stv-detail-row">
                <span className="stv-detail-label">
                  <FiTag className="stv-detail-icon" /> Category
                </span>
                <span className="stv-detail-value">
                  {CATEGORY_LABEL[story.category] || '—'}
                </span>
              </div>

              <div className="stv-detail-row">
                <span className="stv-detail-label">
                  <FiUser className="stv-detail-icon" /> Author
                </span>
                <span className="stv-detail-value">
                  {getAuthorName(story.author)}
                </span>
              </div>

              <div className="stv-detail-row">
                <span className="stv-detail-label">
                  <FiCalendar className="stv-detail-icon" /> Published
                </span>
                <span className="stv-detail-value">
                  {formatDate(story.created_at)}
                </span>
              </div>
            </div>
          </section>

          {/* ── Simple join CTA ──────────────────── */}
          <section className="stv-cta">
            <p className="stv-cta-text">
              Have a story like this? Join Youpata to publish{' '}
              your own and get seen by thousands of readers.
            </p>

            <button
              type="button"
              className="stv-cta-btn"
              onClick={goToLogin}
            >
              Start your own story
            </button>
          </section>
        </div>
      </article>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Header
   ──────────────────────────────────────────────────────── */

function StoryHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="stv-topbar">
      <button
        type="button"
        className="stv-topbar-btn"
        onClick={onBack}
        aria-label="Back"
      >
        <FiArrowLeft />
      </button>

      <a href="/" className="stv-brand">
        <span className="yp-logo-you">You</span>
        <span className="yp-logo-p">p</span>
        <span className="yp-logo-ata">ata</span>
      </a>

      <div className="stv-topbar-spacer" />
    </header>
  )
}

export default StoryInfo