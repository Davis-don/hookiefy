// src/pages/accounts/profile/components/AccountPassword.tsx

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { updateUserPassword } from '../api/profileApi';
import './accountPassword.css'

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type Props = {
  onSaved?: () => void;
};

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function AccountPassword({ onSaved }: Props) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);

  const [oldPassword, setOldPassword]         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');

  const mutation = useMutation({
    mutationFn: (payload: {
      old_password: string;
      new_password: string;
      new_password2: string;
    }) => updateUserPassword(payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Password updated.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onSaved?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not update your password.');
    },
  });

  const busy = mutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!oldPassword) return setError('Please enter your current password.');
    if (!newPassword) return setError('Please enter a new password.');
    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match.');
    }
    if (newPassword === oldPassword) {
      return setError('New password must be different from the current one.');
    }

    mutation.mutate({
      old_password: oldPassword,
      new_password: newPassword,
      new_password2: confirmPassword,
    });
  };

  return (
    <section className="ap-card">
      <header className="ap-head">
        <h3 className="ap-title">Password</h3>
        <p className="ap-sub">
          Choose a strong password you don't use anywhere else.
        </p>
      </header>

      <form className="ap-form" onSubmit={handleSubmit} noValidate>
        <div className="ap-grid">
          <div className="ap-field ap-field-full">
            <label htmlFor="ap-old" className="ap-label">Current password</label>
            <input
              id="ap-old"
              type="password"
              className="ap-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={busy}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="ap-field">
            <label htmlFor="ap-new" className="ap-label">New password</label>
            <input
              id="ap-new"
              type="password"
              className="ap-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="ap-field">
            <label htmlFor="ap-confirm" className="ap-label">Confirm new password</label>
            <input
              id="ap-confirm"
              type="password"
              className="ap-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <div className="ap-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="ap-actions">
          <button
            type="submit"
            className="ap-btn ap-btn-primary"
            disabled={busy || !access}
          >
            {busy ? <Spinner size={16} label="Updating…" /> : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AccountPassword;