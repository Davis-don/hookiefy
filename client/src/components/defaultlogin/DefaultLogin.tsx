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

// ============================================================
// TYPES
// ============================================================

interface DefaultLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultLogin({ isOpen, onClose, onSwitchToSignup }: DefaultLoginProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login - replace with actual API call
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      navigate('/signin');
    }, 1000);
  };

  const handleSignUp = () => {
    onClose();
    if (onSwitchToSignup) {
      onSwitchToSignup();
    } else {
      navigate('/signup');
    }
  };

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

        {/* Login Form */}
        <form className="default-login-form" onSubmit={handleLogin}>
          <div className="default-login-input-group">
            <div className="default-login-input-icon">
              <IoPerson />
            </div>
            <input
              type="text"
              className="default-login-input"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="default-login-input-group">
            <div className="default-login-input-icon">
              <IoLockClosed />
            </div>
            <input
              type="password"
              className="default-login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="default-login-options">
            <label className="default-login-remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="default-login-forgot">Forgot password?</a>
          </div>

          <button 
            type="submit" 
            className="default-login-primary-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="default-login-spinner"></span>
            ) : (
              <>
                <IoLogInOutline className="default-login-btn-icon" />
                Login
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="default-login-divider">
          <span>or</span>
        </div>

        {/* Sign up button */}
        <button className="default-login-secondary-btn" onClick={handleSignUp}>
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