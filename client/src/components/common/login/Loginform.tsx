// LoginForm.tsx - Pure Form with its own styles
import React, { useState } from 'react';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './loginform.css'

interface LoginFormProps {
  onLogin?: (email: string, password: string) => void;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin) {
      onLogin(email, password);
    }
    console.log('Login attempt:', { email, password, rememberMe });
  };

  return (
    <div className="login-form-container">
      <div className="login-form-wrapper">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Sign in to your account</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-icon-wrapper">
              <FaUser className="input-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrapper">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="login-submit-btn">
            Sign In
          </button>

          <div className="login-footer">
            <p>
              Don't have an account? <a href="#" className="signup-link">Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;