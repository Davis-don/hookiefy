// src/components/auth/RequireAuth.tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

type RequireAuthProps = {
  children: ReactNode;
  /** If set, the user's role must match this exactly. */
  role?: string;
  /** Where to send the user if they are not allowed here. Defaults to /login. */
  redirectTo?: string;
};

function RequireAuth({ children, role, redirectTo = '/login' }: RequireAuthProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // 1. Not logged in → go to login, remember where they wanted to go.
  if (!user) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // 2. Logged in but wrong role → send them somewhere safe.
  if (role && user.role !== role) {
    // Fall back to their own dashboard based on their actual role.
    const fallback =
      user.role === 'superadmin' ? '/superaccount' : '/useraccount';
    return <Navigate to={fallback} replace />;
  }

  // 3. All good.
  return <>{children}</>;
}

export default RequireAuth;