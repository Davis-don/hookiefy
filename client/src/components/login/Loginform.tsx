import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent, ChangeEvent } from 'react';
import { toast } from '../../store/Toaststore';
import './loginform.css';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  redirect_to: string;
}

interface ApiError {
  error?: string;
  email?: string[];
  password?: string[];
  non_field_errors?: string[];
}

interface LoginformProps {
  onSubmittingChange: (isSubmitting: boolean) => void;
}

function Loginform({ onSubmittingChange }: LoginformProps) {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginCredentials, string>>>({});
  const navigate = useNavigate();
  
  const apiUrl = import.meta.env.VITE_API_URL;

  const loginMutation = useMutation<LoginResponse, ApiError, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch(`${apiUrl}/accounts/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      onSubmittingChange(true);
      // Loading toast removed - we have a spinner now
    },
    onSuccess: (data) => {
      onSubmittingChange(false);
      toast.success(data.message || 'Login successful!', {
        title: 'Welcome Back! ✨',
        duration: 5000,
      });
      
      if (data.redirect_to) {
        navigate(data.redirect_to);
      } else {
        navigate('/unauthorized');
      }
    },
    onError: (error: ApiError) => {
      setErrors({});
      onSubmittingChange(false);
      
      if (error.error) {
        toast.error(error.error, { 
          title: 'Error',
          duration: 6000 
        });
      } else if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { 
          title: 'Login Failed',
          duration: 6000 
        });
      } else if (error.email) {
        const errorMsg = Array.isArray(error.email) ? error.email[0] : error.email;
        setErrors(prev => ({ ...prev, email: errorMsg }));
        toast.error(errorMsg, { 
          title: 'Invalid Email',
          duration: 6000 
        });
      } else if (error.password) {
        const errorMsg = Array.isArray(error.password) ? error.password[0] : error.password;
        setErrors(prev => ({ ...prev, password: errorMsg }));
        toast.error(errorMsg, { 
          title: 'Invalid Password',
          duration: 6000 
        });
      } else {
        toast.error('Login failed. Please try again.', { 
          title: 'Connection Error',
          duration: 6000 
        });
      }
    },
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof LoginCredentials;
    
    setFormData(prev => ({ ...prev, [key]: value }));
    
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginCredentials, string>> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      toast.warning('Email is required', {
        title: 'Missing Information',
        duration: 5000,
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      toast.warning('Please enter a valid email address', {
        title: 'Invalid Format',
        duration: 5000,
      });
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
      toast.warning('Password is required', {
        title: 'Missing Information',
        duration: 5000,
      });
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      toast.warning('Password must be at least 8 characters', {
        title: 'Too Short',
        duration: 5000,
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    loginMutation.mutate(formData);
  };

  return (
    <div className="overall-login-form">
      <form className="romantic-login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`romantic-input ${errors.email ? 'romantic-input-error' : ''}`}
            placeholder="Your email address"
            autoComplete="email"
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`romantic-input ${errors.password ? 'romantic-input-error' : ''}`}
            placeholder="Your secret password"
            autoComplete="current-password"
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <button type="submit" className="romantic-button">
          Sign In
          <span className="button-heart">❤️</span>
        </button>

        <div className="form-footer">
          <a href="/forgot-password">Forgot your password?</a>
          <span style={{ margin: '0 10px', color: '#ff69b4' }}>•</span>
          <a href="/signup">Create account</a>
        </div>
      </form>
    </div>
  );
}

export default Loginform;