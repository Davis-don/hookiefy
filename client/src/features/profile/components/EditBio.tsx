// src/pages/accounts/profile/components/EditBio.tsx

import { useMemo, useState } from 'react';
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
  onClose?: () => void;
  onSaved?: () => void;
};

type MissingKey = 'gender' | 'phone' | 'email';

/* ──────────────────────────────────────────────────────────
   Phone helpers — mirrored from Register
   ────────────────────────────────────────────────────────── */

/**
 * Extract just the 9 digits after +254 from whatever the user typed.
 * Returns "" if the result isn't a valid Kenyan local number.
 */
function normalizeLocalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length > 9) {
    digits = digits.slice(3);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 9) return '';
  if (!/^[71]/.test(digits)) return '';

  return digits;
}

/**
 * Strip a +254 / 254 / leading-0 prefix so we can show only the local part
 * inside the input (the "+254" is displayed as a fixed prefix next to it).
 */
function toLocalPart(raw: string): string {
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length > 9) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
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
  /* Local mirror so inline edits update the notice immediately */
  const [gender, setGender] = useState<'M' | 'F' | 'O' | '' | null>(initialGender);
  const [phone, setPhone] = useState(toLocalPart(initialPhone));
  const [email, setEmail] = useState(initialEmail);

  /* Which fields are still empty? */
  const missing = useMemo<MissingKey[]>(() => {
    const list: MissingKey[] = [];
    if (!gender) list.push('gender');
    if (!phone.trim()) list.push('phone');
    if (!email.trim()) list.push('email');
    return list;
  }, [gender, phone, email]);

  /* Toggle: which missing field is currently being edited */
  const [activeKey, setActiveKey] = useState<MissingKey | null>(null);

  const missingLabels: Record<MissingKey, string> = {
    gender: 'Gender',
    phone: 'Phone number',
    email: 'Email address',
  };

  /* The phone passed to AccountInfo is always the full E.164 value */
  const fullPhone = phone ? `+254${phone}` : '';

  return (
    <div className="overall-container-edit">
      {/* ── Missing-info notice ─────────────────────────── */}
      {missing.length > 0 && (
        <div className="eb-notice" role="status" aria-live="polite">
          <div className="eb-notice-head">
            <span className="eb-notice-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <p className="eb-notice-text">
              Some details are missing from your profile. Click a box to add
              the missing information.
            </p>
          </div>

          <ul className="eb-notice-list" role="list">
            {missing.map((key) => (
              <li key={key} className="eb-notice-item">
                {activeKey === key ? (
                  <InlineEditor
                    fieldKey={key}
                    value={
                      key === 'gender'
                        ? (gender ?? '')
                        : key === 'phone'
                          ? phone
                          : email
                    }
                    onChange={(v) => {
                      if (key === 'gender') {
                        setGender(v as 'M' | 'F' | 'O' | '');
                      } else if (key === 'phone') {
                        // digits only, max 9 (local part)
                        setPhone(v.replace(/\D/g, '').slice(0, 9));
                      } else {
                        setEmail(v);
                      }
                    }}
                    onDone={(valid) => {
                      if (valid) setActiveKey(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="eb-notice-box"
                    onClick={() => setActiveKey(key)}
                  >
                    <span className="eb-notice-label">
                      {missingLabels[key]}
                    </span>
                    <span className="eb-notice-hint">Not set — click to add</span>
                    <span className="eb-notice-plus" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
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

/* ──────────────────────────────────────────────────────────
   Inline editor for a single missing field
   ────────────────────────────────────────────────────────── */

function InlineEditor({
  fieldKey,
  value,
  onChange,
  onDone,
}: {
  fieldKey: MissingKey;
  value: string;
  onChange: (v: string) => void;
  /** valid = true only if the value passed validation */
  onDone: (valid: boolean) => void;
}) {
  const [error, setError] = useState<string>('');

  const handleDone = () => {
    if (fieldKey === 'phone') {
      const local = normalizeLocalPhone(value);
      if (!local) {
        setError(
          'Enter a valid Kenyan number. It must start with 07, 01, 7 or 1.'
        );
        return;
      }
      setError('');
    }
    if (fieldKey === 'email') {
      if (!value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setError('Enter a valid email address.');
        return;
      }
      setError('');
    }
    if (fieldKey === 'gender' && !value) {
      setError('Please select a gender.');
      return;
    }
    onDone(true);
  };

  return (
    <div className="eb-inline-wrap">
      <div className="eb-inline">
        {fieldKey === 'gender' ? (
          <select
            className="eb-inline-input"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setError('');
            }}
            autoFocus
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        ) : fieldKey === 'phone' ? (
          <div className="eb-inline-phone">
            <span className="eb-inline-phone-prefix">+254</span>
            <input
              className="eb-inline-input eb-inline-phone-input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (error) setError('');
              }}
              placeholder="7XX XXX XXX"
              autoFocus
            />
          </div>
        ) : (
          <input
            className="eb-inline-input"
            type="email"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (error) setError('');
            }}
            placeholder="you@example.com"
            autoFocus
          />
        )}

        <button
          type="button"
          className="eb-inline-done"
          onClick={handleDone}
        >
          Done
        </button>
      </div>

      {error && <p className="eb-inline-error">{error}</p>}
    </div>
  );
}

export default EditBio;