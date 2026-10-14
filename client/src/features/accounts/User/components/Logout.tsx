// src/pages/accounts/components/Logout.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';
import './Logout.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Minimum time the spinner stays visible, even on a fast reply. */
const MIN_BUSY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/**
 * Best-effort server-side logout. Never throws.
 * Returns when the request completes (or fails).
 */
async function logoutRequest(refresh: string | null): Promise<void> {
  try {
    await fetch(`${API_BASE}/account/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    /* swallow — we still clear locally */
  }
}

type LogoutProps = {
  variant?: 'sidebar' | 'bottom';
  onStart?: () => void;
  onEnd?: () => void;
};

function Logout({ variant = 'sidebar', onStart, onEnd }: LogoutProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const refresh = useAuthStore((s) => s.refresh);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleLogout = async () => {
    if (busy) return;

    // Two-click confirm (protects against stray taps)
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 2500);
      return;
    }

    setConfirming(false);
    setBusy(true);
    onStart?.();

    // 1. Fire the toast immediately so it's already queued on-screen.
    toast.success('Logging you out…');

    // 2. Kick off the request and a minimum-duration timer in parallel.
    const minDelay = delay(MIN_BUSY_MS);
    await Promise.all([logoutRequest(refresh), minDelay]);

    // 3. Clear local auth.
    clearAuth?.();

    // 4. Success toast (distinct wording, same as login).
    toast.success('You have been logged out.');

    // 5. Give the toast one frame to mount, then navigate.
    await delay(60);

    onEnd?.();
    navigate('/', { replace: true });
  };

  const logoutIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );

  // ── Mobile bottom-nav variant ────────────────────────
  if (variant === 'bottom') {
    return (
      <button
        type="button"
        className={
          'ua-bottom-link' +
          (busy ? ' is-busy' : '') +
          (confirming ? ' is-confirming' : '')
        }
        onClick={handleLogout}
        aria-label={
          busy ? 'Logging out' : confirming ? 'Tap again to confirm' : 'Log out'
        }
        aria-busy={busy}
        disabled={busy}
      >
        {busy ? (
          <span className="ua-logout-spinner">
            <Spinner size={20} />
          </span>
        ) : (
          logoutIcon
        )}
      </button>
    );
  }

  // ── Sidebar variant ──────────────────────────────────
  return (
    <button
      type="button"
      className={
        'ua-sidebar-link' +
        (busy ? ' is-busy' : '') +
        (confirming ? ' is-confirming' : '')
      }
      onClick={handleLogout}
      aria-busy={busy}
      disabled={busy}
    >
      <span className="ua-sidebar-icon">
        {busy ? (
          <span className="ua-logout-spinner">
            <Spinner size={20} />
          </span>
        ) : (
          logoutIcon
        )}
      </span>

      <span className="ua-sidebar-label">
        {busy ? 'Logging out…' : confirming ? 'Tap again' : 'Log out'}
      </span>
    </button>
  );
}

export default Logout;