// src/pages/accounts/profile/components/AccountInfo.tsx

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  updateUserProfile,
  type UpdateUserPayload,
} from '../api/profileApi';
import './accountInfo.css';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type Props = {
  initial: {
    email: string;
    firstName: string;
    lastName: string;
    gender: 'M' | 'F' | 'O' | '' | null;
    phoneNumber: string | null;
  };
  onSaved?: () => void;
};

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function AccountInfo({ initial, onSaved }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const access = useAuthStore((s) => s.access);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName]   = useState(initial.lastName);
  const [email, setEmail]         = useState(initial.email);
  const [gender, setGender]       = useState<string>(initial.gender ?? '');
  const [phone, setPhone]         = useState(initial.phoneNumber ?? '');
  const [error, setError]         = useState('');

  // Sync if parent data changes
  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setEmail(initial.email);
    setGender(initial.gender ?? '');
    setPhone(initial.phoneNumber ?? '');
    setError('');
  }, [
    initial.firstName,
    initial.lastName,
    initial.email,
    initial.gender,
    initial.phoneNumber,
  ]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUserProfile(payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Account updated.');
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      onSaved?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not update your account.');
    },
  });

  const busy = mutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedFirst = firstName.trim();
    const trimmedLast  = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst) return setError('Please enter your first name.');
    if (!trimmedLast)  return setError('Please enter your last name.');
    if (!trimmedEmail) return setError('Please enter your email.');

    const payload: UpdateUserPayload = {};
    if (trimmedFirst !== initial.firstName) payload.first_name = trimmedFirst;
    if (trimmedLast  !== initial.lastName)  payload.last_name  = trimmedLast;
    if (trimmedEmail !== initial.email)     payload.email      = trimmedEmail;
    if (trimmedPhone !== (initial.phoneNumber ?? '')) {
      payload.phone_number = trimmedPhone;
    }
    if (gender !== (initial.gender ?? '')) {
      payload.gender = gender as 'M' | 'F' | 'O' | '';
    }

    if (Object.keys(payload).length === 0) {
      return setError('Nothing changed.');
    }

    mutation.mutate(payload);
  };

  return (
    <section className="ai-card">
      <header className="ai-head">
        <h3 className="ai-title">Account information</h3>
        <p className="ai-sub">
          Update your name, contact details, and identity.
        </p>
      </header>

      <form className="ai-form" onSubmit={handleSubmit} noValidate>
        <div className="ai-grid">
          <div className="ai-field">
            <label htmlFor="ai-first" className="ai-label">First name</label>
            <input
              id="ai-first"
              type="text"
              className="ai-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={busy}
              maxLength={80}
              placeholder="First name"
              autoComplete="given-name"
            />
          </div>

          <div className="ai-field">
            <label htmlFor="ai-last" className="ai-label">Last name</label>
            <input
              id="ai-last"
              type="text"
              className="ai-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={busy}
              maxLength={80}
              placeholder="Last name"
              autoComplete="family-name"
            />
          </div>

          <div className="ai-field ai-field-full">
            <label htmlFor="ai-email" className="ai-label">Email</label>
            <input
              id="ai-email"
              type="email"
              className="ai-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="ai-field">
            <label htmlFor="ai-phone" className="ai-label">Phone number</label>
            <input
              id="ai-phone"
              type="tel"
              className="ai-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              maxLength={15}
              placeholder="+254712345678"
              autoComplete="tel"
            />
          </div>

          <div className="ai-field">
            <label htmlFor="ai-gender" className="ai-label">Gender</label>
            <select
              id="ai-gender"
              className="ai-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={busy}
            >
              <option value="">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="ai-error">
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

        <div className="ai-actions">
          <button
            type="submit"
            className="ai-btn ai-btn-primary"
            disabled={busy || !access}
          >
            {busy ? <Spinner size={16} label="Saving…" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AccountInfo;