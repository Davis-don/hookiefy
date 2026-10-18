// src/components/engagement/FollowCount.tsx

import { useEffect, useState } from 'react';
import './followcount.css';

import { useBusinessFollowStatus } from '../hooks/useEngagement';

type FollowCountProps = {
  /** The business whose follower count we display. */
  businessId: number;

  /** Optional — pass the value you already have so the number
   *  doesn't flicker from 0 to the real count on mount. */
  initialCount?: number;

  /** Optional extra class(es). */
  className?: string;
};

/* Compact a number — 0, 1, 23, 999, 1.2k, 34.5k, 1.4M */
function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.floor(n));
  if (n < 1_000_000) {
    const v = n / 1000;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `${s.replace(/\.0$/, '')}k`;
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `${s.replace(/\.0$/, '')}M`;
  }
  return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
}

/* "0 followers" / "1 follower" / "23 followers" */
function labelFor(n: number): string {
  return `${formatCount(n)} ${n === 1 ? 'follower' : 'followers'}`;
}

function FollowCount({
  businessId,
  initialCount,
  className = '',
}: FollowCountProps) {
  const { data } = useBusinessFollowStatus(businessId);

  const [count, setCount] = useState(initialCount ?? 0);

  /* Sync when the server responds OR when the follow toggle
     updates the shared cache entry */
  useEffect(() => {
    if (!data) return;
    setCount(data.follows_count);
  }, [data]);

  return (
    <span
      className={`follow-count ${className}`.trim()}
      aria-live="polite"
    >
      {labelFor(count)}
    </span>
  );
}

export default FollowCount;