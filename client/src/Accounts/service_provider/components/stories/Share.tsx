// Share.tsx — self-contained share button with its own sheet
import { useEffect, useState } from 'react'
import {
  FiShare2,
  FiLink,
  FiMessageSquare,
  FiTwitter,
  FiFacebook,
  FiMail,
  FiX,
  FiCheck,
} from 'react-icons/fi'
import { toast } from 'sonner'
import './share.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface ShareProps {
  postId: number
  /** Optional — passed through to analytics / logging */
  userId?: number
  /** Optional title for the share text */
  postTitle?: string
  /** Optional — render variant */
  size?: 'sm' | 'md'
  /**
   * Which kind of content is being shared.
   *   'story'         → shares via /s/<id>
   *   'clientservice' → shares via /p/<id>
   * Defaults to 'story'.
   */
  contentType?: 'story' | 'clientservice'
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function Share({
  postId,
  userId,
  postTitle = '',
  size = 'md',
  contentType = 'story',
}: ShareProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  /* Escape closes */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* Lock scroll while open */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  /* ── Build the public share URL ───────────────────
     Stories  →  /s/<id>
     Services →  /p/<id>                              */
  const publicPath =
    contentType === 'clientservice'
      ? `/p/${postId}`
      : `/s/${postId}`

  const shareUrl = `${window.location.origin}${publicPath}`

  const shareText = postTitle
    ? `${postTitle} — check this out on Youpata`
    : 'Check this out on Youpata'

  /* Copy link */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied', {
        duration: 2000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link', { duration: 3000 })
    }
  }

  /* Native share */
  const handleNative = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: postTitle || 'Youpata story',
          text: shareText,
          url: shareUrl,
        })
        setOpen(false)
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy()
    }
  }

  /* External shortcuts */
  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const onTwitter = () =>
    openUrl(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(shareUrl)}`
    )

  const onFacebook = () =>
    openUrl(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}`
    )

  const onWhatsApp = () =>
    openUrl(
      `https://wa.me/?text=${encodeURIComponent(
        `${shareText} ${shareUrl}`
      )}`
    )

  const onEmail = () =>
    openUrl(
      `mailto:?subject=${encodeURIComponent(
        postTitle || 'Check this out on Youpata'
      )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
    )

  return (
    <>
      {/* ── Trigger button (icon-only) ───────────── */}
      <button
        type="button"
        className={`sh-btn-root sh-btn-root-${size}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Share this post"
        data-post-id={postId}
        data-user-id={userId ?? ''}
        data-content-type={contentType}
      >
        <FiShare2 className="sh-btn-icon" />
      </button>

      {/* ── Share sheet ──────────────────────────── */}
      {open && (
        <div
          className="sh-overlay"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sh-title"
        >
          <div
            className="sh-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="sh-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <FiX />
            </button>

            <h2 id="sh-title" className="sh-title">
              {contentType === 'clientservice'
                ? 'Share this listing'
                : 'Share this story'}
            </h2>

            <p className="sh-subtitle">
              {postTitle
                ? postTitle.length > 60
                  ? `${postTitle.slice(0, 60)}…`
                  : postTitle
                : 'Send this post to a friend'}
            </p>

            {/* Share tiles */}
            <div className="sh-grid">
              <button
                type="button"
                className="sh-tile"
                onClick={handleCopy}
              >
                <span className="sh-tile-icon sh-tile-icon-copy">
                  {copied ? <FiCheck /> : <FiLink />}
                </span>
                <span className="sh-tile-label">
                  {copied ? 'Copied' : 'Copy'}
                </span>
              </button>

              <button
                type="button"
                className="sh-tile"
                onClick={onWhatsApp}
              >
                <span className="sh-tile-icon sh-tile-icon-wa">
                  <FiMessageSquare />
                </span>
                <span className="sh-tile-label">WhatsApp</span>
              </button>

              <button
                type="button"
                className="sh-tile"
                onClick={onTwitter}
              >
                <span className="sh-tile-icon sh-tile-icon-tw">
                  <FiTwitter />
                </span>
                <span className="sh-tile-label">Twitter</span>
              </button>

              <button
                type="button"
                className="sh-tile"
                onClick={onFacebook}
              >
                <span className="sh-tile-icon sh-tile-icon-fb">
                  <FiFacebook />
                </span>
                <span className="sh-tile-label">Facebook</span>
              </button>

              <button
                type="button"
                className="sh-tile"
                onClick={onEmail}
              >
                <span className="sh-tile-icon sh-tile-icon-mail">
                  <FiMail />
                </span>
                <span className="sh-tile-label">Email</span>
              </button>

              <button
                type="button"
                className="sh-tile"
                onClick={handleNative}
              >
                <span className="sh-tile-icon sh-tile-icon-more">
                  <FiShare2 />
                </span>
                <span className="sh-tile-label">More</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Share