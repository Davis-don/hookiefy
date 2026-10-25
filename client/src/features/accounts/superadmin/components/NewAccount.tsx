// src/pages/accounts/components/NewAccount.tsx

import { useState } from 'react';
import { createYoupataAccount } from '../api/accounts';
import { useAuthStore } from '../../../../store/authStore';
import './NewAccount.css';

type NewAccountProps = {
  onCreated?: () => void;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: '' | 'M' | 'F' | 'O';
  password: string;
  confirmPassword: string;
};

const initialData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: '',
  password: '',
  confirmPassword: '',
};

// ---------- Email helpers ----------

const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz',
  'io', 'co', 'app', 'dev', 'ai', 'me', 'tv', 'xyz', 'online',
  'site', 'store', 'tech', 'cloud', 'email', 'pro', 'name',
  'ke', 'tz', 'ug', 'rw', 'bi', 'et', 'so', 'ss', 'sd', 'eg',
  'za', 'ng', 'gh', 'zm', 'zw', 'mw', 'mz', 'na', 'bw',
  'uk', 'us', 'ca', 'au', 'nz', 'de', 'fr', 'es', 'it', 'nl',
  'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'ie', 'pt', 'gr',
  'pl', 'cz', 'ro', 'hu', 'ru', 'ua', 'tr', 'il', 'ae', 'sa',
  'in', 'pk', 'bd', 'lk', 'np', 'cn', 'jp', 'kr', 'sg', 'my',
  'id', 'ph', 'th', 'vn', 'hk', 'tw',
]);

const EMAIL_TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com', 'gmailcom': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com', 'yhaoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'outllok.com': 'outlook.com',
  'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com',
  'protonmai.com': 'protonmail.com', 'protonmal.com': 'protonmail.com',
  'yandex.co': 'yandex.com', 'yandex.con': 'yandex.com',
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'guerrillamail.com', 'sharklasers.com', 'throwawaymail.com', 'yopmail.com',
  'trashmail.com', 'getnada.com', 'dispostable.com', 'fakeinbox.com',
]);

function validateEmail(raw: string): string {
  const value = raw.trim().toLowerCase();

  if (!value) return 'Please enter an email address.';
  if (!EMAIL_SHAPE_RE.test(value)) return 'Enter a valid email address.';
  if (value.length > 254) return 'Email address is too long.';

  const atIndex = value.lastIndexOf('@');
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (!local || !domain) return 'Enter a valid email address.';
  if (local.length > 64) return 'The part before @ cannot exceed 64 characters.';
  if (!domain.includes('.')) return 'Enter a valid email address.';

  const tld = domain.slice(domain.lastIndexOf('.') + 1);

  if (!COMMON_TLDS.has(tld)) {
    return `'.${tld}' is not a recognised email domain ending.`;
  }
  if (EMAIL_TYPO_DOMAINS[domain]) {
    return `Did you mean ${local}@${EMAIL_TYPO_DOMAINS[domain]}?`;
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Disposable email addresses are not allowed.';
  }

  return '';
}

// ---------- Phone helpers (mirrors backend rules) ----------

function normalizeLocalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  let d = digits;
  if (d.startsWith('254') && d.length > 9) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length !== 9) return '';
  if (!/^[71]/.test(d)) return '';

  return d;
}

function validatePhone(raw: string): string {
  if (!raw.trim()) return '';
  if (!normalizeLocalPhone(raw)) {
    return 'Enter a valid Kenyan number. It must start with 07, 01, 7 or 1.';
  }
  return '';
}

// ---------- Password helpers ----------

type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
};

function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function allPasswordChecksPass(c: PasswordChecks): boolean {
  return c.length && c.upper && c.lower && c.digit && c.special;
}

// ---------- Eye icons ----------

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ---------- Component ----------

function NewAccount({ onCreated }: NewAccountProps) {
  const accessToken = useAuthStore((s) => s.access);

  const [data, setData] = useState<FormData>(initialData);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwChecks = checkPassword(data.password);
  const pwAllGood = allPasswordChecksPass(pwChecks);

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!data.firstName.trim()) return setError('Please enter a first name.');
    if (!data.lastName.trim()) return setError('Please enter a last name.');

    const emailError = validateEmail(data.email);
    if (emailError) return setError(emailError);

    const phoneError = validatePhone(data.phoneNumber);
    if (phoneError) return setError(phoneError);

    if (!data.password) return setError('Please enter a password.');
    if (!pwAllGood) {
      return setError('Password does not meet all the requirements below.');
    }
    if (!data.confirmPassword) return setError('Please confirm the password.');
    if (data.password !== data.confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (!accessToken) {
      return setError(
        'Your session has expired. Please log in again as a superadmin.',
      );
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await createYoupataAccount(
        {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          phoneNumber: data.phoneNumber.trim() || undefined,
          gender: data.gender || undefined,
          password: data.password,
          confirmPassword: data.confirmPassword,
        },
        accessToken,
      );

      setSuccess(
        `Youpata-managed account created for ${res.user.email}.`,
      );
      setData(initialData);
      onCreated?.();
    } catch (err: any) {
      setError(err?.message || 'Could not create the account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sa-form-page">
      <form className="sa-form-card" onSubmit={handleSubmit} noValidate>
        <div className="sa-form-grid">
          {/* First name */}
          <div className="sa-field">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </span>
            <input type="text" placeholder="First name"
              value={data.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              autoComplete="given-name" disabled={submitting} />
          </div>

          {/* Last name */}
          <div className="sa-field">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </span>
            <input type="text" placeholder="Last name"
              value={data.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              autoComplete="family-name" disabled={submitting} />
          </div>

          {/* Email */}
          <div className="sa-field sa-field-wide">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
                <path d="M3 5l9 7 9-7" />
              </svg>
            </span>
            <input type="email" placeholder="Email address"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email" disabled={submitting} />
          </div>

          {/* Phone number */}
          <div className="sa-field sa-field-wide">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <input type="tel" placeholder="Phone number (optional)"
              value={data.phoneNumber}
              onChange={(e) => update('phoneNumber', e.target.value)}
              autoComplete="tel" disabled={submitting} />
          </div>

          {/* Gender */}
          <div className="sa-field sa-field-wide">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="6" />
                <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" />
              </svg>
            </span>
            <select
              value={data.gender}
              onChange={(e) => update('gender', e.target.value)}
              disabled={submitting}
              className="sa-select"
            >
              <option value="">Select gender (optional)</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          {/* Password */}
          <div className="sa-field sa-field-wide">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                <circle cx="12" cy="16" r="1.2" />
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={data.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              className="sa-register-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
              disabled={submitting}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {/* Password rules */}
          <ul className="sa-password-rules sa-field-wide" aria-live="polite">
            <li className={pwChecks.length ? 'is-ok' : ''}>
              At least 8 characters
            </li>
            <li className={pwChecks.upper ? 'is-ok' : ''}>
              At least one uppercase letter (A–Z)
            </li>
            <li className={pwChecks.lower ? 'is-ok' : ''}>
              At least one lowercase letter (a–z)
            </li>
            <li className={pwChecks.digit ? 'is-ok' : ''}>
              At least one number (0–9)
            </li>
            <li className={pwChecks.special ? 'is-ok' : ''}>
              At least one special character (! @ # $ % …)
            </li>
          </ul>

          {/* Confirm password */}
          <div className="sa-field sa-field-wide">
            <span className="sa-register-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                <circle cx="12" cy="16" r="1.2" />
              </svg>
            </span>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              value={data.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              className="sa-register-eye"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              title={showConfirm ? 'Hide password' : 'Show password'}
              tabIndex={-1}
              disabled={submitting}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && <p className="sa-alert sa-alert-error">{error}</p>}
        {success && <p className="sa-alert sa-alert-success">{success}</p>}

        <div className="sa-form-actions">
          <button type="submit" className="sa-btn sa-btn-primary"
            disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Youpata-managed account'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewAccount;