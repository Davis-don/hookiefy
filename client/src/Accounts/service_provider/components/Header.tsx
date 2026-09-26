// Header.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../../store/authtokenstore';
import PremiumBadge, {
  fetchPremiumStatus,
  usePremiumStatus,
} from './PremiumBadge';
import LogoutButton from './LogoutButton';
import Notification from './notification/Notification';
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

  /* ── Dropdown state ────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  /* ── Close dropdown on outside click / Escape ───────── */
  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  /* ── Handlers ──────────────────────────────────────── */
  const toggleMenu = () => {
    setMenuOpen((v) => !v);
    prefetchProfile();
    prefetchPremium();
  };

  const handleProfileSelect = () => {
    setMenuOpen(false);
    onProfileClick();
  };

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

        {/* ── Right cluster: Bell + Avatar ─────────────── */}
        <div className="yp-dash-header-actions">
          {/* ── Notification bell ──────────────────────── */}
          <Notification />

          {/* ── Avatar with premium halo + crown seal ──── */}
          <div
            ref={menuRef}
            className="yp-dash-avatar-wrap"
            data-premium={isPremium ? 'true' : 'false'}
          >
            {/* Halo ring — only visible when premium */}
            <span className="yp-avatar-halo" aria-hidden="true" />

            <button
              className="yp-dash-avatar-btn"
              onClick={toggleMenu}
              onMouseEnter={() => {
                prefetchProfile();
                prefetchPremium();
              }}
              onTouchStart={() => {
                prefetchProfile();
                prefetchPremium();
              }}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
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

            {/* ── Dropdown menu ─────────────────────────── */}
            {menuOpen && (
              <div
                className="yp-avatar-menu"
                role="menu"
                aria-label="Account menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="yp-avatar-menu-item"
                  onClick={handleProfileSelect}
                >
                  <FiUser className="yp-avatar-menu-icon" />
                  <span>Profile</span>
                </button>

                {/* LogoutButton renders its own icon + label */}
                <div className="yp-avatar-menu-item yp-avatar-menu-item--logout">
                  <LogoutButton
                    redirectTo="/login"
                    onLoggedOut={() => setMenuOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;