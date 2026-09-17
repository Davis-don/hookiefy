// LogoutButton.tsx
import './logout.css'
import { FiLogOut } from 'react-icons/fi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */
interface LogoutResponse {
  message: string
}

interface LogoutButtonProps {
  /** Optional redirect path after successful logout. */
  redirectTo?: string
  /** Optional callback fired after successful logout. */
  onLoggedOut?: () => void
}

/* ────────────────────────────────────────────────────────
   Logout API call
   Backend: POST /account/logout/
   Body: { refresh: "<refresh_token>" }
   ──────────────────────────────────────────────────────── */
async function logoutRequest(
  access: string | null,
  refresh: string | null
): Promise<LogoutResponse> {
  if (!access) {
    throw new Error('No access token found. You are already logged out.')
  }

  if (!refresh) {
    throw new Error('No refresh token found. You are already logged out.')
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/logout/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh }),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      (data && data.message) || `Logout failed (${response.status})`
    )
  }

  return data as LogoutResponse
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */
function LogoutButton({
  redirectTo = '/login',
  onLoggedOut,
}: LogoutButtonProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ✅ Store exposes `clearTokens`, not `logout`
  const { access, refresh, clearTokens } = useAuthStore()

  const logoutMutation = useMutation({
    mutationFn: () => logoutRequest(access, refresh),

    onSuccess: (data) => {
      // 1. Wipe auth state (tokens + user) from Zustand
      clearTokens()

      // 2. Wipe React Query cache so no stale user data lingers
      queryClient.clear()

      // 3. Success toast
      toast.success(data?.message || 'Logged out successfully.', {
        duration: 2500,
        icon: '👋',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      // 4. Notify parent
      onLoggedOut?.()

      // 5. Redirect to login
      navigate(redirectTo, { replace: true })
    },

    onError: (err: Error) => {
      // Even if backend fails, log out locally so the user
      // doesn't stay stuck inside the app.
      clearTokens()
      queryClient.clear()

      toast.error('Session ended', {
        description:
          err.message ||
          'Your session could not be revoked server-side, but you have been logged out locally.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })

      onLoggedOut?.()

      // Still redirect — user is logged out locally
      navigate(redirectTo, { replace: true })
    },
  })

  const handleClick = () => {
    if (logoutMutation.isPending) return
    logoutMutation.mutate()
  }

  return (
    <button
      type="button"
      className="logout-btn"
      onClick={handleClick}
      disabled={logoutMutation.isPending}
      title="Log out"
      aria-label="Log out"
    >
      <FiLogOut
        className={`logout-btn-icon ${
          logoutMutation.isPending ? 'logout-btn-icon-spinning' : ''
        }`}
      />
      <span className="logout-btn-label">
        {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
      </span>
    </button>
  )
}

export default LogoutButton