import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { GoogleLogin } from '@react-oauth/google';

import { loginUser, type LoginPayload } from './loginApi';
import { googleAuth } from './googleApi';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/toast/ToastContext';
import { Spinner } from '../../components/spinner/Spinner';
import './login.css';

/* ──────────────────────────────────────────────────────────
   Eye icons
   ────────────────────────────────────────────────────────── */

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

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);

  const prefilledEmail =
    (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const redirectByRole = (role: string) => {
    if (role === 'superadmin') navigate('/superaccount');
    else navigate('/useraccount');
  };

  // ── Email / password login ────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => loginUser(payload),
    onSuccess: (res) => {
      setAuth({
        user: res.user,
        access: res.tokens.access,
        refresh: res.tokens.refresh,
      });
      toast.success(res.message || 'Logged in successfully.');
      redirectByRole(res.user.role);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid email or password.');
    },
  });

  // ── Google login ──────────────────────────────────────
  const googleMutation = useMutation({
    mutationFn: (idToken: string) => googleAuth(idToken),
    onSuccess: (res) => {
      setAuth({
        user: res.user,
        access: res.tokens.access,
        refresh: res.tokens.refresh,
      });
      toast.success(res.message || 'Signed in with Google.');
      redirectByRole(res.user.role);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Google sign-in failed.');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    if (!password) return setError('Please enter your password.');
    loginMutation.mutate({ email, password });
  };

  const busy = loginMutation.isPending || googleMutation.isPending;

  return (
    <div className="yp-login-page">
      <div className="yp-login-card">

        <div className="yp-login-avatar" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        </div>

        <h1 className="yp-login-title">CUSTOMER LOGIN</h1>

        {/* ── Google login ────────────────────────────── */}
        <div className="yp-login-google-wrap">
          {googleMutation.isPending ? (
            <div className="yp-login-google-loading">
              <Spinner size={18} label="Signing in with Google…" />
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
              onError={() => toast.error('Google sign-in was cancelled.')}
              useOneTap={false}
              theme="outline"
              size="large"
              width="300"
              text="signin_with"
              shape="rectangular"
            />
          )}
        </div>

        <div className="yp-login-divider" aria-hidden="true">
          <span className="yp-login-divider-line" />
          <span className="yp-login-divider-text">or</span>
          <span className="yp-login-divider-line" />
        </div>

        <form className="yp-login-form" onSubmit={handleSubmit} noValidate>

          <div className="yp-login-field">
            <span className="yp-login-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
                <path d="M3 5l9 7 9-7" />
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </div>

          <div className="yp-login-field">
            <span className="yp-login-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                <circle cx="12" cy="16" r="1.2" />
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />
            <button
              type="button"
              className="yp-login-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
              disabled={busy}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="yp-login-row">
            <label className="yp-login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy}
              />
              <span className="yp-login-check" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="4 12 10 18 20 6" />
                </svg>
              </span>
              Remember me
            </label>

            <Link to="/forgot-password" className="yp-login-forgot">
              Forgot Password?
            </Link>
          </div>

          {error && <p className="yp-login-error">{error}</p>}

          <button type="submit" className="yp-login-submit" disabled={busy}>
            {loginMutation.isPending
              ? <Spinner size={18} label="Logging in…" />
              : 'LOGIN'}
          </button>

          <p className="yp-login-alt">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>

          <p className="yp-login-terms">
            By continuing you agree to our{' '}
            <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;