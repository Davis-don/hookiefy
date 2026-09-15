// Serviceprovider.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import './serviceprovider.css';

// ============================================================
// TYPES
// ============================================================

interface SignupPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  password: string;
  confirmpassword: string;
}

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

interface SignupResponse {
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

const API_BASE = import.meta.env.VITE_API_URL;
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

async function createServiceProvider(
  payload: SignupPayload
): Promise<SignupResponse> {
  const response = await fetch(
    `${API_BASE}/account/signup/service-provider/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        data,
        'Failed to create account. Please try again.'
      )
    );
  }

  return data;
}

async function googleServiceProvider(
  idToken: string
): Promise<SignupResponse> {
  const response = await fetch(
    `${API_BASE}/account/google/service-provider/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(data, 'Google signup failed. Please try again.')
    );
  }

  return data;
}

// ============================================================
// VALIDATION
// ============================================================

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  password: string;
  confirmPassword: string;
}

type FieldName = keyof FormData;
type ValidationErrors = Partial<Record<FieldName, string>>;

function validateField(
  name: FieldName,
  value: string,
  formData: FormData
): string | undefined {
  switch (name) {
    case 'firstName':
      if (!value.trim()) return 'First name is required';
      if (value.trim().length < 2)
        return 'Must be at least 2 characters';
      if (!/^[a-zA-Z\s'-]+$/.test(value.trim()))
        return 'Invalid characters';
      break;

    case 'lastName':
      if (!value.trim()) return 'Last name is required';
      if (value.trim().length < 2)
        return 'Must be at least 2 characters';
      if (!/^[a-zA-Z\s'-]+$/.test(value.trim()))
        return 'Invalid characters';
      break;

    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
        return 'Enter a valid email';
      break;

    case 'phoneNumber':
      if (!value.trim()) return 'Phone number is required';
      if (!/^[\d\s+()-]{7,20}$/.test(value.trim()))
        return 'Enter a valid phone number';
      break;

    case 'gender':
      if (!value) return 'Gender is required';
      break;

    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Min 8 characters';
      if (!/[A-Z]/.test(value)) return 'Add an uppercase letter';
      if (!/[a-z]/.test(value)) return 'Add a lowercase letter';
      if (!/[0-9]/.test(value)) return 'Add a number';
      break;

    case 'confirmPassword':
      if (!value) return 'Please confirm password';
      if (value !== formData.password) return 'Passwords do not match';
      break;
  }
  return undefined;
}

// ============================================================
// STEP CONFIG
// ============================================================

const STEPS: { id: number; title: string; fields: FieldName[] }[] = [
  {
    id: 1,
    title: 'Your details',
    fields: ['firstName', 'lastName', 'email'],
  },
  {
    id: 2,
    title: 'Contact info',
    fields: ['phoneNumber', 'gender'],
  },
  {
    id: 3,
    title: 'Secure your account',
    fields: ['password', 'confirmPassword'],
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

function Serviceprovider() {
  const navigate = useNavigate();
  const googleInitialized = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // ----- Handlers -----
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as FieldName]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name as FieldName, value, formData);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = STEPS[stepIndex];
    const stepErrors: ValidationErrors = {};
    const newTouched: Record<string, boolean> = {};

    step.fields.forEach((field) => {
      newTouched[field] = true;
      const error = validateField(field, formData[field], formData);
      if (error) stepErrors[field] = error;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setErrors((prev) => ({ ...prev, ...stepErrors }));

    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
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
    setDirection('forward');
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setDirection('back');
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // ----- Google signup mutation -----
  const googleSignupMutation = useMutation({
    mutationFn: googleServiceProvider,
    onSuccess: (result) => {
      const name = result.user?.first_name || 'there';
      if (result.access) localStorage.setItem('access_token', result.access);
      if (result.refresh) localStorage.setItem('refresh_token', result.refresh);

      toast.success('🎉 Signed up with Google!', {
        description: `Welcome ${name}! Redirecting you now...`,
        duration: 6000,
        style: {
          background: '#1a1a2e',
          border: '2px solid #22c55e',
          color: '#ffffff',
        },
      });

      if (!result.user?.phone_number || !result.user?.gender) {
        setTimeout(() => navigate('/complete-profile'), 1200);
      } else {
        setTimeout(() => navigate('/login'), 1200);
      }
    },
    onError: (error: Error) => {
      toast.error('Google Signup Failed', {
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

  // ----- Local signup mutation -----
  const localSignupMutation = useMutation({
    mutationFn: createServiceProvider,
    onSuccess: (result) => {
      const name = result.user?.first_name || 'there';
      if (result.access) localStorage.setItem('access_token', result.access);
      if (result.refresh) localStorage.setItem('refresh_token', result.refresh);

      toast.success('🎉 Account Created Successfully!', {
        description: `Welcome ${name}! Redirecting you now...`,
        duration: 6000,
        style: {
          background: '#1a1a2e',
          border: '2px solid #22c55e',
          color: '#ffffff',
        },
      });

      setTimeout(() => navigate('/dashboard'), 1200);
    },
    onError: (error: Error) => {
      toast.error('Signup Failed', {
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

  // ----- Google callback -----
  const handleGoogleCredential = useCallback(
    (response: { credential: string }) => {
      if (!response?.credential) {
        toast.error('Google signup failed', {
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
      googleSignupMutation.mutate(response.credential);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ----- Load Google script once -----
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

  // ----- Final submit -----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    let allValid = true;
    STEPS.forEach((_, idx) => {
      const step = STEPS[idx];
      const stepErrors: ValidationErrors = {};
      step.fields.forEach((field) => {
        const error = validateField(field, formData[field], formData);
        if (error) {
          stepErrors[field] = error;
          allValid = false;
        }
      });
      setErrors((prev) => ({ ...prev, ...stepErrors }));
    });

    if (!allValid) {
      toast.error('Please fix all fields', {
        duration: 4000,
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    localSignupMutation.mutate({
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      phone_number: formData.phoneNumber.trim(),
      gender: formData.gender,
      password: formData.password,
      confirmpassword: formData.confirmPassword,
    });
  };

  // ----- Google button -----
  const handleGoogleSignup = () => {
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
    localSignupMutation.isPending || googleSignupMutation.isPending;

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Field renderer
  const renderField = (field: FieldName) => {
    const hasError = touched[field] && errors[field];
    const groupClass = `input-group${hasError ? ' input-error' : ''}`;

    switch (field) {
      case 'firstName':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoFocus
            />
            {hasError && (
              <span className="error-message">{errors.firstName}</span>
            )}
          </div>
        );

      case 'lastName':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />
            {hasError && (
              <span className="error-message">{errors.lastName}</span>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field} className={groupClass}>
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
            />
            {hasError && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>
        );

      case 'phoneNumber':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="phoneNumber">Phone number</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={formData.phoneNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoFocus
            />
            {hasError && (
              <span className="error-message">{errors.phoneNumber}</span>
            )}
          </div>
        );

      case 'gender':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            >
              <option value="" disabled>
                Select gender
              </option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
            {hasError && (
              <span className="error-message">{errors.gender}</span>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoFocus
            />
            {hasError && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>
        );

      case 'confirmPassword':
        return (
          <div key={field} className={groupClass}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
            />
            {hasError && (
              <span className="error-message">
                {errors.confirmPassword}
              </span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="overall-service-provider-container">
      <div className="service-provider-form-container">
        {/* Header */}
        <div className="form-header">
          <h2>Create your account</h2>
          <p>Join as a service provider and start earning</p>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-label">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>

        {/* Step title */}
        <div className="step-title" key={currentStep}>
          {STEPS[currentStep].title}
        </div>

        {/* Form */}
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div
            className={`step-body step-${direction}`}
            key={currentStep}
          >
            {STEPS[currentStep].fields.map(renderField)}
          </div>

          {/* Password hint on last step */}
          {isLastStep && (
            <p className="password-hint">
              At least 8 characters with uppercase, lowercase & a number.
            </p>
          )}

          {/* Nav buttons */}
          <div className="nav-buttons">
            {!isFirstStep && (
              <button
                type="button"
                className="back-btn"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </button>
            )}

            {!isLastStep ? (
              <button
                type="button"
                className="submit-btn"
                onClick={handleNext}
                disabled={isLoading}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="submit-btn"
                disabled={isLoading}
              >
                {localSignupMutation.isPending
                  ? 'Creating account...'
                  : 'Create account'}
              </button>
            )}
          </div>

          {/* Divider + Google only on first step */}
          {isFirstStep && (
            <>
              <div className="divider">
                <hr />
                <span>or</span>
                <hr />
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignup}
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
                {googleSignupMutation.isPending
                  ? 'Signing up...'
                  : 'Continue with Google'}
              </button>
            </>
          )}

          {/* Login link */}
          <p className="login-link">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Serviceprovider;