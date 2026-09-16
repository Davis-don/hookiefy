// Header.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import PremiumBadge, {
  fetchPremiumStatus,
  usePremiumStatus,
} from './PremiumBadge';
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
   Fetch profile image
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

  /* ── Premium status (shared cache with badge) ──────── */
  const { data: premiumData } = usePremiumStatus();
  const isPremium = premiumData?.is_premium === true;

  /* ── Profile-image query ───────────────────────────── */
  const {
    data: profileData,
    refetch: refetchProfile,
    isFetching,
  } = useQuery<ProfileImageResponse, Error>({
    queryKey: ['profile-image', access],
    queryFn: () => fetchProfileImage(access),
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

  const imageUrl = profileData?.profile_image_url || null;

  /* ── Prefetch helpers ──────────────────────────────── */
  const prefetchProfile = () => {
    if (!access) return;
    queryClient.prefetchQuery({
      queryKey: ['profile-image', access],
      queryFn: () => fetchProfileImage(access),
      staleTime: 10 * 60_000,
    });
  };

  const prefetchPremium = () => {
    if (!access) return;
    queryClient.prefetchQuery({
      queryKey: ['premium-status', access],
      queryFn: () => fetchPremiumStatus(access),
      staleTime: 10 * 60_000,
    });
  };

  /* ── Throttled silent refetch on tab focus ─────────── */
  const lastFocusRef = useRef<number>(0);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 120_000) return;
      lastFocusRef.current = now;

      refetchProfile({ cancelRefetch: false });

      if (access) {
        queryClient.refetchQueries({
          queryKey: ['premium-status', access],
        });
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchProfile, queryClient, access]);

  /* ── Reset image fade on URL change ─────────────────── */
  useEffect(() => {
    setImgLoaded(false);
  }, [imageUrl]);

  return (
    <header className="yp-dash-header">
      <div className="yp-dash-header-content">
        {/* ── Brand ─────────────────────────────────────── */}
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

        {/* ── Avatar with premium halo + crown seal ─────── */}
        <div
          className="yp-dash-avatar-wrap"
          data-premium={isPremium ? 'true' : 'false'}
        >
          {/* Halo ring — only visible when premium */}
          <span className="yp-avatar-halo" aria-hidden="true" />

          <button
            className="yp-dash-avatar-btn"
            onClick={onProfileClick}
            onMouseEnter={() => {
              prefetchProfile();
              prefetchPremium();
            }}
            onTouchStart={() => {
              prefetchProfile();
              prefetchPremium();
            }}
            aria-label="Open profile"
            type="button"
          >
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
                  target.parentElement?.classList.add(
                    'yp-avatar-fallback'
                  );
                }}
              />
            ) : (
              <div className="yp-dash-avatar">{userName}</div>
            )}

            {isFetching && !imgLoaded && (
              <span className="yp-avatar-refresh-dot" aria-hidden="true" />
            )}
          </button>

          {/* Corner crown — only renders for premium users */}
          <div className="yp-dash-avatar-seal">
            <PremiumBadge size="xs" showLabel={false} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;