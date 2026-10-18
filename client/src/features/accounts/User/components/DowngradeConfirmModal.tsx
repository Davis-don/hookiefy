// src/pages/accounts/User/components/DowngradeConfirmModal.tsx

import { useState } from 'react';
import type { DowngradePreCheckResponse } from '../api/billingApi';
import './downgradeconfirmmodal.css';

type Props = {
  audit: DowngradePreCheckResponse;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

function DowngradeConfirmModal({ audit, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const { overflow, target_plan_name } = audit;

  const items: Array<{ label: string; count: number }> = [
    { label: 'businesses', count: overflow.businesses },
    { label: 'posts', count: overflow.posts },
    { label: 'products', count: overflow.products },
    { label: 'product images', count: overflow.images },
  ].filter((x) => x.count > 0);

  return (
    <div
      className="dcm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="dcm-panel">
        <div className="dcm-icon" aria-hidden="true">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>

        <h2 id="dcm-title" className="dcm-title">
          Downgrade to {target_plan_name}
        </h2>

        <p className="dcm-lead">
          Your current content exceeds the limits of{' '}
          <strong>{target_plan_name}</strong>. To complete the
          downgrade, the following items will be{' '}
          <strong>permanently deleted</strong>:
        </p>

        <ul className="dcm-list">
          {items.map((item) => (
            <li key={item.label} className="dcm-list-item">
              <span className="dcm-count">{item.count}</span>
              <span className="dcm-label">{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="dcm-warning">
          This cannot be undone. Any images attached to those
          items will also be removed from our storage.
        </div>

        <div className="dcm-actions">
          <button
            type="button"
            className="dcm-btn dcm-btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dcm-btn dcm-btn-danger"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DowngradeConfirmModal;