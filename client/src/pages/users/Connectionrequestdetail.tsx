import './connectionrequestdetail.css'
import { usePreviewStore } from './store/connectpreview'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import {  useEffect } from 'react'
import { toast } from 'sonner'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent'

interface UserFullData {
  account: {
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
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    date_joined: string;
    last_login: string | null;
  };
  profile: {
    bio: string;
    country: string;
    county: string;
    city: string;
    date_of_birth: string;
    age: number;
    created_at: string;
    updated_at: string;
  } | null;
  preference: {
    interested_in_gender: string;
    interested_in_gender_display: string;
    minimum_age: number;
    maximum_age: number;
    created_at: string;
    updated_at: string;
  } | null;
  assignment: {
    assigned_to_id: number;
    assigned_to_email: string;
    assigned_to_name: string;
    assigned_to_role: string;
    assigned_at: string;
  } | null;
}

// API call to fetch user full data by ID
const fetchUserFullDataById = async (accessToken: string | null, userId: string): Promise<UserFullData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/user-full-data/${userId}/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 403) {
      throw new Error('Permission denied.');
    }
    if (response.status === 404) {
      throw new Error('User not found.');
    }
    throw new Error(`Failed to fetch user data: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

function Connectionrequestdetail() {
  const { id, closePreview } = usePreviewStore();
  const { access: accessToken } = useAuthStore();

  // Check if id is valid
  const isValidId = id !== null && id !== undefined && id !== '';

  // Fetch user full data by ID
  const {
    data: userData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userFullData', id, accessToken],
    queryFn: () => fetchUserFullDataById(accessToken, id as string),
    enabled: !!accessToken && isValidId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load user data', {
        description: error instanceof Error ? error.message : 'Please try again later',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    }
  }, [isError, error]);

  // If no valid ID, show error state
  if (!isValidId) {
    return (
      <div className="overall-conection-request-detail">
        <div className="conn-req-detail-back" onClick={closePreview}>
          <span className="conn-req-detail-back-icon">←</span>
          <span className="conn-req-detail-back-text">Back</span>
        </div>
        <div className="conn-req-detail-error">
          <div className="conn-req-detail-error-icon">😕</div>
          <p className="conn-req-detail-error-text">Invalid user ID</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="overall-conection-request-detail">
        <div className="conn-req-detail-back" onClick={closePreview}>
          <span className="conn-req-detail-back-icon">←</span>
          <span className="conn-req-detail-back-text">Back</span>
        </div>
        <div className="conn-req-detail-loading">
          <Loadingcomponent />
          <div className="conn-req-detail-loading-text">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !userData) {
    return (
      <div className="overall-conection-request-detail">
        <div className="conn-req-detail-back" onClick={closePreview}>
          <span className="conn-req-detail-back-icon">←</span>
          <span className="conn-req-detail-back-text">Back</span>
        </div>
        <div className="conn-req-detail-error">
          <div className="conn-req-detail-error-icon">😕</div>
          <p className="conn-req-detail-error-text">
            {error instanceof Error ? error.message : 'Failed to load user data'}
          </p>
          <button 
            className="conn-req-detail-retry-btn"
            onClick={() => refetch()}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const account = userData.account;
  const profile = userData.profile;
  const preference = userData.preference;

  // Extract data from the response
  const userName = account.full_name;
  const userAvatar = account.profile_image_url || '';
  const userLocation = profile ? [profile.city, profile.county, profile.country].filter(Boolean).join(', ') : 'Location not set';
  const userBio = profile?.bio || 'No bio provided';
  const userAge = profile?.age || 'N/A';
  
  // Extract interested in from preference
  const interestMap: { [key: string]: string } = {
    'M': '👨 Men',
    'F': '👩 Women',
    'both': '👫 Both',
    'all': '👥 All'
  };
  const interestedIn = preference?.interested_in_gender 
    ? interestMap[preference.interested_in_gender] || preference.interested_in_gender_display 
    : 'Not specified';

  // Generate looking for text based on preferences
  const lookingFor = preference 
    ? `Looking for ${interestedIn} aged ${preference.minimum_age || 'any'} to ${preference.maximum_age || 'any'} for meaningful connections and great conversations.`
    : 'Looking for genuine connections and meaningful conversations.';

  return (
    <div className="overall-conection-request-detail">
      {/* Back Button */}
      <div className="conn-req-detail-back" onClick={closePreview}>
        <span className="conn-req-detail-back-icon">←</span>
        <span className="conn-req-detail-back-text">Back</span>
      </div>

      {/* Profile Header */}
      <div className="conn-req-detail-profile">
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt={userName} 
            className="conn-req-detail-avatar" 
          />
        ) : (
          <div className="conn-req-detail-avatar-fallback">
            <span>{userName?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
        )}
        <h2 className="conn-req-detail-name">{userName || 'Unknown User'}</h2>
        <div className="conn-req-detail-handle">@{account.email?.split('@')[0] || 'user'}</div>
        <div className="conn-req-detail-location">
          <span className="conn-req-detail-location-icon">📍</span>
          <span>{userLocation}</span>
        </div>
        {userAge !== 'N/A' && (
          <div className="conn-req-detail-age">
            <span className="conn-req-detail-age-icon">🎂</span>
            <span>{userAge} years old</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="conn-req-detail-stats">
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">{preference?.interested_in_gender ? '✓' : '—'}</span>
          <span className="conn-req-detail-stat-label">Interested</span>
        </div>
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">{preference?.minimum_age || 'Any'}</span>
          <span className="conn-req-detail-stat-label">Min Age</span>
        </div>
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">{preference?.maximum_age || 'Any'}</span>
          <span className="conn-req-detail-stat-label">Max Age</span>
        </div>
      </div>

      {/* Bio Section */}
      <div className="conn-req-detail-bio">
        <div className="conn-req-detail-bio-title">About</div>
        <div className="conn-req-detail-bio-text">{userBio}</div>
      </div>

      {/* Looking For Section */}
      <div className="conn-req-detail-looking">
        <div className="conn-req-detail-looking-title">Looking For</div>
        <div className="conn-req-detail-looking-text">{lookingFor}</div>
      </div>
    </div>
  )
}

export default Connectionrequestdetail