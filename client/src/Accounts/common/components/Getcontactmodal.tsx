// Getcontactmodal.tsx
import { useEffect } from 'react'
import { FiX, FiLock, FiInfo } from 'react-icons/fi'
import './getcontactmodal.css'
import { usePostActionStore } from '../store/usepaymentstore'

interface GetcontactmodalProps {
  /** Optional callback triggered by clicking the X, the
   *  overlay, or pressing Escape. Falls back to the
   *  store's own `clear()` if not provided. */
  onClose?: () => void
}

function Getcontactmodal({ onClose }: GetcontactmodalProps) {
  const postId = usePostActionStore((s) => s.postId)
  const clear = usePostActionStore((s) => s.clear)

  /* Close handler — prefers the prop, then falls back to store */
  const handleClose = () => {
    if (onClose) onClose()
    else clear()
  }

  /* Escape closes; also lock body scroll while open */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Guard — nothing to show without a post id */
  if (postId === null) return null

  return (
    <div
      className="gcm-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcm-title"
    >
      <div
        className="gcm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="gcm-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <FiX />
        </button>

        {/* Icon */}
        <div className="gcm-icon-wrap">
          <FiLock className="gcm-icon" />
        </div>

        {/* Title + subtitle */}
        <h2 id="gcm-title" className="gcm-title">
          Unlock contact
        </h2>

        <p className="gcm-subtitle">
          Pay a small fee to reveal the provider's phone
          number and start a conversation.
        </p>

        {/* Debug info — replace with the real payment UI later */}
        <div className="gcm-info">
          <FiInfo className="gcm-info-icon" />
          <span>
            Post ID:{' '}
            <strong className="gcm-info-value">
              {postId}
            </strong>
          </span>
        </div>

        {/* Actions */}
        <div className="gcm-actions">
          <button
            type="button"
            className="gcm-btn gcm-btn-secondary"
            onClick={handleClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="gcm-btn gcm-btn-primary"
            onClick={() => {
              // TODO: kick off the payment / unlock flow
              console.log('Unlock contact for post', postId)
            }}
          >
            Pay & unlock
          </button>
        </div>
      </div>
    </div>
  )
}

export default Getcontactmodal