import React, { useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import './header.css';

interface HeaderProps {
  onProfileClick: () => void;
  onBrandClick?: () => void;
  userName?: string;
}

interface ProfileImageResponse {
  profile_image_url: string | null;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com';

/* ────────────────────────────────────────────────────────
   Fetch profile image (reusable — also used for prefetch)
   ──────────────────────────────────────────────────────── */
async function fetchProfileImage(
  access: string | null
): Promise<ProfileImageResponse> {
  if (!access) throw new Error('No access token found');

  const response = await fetch(`${API_URL}/account/profile-image/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Profile image fetch failed: ${response.status}`);
  }

  return response.json();
}

const Header: React.FC<HeaderProps> = ({
  onProfileClick,
  onBrandClick,
  userName = 'SP',
}) => {
  const { access } = useAuthStore();
  const queryClient = useQueryClient();
  const [imgLoaded, setImgLoaded] = useState(false);

  /* ── Main query ─────────────────────────────────────── */
  const { data: profileData, refetch, isFetching } =
    useQuery<ProfileImageResponse, Error>({
      queryKey: ['profile-image', access],
      queryFn: () => fetchProfileImage(access),
      enabled: !!access,

      // Keep the last good image while refetching → NO flicker
      placeholderData: keepPreviousData,

      // Cache is fresh for 10 min — refetch only when we ask
      staleTime: 10 * 60_000,

      // Keep cached data 30 min after unmount
      gcTime: 30 * 60_000,

      // No automatic refetch on window focus (we do it manually, throttled)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,

      // Only 1 retry, with backoff → won't spam the API
      retry: 1,
      retryDelay: 2000,
    });

  const imageUrl = profileData?.profile_image_url || null;

  /* ── Prefetch on hover/tap (before click) ──────────── */
  const prefetch = () => {
    if (!access) return;
    queryClient.prefetchQuery({
      queryKey: ['profile-image', access],
      queryFn: () => fetchProfileImage(access),
      staleTime: 10 * 60_000,
    });
  };

  /* ── Throttled silent refetch when tab regains focus ── */
  const lastFocusRef = useRef<number>(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      // Throttle: at most once every 2 minutes
      if (now - lastFocusRef.current < 120_000) return;
      lastFocusRef.current = now;

      // Silent refetch — no spinner, no lag
      refetch({ cancelRefetch: false });
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  /* ── Reset image fade on URL change ─────────────────── */
  useEffect(() => {
    setImgLoaded(false);
  }, [imageUrl]);

  return (
    <header className="yp-dash-header">
      <div className="yp-dash-header-content">
        {/* Brand */}
        <h1
          className="yp-dash-wordmark"
          onClick={onBrandClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBrandClick?.();
            }
          }}
          role="link"
          tabIndex={0}
          aria-label="Go to home"
        >
          <span className="yp-logo-you">You</span>
          <span className="yp-logo-p">p</span>
          <span className="yp-logo-ata">ata</span>
        </h1>

        {/* Avatar */}
        <button
          className="yp-dash-avatar-btn"
          onClick={onProfileClick}
          onMouseEnter={prefetch}
          onTouchStart={prefetch}
          aria-label="Open profile"
          type="button"
        >
          {/* Show image if we have one (even while refetching) */}
          {imageUrl ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Profile"
              className={`yp-dash-avatar yp-dash-avatar-img ${
                imgLoaded ? 'yp-avatar-loaded' : 'yp-avatar-loading'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.classList.add('yp-avatar-fallback');
              }}
            />
          ) : (
            <div className="yp-dash-avatar">{userName}</div>
          )}

          {/* Silent refresh indicator (tiny dot, no layout shift) */}
          {isFetching && !imgLoaded && (
            <span className="yp-avatar-refresh-dot" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;