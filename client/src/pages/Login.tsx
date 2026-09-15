// Login.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast, } from 'sonner';
import { useAuthStore } from '../store/authtokenstore';
import './login.css';

// ============================================================
// TYPES
// ============================================================

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  gender: string | null;
  role: string;
  profile_image_url: string | null;
  has_profile_image: boolean;
  auth_provider: string;
}

interface LoginResponse {
  message: string;
  access: string;
  refresh: string;
  user: UserData;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

// ============================================================
// API HELPERS
// ============================================================

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;

  if (typeof data.message === 'string' && data.message) {
    if (data.errors && typeof data.errors === 'object') {
      const detail = Object.entries(data.errors)
        .map(
          ([field, errs]) =>
            `${field}: ${
              Array.isArray(errs) ? errs.join(', ') : String(errs)
            }`
        )
        .join(' | ');
      return `${data.message} — ${detail}`;
    }
    return data.message;
  }

  if (data.errors && typeof data.errors === 'object') {
    return Object.entries(data.errors)
      .map(
        ([field, errs]) =>
          `${field}: ${
            Array.isArray(errs) ? errs.join(', ') : String(errs)
          }`
      )
      .join(' | ');
  }

  const fieldErrors = Object.entries(data)
    .filter(([, v]) => Array.isArray(v) || typeof v === 'string')
    .map(
      ([field, errs]) =>
        `${field}: ${
          Array.isArray(errs) ? errs.join(', ') : String(errs)
        }`
    )
    .join(' | ');

  return fieldErrors || fallback;
}

/**
 * Safely parse a fetch response — throws a clear error
 * if the server did not return JSON.
 */
async function parseJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('❌ Non-JSON response:', text.substring(0, 200));
    throw new Error(
      'Server returned unexpected response. Please try again.'
    );
  }

  return response.json();
}

async function loginWithCredentials(payload: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const url = `${API_BASE}/account/login/`;
  console.log('📤 Sending login request to:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(data, 'Login failed. Please try again.')
    );
  }

  return data;
}

async function googleLoginByRole(
  idToken: string,
  role: 'serviceprovider' | 'serviceseeker'
): Promise<LoginResponse> {
  const slug =
    role === 'serviceprovider' ? 'service-provider' : 'service-seeker';

  const url = `${API_BASE}/account/google/${slug}/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ token: idToken }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(data, 'Google login failed. Please try again.')
    );
  }

  return data;
}

/**
 * Try both role endpoints. The backend returns a clear
 * "different account type" message when the Google account
 * belongs to the other role, so we fall back safely.
 */
async function googleLogin(idToken: string): Promise<LoginResponse> {
  try {
    return await googleLoginByRole(idToken, 'serviceprovider');
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    const isRoleMismatch =
      message.toLowerCase().includes('different account type') ||
      message.toLowerCase().includes('belongs to a different');

    if (isRoleMismatch) {
      return await googleLoginByRole(idToken, 'serviceseeker');
    }

    throw err;
  }
}

// ============================================================
// VALIDATION
// ============================================================

interface FormData {
  email: string;
  password: string;
}

type FieldName = keyof FormData;
type ValidationErrors = Partial<Record<FieldName, string>>;

function validateField(
  name: FieldName,
  value: string
): string | undefined {
  switch (name) {
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
        return 'Enter a valid email';
      break;

    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Min 6 characters';
      break;
  }
  return undefined;
}

// ============================================================
// ROLE → DASHBOARD ROUTE
// ============================================================

function getDashboardRoute(role: string | undefined): string {
  switch (role) {
    case 'superadmin':
      return '/superadmin/dashboard';
    case 'serviceprovider':
      return '/service_provider/dashboard';
    case 'serviceseeker':
      return '/service_seeker/dashboard';
    default:
      return '/unauthorized';
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function Login() {
  const navigate = useNavigate();
  const googleInitialized = useRef(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ✅ Auth store (Zustand)
  const { setTokens } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as FieldName]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name as FieldName, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // ============================================================
  // SHARED SUCCESS HANDLER
  // ============================================================

  const handleLoginSuccess = (result: LoginResponse) => {
    const name = result.user?.first_name || 'there';

    // ✅ Store tokens + user in Zustand auth store (persisted)
    setTokens({
      access: result.access,
      refresh: result.refresh,
      user: result.user,
    });

    console.log('✅ Login successful, tokens + user stored in auth store');

    toast.success('🎉 Login successful!', {
      description: `Welcome back, ${name}!`,
      duration: 4000,
      style: {
        background: '#1a1a2e',
        border: '2px solid #22c55e',
        color: '#ffffff',
      },
    });

    const target = getDashboardRoute(result.user?.role);
    setTimeout(() => navigate(target), 900);
  };

  // ============================================================
  // LOCAL LOGIN MUTATION
  // ============================================================

  const loginMutation = useMutation({
    mutationFn: loginWithCredentials,
    onSuccess: handleLoginSuccess,
    onError: (error: Error) => {
      console.error('❌ Login error:', error.message);
      // Stay on the login page — only show the error
      toast.error('Login Failed', {
        description: error.message,
        duration: 6000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // ============================================================
  // GOOGLE LOGIN MUTATION
  // ============================================================

  const googleLoginMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: handleLoginSuccess,
    onError: (error: Error) => {
      console.error('❌ Google login error:', error.message);
      // Stay on the login page — only show the error
      toast.error('Google Login Failed', {
        description: error.message,
        duration: 6000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // ============================================================
  // GOOGLE CALLBACK
  // ============================================================

  const handleGoogleCredential = useCallback(
    (response: { credential: string }) => {
      if (!response?.credential) {
        toast.error('Google login failed', {
          description: 'No credential returned from Google.',
          duration: 5000,
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
        return;
      }
      googleLoginMutation.mutate(response.credential);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ============================================================
  // LOAD GOOGLE IDENTITY SCRIPT
  // ============================================================

  useEffect(() => {
    if (googleInitialized.current) return;

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        googleInitialized.current = true;
      }
    };

    const existing = document.getElementById('google-identity-script');
    if (existing) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-identity-script';
    script.onload = initializeGoogle;
    script.onerror = () => {
      toast.error('Failed to load Google sign-in', {
        description: 'Check your internet and try again.',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    };
    document.body.appendChild(script);
  }, [handleGoogleCredential]);

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    setTouched({ email: true, password: true });
    setErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) {
      toast.error('Please fix the highlighted fields', {
        duration: 3000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    loginMutation.mutate({
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  // ============================================================
  // GOOGLE BUTTON
  // ============================================================

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google sign-in misconfigured', {
        description: 'Missing VITE_GOOGLE_CLIENT_ID env variable.',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }
    if (!window.google?.accounts?.id) {
      toast.error('Google sign-in not ready', {
        description: 'Please wait a moment and try again.',
        duration: 4000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }
    window.google.accounts.id.prompt();
  };

  const isLoading =
    loginMutation.isPending || googleLoginMutation.isPending;

  // ============================================================
  // RENDER
  // ============================================================

  const emailHasError = touched.email && errors.email;
  const passwordHasError = touched.password && errors.password;

  return (
    <div className="overall-login-container">
      <div className="login-form-container">
        {/* Header */}
        <div className="form-header">
          <h2>Welcome back</h2>
          <p>Log in to continue to your account</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div
            className={`input-group${
              emailHasError ? ' input-error' : ''
            }`}
          >
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
            {emailHasError && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          {/* Password */}
          <div
            className={`input-group${
              passwordHasError ? ' input-error' : ''
            }`}
          >
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoComplete="current-password"
            />
            {passwordHasError && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          {/* Forgot password link */}
          <div className="forgot-password">
            <a href="/forgot-password">Forgot password?</a>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {loginMutation.isPending ? 'Logging in...' : 'Log in'}
          </button>

          {/* Divider */}
          <div className="divider">
            <hr />
            <span>or</span>
            <hr />
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoginMutation.isPending
              ? 'Signing in...'
              : 'Continue with Google'}
          </button>

          {/* Signup link at bottom */}
          <p className="signup-link">
            Don't have an account? <a href="/signup">Sign up</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;