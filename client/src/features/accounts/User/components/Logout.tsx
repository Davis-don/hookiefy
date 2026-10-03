import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';
import './Logout.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function logoutRequest(refresh: string | null): Promise<void> {
  if (!refresh) return; // nothing to blacklist server-side

  try {
    await fetch(`${API_BASE}/account/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    // ignore — we still clear locally
  }
}

type LogoutProps = {
  /** Visual variant — matches the sidebar vs. bottom nav shapes. */
  variant?: 'sidebar' | 'bottom';
};

function Logout({ variant = 'sidebar' }: LogoutProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const refresh = useAuthStore((s) => s.refresh);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logoutMutation = useMutation({
    mutationFn: () => logoutRequest(refresh),
    onSettled: () => {
      clearAuth();
      toast.success('You have been logged out.');
      navigate('/', { replace: true });
    },
  });

  const busy = logoutMutation.isPending;

  const handleLogout = () => {
    if (busy) return;
    logoutMutation.mutate();
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

  // ── Mobile bottom nav variant ────────────────────────
  if (variant === 'bottom') {
    return (
      <button
        type="button"
        className={'ua-bottom-link' + (busy ? ' is-busy' : '')}
        onClick={handleLogout}
        aria-label={busy ? 'Logging out' : 'Log out'}
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
      className={'ua-sidebar-link' + (busy ? ' is-busy' : '')}
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
        {busy ? 'Logging out…' : 'Log out'}
      </span>
    </button>
  );
}

export default Logout;