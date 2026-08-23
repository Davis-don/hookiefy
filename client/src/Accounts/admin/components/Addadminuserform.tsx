// Addadminuserform.tsx
// ============================================================
// Addadminuserform.tsx - Add New User Form
// ============================================================

import './addadminuserform.css'
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiLock, 
  FiUserPlus,
  FiXCircle,
  FiCheckCircle,
  FiLoader
} from 'react-icons/fi';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';

// ============================================================
// TYPES
// ============================================================

interface AddUserData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmpassword: string;
  phone_number: string;
  gender: string;
  role: string;
}

interface AddUserResponse {
  message: string;
  data?: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number: string;
    gender: string;
  };
}

// ============================================================
// API HELPERS
// ============================================================

const addUser = async (
  userData: AddUserData,
  accessToken: string | null
): Promise<AddUserResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/new/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create user');
  }

  return response.json();
};

// ============================================================
// COMPONENT
// ============================================================

function Addadminuserform() {
  const { access: accessToken } = useAuthStore();
  const [formData, setFormData] = useState<AddUserData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmpassword: '',
    phone_number: '',
    gender: 'M',
    role: 'user', // Set behind the scenes
  });

  // ---- Mutation ----
  const mutation = useMutation({
    mutationFn: (data: AddUserData) => addUser(data, accessToken),
    onSuccess: (data) => {
      toast.success('User created successfully!', {
        description: `${data.data?.full_name || 'User'} has been added to the system.`,
        duration: 5000,
        icon: '🎉',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmpassword: '',
        phone_number: '',
        gender: 'M',
        role: 'user',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create user', {
        description: error.message || 'Please check the form and try again.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // ---- Handle input change ----
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ---- Handle form submit ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmpassword) {
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
    if (formData.password.length < 8) {
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

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone_number) {
      toast.error('Please fill in all required fields', {
        description: 'All fields are required.',
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

    const loadingToast = toast.loading('Creating user...', {
      description: 'Please wait while we set up the account.',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    mutation.mutate(formData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      },
    });
  };

  // ---- Handle reset ----
  const handleReset = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmpassword: '',
      phone_number: '',
      gender: 'M',
      role: 'user',
    });
  };

  // ---- Loading state ----
  if (mutation.isPending) {
    return (
      <div className="aauf-main-wrapper">
        <div className="aauf-loading-container">
          <Loadingcomponent />
          <p className="aauf-loading-text">Creating user...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aauf-main-wrapper">
      {/* Header */}
      <div className="aauf-header">
        <div className="aauf-header-left">
          <div className="aauf-icon-wrapper">
            <FiUserPlus className="aauf-header-icon" />
          </div>
          <div>
            <h2 className="aauf-title">Add User</h2>
            <p className="aauf-subtitle">Create a new user account</p>
          </div>
        </div>
        <div className="aauf-header-right">
          <button 
            type="button" 
            className="aauf-reset-btn"
            onClick={handleReset}
          >
            <FiXCircle className="aauf-btn-icon" />
            Reset
          </button>
        </div>
      </div>

      {/* Form */}
      <form className="aauf-form" onSubmit={handleSubmit}>
        <div className="aauf-form-grid">
          {/* First Name */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiUser className="aauf-label-icon" />
              First Name <span className="aauf-required">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Enter first name"
              required
            />
          </div>

          {/* Last Name */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiUser className="aauf-label-icon" />
              Last Name <span className="aauf-required">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Enter last name"
              required
            />
          </div>

          {/* Email */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiMail className="aauf-label-icon" />
              Email Address <span className="aauf-required">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Enter email address"
              required
            />
          </div>

          {/* Phone Number */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiPhone className="aauf-label-icon" />
              Phone Number <span className="aauf-required">*</span>
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Enter phone number"
              required
            />
          </div>

          {/* Password */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiLock className="aauf-label-icon" />
              Password <span className="aauf-required">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Enter password (min 8 chars)"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiLock className="aauf-label-icon" />
              Confirm Password <span className="aauf-required">*</span>
            </label>
            <input
              type="password"
              name="confirmpassword"
              value={formData.confirmpassword}
              onChange={handleChange}
              className="aauf-input"
              placeholder="Confirm password"
              required
            />
          </div>

          {/* Gender */}
          <div className="aauf-form-group">
            <label className="aauf-label">
              <FiUser className="aauf-label-icon" />
              Gender <span className="aauf-required">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="aauf-input aauf-select"
              required
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="aauf-form-actions">
          <button 
            type="submit" 
            className="aauf-submit-btn"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <FiLoader className="aauf-btn-icon aauf-spinning" />
                Creating...
              </>
            ) : (
              <>
                <FiCheckCircle className="aauf-btn-icon" />
                Add User
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Addadminuserform;