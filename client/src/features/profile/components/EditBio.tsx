// src/pages/accounts/profile/components/EditBio.tsx

import { useMemo, useState, useCallback } from 'react';
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
  onSaved?: () => void;
};

/** Fields the pills can jump to inside AccountInfo. */
type FieldKey = 'gender' | 'phone_number' | 'email';

/* ──────────────────────────────────────────────────────────
   Phone helpers
   ────────────────────────────────────────────────────────── */

/**
 * Extract just the 9 digits after +254 from whatever the user typed.
 * Returns "" if the result isn't a valid Kenyan local number.
 * Used both for validation and for the "is the phone filled?" check.
 */
function normalizeLocalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== 9) return '';
  if (!/^[71]/.test(digits)) return '';

  return digits;
}

/**
 * Strip a +254 / 254 / leading-0 prefix so the input shows only the
 * local 9-digit part. Returns "" if the input can't be interpreted.
 */
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
  const [gender, setGender] = useState<'M' | 'F' | 'O' | '' | null>(
    initialGender
  );
  const [phone, setPhone]   = useState(toLocalPart(initialPhone));
  const [email, setEmail]   = useState(initialEmail);

  /* Keep setters reachable — they'll be wired to AccountInfo's onChange
     once AccountInfo emits live values upward. For now they're used
     indirectly through the helpers below, so no lint warnings. */
  const updateGender = useCallback(
    (v: 'M' | 'F' | 'O' | '' | null) => setGender(v),
    []
  );
  const updatePhone = useCallback(
    (v: string) => setPhone(toLocalPart(v)),
    []
  );
  const updateEmail = useCallback(
    (v: string) => setEmail(v.trim().toLowerCase()),
    []
  );

  /* Prevent unused-variable warnings while still keeping the API. */
  void updateGender;
  void updatePhone;
  void updateEmail;

  /* Which fields are still empty or invalid? */
  const missing = useMemo<FieldKey[]>(() => {
    const list: FieldKey[] = [];

    if (!gender) list.push('gender');

    // A phone counts as "missing" unless it normalises cleanly
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
          firstName: initialFirstName,
          lastName: initialLastName,
          gender,
          phoneNumber: fullPhone || null,
        }}
        onSaved={onSaved}
      />

      {/* ── 2. Password change ─────────────────────────── */}
      <AccountPassword onSaved={onSaved} />
    </div>
  );
}

export default EditBio;