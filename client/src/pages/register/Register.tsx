import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { GoogleLogin } from '@react-oauth/google';

import { registerUser, type RegisterPayload } from './registerApi';
import { googleAuth } from '../login/googleApi';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/toast/ToastContext';
import { Spinner } from '../../components/spinner/Spinner';
import './register.css';

type FormData = {
  firstName: string;
  lastName: string;
  gender: string;
  phoneNumber: string; // local part only, e.g. "712345678"
  email: string;
  password: string;
  confirmPassword: string;
};

const initialData: FormData = {
  firstName: '',
  lastName: '',
  gender: '',
  phoneNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
};

// ---------- Phone helpers ----------

/**
 * Extract just the 9 digits after +254 from whatever the user typed.
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

// ---------- Email helpers ----------

const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMMON_TLDS = new Set([
  // generic
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz',
  'io', 'co', 'app', 'dev', 'ai', 'me', 'tv', 'xyz', 'online',
  'site', 'store', 'tech', 'cloud', 'email', 'pro', 'name',

  // Africa / Kenya + common
  'ke', 'tz', 'ug', 'rw', 'bi', 'et', 'so', 'ss', 'sd', 'eg',
  'za', 'ng', 'gh', 'zm', 'zw', 'mw', 'mz', 'na', 'bw',

  // common others
  'uk', 'us', 'ca', 'au', 'nz', 'de', 'fr', 'es', 'it', 'nl',
  'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'ie', 'pt', 'gr',
  'pl', 'cz', 'ro', 'hu', 'ru', 'ua', 'tr', 'il', 'ae', 'sa',
  'in', 'pk', 'bd', 'lk', 'np', 'cn', 'jp', 'kr', 'sg', 'my',
  'id', 'ph', 'th', 'vn', 'hk', 'tw',
]);

const EMAIL_TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmailcom': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.comm': 'gmail.com',

  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',

  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'homail.com': 'hotmail.com',

  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outllok.com': 'outlook.com',

  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icoud.com': 'icloud.com',

  'protonmai.com': 'protonmail.com',
  'protonmal.com': 'protonmail.com',

  'yandex.co': 'yandex.com',
  'yandex.con': 'yandex.com',
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'fakeinbox.com',
]);

/**
 * Return an error message string, or "" if the email is valid.
 * Mirrors the backend's validate_email_address().
 */
function validateEmail(raw: string): string {
  const value = raw.trim().toLowerCase();

  if (!value) return 'Please enter your email address.';

  if (!EMAIL_SHAPE_RE.test(value)) {
    return 'Enter a valid email address.';
  }

  if (value.length > 254) {
    return 'Email address is too long.';
  }

  const atIndex = value.lastIndexOf('@');
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (!local || !domain) {
    return 'Enter a valid email address.';
  }

  if (local.length > 64) {
    return 'The part before @ cannot exceed 64 characters.';
  }

  if (!domain.includes('.')) {
    return 'Enter a valid email address.';
  }

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

// ---------- Component ----------

function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<FormData>(initialData);
  const [error, setError] = useState<string>('');

  const totalSteps = 3;

  // Live checks
  const pwChecks = checkPassword(data.password);
  const pwAllGood = allPasswordChecksPass(pwChecks);

  // Email / password signup
  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (res) => {
      toast.success(
        res.message || 'Account created successfully. Please log in to continue.'
      );
      navigate('/login', { state: { email: data.email } });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not create your account.');
    },
  });

  // Google signup
  const googleMutation = useMutation({
    mutationFn: (idToken: string) => googleAuth(idToken),
    onSuccess: (res) => {
      setAuth({
        user: res.user,
        access: res.tokens.access,
        refresh: res.tokens.refresh,
      });
      toast.success(res.message || 'Account created with Google.');
      const role = res.user.role;
      navigate(role === 'superadmin' ? '/superaccount' : '/useraccount');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Google sign-up failed.');
    },
  });

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // Digits only, max 10 (allows a leading 0 like 0712345678)
  const updatePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    update('phoneNumber', digits);
  };

  const goNext = () => {
    if (step === 1) {
      if (!data.firstName.trim()) return setError('Please enter your first name.');
      if (!data.lastName.trim()) return setError('Please enter your last name.');
      if (!data.phoneNumber.trim()) return setError('Please enter your phone number.');
      if (!normalizeLocalPhone(data.phoneNumber)) {
        return setError(
          'Enter a valid Kenyan number. It must start with 07, 01, 7 or 1.'
        );
      }
      if (!data.gender) return setError('Please select your gender.');
    }

    if (step === 2) {
      const emailError = validateEmail(data.email);
      if (emailError) return setError(emailError);
    }

    setError('');
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const local = normalizeLocalPhone(data.phoneNumber);
    if (!local) {
      return setError('Phone number is not valid.');
    }

    const emailError = validateEmail(data.email);
    if (emailError) {
      return setError(emailError);
    }

    if (!data.password) return setError('Please enter your password.');
    if (!pwAllGood) {
      return setError('Password does not meet all the requirements below.');
    }
    if (!data.confirmPassword) return setError('Please confirm your password.');
    if (data.password !== data.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setError('');

    registerMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phoneNumber: `+254${local}`,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  const busy = registerMutation.isPending || googleMutation.isPending;

  return (
    <div className="yp-register-page">
      <div className="yp-register-card">
        <div className="yp-register-avatar" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        </div>

        <h1 className="yp-register-title">CREATE ACCOUNT</h1>

        <div className="yp-register-steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n}
              className={
                'yp-register-step-dot' +
                (step === n ? ' is-active' : '') +
                (step > n ? ' is-done' : '')
              } />
          ))}
        </div>

        {/* Google sign-up */}
        <div className="yp-register-google-wrap">
          {googleMutation.isPending ? (
            <div className="yp-register-google-loading">
              <Spinner size={18} label="Connecting to Google…" />
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  googleMutation.mutate(credentialResponse.credential);
                } else {
                  toast.error('Google did not return a credential.');
                }
              }}
              onError={() => toast.error('Google sign-up was cancelled.')}
              useOneTap={false}
              theme="outline"
              size="large"
              width="300"
              text="signup_with"
              shape="rectangular"
            />
          )}
        </div>

        <div className="yp-register-divider" aria-hidden="true">
          <span className="yp-register-divider-line" />
          <span className="yp-register-divider-text">or</span>
          <span className="yp-register-divider-line" />
        </div>

        <form className="yp-register-form" onSubmit={handleSubmit} noValidate>

          {step === 1 && (
            <>
              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
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
                  autoComplete="given-name" disabled={busy} />
              </div>

              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
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
                  autoComplete="family-name" disabled={busy} />
              </div>

              {/* Phone with fixed +254 prefix */}
              <div className="yp-register-field yp-register-phone">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <span className="yp-register-phone-prefix">+254</span>
                <input type="tel" placeholder="Phone number starting with 01 or 07"
                  value={data.phoneNumber}
                  onChange={(e) => updatePhone(e.target.value)}
                  autoComplete="tel-national" disabled={busy}
                  inputMode="numeric"
                  maxLength={10}
                  aria-label="Kenyan phone number without the +254 prefix" />
              </div>

              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <select value={data.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="yp-register-select" disabled={busy}>
                  <option value="" disabled>Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="yp-register-field">
              <span className="yp-register-icon" aria-hidden="true">
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
                autoComplete="email" disabled={busy} />
            </div>
          )}

          {step === 3 && (
            <>
              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="1.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    <circle cx="12" cy="16" r="1.2" />
                  </svg>
                </span>
                <input type="password" placeholder="Password"
                  value={data.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password" disabled={busy} />
              </div>

              {/* Live password rules */}
              <ul className="yp-password-rules" aria-live="polite">
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

              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="1.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    <circle cx="12" cy="16" r="1.2" />
                  </svg>
                </span>
                <input type="password" placeholder="Confirm password"
                  value={data.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  autoComplete="new-password" disabled={busy} />
              </div>
            </>
          )}

          {error && <p className="yp-register-error">{error}</p>}

          <div className="yp-register-actions">
            {step > 1 && (
              <button type="button" className="yp-register-back"
                onClick={goBack} disabled={busy}>Back</button>
            )}
            {step < totalSteps ? (
              <button type="button" className="yp-register-submit"
                onClick={goNext} disabled={busy}>NEXT</button>
            ) : (
              <button type="submit" className="yp-register-submit" disabled={busy}>
                {registerMutation.isPending
                  ? <Spinner size={18} label="Creating account…" />
                  : 'CREATE ACCOUNT'}
              </button>
            )}
          </div>

          <p className="yp-register-alt">
            Already have an account? <Link to="/login">Log in</Link>
          </p>

          <p className="yp-register-terms">
            By creating an account you agree to our{' '}
            <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;