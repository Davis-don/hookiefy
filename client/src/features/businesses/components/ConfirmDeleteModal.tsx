import { useEffect } from 'react';
import { Spinner } from '../../../components/spinner/Spinner';
import './confirmdeletemodal.css';

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDeleteModal({
  open,
  title = 'Delete this business?',
  message = 'This action cannot be undone. All data for this business will be permanently removed.',
  confirmLabel = 'Yes, delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="cdm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cdm-title"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div className="cdm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cdm-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="17" r="0.6" fill="currentColor" />
          </svg>
        </div>

        <h3 id="cdm-title" className="cdm-title">{title}</h3>
        <p className="cdm-message">{message}</p>

        <div className="cdm-actions">
          <button
            type="button"
            className="cdm-btn cdm-btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="cdm-btn cdm-btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner size={16} label="Deleting…" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;