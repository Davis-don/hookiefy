// src/pages/accounts/components/SuperHeader.tsx

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Avatar from '../../User/components/Avatar';
import NotificationBell from '../../User/components/NotificationBell';
import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';

import './superheader.css';

type SuperHeaderProps = {
  /** Fired when the avatar or the Profile item is clicked. */
  onOpenProfile?: () => void;
  /** Fired when the Plans item is clicked. */
  onOpenPlans?: () => void;
  /** Fired when the Settings item is clicked. */
  onOpenSettings?: () => void;
};

/* ── Timing ──────────────────────────────────────────── */

/** Minimum time the spinner stays visible, even on a fast reply. */
const MIN_BUSY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/* ── Icons ───────────────────────────────────────────── */

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5"  r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

const PlansIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="7" y1="15" x2="11" y2="15" />
    <line x1="7" y1="18" x2="13" y2="18" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17l5-5-5-5" />
    <path d="M20 12H9" />
    <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
  </svg>
);

/* ── Component ───────────────────────────────────────── */

function SuperHeader({
  onOpenProfile,
  onOpenPlans,
  onOpenSettings,
}: SuperHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const toast = useToast();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const refresh = useAuthStore((s) => s.refresh);

  /* Local logout state — drives the dropdown item's spinner */
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the dropdown when clicking outside it, or pressing Escape.
  useEffect(() => {
    if (!open) return;

    const handleClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  /**
   * Logout flow:
   *   1. Fire an immediate "Logging you out…" toast.
   *   2. Show spinner on the dropdown item.
   *   3. Best-effort POST to /account/logout/ to blacklist the token.
   *   4. Wait a minimum duration so the spinner is visible.
   *   5. Clear local auth.
   *   6. Fire a "logged out" toast.
   *   7. Redirect to /login.
   *
   * On network failure we still log out locally — the user asked to leave.
   */
  const handleLogout = async () => {
    if (loggingOut) return;

    setOpen(false);
    setLoggingOut(true);

    // 1. Immediate toast — queued even before navigation tears us down.
    toast.success('Logging you out…');

    // 2. Kick off the request and the minimum-duration timer in parallel.
    const minDelay = delay(MIN_BUSY_MS);

    const request = (async () => {
      try {
        if (refresh) {
          await fetch(
            `${
              import.meta.env.VITE_API_URL || 'http://localhost:8000'
            }/account/logout/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh }),
            }
          );
        }
      } catch {
        /* swallow — we still clear locally */
      }
    })();

    await Promise.all([request, minDelay]);

    // 3. Clear local auth.
    clearAuth?.();

    // 4. Success toast.
    toast.success('You have been logged out.');

    // 5. Give the toast a frame to mount before unmounting the shell.
    await delay(60);

    navigate('/login', { replace: true });
  };

  return (
    <header className="sh-header">
      {/* Brand — hidden on desktop via CSS */}
      <Link
        to="/superaccount"
        className="sh-header-brand"
        aria-label="Youpata admin"
      >
        <span className="sh-header-logo-you">You</span>
        <span className="sh-header-logo-p">p</span>
        <span className="sh-header-logo-ata">ata</span>
        <span className="sh-header-badge">Admin</span>
      </Link>

      {/* Right cluster: bell + avatar + overflow menu */}
      <div className="sh-header-right">
        <NotificationBell
          onClick={() => {
            /* open admin notifications panel */
          }}
        />

        <button
          type="button"
          className="sh-header-avatar-btn"
          onClick={onOpenProfile}
          aria-label="Open profile"
          title="Profile"
        >
          <Avatar size="md" />
        </button>

        {/* Overflow menu */}
        <div className="sh-header-menu" ref={menuRef}>
          <button
            type="button"
            className={
              'sh-header-menu-btn' + (open ? ' is-open' : '')
            }
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            aria-haspopup="menu"
            aria-expanded={open}
            title="More"
            disabled={loggingOut}
          >
            <MenuIcon />
          </button>

          {open && (
            <div className="sh-header-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className="sh-header-dropdown-item"
                onClick={() => {
                  setOpen(false);
                  onOpenPlans?.();
                }}
              >
                <span className="sh-header-dropdown-icon">
                  <PlansIcon />
                </span>
                <span className="sh-header-dropdown-label">Plans</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sh-header-dropdown-item"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings?.();
                }}
              >
                <span className="sh-header-dropdown-icon">
                  <SettingsIcon />
                </span>
                <span className="sh-header-dropdown-label">Settings</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sh-header-dropdown-item"
                onClick={() => {
                  setOpen(false);
                  onOpenProfile?.();
                }}
              >
                <span className="sh-header-dropdown-icon">
                  <ProfileIcon />
                </span>
                <span className="sh-header-dropdown-label">Profile</span>
              </button>

              <div className="sh-header-dropdown-sep" aria-hidden="true" />

              <button
                type="button"
                role="menuitem"
                className={
                  'sh-header-dropdown-item sh-header-dropdown-item--danger' +
                  (loggingOut ? ' is-busy' : '')
                }
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut}
              >
                <span className="sh-header-dropdown-icon">
                  {loggingOut ? (
                    <span className="sh-header-spinner">
                      <span className="sh-spinner-ring" />
                    </span>
                  ) : (
                    <LogoutIcon />
                  )}
                </span>
                <span className="sh-header-dropdown-label">
                  {loggingOut ? 'Logging out…' : 'Logout'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default SuperHeader;