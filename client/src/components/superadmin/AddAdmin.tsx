import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import './addadmin.css';

interface AdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  password: string;
  confirm_password: string;
}

interface AdminResponse {
  message: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface ApiError {
  error?: string;
  first_name?: string[];
  last_name?: string[];
  email?: string[];
  gender?: string[];
  password?: string[];
  confirm_password?: string[];
  non_field_errors?: string[];
}

function AddAdmin() {
  const [formData, setFormData] = useState<AdminFormData>({
    first_name: '',
    last_name: '',
    email: '',
    gender: '',
    password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const apiUrl = import.meta.env.VITE_API_URL;

  const addAdminMutation = useMutation<AdminResponse, ApiError, AdminFormData>({
    mutationFn: async (adminData: AdminFormData) => {
      const response = await fetch(`${apiUrl}/accounts/admin/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(adminData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      
      // Show server success message directly in toast
      toast.success(data.message, {
        duration: 6000,
      });
      
      // Reset form on success
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        gender: '',
        password: '',
        confirm_password: ''
      });
      setErrors({});
    },
    onError: (error: ApiError) => {
      setIsSubmitting(false);
      
      // Clear previous errors
      setErrors({});
      
      // Handle field-specific errors from server
      if (error.first_name) {
        const errorMsg = Array.isArray(error.first_name) ? error.first_name[0] : error.first_name;
        setErrors(prev => ({ ...prev, first_name: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.last_name) {
        const errorMsg = Array.isArray(error.last_name) ? error.last_name[0] : error.last_name;
        setErrors(prev => ({ ...prev, last_name: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.email) {
        const errorMsg = Array.isArray(error.email) ? error.email[0] : error.email;
        setErrors(prev => ({ ...prev, email: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.gender) {
        const errorMsg = Array.isArray(error.gender) ? error.gender[0] : error.gender;
        setErrors(prev => ({ ...prev, gender: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.password) {
        const errorMsg = Array.isArray(error.password) ? error.password[0] : error.password;
        setErrors(prev => ({ ...prev, password: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.confirm_password) {
        const errorMsg = Array.isArray(error.confirm_password) ? error.confirm_password[0] : error.confirm_password;
        setErrors(prev => ({ ...prev, confirm_password: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.error) {
        toast.error(error.error, { duration: 6000 });
      }
    },
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof AdminFormData;
    
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AdminFormData, string>> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    
    // Show first error as toast using the exact error message
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.warning(firstError, { duration: 5000 });
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    addAdminMutation.mutate(formData);
  };

  return (
    <div className="overal-add-admin-container">
      {isSubmitting ? (
        <div className="add-admin-spinner-container">
          <Spinner 
            size="large" 
            color="#c41e3a" 
            message="Creating admin account..." 
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="overall-form-container-add-admin">
            <div className="left-side-form-container">
              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="firstName">
                  First Name
                </label>
                <input 
                  type="text" 
                  id="firstName" 
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`form-control form-control-lg ${errors.first_name ? 'is-invalid' : ''}`} 
                  placeholder="Enter first name" 
                />
                {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
              </div>

              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="lastName">
                  Last Name
                </label>
                <input 
                  type="text" 
                  id="lastName" 
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`form-control form-control-lg ${errors.last_name ? 'is-invalid' : ''}`} 
                  placeholder="Enter last name" 
                />
                {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
              </div>

              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="email">
                  Email
                </label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`} 
                  placeholder="Enter email" 
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="gender">
                  Gender
                </label>
                <select 
                  id="gender" 
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`form-select form-select-lg ${errors.gender ? 'is-invalid' : ''}`}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="prefer_not_say">Prefer not to say</option>
                </select>
                {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
              </div>
            </div>
            
            <div className="right-side-form-container">
              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="password">
                  Password
                </label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`form-control form-control-lg ${errors.password ? 'is-invalid' : ''}`} 
                  placeholder="Enter password" 
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              <div className="mb-3">
                <label className='form-label fw-semibold' htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className={`form-control form-control-lg ${errors.confirm_password ? 'is-invalid' : ''}`} 
                  placeholder="Confirm password" 
                />
                {errors.confirm_password && <div className="invalid-feedback">{errors.confirm_password}</div>}
              </div>

              {/* Submit button container */}
              <div className="">
                <button 
                  type="submit" 
                  className="submit-btn btn bg-danger text-white fw-semibold btn-lg w-100"
                  disabled={isSubmitting}
                >
                  Create Admin Account
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddAdmin;