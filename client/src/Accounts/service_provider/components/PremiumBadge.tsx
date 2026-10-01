// PremiumBadge.tsx
import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import './premiumBadge.css';

/* ────────────────────────────────────────────────────────
   Response shape — exported so other components can reuse
   ──────────────────────────────────────────────────────── */
export interface PremiumStatusResponse {
  is_premium: boolean;
  role: string;
  expires_at: string | null;
  is_expired: boolean;
  time_remaining?: {
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
export async function fetchPremiumStatus(
  access: string | null
): Promise<PremiumStatusResponse> {
  if (!access) throw new Error('No access token found');

  const response = await fetch(
    `${API_URL}/subscription/premium-status/`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${access}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Premium status fetch failed: ${response.status}`
    );
  }

  return response.json();
}

/* ────────────────────────────────────────────────────────
   Shared hook — one cache entry across the whole app
   ──────────────────────────────────────────────────────── */
export function usePremiumStatus() {
  const { access } = useAuthStore();

  return useQuery<PremiumStatusResponse, Error>({
    queryKey: ['premium-status', access],
    queryFn: () => fetchPremiumStatus(access),
    enabled: !!access,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 2000,
  });
}

/* ────────────────────────────────────────────────────────
   Helper — the rule for showing the badge
   ──────────────────────────────────────────────────────── */
export function shouldShowPremiumBadge(
  data: PremiumStatusResponse | undefined
): boolean {
  if (!data) return false;
  return data.is_premium === true && data.is_expired === false;
}

interface PremiumBadgeProps {
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/* ────────────────────────────────────────────────────────
   Size map
   ──────────────────────────────────────────────────────── */
const SIZES = {
  xs: { crest: 18, ribbon: 0, font: 0 },
  sm: { crest: 22, ribbon: 0, font: 9 },
  md: { crest: 30, ribbon: 1, font: 10 },
  lg: { crest: 44, ribbon: 1, font: 12 },
} as const;

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  showLabel = true,
  size = 'sm',
}) => {
  const { data, isLoading, isError } = usePremiumStatus();

  if (isLoading && !data) return null;
  if (isError || !data) return null;
  if (!shouldShowPremiumBadge(data)) return null;

  const dims = SIZES[size];
  const showRibbon = dims.ribbon === 1 && showLabel;

  const expiryLabel = data.expires_at
    ? `Premium until ${new Date(
        data.expires_at
      ).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`
    : 'Premium member';

  return (
    <span
      className={`yp-trophy yp-trophy--${size}`}
      title={expiryLabel}
      aria-label={expiryLabel}
      role="img"
    >
      {/* ── The trophy crest ────────────────────────── */}
      <span className="yp-trophy-crest">
        <svg
          width={dims.crest}
          height={dims.crest}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Radial glow behind the trophy */}
          <defs>
            <radialGradient
              id="trophyGlow"
              cx="50%"
              cy="40%"
              r="60%"
            >
              <stop
                offset="0%"
                stopColor="#fde68a"
                stopOpacity="0.9"
              />
              <stop
                offset="60%"
                stopColor="#fbbf24"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor="#f59e0b"
                stopOpacity="0"
              />
            </radialGradient>

            <linearGradient
              id="trophyGold"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="35%" stopColor="#fcd34d" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            <linearGradient
              id="trophyShine"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="#ffffff"
                stopOpacity="0"
              />
              <stop
                offset="45%"
                stopColor="#ffffff"
                stopOpacity="0.85"
              />
              <stop
                offset="55%"
                stopColor="#ffffff"
                stopOpacity="0.85"
              />
              <stop
                offset="100%"
                stopColor="#ffffff"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Glow */}
          <circle
            cx="24"
            cy="22"
            r="22"
            fill="url(#trophyGlow)"
          />

          {/* Cup bowl */}
          <path
            d="M14 10h20v8a10 10 0 0 1-20 0v-8z"
            fill="url(#trophyGold)"
            stroke="#7c2d12"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Handles */}
          <path
            d="M14 12H9a4 4 0 0 0 4 4h1"
            stroke="#b45309"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M34 12h5a4 4 0 0 1-4 4h-1"
            stroke="#b45309"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Stem */}
          <rect
            x="21"
            y="28"
            width="6"
            height="5"
            rx="1"
            fill="url(#trophyGold)"
            stroke="#7c2d12"
            strokeWidth="0.8"
          />

          {/* Base plate */}
          <rect
            x="15"
            y="33"
            width="18"
            height="4"
            rx="1.5"
            fill="url(#trophyGold)"
            stroke="#7c2d12"
            strokeWidth="0.8"
          />

          {/* Base wider plate */}
          <rect
            x="12"
            y="37"
            width="24"
            height="3.5"
            rx="1.5"
            fill="#b45309"
            stroke="#7c2d12"
            strokeWidth="0.8"
          />

          {/* Star on the cup */}
          <path
            d="M24 13.5l1.2 2.4 2.6.35-1.9 1.8.45 2.55L24 19.4l-2.35 1.2.45-2.55-1.9-1.8 2.6-.35L24 13.5z"
            fill="#fff7ed"
            stroke="#7c2d12"
            strokeWidth="0.4"
          />

          {/* Diagonal shine sweep */}
          <path
            d="M14 10h20v8a10 10 0 0 1-20 0v-8z"
            fill="url(#trophyShine)"
            className="yp-trophy-shine"
          />
        </svg>

        {/* Sparkles around the trophy */}
        <span className="yp-trophy-spark yp-trophy-spark--1" />
        <span className="yp-trophy-spark yp-trophy-spark--2" />
        <span className="yp-trophy-spark yp-trophy-spark--3" />
      </span>

      {/* ── Optional ribbon with label ──────────────── */}
      {showRibbon && (
        <span
          className="yp-trophy-ribbon"
          style={{ fontSize: dims.font }}
        >
          <span className="yp-trophy-ribbon-text">Premium</span>
        </span>
      )}
    </span>
  );
};

export default PremiumBadge;