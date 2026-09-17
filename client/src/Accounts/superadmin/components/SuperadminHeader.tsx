// SuperadminHeader.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import {
  FiUser,
  FiTool,
  FiDollarSign,
  FiSettings,
  FiAward,
} from 'react-icons/fi'
import { useAuthStore } from '../../../store/authtokenstore'
import LogoutButton from '../../service_provider/components/LogoutButton'
import './superadminheader.css'

interface SuperadminHeaderProps {
  onProfileClick: () => void
  onBrandClick?: () => void
  onNavigate?: (tabId: string) => void
  userName?: string
}

interface ProfileImageResponse {
  profile_image_url: string | null
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com'

async function fetchProfileImage(
  access: string | null
): Promise<ProfileImageResponse> {
  if (!access) throw new Error('No access token found')

  const response = await fetch(`${API_URL}/account/profile-image/`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Profile image fetch failed: ${response.status}`)
  }

  return response.json()
}

const SuperadminHeader: React.FC<SuperadminHeaderProps> = ({
  onProfileClick,
  onBrandClick,
  onNavigate,
  userName = 'SA',
}) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()
  const [imgLoaded, setImgLoaded] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
  })

  const imageUrl = profileData?.profile_image_url || null

  const prefetchProfile = () => {
    if (!access) return
    queryClient.prefetchQuery({
      queryKey: ['profile-image', access],
      queryFn: () => fetchProfileImage(access),
      staleTime: 10 * 60_000,
    })
  }

  const lastFocusRef = useRef<number>(0)

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusRef.current < 120_000) return
      lastFocusRef.current = now

      refetchProfile({ cancelRefetch: false })
    }

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetchProfile])

  useEffect(() => {
    setImgLoaded(false)
  }, [imageUrl])

  useEffect(() => {
    if (!menuOpen) return

    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const toggleMenu = () => {
    setMenuOpen((v) => !v)
    prefetchProfile()
  }

  const handleProfileSelect = () => {
    setMenuOpen(false)
    onProfileClick()
  }

  const handleNavigate = (tabId: string) => {
    setMenuOpen(false)
    onNavigate?.(tabId)
  }

  return (
    <header className="sa-mobile-header">
      <div className="sa-mobile-header-content">
        {/* ── Brand + Crown badge ───────────────────────── */}
        <div
          className="sa-mobile-brand"
          onClick={onBrandClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onBrandClick?.()
            }
          }}
          role="link"
          tabIndex={0}
          aria-label="Go to analytics"
        >
          <h1 className="sa-mobile-wordmark">
            <span className="sa-logo-you">You</span>
            <span className="sa-logo-p">p</span>
            <span className="sa-logo-ata">ata</span>
          </h1>

          <span className="sa-admin-crown" title="Superadmin">
            <FiAward className="sa-admin-crown-icon" />
          </span>
        </div>

        <div ref={menuRef} className="sa-mobile-avatar-wrap">
          <button
            className="sa-mobile-avatar-btn"
            onClick={toggleMenu}
            onMouseEnter={prefetchProfile}
            onTouchStart={prefetchProfile}
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
                className={`sa-mobile-avatar sa-mobile-avatar-img ${
                  imgLoaded ? 'sa-avatar-loaded' : 'sa-avatar-loading'
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement?.classList.add(
                    'sa-avatar-fallback'
                  )
                }}
              />
            ) : (
              <div className="sa-mobile-avatar">{userName}</div>
            )}

            {isFetching && !imgLoaded && (
              <span className="sa-avatar-refresh-dot" aria-hidden="true" />
            )}
          </button>

          {menuOpen && (
            <div
              className="sa-avatar-menu"
              role="menu"
              aria-label="Account menu"
            >
              <button
                type="button"
                role="menuitem"
                className="sa-avatar-menu-item"
                onClick={handleProfileSelect}
              >
                <FiUser className="sa-avatar-menu-icon" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sa-avatar-menu-item"
                onClick={() => handleNavigate('services')}
              >
                <FiTool className="sa-avatar-menu-icon" />
                <span>Services</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sa-avatar-menu-item"
                onClick={() => handleNavigate('finances')}
              >
                <FiDollarSign className="sa-avatar-menu-icon" />
                <span>Finances</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sa-avatar-menu-item"
                onClick={() => handleNavigate('settings')}
              >
                <FiSettings className="sa-avatar-menu-icon" />
                <span>Settings</span>
              </button>

              <div className="sa-avatar-menu-divider" aria-hidden="true" />

              <div className="sa-avatar-menu-item sa-avatar-menu-item--logout">
                <LogoutButton
                  redirectTo="/login"
                  onLoggedOut={() => setMenuOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default SuperadminHeader