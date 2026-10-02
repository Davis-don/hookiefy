import { useState } from 'react';
import { Link } from 'react-router-dom';
import './register.css';

type FormData = {
  firstName: string;
  lastName: string;
  gender: string;
  phoneNumber: string;
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

function Register() {
  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<FormData>(initialData);
  const [error, setError] = useState<string>('');

  const totalSteps = 3;

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const goNext = () => {
    // ── validation per step ─────────────────────────────
    if (step === 1) {
      if (!data.firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!data.lastName.trim()) {
        setError('Please enter your last name.');
        return;
      }
      if (!data.phoneNumber.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!data.gender) {
        setError('Please select your gender.');
        return;
      }
    }

    if (step === 2) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      if (!emailOk) {
        setError('Please enter a valid email address.');
        return;
      }
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

    if (!data.password) {
      setError('Please enter your password.');
      return;
    }
    if (data.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!data.confirmPassword) {
      setError('Please confirm your password.');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // TODO: send to your API
    // POST /api/accounts/register  { firstName, lastName, gender, phoneNumber, email, password }
    console.log('Register payload:', {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="yp-register-page">
      <div className="yp-register-card">

        {/* Avatar circle */}
        <div className="yp-register-avatar" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        </div>

        <h1 className="yp-register-title">CREATE ACCOUNT</h1>

        {/* Step indicator */}
        <div className="yp-register-steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={
                'yp-register-step-dot' +
                (step === n ? ' is-active' : '') +
                (step > n ? ' is-done' : '')
              }
            />
          ))}
        </div>

        <form className="yp-register-form" onSubmit={handleSubmit} noValidate>

          {/* ── Step 1: Basic details ───────────────────── */}
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
                <input
                  type="text"
                  placeholder="First name"
                  value={data.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  autoComplete="given-name"
                />
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
                <input
                  type="text"
                  placeholder="Last name"
                  value={data.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  autoComplete="family-name"
                />
              </div>

              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={data.phoneNumber}
                  onChange={(e) => update('phoneNumber', e.target.value)}
                  autoComplete="tel"
                />
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
                <select
                  value={data.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="yp-register-select"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </>
          )}

          {/* ── Step 2: Email ───────────────────────────── */}
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
              <input
                type="email"
                placeholder="Email address"
                value={data.email}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>
          )}

          {/* ── Step 3: Password + Confirm ──────────────── */}
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
                <input
                  type="password"
                  placeholder="Password"
                  value={data.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password"
                />
              </div>

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
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={data.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {error && <p className="yp-register-error">{error}</p>}

          {/* ── Buttons ─────────────────────────────────── */}
          <div className="yp-register-actions">
            {step > 1 && (
              <button
                type="button"
                className="yp-register-back"
                onClick={goBack}
              >
                Back
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                className="yp-register-submit"
                onClick={goNext}
              >
                NEXT
              </button>
            ) : (
              <button
                type="submit"
                className="yp-register-submit"
              >
                CREATE ACCOUNT
              </button>
            )}
          </div>

          <p className="yp-register-alt">
            Already have an account?{' '}
            <Link to="/login">Log in</Link>
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