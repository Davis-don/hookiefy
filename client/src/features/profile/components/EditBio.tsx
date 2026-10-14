// src/pages/accounts/profile/components/EditBio.tsx

import { useEffect, useMemo, useState, useCallback } from 'react';
import AccountInfo from './AccountInfo';
import AccountPassword from './AccountPassword';
import './editBio.css';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type Props = {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialEmail: string;
  initialGender: 'M' | 'F' | 'O' | '' | null;
  /** Fired after the parent should re-fetch the user. */
  onSaved?: () => void;
};

/** Fields the pills can jump to inside AccountInfo. */
type FieldKey = 'gender' | 'phone_number' | 'email';

/* ──────────────────────────────────────────────────────────
   Phone helpers
   ────────────────────────────────────────────────────────── */

function normalizeLocalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== 9) return '';
  if (!/^[71]/.test(digits)) return '';

  return digits;
}

function toLocalPart(raw: string): string {
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);

  return digits.slice(0, 9);
}

/* ──────────────────────────────────────────────────────────
   Field metadata
   ────────────────────────────────────────────────────────── */

const FIELD_META: Record<FieldKey, { label: string; short: string }> = {
  gender:       { label: 'Gender',        short: 'Gender' },
  phone_number: { label: 'Phone number',  short: 'Phone'  },
  email:        { label: 'Email address', short: 'Email'  },
};

/* ──────────────────────────────────────────────────────────
   Scroll + flash highlight
   ────────────────────────────────────────────────────────── */

function scrollToField(field: FieldKey) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-field="${field}"]`
    );
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    el.classList.add('eb-field-flash');
    window.setTimeout(() => el.classList.remove('eb-field-flash'), 2000);

    const focusable = el.querySelector<HTMLElement>(
      'input, select, textarea'
    );
    focusable?.focus({ preventScroll: true });
  });
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function EditBio({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialEmail,
  initialGender,
  onSaved,
}: Props) {
  /* Local mirrors — kept in sync with the parent props and with
     live edits that bubble up from AccountInfo. */
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName]   = useState(initialLastName);
  const [gender, setGender]       = useState<'M' | 'F' | 'O' | '' | null>(
    initialGender
  );
  const [phone, setPhone]         = useState(toLocalPart(initialPhone));
  const [email, setEmail]         = useState(initialEmail);

  /* Whenever the parent re-fetches and passes new initial values,
     resync our mirrors. This is what makes the pills disappear
     after a successful save + refetch. */
  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setGender(initialGender);
    setPhone(toLocalPart(initialPhone));
    setEmail(initialEmail);
  }, [
    initialFirstName,
    initialLastName,
    initialGender,
    initialPhone,
    initialEmail,
  ]);

  /* Called from AccountInfo after a successful save.
     1. Push the fresh values into local state so the pills update
        on the current render (no waiting for refetch).
     2. Notify the parent so it can re-fetch the canonical user. */
  const handleAccountSaved = useCallback(
    (next: {
      firstName: string;
      lastName: string;
      gender: 'M' | 'F' | 'O' | '' | null;
      phoneNumber: string | null;
      email: string;
    }) => {
      setFirstName(next.firstName);
      setLastName(next.lastName);
      setGender(next.gender);
      setPhone(toLocalPart(next.phoneNumber ?? ''));
      setEmail(next.email);
      onSaved?.();
    },
    [onSaved]
  );

  /* Which fields are still empty or invalid? */
  const missing = useMemo<FieldKey[]>(() => {
    const list: FieldKey[] = [];

    if (!gender) list.push('gender');
    if (!normalizeLocalPhone(phone)) list.push('phone_number');
    if (!email.trim()) list.push('email');

    return list;
  }, [gender, phone, email]);

  const fullPhone = phone ? `+254${phone}` : '';

  const handleJump = useCallback((field: FieldKey) => {
    scrollToField(field);
  }, []);

  return (
    <div className="overall-container-edit">
      {/* ── Missing-info pills ─────────────────────────── */}
      {missing.length > 0 && (
        <div className="eb-missing" role="status" aria-live="polite">
          <div className="eb-missing-head">
            <span className="eb-missing-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>

            <span className="eb-missing-title">Complete your profile</span>

            <span className="eb-missing-count">
              {missing.length} left
            </span>
          </div>

          <div className="eb-missing-pills">
            {missing.map((key) => (
              <button
                key={key}
                type="button"
                className="eb-pill"
                onClick={() => handleJump(key)}
                title={`Go to ${FIELD_META[key].label}`}
              >
                <span className="eb-pill-dot" aria-hidden="true" />
                <span className="eb-pill-label">
                  {FIELD_META[key].short}
                </span>
                <span className="eb-pill-arrow" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.6"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 1. General account details ─────────────────── */}
      <AccountInfo
        initial={{
          email,
          firstName,
          lastName,
          gender,
          phoneNumber: fullPhone || null,
        }}
        onSaved={handleAccountSaved}
      />

      {/* ── 2. Password change ─────────────────────────── */}
      <AccountPassword onSaved={onSaved} />
    </div>
  );
}

export default EditBio;