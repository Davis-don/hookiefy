// PremiumBadge.tsx
import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import './premiumBadge.css';

interface PremiumStatusResponse {
  is_premium: boolean;
  role: string;
  expires_at: string | null;
  is_expired: boolean;
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

  const response = await fetch(`${API_URL}/account/premium-status/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Premium status fetch failed: ${response.status}`);
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

interface PremiumBadgeProps {
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  showLabel = true,
  size = 'sm',
}) => {
  const { data, isLoading } = usePremiumStatus();

  if (isLoading && !data) return null;
  if (!data?.is_premium) return null;

  const iconSize = size === 'md' ? 13 : size === 'sm' ? 11 : 10;

  return (
    <span
      className={`yp-premium-badge yp-premium-badge-${size}`}
      title={
        data.expires_at
          ? `Premium until ${new Date(
              data.expires_at
            ).toLocaleDateString()}`
          : 'Premium account'
      }
      aria-label="Premium account"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="yp-premium-crown"
      >
        <path
          d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.5 12h-15L3 7z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {showLabel && (
        <span className="yp-premium-badge-label">Premium</span>
      )}

      <span className="yp-premium-shine" aria-hidden="true" />
    </span>
  );
};

export default PremiumBadge;