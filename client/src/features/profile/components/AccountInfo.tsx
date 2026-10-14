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

/** Values handed back to the parent after a successful save. */
export type AccountInfoSnapshot = {
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'O' | '' | null;
  phoneNumber: string | null;
  email: string;
};

type Props = {
  initial: {
    email: string;
    firstName: string;
    lastName: string;
    gender: 'M' | 'F' | 'O' | '' | null;
    phoneNumber: string | null;
  };
  /** Called after a successful save with the new values. */
  onSaved?: (next: AccountInfoSnapshot) => void;
};

/* ──────────────────────────────────────────────────────────
   Phone helpers — mirrored from Register / EditBio
   ────────────────────────────────────────────────────────── */

/** Extract just the 9 digits after +254 from whatever the user typed. */
function normalizeLocalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 9) return '';
  if (!/^[71]/.test(digits)) return '';
  return digits;
}

/** Strip a +254 / 254 / leading-0 prefix so the input shows only the local part. */
function toLocalPart(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/* ──────────────────────────────────────────────────────────
   Email validation — same rules as Register
   ────────────────────────────────────────────────────────── */

function isValidEmail(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
  if (v.length > 254) return false;
  return true;
}

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
  /* Phone state holds only the local 9-digit part (the +254 is a fixed prefix) */
  const [phone, setPhone]         = useState(toLocalPart(initial.phoneNumber));
  const [error, setError]         = useState('');

  // Sync if parent data changes (e.g. after a refetch)
  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setEmail(initial.email);
    setGender(initial.gender ?? '');
    setPhone(toLocalPart(initial.phoneNumber));
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

    onSuccess: (res, variables) => {
      toast.success(res.message || 'Account updated.');

      // Invalidate so any other component reading `current-user` re-fetches.
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      /*
       * Compute the post-save snapshot from the diff we sent, so
       * the parent sees the exact values the server now holds —
       * no guessing, no stale state.
       *
       * `variables` is the payload that was actually sent:
       *   first_name?, last_name?, email?, phone_number?, gender?
       * Any field NOT in the payload means "unchanged", so we fall
       * back to the current initial.* value.
       */
      const next: AccountInfoSnapshot = {
        firstName:
          variables.first_name !== undefined
            ? variables.first_name
            : initial.firstName,
        lastName:
          variables.last_name !== undefined
            ? variables.last_name
            : initial.lastName,
        email:
          variables.email !== undefined
            ? variables.email
            : initial.email,
        gender:
          variables.gender !== undefined
            ? (variables.gender as 'M' | 'F' | 'O' | '' | null)
            : (initial.gender ?? null),
        phoneNumber:
          variables.phone_number !== undefined
            ? (variables.phone_number || null)
            : (initial.phoneNumber ?? null),
      };

      onSaved?.(next);
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

    if (!trimmedFirst) return setError('Please enter your first name.');
    if (!trimmedLast)  return setError('Please enter your last name.');
    if (!trimmedEmail) return setError('Please enter your email.');
    if (!isValidEmail(trimmedEmail)) {
      return setError('Enter a valid email address.');
    }

    /* Phone: local part (9 digits) or empty */
    const trimmedPhone = phone.trim();
    let normalizedPhone = '';
    if (trimmedPhone) {
      const local = normalizeLocalPhone(trimmedPhone);
      if (!local) {
        return setError(
          'Enter a valid Kenyan number. It must start with 07, 01, 7 or 1.'
        );
      }
      normalizedPhone = `+254${local}`;
    }

    /* Build a diff-only payload */
    const payload: UpdateUserPayload = {};
    if (trimmedFirst !== initial.firstName) payload.first_name = trimmedFirst;
    if (trimmedLast  !== initial.lastName)  payload.last_name  = trimmedLast;
    if (trimmedEmail !== initial.email)     payload.email      = trimmedEmail;

    const initialPhone = initial.phoneNumber ?? '';
    if (normalizedPhone !== initialPhone) {
      payload.phone_number = normalizedPhone; // '' clears the field
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
          {/* ── First name ─────────────────────────────── */}
          <div className="ai-field" data-field="first_name">
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

          {/* ── Last name ──────────────────────────────── */}
          <div className="ai-field" data-field="last_name">
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

          {/* ── Email ──────────────────────────────────── */}
          <div className="ai-field ai-field-full" data-field="email">
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

          {/* ── Phone with +254 prefix ─────────────────── */}
          <div className="ai-field" data-field="phone_number">
            <label htmlFor="ai-phone" className="ai-label">Phone number</label>
            <div className="ai-phone-wrap">
              <span className="ai-phone-prefix">+254</span>
              <input
                id="ai-phone"
                type="tel"
                inputMode="numeric"
                className="ai-input ai-phone-input"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
                }
                disabled={busy}
                maxLength={9}
                placeholder="712345678"
                autoComplete="tel-national"
              />
            </div>
          </div>

          {/* ── Gender ─────────────────────────────────── */}
          <div className="ai-field" data-field="gender">
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