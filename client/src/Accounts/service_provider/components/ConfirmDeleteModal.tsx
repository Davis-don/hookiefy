// ConfirmDeleteModal.tsx
import { useEffect } from 'react'
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi'
import './confirmdeletemodal.css'

interface ConfirmDeleteModalProps {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Optional context line, e.g. the service title */
  subject?: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDeleteModal = ({
  open,
  title = 'Delete this item?',
  message = 'This action cannot be undone. All images and data associated with it will be permanently removed.',
  confirmLabel = 'Yes, delete',
  cancelLabel = 'Cancel',
  subject,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) => {
  /* Escape closes (unless mid-delete) */
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, isPending, onCancel])

  /* Lock body scroll */
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="cdm-overlay"
      onClick={() => {
        if (!isPending) onCancel()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="cdm-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cdm-close"
          onClick={onCancel}
          disabled={isPending}
          aria-label="Close"
        >
          <FiX />
        </button>

        <div className="cdm-icon-wrap">
          <FiAlertTriangle className="cdm-icon" />
        </div>

        <h2 className="cdm-title">{title}</h2>

        {subject && (
          <p className="cdm-subject" title={subject}>
            “{subject}”
          </p>
        )}

        <p className="cdm-message">{message}</p>

        <div className="cdm-actions">
          <button
            type="button"
            className="cdm-btn cdm-btn-cancel"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="cdm-btn cdm-btn-danger"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="cdm-spinner" />
                Deleting…
              </>
            ) : (
              <>
                <FiTrash2 className="cdm-btn-icon" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDeleteModal