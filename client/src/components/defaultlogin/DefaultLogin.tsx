// ============================================================
// DefaultLogin.tsx - Login modal with slide-up animation (Blue theme)
// ============================================================

import './defaultlogin.css'
import { IoClose } from "react-icons/io5";
import { IoLogInOutline } from "react-icons/io5";
import { IoPerson } from "react-icons/io5";
import { IoLockClosed } from "react-icons/io5";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';

// ============================================================
// TYPES
// ============================================================

interface DefaultLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultLogin({ isOpen, onClose, onSwitchToSignup }: DefaultLoginProps) {
  const navigate = useNavigate();
  
  // Form state
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Auth store
  const { setTokens } = useAuthStore();

  // ✅ API URL with proper fallback
  const API_URL = import.meta.env.VITE_API_URL || "https://hookiefy-server-7d6d.onrender.com";

  // ✅ LOGIN MUTATION with proper error handling
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const url = `${API_URL}/account/login/`;
      console.log("📤 Sending login request to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });

      // ✅ Check if response is JSON
      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned unexpected response. Please try again.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || result.detail || "Login failed");
      }

      return result as LoginResponse;
    },

    onSuccess: (data) => {
      setTokens({
        access: data.access,
        refresh: data.refresh,
      });

      console.log("✅ Login successful, tokens stored in auth store");

      setErrorMessage(null);
      onClose();

      if (data.user?.role === "superadmin") {
        navigate("/superadmin/dashboard");
      } else if (data.user?.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user?.role === "user") {
        navigate("/user/dashboard");
      } else {
        navigate("/unauthorized");
      }
    },

    onError: (error: any) => {
      console.error("❌ Login error:", error.message);
      setErrorMessage(error.message || "Login failed. Please check your credentials.");
    },
  });

  // ✅ Conditional return AFTER all hooks
  if (!isOpen) return null;

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignUp = () => {
    onClose();
    if (onSwitchToSignup) {
      onSwitchToSignup();
    } else {
      navigate('/signup');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate(loginData);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="default-login-overlay" onClick={onClose}>
      <div className="default-login-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="default-login-close-btn" onClick={onClose}>
          <IoClose />
        </button>

        {/* Gradient accent bar at top - Blue */}
        <div className="default-login-accent-bar"></div>

        {/* Logo/Brand */}
        <div className="default-login-brand">
          <h2>Hookiefy</h2>
          <p>Welcome back! Please login to your account</p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="default-login-error">
            <span className="default-login-error-icon">⚠️</span>
            <span className="default-login-error-text">{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {loginMutation.isSuccess && (
          <div className="default-login-success">
            <span className="default-login-success-icon">✅</span>
            <span className="default-login-success-text">
              {loginMutation.data?.message || "Login successful!"}
            </span>
          </div>
        )}

        {/* Login Form */}
        <form className="default-login-form" onSubmit={handleSubmit} noValidate>
          <div className="default-login-input-group">
            <div className="default-login-input-icon">
              <IoPerson />
            </div>
            <input
              type="email"
              name="email"
              className={`default-login-input ${errorMessage ? 'error' : ''}`}
              placeholder="Email Address"
              value={loginData.email}
              onChange={handleChange}
              disabled={loginMutation.isPending}
              required
            />
          </div>

          <div className="default-login-input-group">
            <div className="default-login-input-icon">
              <IoLockClosed />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className={`default-login-input ${errorMessage ? 'error' : ''}`}
              placeholder="Password"
              value={loginData.password}
              onChange={handleChange}
              disabled={loginMutation.isPending}
              required
              minLength={6}
            />
            <button
              type="button"
              className="default-login-password-toggle"
              onClick={togglePasswordVisibility}
              disabled={loginMutation.isPending}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          <div className="default-login-options">
            <label className="default-login-remember">
              <input type="checkbox" disabled={loginMutation.isPending} />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="default-login-forgot">
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            className="default-login-primary-btn"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <span className="default-login-spinner"></span>
                <span className="default-login-btn-text">Signing in...</span>
              </>
            ) : (
              <>
                <IoLogInOutline className="default-login-btn-icon" />
                <span className="default-login-btn-text">Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="default-login-divider">
          <span>or</span>
        </div>

        {/* Sign up button */}
        <button 
          className="default-login-secondary-btn" 
          onClick={handleSignUp}
          disabled={loginMutation.isPending}
        >
          Create New Account
        </button>

        {/* Footer */}
        <div className="default-login-footer">
          <span>© 2026 Hookiefy. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}

export default DefaultLogin;