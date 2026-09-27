// Premiumexpire.tsx
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import './premiumexpire.css';

/* ────────────────────────────────────────────────────────
   Response type — mirrors /subscription/status/
   ──────────────────────────────────────────────────────── */
interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: string;
}

interface TimeRemaining {
  total_seconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  human: string;
  short: string;
}

interface ElapsedSince {
  total_seconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  human: string;
}

interface SubscriptionStatusResponse {
  has_subscription: boolean;
  is_free: boolean;
  is_premium: boolean;
  is_active: boolean;
  is_expired: boolean;
  status: 'active' | 'expired' | 'free' | 'no_subscription';
  plan: SubscriptionPlan | null;
  start_date: string | null;
  end_date: string | null;
  time_remaining: TimeRemaining | null;
  elapsed_since_expiry: ElapsedSince | null;
  role: string;
  message?: string;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com';

/* ────────────────────────────────────────────────────────
   Fetch subscription status
   ──────────────────────────────────────────────────────── */
async function fetchSubscriptionStatus(
  access: string
): Promise<SubscriptionStatusResponse> {
  const response = await fetch(`${API_URL}/subscription/status/`, {
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
      `Failed to load subscription status (${response.status})`;
    throw new Error(message);
  }

  return data as SubscriptionStatusResponse;
}

/* ────────────────────────────────────────────────────────
   Format a POSITIVE remaining time as "Xd Xh Xm Xs"
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
   Format an ELAPSED time as "X days, Y hours ago"
   ──────────────────────────────────────────────────────── */
function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Math.abs(totalSeconds)));

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (days > 0) {
    if (hours > 0) {
      return `${days} day${days === 1 ? '' : 's'}, ${hours} hour${
        hours === 1 ? '' : 's'
      } ago`;
    }
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}, ${minutes} minute${
        minutes === 1 ? '' : 's'
      } ago`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (seconds > 0) {
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }

  return 'just now';
}

/* ────────────────────────────────────────────────────────
   Seconds since an ISO date — null if invalid
   ──────────────────────────────────────────────────────── */
function secondsSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 1000);
}

/* ────────────────────────────────────────────────────────
   Refetch cadence
   ──────────────────────────────────────────────────────── */
function refetchIntervalFor(totalSeconds: number): number {
  if (totalSeconds > 86400) return 30 * 60_000;
  if (totalSeconds > 3600) return 15 * 60_000;
  if (totalSeconds > 600) return 5 * 60_000;
  if (totalSeconds > 60) return 60_000;
  return 30_000;
}

const EXPIRED_REFETCH_INTERVAL = 5 * 60_000;
const FREE_REFETCH_INTERVAL = 5 * 60_000;

const Premiumexpire = () => {
  const { access } = useAuthStore();
  const queryClient = useQueryClient();

  /* Local countdown state:
     positive → seconds remaining
     zero / negative → seconds since expiry
     null → nothing to show (free or no subscription) */
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const { data, isLoading, isError, error } = useQuery<
    SubscriptionStatusResponse,
    Error
  >({
    queryKey: ['subscription-status', access],
    queryFn: () => {
      if (!access) throw new Error('You are not signed in.');
      return fetchSubscriptionStatus(access);
    },
    enabled: !!access,

    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,

    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,

    refetchInterval: (query) => {
      const d = query.state.data;

      if (!d) return false;

      // Free plan → slow poll (in case they upgrade)
      if (d.status === 'free') return FREE_REFETCH_INTERVAL;

      // No subscription → don't poll
      if (!d.has_subscription) return false;

      // Expired → slow poll (in case they renew)
      if (d.is_expired) return EXPIRED_REFETCH_INTERVAL;

      // Active → scale with time left
      const total = d.time_remaining?.total_seconds;
      if (total == null || total <= 0) return false;

      return refetchIntervalFor(total);
    },

    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 2000,
  });

  /* ── Seed / re-seed countdown when fresh data arrives ── */
  useEffect(() => {
    if (!data) {
      setRemaining(null);
      return;
    }

    // Free plan or no subscription → no countdown
    if (data.is_free || !data.has_subscription) {
      setRemaining(null);
      return;
    }

    // Expired → store NEGATIVE seconds since expiry
    if (data.is_expired) {
      const since = secondsSince(data.end_date);
      setRemaining(since != null ? -Math.max(0, since) : 0);
      return;
    }

    // Active → store positive seconds remaining
    const total = data.time_remaining?.total_seconds;
    if (data.is_active && total != null) {
      setRemaining((prev) => {
        if (prev === null) return total;
        if (prev <= 0) return total; // was expired, now renewed
        if (Math.abs(prev - total) > 2) return total;
        return prev;
      });
      return;
    }

    setRemaining(null);
  }, [
    data,
    data?.is_free,
    data?.is_active,
    data?.is_expired,
    data?.has_subscription,
    data?.end_date,
    data?.time_remaining?.total_seconds,
  ]);

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

        // Reached zero → flip to "expired just now", refetch
        if (prev === 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          queryClient.invalidateQueries({
            queryKey: ['subscription-status', access],
          });
          return 0;
        }

        // Already expired → keep counting up (more negative)
        if (prev <= 0) return prev - 1;

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

  /* ── Silent refetch on focus, throttled ───────────── */
  const lastFocusRef = useRef<number>(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 60_000) return;
      lastFocusRef.current = now;

      if (access) {
        queryClient.invalidateQueries({
          queryKey: ['subscription-status', access],
          refetchType: 'active',
        });
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [access, queryClient]);

  /* ── Render: nothing until we know status ──────────── */
  if (isLoading && !data) return null;

  /* ── Error state ───────────────────────────────────── */
  if (isError && !data) {
    return (
      <div className="premium-expire-alert premium-expire-alert-error">
        <span className="premium-expire-alert-icon" aria-hidden="true">
          !
        </span>
        <span className="premium-expire-alert-text">
          {error?.message || 'Could not load subscription status.'}
        </span>
      </div>
    );
  }

  if (!data) return null;

  /* ── No subscription at all → render nothing ───────── */
  if (!data.has_subscription) return null;

  /* ── FREE PLAN ─────────────────────────────────────── */
  if (data.is_free) {
    return (
      <div
        className="premium-expire-alert premium-expire-alert-free"
        role="status"
        aria-live="polite"
      >
        <span className="premium-expire-alert-icon" aria-hidden="true">
          ★
        </span>

        <span className="premium-expire-alert-text">
          <strong>You're on the Free plan</strong>
          <span className="premium-expire-sep">·</span>
          Upgrade to Premium to unlock featured listings and priority
          visibility.
        </span>
      </div>
    );
  }

  /* ── EXPIRED ───────────────────────────────────────── */
  if (data.is_expired) {
    const elapsedSeconds =
      remaining !== null && remaining <= 0
        ? Math.abs(remaining)
        : data.elapsed_since_expiry?.total_seconds ?? 0;

    return (
      <div
        className="premium-expire-alert premium-expire-alert-expired"
        role="alert"
        aria-live="polite"
      >
        <span className="premium-expire-alert-icon" aria-hidden="true">
          ⏱
        </span>

        <span className="premium-expire-alert-text">
          <strong>Your Premium has expired</strong>
          <span className="premium-expire-sep">·</span>
          {elapsedSeconds === 0
            ? 'just now'
            : formatElapsed(elapsedSeconds)}
          <span className="premium-expire-expired-hint">
            Renew to unlock premium features again.
          </span>
        </span>
      </div>
    );
  }

  /* ── ACTIVE (paid, counting down) ──────────────────── */
  if (data.is_active && remaining !== null && remaining > 0) {
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
          <strong>{data.plan?.name || 'Premium'} active</strong>
          <span className="premium-expire-sep">·</span>
          expires in{' '}
          <span className="premium-expire-countdown">
            {formatCountdown(remaining)}
          </span>
        </span>
      </div>
    );
  }

  /* ── Fallback ──────────────────────────────────────── */
  return null;
};

export default Premiumexpire;