// src/components/engagement/LikeButton.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import './likebutton.css';

import {
  useEngagementStatus,
  useToggleLike,
} from '../hooks/useEngagement';
import type { TargetKind } from '../apis/engagementApi';

type LikeButtonProps = {
  targetKind: TargetKind;
  targetId: number;
  /** Override initial server state (e.g. when the parent already fetched it) */
  initialLiked?: boolean;
  initialCount?: number;
  onToggle?: (liked: boolean, count: number) => void;
};

/* ── Palette for the pop-up hearts ───────────────────── */
const COLOURS = [
  '#E11D48', // rose
  '#F472B6', // pink
  '#60A5FA', // sky blue
  '#34D399', // mint green
  '#FBBF24', // amber
  '#A78BFA', // lavender
  '#FB7185', // coral
  '#22D3EE', // cyan
];

const HEART_PATH =
  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';

type Particle = {
  id: number;
  colour: string;
  delay: number;
  scale: number;
  rotate: number;
};

function LikeButton({
  targetKind,
  targetId,
  initialLiked,
  initialCount,
  onToggle,
}: LikeButtonProps) {
  /* ── Server state ───────────────────────────────────── */
  const { data, isPending } = useEngagementStatus(targetKind, targetId);

  /* ── Local state ────────────────────────────────────── */
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount ?? 0);

  const [bursting, setBursting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const burstTimeout = useRef<number | null>(null);

  /* ── Sync from server when query resolves ───────────── */
  useEffect(() => {
    if (!data) return;
    setLiked(data.liked);
    setCount(data.likes_count);
  }, [data]);

  /* ── Fire the burst — supports two calls in a row ───── */
  const fireBurst = useCallback((strong = false) => {
    const now = Date.now();

    // Strong burst = more hearts, wider spread, longer life
    const howMany = strong ? 18 : 14;

    const next: Particle[] = Array.from({ length: howMany }, (_, i) => ({
      id: now + i,
      colour: COLOURS[i % COLOURS.length],
      delay: Math.random() * (strong ? 180 : 120),
      scale: (strong ? 0.85 : 0.7) + Math.random() * 0.45,
      rotate: -35 + Math.random() * 70,
    }));

    setParticles((prev) => [...prev, ...next]);
    setBursting(true);

    if (burstTimeout.current) window.clearTimeout(burstTimeout.current);
    burstTimeout.current = window.setTimeout(() => {
      setBursting(false);
      setParticles([]);
    }, strong ? 1400 : 1100);
  }, []);

  /* ── Toggle mutation ────────────────────────────────── */
  const mutation = useToggleLike(targetKind, targetId, {
    onOptimistic: () => {
      // Snappy first animation — before the network even answers
      fireBurst(false);
    },
    onConfirmed: (data) => {
      // Second, bigger burst once the server says yes
      fireBurst(true);

      // Then re-sync the exact server values
      if (typeof data.liked === 'boolean') setLiked(data.liked);
      if (typeof data.likes_count === 'number') setCount(data.likes_count);

      onToggle?.(data.liked ?? liked, data.likes_count);
    },
    onRollback: () => {
      // Silent rollback — parent will re-render with server truth
    },
  });

  const handleClick = () => {
    // Flip locally right away so the UI feels instant
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(nextLiked);
    setCount(nextCount);

    mutation.mutate();
  };

  const disabled = isPending || mutation.isPending;

  return (
    <button
      type="button"
      className={`like-button ${liked ? 'is-liked' : ''} ${
        bursting ? 'is-bursting' : ''
      }`}
      aria-label={liked ? 'Unlike' : 'Like'}
      aria-pressed={liked}
      title={liked ? 'Unlike' : 'Like'}
      onClick={handleClick}
      disabled={disabled && !bursting}
    >
      {/* ── Floating heart cloud ─────────────────────────── */}
      <span className="like-button__burst" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={p.id}
            className={`like-button__particle like-button__particle--${
              i % 14
            }`}
            style={{
              ['--colour' as string]: p.colour,
              ['--delay' as string]: `${p.delay}ms`,
              ['--scale' as string]: p.scale,
              ['--rotate' as string]: `${p.rotate}deg`,
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path d={HEART_PATH} fill="currentColor" />
            </svg>
          </span>
        ))}
      </span>

      {/* ── Main heart ───────────────────────────────────── */}
      <svg
        className="like-button__heart"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={HEART_PATH} />
      </svg>

      {/* ── Count ────────────────────────────────────────── */}
      <span className="like-button__count" aria-hidden="true">
        {count}
      </span>
    </button>
  );
}

export default LikeButton;