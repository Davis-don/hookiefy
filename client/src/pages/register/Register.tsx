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
  const navigate = useNavigate();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<FormData>(initialData);
  const [error, setError] = useState<string>('');

  const totalSteps = 3;

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

  // Google signup — same backend endpoint creates or links the account
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

  const goNext = () => {
    if (step === 1) {
      if (!data.firstName.trim()) return setError('Please enter your first name.');
      if (!data.lastName.trim()) return setError('Please enter your last name.');
      if (!data.phoneNumber.trim()) return setError('Please enter your phone number.');
      if (!data.gender) return setError('Please select your gender.');
    }
    if (step === 2) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      if (!emailOk) return setError('Please enter a valid email address.');
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
    if (!data.password) return setError('Please enter your password.');
    if (data.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!data.confirmPassword) return setError('Please confirm your password.');
    if (data.password !== data.confirmPassword) return setError('Passwords do not match.');
    setError('');
    registerMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email,
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

              <div className="yp-register-field">
                <span className="yp-register-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <input type="tel" placeholder="Phone number"
                  value={data.phoneNumber}
                  onChange={(e) => update('phoneNumber', e.target.value)}
                  autoComplete="tel" disabled={busy} />
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