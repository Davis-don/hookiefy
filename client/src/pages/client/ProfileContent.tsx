import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import './profilecontent.css';

interface ClientProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  is_active: boolean;
  date_joined: string;
}

interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
}

interface UpdatePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ApiError {
  error?: string;
  first_name?: string[];
  last_name?: string[];
  email?: string[];
  gender?: string[];
  current_password?: string[];
  new_password?: string[];
  confirm_password?: string[];
  non_field_errors?: string[];
}

function ProfileContent() {
  const queryClient = useQueryClient();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Personal details state
  const [profileData, setProfileData] = useState<UpdateProfileData>({});
  const [originalProfileData, setOriginalProfileData] = useState<UpdateProfileData>({});
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof UpdateProfileData, string>>>({});
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState<UpdatePasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof UpdatePasswordData, string>>>({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch client profile data
  const { 
    data: clientData, 
    isLoading: isLoadingProfile, 
    error: profileError,
    refetch: refetchProfile
  } = useQuery<ClientProfileData>({
    queryKey: ['clientProfile'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/client/me/fetch_data/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    retry: false,
  });

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (clientData) {
      const initialData = {
        first_name: clientData.first_name || '',
        last_name: clientData.last_name || '',
        email: clientData.email || '',
        gender: clientData.gender || '',
      };
      setProfileData(initialData);
      setOriginalProfileData(initialData);
    }
  }, [clientData]);

  // Check for profile changes
  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
    setHasProfileChanges(hasUnsavedChanges);
  }, [profileData, originalProfileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation<{ message: string }, ApiError, UpdateProfileData>({
    mutationFn: async (updateData: UpdateProfileData) => {
      const response = await fetch(`${apiUrl}/accounts/client/me/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      setIsUpdatingProfile(true);
    },
    onSuccess: (data) => {
      setIsUpdatingProfile(false);
      setHasProfileChanges(false);
      setOriginalProfileData({ ...profileData });
      
      toast.success(data.message || 'Profile updated successfully! ✨', {
        duration: 5000,
      });
      
      // Refetch profile data
      queryClient.invalidateQueries({ queryKey: ['clientProfile'] });
    },
    onError: (error: ApiError) => {
      setIsUpdatingProfile(false);
      
      // Clear previous errors
      setProfileErrors({});
      
      // Handle field-specific errors
      const fieldErrors: Partial<Record<keyof UpdateProfileData, string>> = {};
      
      if (error.first_name) {
        const errorMsg = Array.isArray(error.first_name) ? error.first_name[0] : error.first_name;
        fieldErrors.first_name = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.last_name) {
        const errorMsg = Array.isArray(error.last_name) ? error.last_name[0] : error.last_name;
        fieldErrors.last_name = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.email) {
        const errorMsg = Array.isArray(error.email) ? error.email[0] : error.email;
        fieldErrors.email = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.gender) {
        const errorMsg = Array.isArray(error.gender) ? error.gender[0] : error.gender;
        fieldErrors.gender = errorMsg;
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
      
      setProfileErrors(fieldErrors);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation<{ message: string }, ApiError, UpdatePasswordData>({
    mutationFn: async (passwordData: UpdatePasswordData) => {
      const response = await fetch(`${apiUrl}/accounts/client/me/password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      setIsUpdatingPassword(true);
    },
    onSuccess: (data) => {
      setIsUpdatingPassword(false);
      
      // Clear password form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordErrors({});
      
      toast.success(data.message || 'Password updated successfully! 🔒', {
        duration: 5000,
      });
    },
    onError: (error: ApiError) => {
      setIsUpdatingPassword(false);
      
      // Clear previous errors
      setPasswordErrors({});
      
      // Handle field-specific errors
      const fieldErrors: Partial<Record<keyof UpdatePasswordData, string>> = {};
      
      if (error.current_password) {
        const errorMsg = Array.isArray(error.current_password) ? error.current_password[0] : error.current_password;
        fieldErrors.current_password = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.new_password) {
        const errorMsg = Array.isArray(error.new_password) ? error.new_password[0] : error.new_password;
        fieldErrors.new_password = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.confirm_password) {
        const errorMsg = Array.isArray(error.confirm_password) ? error.confirm_password[0] : error.confirm_password;
        fieldErrors.confirm_password = errorMsg;
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
      
      setPasswordErrors(fieldErrors);
    },
  });

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UpdateProfileData;
    
    setProfileData(prev => ({ ...prev, [key]: value }));
    
    // Clear field-specific error when user starts typing
    if (profileErrors[key]) {
      setProfileErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UpdatePasswordData;
    
    setPasswordData(prev => ({ ...prev, [key]: value }));
    
    // Clear field-specific error when user starts typing
    if (passwordErrors[key]) {
      setPasswordErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateProfileData, string>> = {};
    
    // First name validation
    if (!profileData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (profileData.first_name.length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    }
    
    // Last name validation
    if (!profileData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (profileData.last_name.length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    }
    
    // Email validation
    if (!profileData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setProfileErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.warning(firstError, { duration: 5000 });
      return false;
    }
    
    return true;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdatePasswordData, string>> = {};
    
    if (!passwordData.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    
    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }
    
    if (!passwordData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    if (passwordData.current_password && passwordData.new_password === passwordData.current_password) {
      newErrors.new_password = 'New password cannot be the same as current password';
    }
    
    setPasswordErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.warning(firstError, { duration: 5000 });
      return false;
    }
    
    return true;
  };

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    // Only send fields that have changed
    const changedData: UpdateProfileData = {};
    Object.keys(profileData).forEach((key) => {
      const typedKey = key as keyof UpdateProfileData;
      if (profileData[typedKey] !== originalProfileData[typedKey]) {
        const value = profileData[typedKey];
        (changedData as any)[typedKey] = value;
      }
    });
    
    if (Object.keys(changedData).length === 0) {
      toast.info('No changes to save', { duration: 3000 });
      return;
    }
    
    updateProfileMutation.mutate(changedData);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    updatePasswordMutation.mutate(passwordData);
  };

  if (isLoadingProfile) {
    return (
      <div className="pc-spinner-wrapper">
        <Spinner size="large" color="#c41e3a" message="Loading your profile..." />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="pc-error-wrapper">
        <div className="pc-error-icon">⚠️</div>
        <h3 className="pc-error-title">Unable to Load Profile</h3>
        <p className="pc-error-message">Please try refreshing the page</p>
        <button className="pc-retry-button" onClick={() => refetchProfile()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pc-main-container">
      <div className="pc-header-section">
        <h2 className="pc-page-title">👤 My Profile</h2>
        <p className="pc-page-subtitle">Manage your personal information and account security</p>
      </div>

      {/* Personal Details Section */}
      <div className="pc-section">
        <div className="pc-section-header">
          <span className="pc-section-icon">📝</span>
          <h3 className="pc-section-title">Personal Information</h3>
        </div>
        
        <form onSubmit={handleProfileSubmit} className="pc-form">
          <div className="pc-form-grid">
            {/* First Name */}
            <div className="pc-input-group">
              <label className="pc-field-label" htmlFor="first_name">
                First Name <span className="pc-required-star">*</span>
              </label>
              <input 
                type="text" 
                id="first_name" 
                name="first_name"
                value={profileData.first_name || ''}
                onChange={handleProfileChange}
                className={`pc-field-input ${profileErrors.first_name ? 'pc-field-error' : ''}`} 
                placeholder="Enter your first name"
              />
              {profileErrors.first_name && <div className="pc-error-message">{profileErrors.first_name}</div>}
            </div>

            {/* Last Name */}
            <div className="pc-input-group">
              <label className="pc-field-label" htmlFor="last_name">
                Last Name <span className="pc-required-star">*</span>
              </label>
              <input 
                type="text" 
                id="last_name" 
                name="last_name"
                value={profileData.last_name || ''}
                onChange={handleProfileChange}
                className={`pc-field-input ${profileErrors.last_name ? 'pc-field-error' : ''}`} 
                placeholder="Enter your last name"
              />
              {profileErrors.last_name && <div className="pc-error-message">{profileErrors.last_name}</div>}
            </div>

            {/* Email */}
            <div className="pc-input-group pc-input-full">
              <label className="pc-field-label" htmlFor="email">
                Email Address <span className="pc-required-star">*</span>
              </label>
              <input 
                type="email" 
                id="email" 
                name="email"
                value={profileData.email || ''}
                onChange={handleProfileChange}
                className={`pc-field-input ${profileErrors.email ? 'pc-field-error' : ''}`} 
                placeholder="Enter your email address"
              />
              {profileErrors.email && <div className="pc-error-message">{profileErrors.email}</div>}
            </div>

            {/* Gender */}
            <div className="pc-input-group pc-input-full">
              <label className="pc-field-label" htmlFor="gender">
                Gender <span className="pc-optional-badge">(Optional)</span>
              </label>
              <select 
                id="gender" 
                name="gender"
                value={profileData.gender || ''}
                onChange={handleProfileChange}
                className={`pc-field-select ${profileErrors.gender ? 'pc-field-error' : ''}`}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
              {profileErrors.gender && <div className="pc-error-message">{profileErrors.gender}</div>}
            </div>
          </div>

          <div className="pc-button-wrapper">
            <button 
              type="submit" 
              className={`pc-submit-button ${hasProfileChanges ? 'pc-submit-active' : ''}`}
              disabled={!hasProfileChanges || isUpdatingProfile}
            >
              {isUpdatingProfile ? 'Saving...' : hasProfileChanges ? '💾 Save Changes' : '✓ Up to Date'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="pc-section">
        <div className="pc-section-header">
          <span className="pc-section-icon">🔒</span>
          <h3 className="pc-section-title">Change Password</h3>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="pc-form">
          <div className="pc-form-grid">
            {/* Current Password */}
            <div className="pc-input-group pc-input-full">
              <label className="pc-field-label" htmlFor="current_password">
                Current Password <span className="pc-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="current_password" 
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                className={`pc-field-input ${passwordErrors.current_password ? 'pc-field-error' : ''}`} 
                placeholder="Enter your current password"
              />
              {passwordErrors.current_password && <div className="pc-error-message">{passwordErrors.current_password}</div>}
            </div>

            {/* New Password */}
            <div className="pc-input-group">
              <label className="pc-field-label" htmlFor="new_password">
                New Password <span className="pc-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="new_password" 
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                className={`pc-field-input ${passwordErrors.new_password ? 'pc-field-error' : ''}`} 
                placeholder="Enter new password"
              />
              <small className="pc-field-hint">Must be at least 8 characters</small>
              {passwordErrors.new_password && <div className="pc-error-message">{passwordErrors.new_password}</div>}
            </div>

            {/* Confirm Password */}
            <div className="pc-input-group">
              <label className="pc-field-label" htmlFor="confirm_password">
                Confirm New Password <span className="pc-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="confirm_password" 
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                className={`pc-field-input ${passwordErrors.confirm_password ? 'pc-field-error' : ''}`} 
                placeholder="Confirm your new password"
              />
              {passwordErrors.confirm_password && <div className="pc-error-message">{passwordErrors.confirm_password}</div>}
            </div>
          </div>

          <div className="pc-button-wrapper">
            <button 
              type="submit" 
              className="pc-submit-button pc-password-button"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? 'Updating...' : '🔐 Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileContent;