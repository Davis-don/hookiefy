import './mypreference.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

interface PreferenceData {
  interested_in_gender: string;
  minimum_age: number | string;
  maximum_age: number | string;
}

interface MypreferenceProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface PreferenceResponse {
  message: string;
  data: {
    id?: number;
    user?: number;
    interested_in_gender: string;
    minimum_age: number;
    maximum_age: number;
    created_at?: string;
    updated_at?: string;
  };
}

// Fetch preference
const fetchPreference = async (accessToken: string | null): Promise<PreferenceResponse | null> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/preference/get/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // No preference exists yet
    }
    throw new Error('Failed to fetch preference');
  }

  return response.json();
};

// Create/Update preference
const createOrUpdatePreference = async (preferenceData: PreferenceData, accessToken: string | null): Promise<PreferenceResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/preference/create-update/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferenceData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save preference');
  }

  return response.json();
};

function Mypreference({ onComplete, onCancel }: MypreferenceProps) {
  const { access: accessToken } = useAuthStore();
  const [formData, setFormData] = useState<PreferenceData>({
    interested_in_gender: '',
    minimum_age: '',
    maximum_age: '',
  });
  const [isExistingPreference, setIsExistingPreference] = useState(false);

  // Fetch existing preference data
  const { isLoading: isLoadingPreference } = useQuery({
    queryKey: ['userPreference', accessToken],
    queryFn: () => fetchPreference(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Use useEffect to handle the data from the query
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchPreference(accessToken);
        if (data && data.data) {
          const preference = data.data;
          setFormData({
            interested_in_gender: preference.interested_in_gender || '',
            minimum_age: preference.minimum_age || '',
            maximum_age: preference.maximum_age || '',
          });
          setIsExistingPreference(true);
        } else {
          setIsExistingPreference(false);
        }
      } catch (error) {
        setIsExistingPreference(false);
      }
    };

    if (accessToken) {
      fetchData();
    }
  }, [accessToken]);

  const mutation = useMutation({
    mutationFn: (data: PreferenceData) => createOrUpdatePreference(data, accessToken),
    onSuccess: () => {
      toast.success(isExistingPreference ? 'Preferences updated successfully!' : 'Preferences created successfully!', {
        description: isExistingPreference ? 'Your preferences have been updated.' : 'Your preferences have been created.',
        duration: 4000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to save preferences', {
        description: error.message || 'Please check your input and try again.',
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.interested_in_gender) {
      toast.error('Gender preference is required', {
        description: 'Please select who you are interested in.',
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

    if (!formData.minimum_age || Number(formData.minimum_age) < 18) {
      toast.error('Minimum age is required', {
        description: 'Please enter a minimum age (must be at least 18).',
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

    if (!formData.maximum_age || Number(formData.maximum_age) < 18) {
      toast.error('Maximum age is required', {
        description: 'Please enter a maximum age (must be at least 18).',
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

    // Validate that minimum_age <= maximum_age
    const minAge = Number(formData.minimum_age);
    const maxAge = Number(formData.maximum_age);
    if (minAge > maxAge) {
      toast.error('Invalid age range', {
        description: 'Minimum age cannot be greater than maximum age.',
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

    const loadingToast = toast.loading(isExistingPreference ? 'Updating preferences...' : 'Creating preferences...', {
      description: 'Please wait while we save your preferences.',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    mutation.mutate(formData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  if (isLoadingPreference) {
    return (
      <div className="mpf-pref-overlay">
        <div className="mpf-pref-modal-content">
          <div className="mpf-pref-loading-container">
            <div className="mpf-pref-loading-spinner"></div>
            <p>Loading preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mpf-pref-overlay">
      <div className="mpf-pref-modal-content">
        <div className="mpf-pref-header">
          <div className="mpf-pref-header-left">
            <h3>{isExistingPreference ? 'Edit Preferences' : 'Complete Preferences'}</h3>
          </div>
        </div>

        <div className="mpf-pref-form-container">
          <form className="mpf-pref-form" onSubmit={handleSubmit}>
            <div className="mpf-pref-form-group">
              <label className="mpf-pref-label">Interested In</label>
              <select
                name="interested_in_gender"
                className="mpf-pref-select"
                value={formData.interested_in_gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender preference</option>
                <option value="M">Men</option>
                <option value="F">Women</option>
                <option value="A">All</option>
              </select>
            </div>

            <div className="mpf-pref-form-row">
              <div className="mpf-pref-form-group">
                <label className="mpf-pref-label">Minimum Age</label>
                <input
                  type="number"
                  name="minimum_age"
                  placeholder="18"
                  className="mpf-pref-input"
                  value={formData.minimum_age}
                  onChange={handleChange}
                  min="18"
                  max="100"
                  required
                />
              </div>

              <div className="mpf-pref-form-group">
                <label className="mpf-pref-label">Maximum Age</label>
                <input
                  type="number"
                  name="maximum_age"
                  placeholder="100"
                  className="mpf-pref-input"
                  value={formData.maximum_age}
                  onChange={handleChange}
                  min="18"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="mpf-pref-form-actions">
              <button 
                type="submit" 
                className="mpf-pref-submit-btn"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : isExistingPreference ? 'Update Preferences' : 'Create Preferences'}
              </button>
              {onCancel && (
                <button 
                  type="button" 
                  className="mpf-pref-cancel-btn"
                  onClick={onCancel}
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Mypreference