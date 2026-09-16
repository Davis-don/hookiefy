// Premiumexpire.tsx
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import './premiumexpire.css';

/* ────────────────────────────────────────────────────────
   Response type — mirrors what the backend returns
   ──────────────────────────────────────────────────────── */
interface PremiumStatusResponse {
  is_premium: boolean;
  role: string;
  expires_at: string | null;
  is_expired: boolean;
  time_remaining: {
    total_seconds: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    human: string;
    short: string;
  } | null;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com';

/* ────────────────────────────────────────────────────────
   Fetch premium status
   ──────────────────────────────────────────────────────── */
async function fetchPremiumStatus(
  access: string
): Promise<PremiumStatusResponse> {
  const response = await fetch(`${API_URL}/account/premium-status/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.message || data.detail)) ||
      `Failed to load premium status (${response.status})`;
    throw new Error(message);
  }

  return data as PremiumStatusResponse;
}

/* ────────────────────────────────────────────────────────
   Format seconds as "Xd Xh Xm Xs"
   ──────────────────────────────────────────────────────── */
function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/* ────────────────────────────────────────────────────────
   Refetch cadence
   ────────────────────────────────────────────────────────
   - The ticker runs every 1s locally (no network).
   - The server is re-queried at a cadence that scales with
     how much time is left:
        > 1 day    → every 30 min
        > 1 hour   → every 15 min
        > 10 min   → every 5 min
        > 1 min    → every 60 s
        otherwise  → every 30 s
   This keeps the countdown accurate near expiry without
   hammering the server for users who have days left.
   ──────────────────────────────────────────────────────── */
function refetchIntervalFor(totalSeconds: number): number {
  if (totalSeconds > 86400) return 30 * 60_000; // 30 min
  if (totalSeconds > 3600) return 15 * 60_000;  // 15 min
  if (totalSeconds > 600) return 5 * 60_000;    // 5 min
  if (totalSeconds > 60) return 60_000;         // 1 min
  return 30_000;                                // 30 s
}

const Premiumexpire = () => {
  const { access } = useAuthStore();
  const queryClient = useQueryClient();

  /* ── Local countdown state ─────────────────────────── */
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  /* ── Query that fetches premium status ─────────────── */
  const { data, isLoading, isError, error } = useQuery<
    PremiumStatusResponse,
    Error
  >({
    queryKey: ['premium-expire', access],
    queryFn: () => {
      if (!access) throw new Error('You are not signed in.');
      return fetchPremiumStatus(access);
    },
    enabled: !!access,

    // Keep cached data alive across navigation.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,

    // No automatic refetch on focus / mount / reconnect —
    // the smart interval below controls cadence instead.
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,

    // Adaptive refetch: how often depends on time left.
    refetchInterval: (query) => {
      const total = query.state.data?.time_remaining?.total_seconds;
      if (
        !query.state.data?.is_premium ||
        total == null ||
        total <= 0
      ) {
        return false; // stop polling when not premium / expired
      }
      return refetchIntervalFor(total);
    },

    // Pause polling when the tab is hidden — saves battery
    // and prevents needless requests in background tabs.
    refetchIntervalInBackground: false,

    retry: 1,
    retryDelay: 2000,
  });

  /* ── Surface errors as inline state (no toast spam) ── */
  // Only log once; UI renders a soft fallback message.

  /* ── Seed / re-seed the countdown when fresh data arrives ── */
  useEffect(() => {
    const total = data?.time_remaining?.total_seconds;

    if (data?.is_premium && total != null) {
      // Only reset the local ticker if the server value
      // differs by more than 2 seconds — prevents visible
      // jumps every time a background refetch lands.
      setRemaining((prev) => {
        if (prev === null) return total;
        if (Math.abs(prev - total) > 2) return total;
        return prev;
      });
    } else {
      setRemaining(null);
    }
  }, [data?.is_premium, data?.time_remaining?.total_seconds]);

  /* ── Local ticker: decrement every second ──────────── */
  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (remaining === null) return;

    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          // Reached zero — stop ticking and force a fresh
          // query so the backend decides the real state.
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          queryClient.invalidateQueries({
            queryKey: ['premium-expire', access],
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [remaining === null, access, queryClient]);

  /* ── Silent refetch when the tab regains focus ─────── */
  // Throttled to at most once every 60 seconds.
  const lastFocusRef = useRef<number>(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 60_000) return;
      lastFocusRef.current = now;

      if (access) {
        queryClient.invalidateQueries({
          queryKey: ['premium-expire', access],
          refetchType: 'active',
        });
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [access, queryClient]);

  /* ── Render: nothing until we know status ──────────── */
  if (isLoading && !data) return null;

  /* ── Error state — soft message, no toast spam ─────── */
  if (isError && !data) {
    return (
      <div className="premium-expire-alert premium-expire-alert-error">
        <span className="premium-expire-alert-icon" aria-hidden="true">
          !
        </span>
        <span className="premium-expire-alert-text">
          {error?.message || 'Could not load premium status.'}
        </span>
      </div>
    );
  }

  /* ── Not premium → render nothing ──────────────────── */
  if (!data?.is_premium || remaining === null) return null;

  /* ── Premium → show the info alert with live countdown */
  return (
    <div
      className="premium-expire-alert premium-expire-alert-info"
      role="status"
      aria-live="polite"
    >
      <span className="premium-expire-alert-icon" aria-hidden="true">
        i
      </span>

      <span className="premium-expire-alert-text">
        <strong>Premium active</strong>
        <span className="premium-expire-sep">·</span>
        expires in{' '}
        <span className="premium-expire-countdown">
          {formatCountdown(remaining)}
        </span>
      </span>
    </div>
  );
};

export default Premiumexpire;