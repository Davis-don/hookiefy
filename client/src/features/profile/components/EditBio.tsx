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
  const [phone, setPhone] = useState(initialPhone);
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
                        setPhone(v);
                      } else {
                        setEmail(v);
                      }
                    }}
                    onDone={() => setActiveKey(null)}
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
          phoneNumber: phone || null,
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
  onDone: () => void;
}) {
  return (
    <div className="eb-inline">
      {fieldKey === 'gender' ? (
        <select
          className="eb-inline-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        >
          <option value="">Select gender</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
      ) : (
        <input
          className="eb-inline-input"
          type={fieldKey === 'phone' ? 'tel' : 'email'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fieldKey === 'phone' ? 'e.g. +254712345678' : 'you@example.com'}
          autoFocus
        />
      )}

      <button
        type="button"
        className="eb-inline-done"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}

export default EditBio;