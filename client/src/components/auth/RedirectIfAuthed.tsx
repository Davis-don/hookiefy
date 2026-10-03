// src/components/auth/RedirectIfAuthed.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

type RedirectIfAuthedProps = {
  children: ReactNode;
};

function RedirectIfAuthed({ children }: RedirectIfAuthedProps) {
  const user = useAuthStore((s) => s.user);

  // If already logged in, send them straight to their dashboard.
  if (user) {
    const target =
      user.role === 'superadmin' ? '/superaccount' : '/useraccount';
    return <Navigate to={target} replace />;
  }

  // Otherwise, show the page.
  return <>{children}</>;
}

export default RedirectIfAuthed;