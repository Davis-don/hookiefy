import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import './adminprofile.css';

interface AdminProfileData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string;
}

interface ApiResponse {
  message: string;
  user: AdminProfileData;
}

interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
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
  current_password?: string[];
  new_password?: string[];
  confirm_password?: string[];
  non_field_errors?: string[];
}

function AdminProfile() {
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

  // Fetch admin profile data
  const { 
    data: responseData, 
    isLoading: isLoadingProfile, 
    error: profileError,
    refetch: refetchProfile
  } = useQuery<ApiResponse>({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/accounts/profile/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

  // Extract user data from response
  const adminData = responseData?.user;

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (adminData) {
      const initialData = {
        first_name: adminData.first_name || '',
        last_name: adminData.last_name || '',
        email: adminData.email || '',
      };
      setProfileData(initialData);
      setOriginalProfileData(initialData);
    }
  }, [adminData]);

  // Check for profile changes
  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
    setHasProfileChanges(hasUnsavedChanges);
  }, [profileData, originalProfileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation<{ message: string }, ApiError, UpdateProfileData>({
    mutationFn: async (updateData: UpdateProfileData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/accounts/profile/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
    },
    onError: (error: ApiError) => {
      setIsUpdatingProfile(false);
      
      setProfileErrors({});
      
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/accounts/password/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        }),
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
      
      setPasswordErrors({});
      
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

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UpdateProfileData;
    
    setProfileData(prev => ({ ...prev, [key]: value }));
    
    if (profileErrors[key]) {
      setProfileErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UpdatePasswordData;
    
    setPasswordData(prev => ({ ...prev, [key]: value }));
    
    if (passwordErrors[key]) {
      setPasswordErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateProfileData, string>> = {};
    
    if (!profileData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (profileData.first_name.length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    }
    
    if (!profileData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (profileData.last_name.length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    }
    
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

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'superadmin':
        return <span className="ap-role-badge superadmin">👑 Super Admin</span>;
      case 'admin':
        return <span className="ap-role-badge admin">🛡️ Admin</span>;
      default:
        return <span className="ap-role-badge moderator">⭐ Moderator</span>;
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="ap-spinner-wrapper">
        <Spinner size="large" color="#c41e3a" message="Loading your profile..." />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="ap-error-wrapper">
        <div className="ap-error-icon">⚠️</div>
        <h3 className="ap-error-title">Unable to Load Profile</h3>
        <p className="ap-error-message">Please try refreshing the page</p>
        <button className="ap-retry-button" onClick={() => refetchProfile()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ap-main-container">
      <div className="ap-header-section">
        <h2 className="ap-page-title">👑 Admin Profile</h2>
        <p className="ap-page-subtitle">Manage your personal information and account security</p>
      </div>

      {/* Personal Details Section */}
      <div className="ap-section">
        <div className="ap-section-header">
          <span className="ap-section-icon">📝</span>
          <h3 className="ap-section-title">Personal Information</h3>
          {adminData && (
            <div className="ap-role-container">
              {getRoleBadge(adminData.role)}
            </div>
          )}
        </div>
        
        <form onSubmit={handleProfileSubmit} className="ap-form">
          <div className="ap-form-grid">
            {/* First Name */}
            <div className="ap-input-group">
              <label className="ap-field-label" htmlFor="first_name">
                First Name <span className="ap-required-star">*</span>
              </label>
              <input 
                type="text" 
                id="first_name" 
                name="first_name"
                value={profileData.first_name || ''}
                onChange={handleProfileChange}
                className={`ap-field-input ${profileErrors.first_name ? 'ap-field-error' : ''}`} 
                placeholder="Enter your first name"
              />
              {profileErrors.first_name && <div className="ap-error-message">{profileErrors.first_name}</div>}
            </div>

            {/* Last Name */}
            <div className="ap-input-group">
              <label className="ap-field-label" htmlFor="last_name">
                Last Name <span className="ap-required-star">*</span>
              </label>
              <input 
                type="text" 
                id="last_name" 
                name="last_name"
                value={profileData.last_name || ''}
                onChange={handleProfileChange}
                className={`ap-field-input ${profileErrors.last_name ? 'ap-field-error' : ''}`} 
                placeholder="Enter your last name"
              />
              {profileErrors.last_name && <div className="ap-error-message">{profileErrors.last_name}</div>}
            </div>

            {/* Email */}
            <div className="ap-input-group ap-input-full">
              <label className="ap-field-label" htmlFor="email">
                Email Address <span className="ap-required-star">*</span>
              </label>
              <input 
                type="email" 
                id="email" 
                name="email"
                value={profileData.email || ''}
                onChange={handleProfileChange}
                className={`ap-field-input ${profileErrors.email ? 'ap-field-error' : ''}`} 
                placeholder="Enter your email address"
              />
              {profileErrors.email && <div className="ap-error-message">{profileErrors.email}</div>}
            </div>
          </div>

          <div className="ap-button-wrapper">
            <button 
              type="submit" 
              className={`ap-submit-button ${hasProfileChanges ? 'ap-submit-active' : ''}`}
              disabled={!hasProfileChanges || isUpdatingProfile}
            >
              {isUpdatingProfile ? 'Saving...' : hasProfileChanges ? '💾 Save Changes' : '✓ Up to Date'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="ap-section">
        <div className="ap-section-header">
          <span className="ap-section-icon">🔒</span>
          <h3 className="ap-section-title">Change Password</h3>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="ap-form">
          <div className="ap-form-grid">
            {/* Current Password */}
            <div className="ap-input-group ap-input-full">
              <label className="ap-field-label" htmlFor="current_password">
                Current Password <span className="ap-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="current_password" 
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                className={`ap-field-input ${passwordErrors.current_password ? 'ap-field-error' : ''}`} 
                placeholder="Enter your current password"
              />
              {passwordErrors.current_password && <div className="ap-error-message">{passwordErrors.current_password}</div>}
            </div>

            {/* New Password */}
            <div className="ap-input-group">
              <label className="ap-field-label" htmlFor="new_password">
                New Password <span className="ap-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="new_password" 
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                className={`ap-field-input ${passwordErrors.new_password ? 'ap-field-error' : ''}`} 
                placeholder="Enter new password"
              />
              <small className="ap-field-hint">Must be at least 8 characters</small>
              {passwordErrors.new_password && <div className="ap-error-message">{passwordErrors.new_password}</div>}
            </div>

            {/* Confirm Password */}
            <div className="ap-input-group">
              <label className="ap-field-label" htmlFor="confirm_password">
                Confirm New Password <span className="ap-required-star">*</span>
              </label>
              <input 
                type="password" 
                id="confirm_password" 
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                className={`ap-field-input ${passwordErrors.confirm_password ? 'ap-field-error' : ''}`} 
                placeholder="Confirm your new password"
              />
              {passwordErrors.confirm_password && <div className="ap-error-message">{passwordErrors.confirm_password}</div>}
            </div>
          </div>

          <div className="ap-button-wrapper">
            <button 
              type="submit" 
              className="ap-submit-button ap-password-button"
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

export default AdminProfile;