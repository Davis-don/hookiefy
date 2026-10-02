import { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire up to your auth API
    console.log({ email, password, remember });
  };

  return (
    <div className="yp-login-page">
      <div className="yp-login-card">

        {/* Avatar circle */}
        <div className="yp-login-avatar" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        </div>

        <h1 className="yp-login-title">CUSTOMER LOGIN</h1>

        <form className="yp-login-form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
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
              required
            />
          </div>

          {/* Password */}
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
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Remember + Forgot */}
          <div className="yp-login-row">
            <label className="yp-login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
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

          {/* Submit */}
          <button type="submit" className="yp-login-submit">
            LOGIN
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