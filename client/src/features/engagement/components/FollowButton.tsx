// src/components/engagement/FollowButton.tsx

import { useEffect, useRef, useState } from 'react';
import './followbutton.css';

import {
  useBusinessFollowStatus,
  useToggleFollowBusiness,
} from '../hooks/useEngagement';

type FollowButtonProps = {
  /** The business being followed. NOT the post/product/story. */
  businessId: number;

  /** Optional label shown above the menu items. */
  businessName?: string;

  /** Optional handler for "View business" in the menu. */
  onOpenBusiness?: () => void;

  /** Optional override when the parent already has the state. */
  initialFollowed?: boolean;

  onToggle?: (followed: boolean) => void;
};

function FollowButton({
  businessId,
  businessName,
  onOpenBusiness,
  initialFollowed,
  onToggle,
}: FollowButtonProps) {
  /* ── Server state ─────────────────────────────────────── */
  const { data, isPending } = useBusinessFollowStatus(businessId);

  /* ── Local mirror for instant feedback ───────────────── */
  const [followed, setFollowed] = useState(initialFollowed ?? false);

  /* ── Menu open/close ─────────────────────────────────── */
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  /* ── Sync from server when the query resolves ────────── */
  useEffect(() => {
    if (!data) return;
    setFollowed(data.followed);
  }, [data]);

  /* ── Close on outside click / Escape ─────────────────── */
  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* ── Follow toggle mutation — targets BUSINESS ──────── */
  const mutation = useToggleFollowBusiness(businessId);

  const handleFollowToggle = () => {
    const next = !followed;

    // Optimistic local flip
    setFollowed(next);

    mutation.mutate(undefined, {
      onSuccess: (resp) => {
        if (typeof resp.followed === 'boolean') setFollowed(resp.followed);
        onToggle?.(resp.followed ?? next);
      },
      onError: () => {
        // Roll back on failure
        setFollowed(!next);
      },
      onSettled: () => {
        setOpen(false);
      },
    });
  };

  const handleOpenBusiness = () => {
    setOpen(false);
    onOpenBusiness?.();
  };

  const busy = mutation.isPending;

  /* ── Label for screen readers ────────────────────────── */
  const triggerLabel = isPending
    ? 'Loading follow status'
    : followed
      ? `Following ${businessName || 'business'}. Open menu`
      : `Follow ${businessName || 'business'}. Open menu`;

  return (
    <div className="follow-button" ref={wrapperRef}>
      {/* ── 3-dot trigger ──────────────────────────────── */}
      <button
        type="button"
        className="follow-button__trigger"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* ── Dropdown panel ─────────────────────────────── */}
      {open && (
        <div
          className="follow-button__panel"
          role="menu"
          aria-label="Follow menu"
        >
          {businessName && (
            <div className="follow-button__panel-header" aria-hidden="true">
              {businessName}
            </div>
          )}

          <button
            type="button"
            className="follow-button__item"
            role="menuitem"
            onClick={handleFollowToggle}
            disabled={busy}
          >
            <span
              className={`follow-button__dot ${
                followed ? 'is-following' : ''
              }`}
              aria-hidden="true"
            />
            <span className="follow-button__label">
              {busy
                ? followed
                  ? 'Unfollowing…'
                  : 'Following…'
                : followed
                  ? 'Unfollow'
                  : 'Follow'}
            </span>
          </button>

          {onOpenBusiness && (
            <button
              type="button"
              className="follow-button__item"
              role="menuitem"
              onClick={handleOpenBusiness}
            >
              <span className="follow-button__icon-slot" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3a14 14 0 0 1 0 18" />
                  <path d="M12 3a14 14 0 0 0 0 18" />
                </svg>
              </span>
              <span className="follow-button__label">View business</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FollowButton;