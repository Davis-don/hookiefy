import './generalinfoedit.css'
import { useState, useEffect } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiSave, 
  FiEdit2,
  FiXCircle,
  FiRefreshCw
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner'

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  role: string;
  profile_image_url: string | null;
  has_profile_image: boolean;
}

interface GeneralinfoeditProps {
  onClose?: () => void;
}

// Fetch current user
const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/current-user/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error('Failed to fetch user data');
  }

  return response.json();
};

// Update current user
const updateCurrentUser = async (
  accessToken: string | null,
  userData: Partial<UserData>
): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/update-user/`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }

  return response.json();
};

function Generalinfoedit({ onClose }: GeneralinfoeditProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserData>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current user data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (userData: Partial<UserData>) => updateCurrentUser(accessToken, userData),
    onSuccess: (updatedData) => {
      toast.success('Profile updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      // Update form data with new data
      setFormData(updatedData);
      setIsEditing(false);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile', {
        description: error.message,
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // Set form data when data is loaded
  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Please fill in all required fields', {
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    const loadingToast = toast.loading('Updating profile...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    updateMutation.mutate(formData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  // Handle cancel
  const handleCancel = () => {
    if (data) {
      setFormData(data);
    }
    setIsEditing(false);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    if (data) {
      setFormData(data);
    }
    setIsRefreshing(false);
    
    toast.info('Profile data refreshed', {
      duration: 2000,
      icon: '🔄',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });
  };

  // Handle close
  const handleClose = () => {
    if (updateMutation.isPending) return;
    if (onClose) onClose();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-loading-container">
          <div className="gei-loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-error-container">
          <div className="gei-error-icon">😅</div>
          <p className="gei-error-text">
            {error instanceof Error ? error.message : 'Failed to load profile'}
          </p>
          <button 
            onClick={() => refetch()}
            className="gei-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-error-container">
          <p>No user data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gei-main-wrapper">
      {/* Header Section */}
      <div className="gei-header-section">
        <div className="gei-header-left">
          <div className="gei-title-wrapper">
            <h2 className="gei-page-title">General Details</h2>
            <p className="gei-page-subtitle">Update your personal information</p>
          </div>
        </div>
        <div className="gei-header-right">
          {/* Refresh Button */}
          <button 
            className="gei-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
            title="Refresh profile data"
          >
            <FiRefreshCw className={`gei-refresh-icon ${isRefreshing || isFetching ? 'gei-spinning' : ''}`} />
          </button>

          {!isEditing && (
            <button 
              className="gei-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <FiEdit2 className="gei-btn-icon" /> Edit Profile
            </button>
          )}
          {onClose && (
            <IoMdClose 
              onClick={handleClose} 
              className={`gei-close-icon ${updateMutation.isPending ? 'gei-disabled' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Form Section */}
      <div className="gei-form-container">
        <form className="gei-form" onSubmit={handleSubmit}>
          <div className="gei-form-grid">
            {/* First Name */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> First Name <span className="gei-required">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter first name"
                required
              />
            </div>

            {/* Last Name */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> Last Name <span className="gei-required">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Email */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiMail className="gei-label-icon" /> Email Address <span className="gei-required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter email address"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiPhone className="gei-label-icon" /> Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number || ''}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter phone number"
              />
            </div>

            {/* Gender */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> Gender
              </label>
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                className="gei-form-input gei-form-select"
                disabled={!isEditing || updateMutation.isPending}
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

          
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="gei-form-actions">
              <button 
                type="submit" 
                className="gei-save-btn"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="gei-spinner-small"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="gei-btn-icon" /> Save Changes
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="gei-cancel-btn"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <FiXCircle className="gei-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Generalinfoedit