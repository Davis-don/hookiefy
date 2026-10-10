// src/components/engagement/FollowButton.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import './followbutton.css';

import {
  useEngagementStatus,
  useToggleFollow,
} from '../hooks/useEngagement';
import type { TargetKind } from '../apis/engagementApi';

type FollowButtonProps = {
  /** What is being followed: a product, post, or story. */
  targetKind: TargetKind;
  targetId: number;

  /** Optional overrides when the parent already has the state. */
  initialFollowed?: boolean;
  initialCount?: number;

  onToggle?: (followed: boolean, count: number) => void;
};

/* ── Sparkle palette — cool tones to contrast the LikeButton's warm hearts ── */
const SPARKLE_COLOURS = [
  '#2563EB', // royal blue
  '#60A5FA', // sky blue
  '#22D3EE', // cyan
  '#34D399', // mint
  '#10B981', // emerald
  '#A78BFA', // violet
  '#818CF8', // indigo
  '#38BDF8', // light blue
];

/* Four-point star used for each sparkle */
const STAR_PATH =
  'M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z';

type Sparkle = {
  id: number;
  colour: string;
  delay: number;
  scale: number;
  rotate: number;
  strong: boolean;
};

function FollowButton({
  targetKind,
  targetId,
  initialFollowed,
  initialCount,
  onToggle,
}: FollowButtonProps) {
  /* ── Server state ─────────────────────────────────────── */
  const { data, isPending } = useEngagementStatus(targetKind, targetId);

  /* ── Local mirror for instant feedback ───────────────── */
  const [followed, setFollowed] = useState(initialFollowed ?? false);
  const [count, setCount] = useState(initialCount ?? 0);

  /* ── Burst state ─────────────────────────────────────── */
  const [bursting, setBursting] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const burstTimeout = useRef<number | null>(null);

  /* ── Sync from server when the query resolves ────────── */
  useEffect(() => {
    if (!data) return;
    setFollowed(data.followed);
    setCount(data.follows_count);
  }, [data]);

  /* ── Sparkle emitter — called twice per follow ──────── */
  const fireSparkles = useCallback((strong = false) => {
    const now = Date.now();
    const howMany = strong ? 18 : 14;

    const next: Sparkle[] = Array.from({ length: howMany }, (_, i) => ({
      id: now + i,
      colour: SPARKLE_COLOURS[i % SPARKLE_COLOURS.length],
      delay: Math.random() * (strong ? 200 : 130),
      scale: (strong ? 0.85 : 0.7) + Math.random() * 0.5,
      rotate: -40 + Math.random() * 80,
      strong,
    }));

    setSparkles((prev) => [...prev, ...next]);
    setBursting(true);

    if (burstTimeout.current) window.clearTimeout(burstTimeout.current);
    burstTimeout.current = window.setTimeout(() => {
      setBursting(false);
      setSparkles([]);
    }, strong ? 1500 : 1150);
  }, []);

  /* ── Follow toggle mutation ─────────────────────────── */
  const mutation = useToggleFollow(targetKind, targetId);

  const handleClick = () => {
    // Optimistic local flip
    const next = !followed;
    const nextCount = next ? count + 1 : Math.max(0, count - 1);
    setFollowed(next);
    setCount(nextCount);

    // First burst fires instantly — only when following
    if (next) fireSparkles(false);

    mutation.mutate(undefined, {
      onSuccess: (resp) => {
        // Celebration burst once the server confirms
        if (next) fireSparkles(true);

        if (typeof resp.followed === 'boolean') setFollowed(resp.followed);
        if (typeof resp.follows_count === 'number') {
          setCount(resp.follows_count);
        }

        onToggle?.(resp.followed ?? next, resp.follows_count);
      },
      onError: () => {
        // Roll back on failure
        setFollowed(!next);
        setCount(count);
      },
    });
  };

  /* ── Disable ONLY while a request is in flight ───────── */
  /*   (initial status fetch must not disable the button,
       or the pointer cursor disappears during page load).  */
  const disabled = mutation.isPending;

  /* ── Label content for screen readers ────────────────── */
  const ariaLabel = isPending
    ? 'Loading follow status'
    : followed
      ? 'Unfollow'
      : 'Follow';

  return (
    <button
      type="button"
      className={`follow-button ${followed ? 'is-following' : ''} ${
        bursting ? 'is-bursting' : ''
      }`}
      aria-label={ariaLabel}
      aria-pressed={followed}
      title={followed ? 'Unfollow' : 'Follow'}
      onClick={handleClick}
      disabled={disabled && !bursting}
    >
      {/* ── Sparkle cloud ────────────────────────────────── */}
      <span className="follow-button__burst" aria-hidden="true">
        {sparkles.map((s, i) => (
          <span
            key={s.id}
            className={`follow-button__sparkle follow-button__sparkle--${
              s.strong ? 14 + (i % 18) : i % 14
            }`}
            style={{
              ['--colour' as string]: s.colour,
              ['--delay' as string]: `${s.delay}ms`,
              ['--scale' as string]: s.scale,
              ['--rotate' as string]: `${s.rotate}deg`,
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path d={STAR_PATH} fill="currentColor" />
            </svg>
          </span>
        ))}
      </span>

      {/* ── Two-state icon (cross-faded) ─────────────────── */}
      <span className="follow-button__icons" aria-hidden="true">
        {/* Person + plus — shown when NOT following */}
        <svg
          className="follow-button__icon follow-button__icon--follow"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="16" y1="11" x2="22" y2="11" />
        </svg>

        {/* Person + check — shown when following */}
        <svg
          className="follow-button__icon follow-button__icon--following"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      </span>

      {/* ── Count ────────────────────────────────────────── */}
      <span className="follow-button__count" aria-hidden="true">
        {count}
      </span>
    </button>
  );
}

export default FollowButton;