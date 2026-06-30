// ============================================================
// 4.  Edituserprofile.tsx  (edit profile form)
//     import './userprofile.css'
// ============================================================

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { toast } from 'sonner';
import { FiX } from 'react-icons/fi';

// ============================================================
// TYPES
// ============================================================

interface UserData {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  has_profile_image: boolean;
}

interface EditProfileFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  bio?: string;
}

interface EdituserprofileProps {
  onClose?: () => void;
}

// ============================================================
// API HELPERS
// ============================================================

const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) throw new Error('No access token found.');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/current-user/`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired.');
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
};

const updateUserProfile = async (accessToken: string | null, data: EditProfileFormData): Promise<UserData> => {
  if (!accessToken) throw new Error('No access token found.');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/update-profile/`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }
  return response.json();
};

// ============================================================
// COMPONENT
// ============================================================

function Edituserprofile({ onClose }: EdituserprofileProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  // ---- Fetch current user ----
  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ---- Form state ----
  const [formData, setFormData] = useState<EditProfileFormData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    gender: '',
    bio: '',
  });

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        gender: user.gender || '',
        bio: '', // bio field if your API supports it
      });
    }
  }, [user]);

  // ---- Update mutation ----
  const updateMutation = useMutation({
    mutationFn: (data: EditProfileFormData) => updateUserProfile(accessToken, data),
    onSuccess: () => {
      toast.success('Profile updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: { background: '#1a1a2e', border: '1px solid #22c55e', color: '#ffffff' },
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      refetch();
      if (onClose) setTimeout(onClose, 1200);
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: { background: '#1a1a2e', border: '1px solid #ef4444', color: '#ffffff' },
      });
    },
  });

  // ---- Handlers ----
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  // ---- Loading / Error ----
  if (isLoading) {
    return (
      <div className="up-edit-form" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="pimg-loading-spinner" style={{ width: '36px', height: '36px', margin: '0 auto 12px' }}></div>
        <p style={{ color: '#8e8e8e' }}>Loading profile...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="up-edit-form" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>😅</div>
        <p style={{ color: '#8e8e8e' }}>{error instanceof Error ? error.message : 'Failed to load'}</p>
        <button
          onClick={() => refetch()}
          style={{
            marginTop: '12px',
            padding: '8px 24px',
            background: '#0095f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="up-edit-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h3 className="up-edit-form-title">Edit Profile</h3>
        {onClose && (
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#262626',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FiX />
          </button>
        )}
      </div>
      <p className="up-edit-form-subtitle">Update your personal information</p>

      <form onSubmit={handleSubmit}>
        <div className="up-form-row">
          <div className="up-form-group">
            <label className="up-form-label">First Name</label>
            <input
              className="up-form-input"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              required
            />
          </div>
          <div className="up-form-group">
            <label className="up-form-label">Last Name</label>
            <input
              className="up-form-input"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="up-form-group">
          <label className="up-form-label">Phone Number</label>
          <input
            className="up-form-input"
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="+1 234 567 890"
          />
        </div>

        <div className="up-form-group">
          <label className="up-form-label">Gender</label>
          <select className="up-form-input" name="gender" value={formData.gender} onChange={handleChange}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="up-form-group">
          <label className="up-form-label">Bio</label>
          <textarea
            className="up-form-input up-form-textarea"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            maxLength={150}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            {formData.bio?.length || 0}/150
          </div>
        </div>

        <div className="up-form-actions">
          <button type="button" className="up-form-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="up-form-save-btn" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <><span className="pimg-spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></span> Saving...</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Edituserprofile;