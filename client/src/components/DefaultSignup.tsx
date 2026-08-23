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
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================

interface DefaultSignupProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onSignupSuccess?: () => void;
}

interface SignupResponse {
  message: string;
  data?: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number: string;
    gender: string | null;
    profile_image_url: string | null;
    has_profile_image: boolean;
    assignment?: {
      assigned_to_id: number;
      assigned_to_email: string;
      assigned_to_name: string;
      assigned_at: string;
    };
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultSignup({ 
  isOpen, 
  onClose, 
  onSwitchToLogin,
  onSignupSuccess 
}: DefaultSignupProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!', {
        description: 'Please make sure both passwords are identical.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      toast.error('Password too short!', {
        description: 'Password must be at least 8 characters long.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate first name
    if (!firstName.trim()) {
      toast.error('First name is required!', {
        description: 'Please enter your first name.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate last name
    if (!lastName.trim()) {
      toast.error('Last name is required!', {
        description: 'Please enter your last name.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate email
    if (!email) {
      toast.error('Email is required!', {
        description: 'Please provide a valid email address.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate phone number
    if (!phoneNumber) {
      toast.error('Phone number is required!', {
        description: 'Please provide a valid phone number.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate gender
    if (!gender) {
      toast.error('Gender is required!', {
        description: 'Please select your gender.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    setIsLoading(true);

    // Prepare the request data
    const requestData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email,
      phone_number: phoneNumber,
      gender: gender,
      password: password,
      confirmpassword: confirmPassword,
    };

    console.log('📝 Sending signup request:', requestData);

    try {
      // Show loading toast
      const loadingToast = toast.loading('Creating your account...', {
        description: 'Please wait while we set up your account.',
        style: {
          background: '#1a1a2e',
          border: '1px solid #3b82f6',
          color: '#ffffff',
        },
      });

      // Make API call to the new endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL}/account/create-user-assigned-to-superadmin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Error response:', errorData);
        
        if (errorData.message && errorData.message.includes('No superadmin exists')) {
          throw new Error('System is currently unavailable. Please try again later or contact support.');
        }
        
        if (errorData.errors) {
          const errorMessages = [];
          for (const [field, errors] of Object.entries(errorData.errors)) {
            if (Array.isArray(errors)) {
              errorMessages.push(`${field}: ${errors.join(', ')}`);
            } else {
              errorMessages.push(`${field}: ${errors}`);
            }
          }
          throw new Error(errorMessages.join(' | '));
        }
        
        if (errorData.email) {
          throw new Error(`Email error: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`);
        }
        if (errorData.password) {
          throw new Error(`Password error: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`);
        }
        if (errorData.confirmpassword) {
          throw new Error(`Password confirmation error: ${Array.isArray(errorData.confirmpassword) ? errorData.confirmpassword[0] : errorData.confirmpassword}`);
        }
        
        throw new Error(errorData.message || 'Failed to create account. Please try again.');
      }

      const result: SignupResponse = await response.json();
      console.log('✅ Signup success:', result);

      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setGender('');
      setPassword('');
      setConfirmPassword('');
      setIsLoading(false);

      const assignedTo = result.data?.assignment?.assigned_to_name || 'Super Admin';
      const firstNameResult = result.data?.first_name || 'User';
      
      toast.success('🎉 Account Created Successfully!', {
        description: `Welcome ${firstNameResult}! Your account has been created and assigned to ${assignedTo}. Please login to continue.`,
        duration: 6000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '2px solid #22c55e',
          color: '#ffffff',
          fontSize: '1.1rem',
          padding: '1.5rem',
        },
        className: 'signup-success-toast',
      });

      onClose();
      
      if (onSignupSuccess) {
        setTimeout(() => {
          onSignupSuccess?.();
        }, 300);
      } else if (onSwitchToLogin) {
        setTimeout(() => {
          onSwitchToLogin?.();
        }, 300);
      } else {
        setTimeout(() => {
          navigate('/signin');
        }, 1000);
      }

    } catch (error) {
      setIsLoading(false);
      
      let errorMessage = 'Failed to create account. Please try again.';
      let toastStyle = {
        background: '#1a1a2e',
        border: '1px solid #ef4444',
        color: '#ffffff',
      };

      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('unavailable') || error.message.includes('superadmin')) {
          toastStyle = {
            background: '#1a1a2e',
            border: '1px solid #f59e0b',
            color: '#ffffff',
          };
        }
      }

      toast.error('Signup Failed', {
        description: errorMessage,
        duration: 6000,
        icon: '⚠️',
        style: toastStyle,
      });
    }
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
          {/* First Name & Last Name Row */}
          <div className="default-signup-name-row">
            <div className="default-signup-input-group">
              <div className="default-signup-input-icon">
                <IoPerson />
              </div>
              <input
                type="text"
                className="default-signup-input"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="default-signup-input-group">
              <div className="default-signup-input-icon">
                <IoPerson />
              </div>
              <input
                type="text"
                className="default-signup-input"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
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
              <IoPerson />
            </div>
            <input
              type="tel"
              className="default-signup-input"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoPerson />
            </div>
            <select
              className="default-signup-input default-signup-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="" disabled>Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div className="default-signup-input-group">
            <div className="default-signup-input-icon">
              <IoLockClosed />
            </div>
            <input
              type="password"
              className="default-signup-input"
              placeholder="Password (min 8 characters)"
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