// ============================================================
// DefaultSignup.tsx - Signup modal with slide-up animation (Blue theme)
// ============================================================

import './defaultsignup.css'
import { IoClose } from "react-icons/io5";
import { IoPerson } from "react-icons/io5";
import { IoLockClosed } from "react-icons/io5";
import { IoMail } from "react-icons/io5";
import { IoLogInOutline } from "react-icons/io5";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================
// TYPES
// ============================================================

interface DefaultSignupProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultSignup({ isOpen, onClose, onSwitchToLogin }: DefaultSignupProps) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate signup - replace with actual API call
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      navigate('/signin');
    }, 1000);
  };

  const handleLogin = () => {
    onClose();
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      navigate('/signin');
    }
  };

  return (
    <div className="default-signup-overlay" onClick={onClose}>
      <div className="default-signup-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="default-signup-close-btn" onClick={onClose}>
          <IoClose />
        </button>

        {/* Gradient accent bar at top - Blue */}
        <div className="default-signup-accent-bar"></div>

        {/* Logo/Brand */}
        <div className="default-signup-brand">
          <h2>Hookiefy</h2>
          <p>Create your account and get started</p>
        </div>

        {/* Signup Form */}
        <form className="default-signup-form" onSubmit={handleSignup}>
          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoPerson />
            </div>
            <input
              type="text"
              className="default-signup-input"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoMail />
            </div>
            <input
              type="email"
              className="default-signup-input"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoLockClosed />
            </div>
            <input
              type="password"
              className="default-signup-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoLockClosed />
            </div>
            <input
              type="password"
              className="default-signup-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="default-signup-terms">
            <label className="default-signup-agree">
              <input type="checkbox" required />
              <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
            </label>
          </div>

          <button 
            type="submit" 
            className="default-signup-primary-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="default-signup-spinner"></span>
            ) : (
              <>
                <IoLogInOutline className="default-signup-btn-icon" />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="default-signup-divider">
          <span>or</span>
        </div>

        {/* Login button */}
        <button className="default-signup-secondary-btn" onClick={handleLogin}>
          Already have an account? Login
        </button>

        {/* Footer */}
        <div className="default-signup-footer">
          <span>© 2026 Hookiefy. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}

export default DefaultSignup;