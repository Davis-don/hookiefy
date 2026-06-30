// ============================================================
// Userfetchuserinfo.tsx  (display user metadata - Instagram style)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { FiUser, FiPhone, FiCalendar, FiMapPin, FiGlobe } from 'react-icons/fi';
import './userfetchprofileinfo.css'

// ============================================================
// TYPES
// ============================================================

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
    date_joined: string;
    last_login: string | null;
  };
  profile: {
    bio: string | null;
    country: string | null;
    county: string | null;
    city: string | null;
    date_of_birth: string | null;
    age: number | null;
    created_at: string;
    updated_at: string;
  } | null;
  preference: {
    interested_in_gender: string | null;
    interested_in_gender_display: string | null;
    minimum_age: number | null;
    maximum_age: number | null;
  } | null;
  assignment: {
    assigned_to_id: number;
    assigned_to_email: string;
    assigned_to_name: string;
    assigned_to_role: string;
    assigned_at: string;
  } | null;
}

// ============================================================
// API HELPER
// ============================================================

const fetchUserFullData = async (accessToken: string | null): Promise<UserFullData> => {
  if (!accessToken) throw new Error('No access token found.');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/current-user-full-data/`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired. Please login again.');
    throw new Error(`Failed to fetch user data: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
};

// ============================================================
// LOADING SPINNER COMPONENT
// ============================================================

const LoadingSpinner = () => {
  return (
    <div className="up-loading-container">
      <div className="up-loading-spinner"></div>
      <p className="up-loading-text">Loading profile...</p>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Userfetchuserinfo() {
  const { access: accessToken } = useAuthStore();

  const { data: userData, isLoading, isError, error } = useQuery<UserFullData>({
    queryKey: ['userFullData', accessToken],
    queryFn: () => fetchUserFullData(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ---- Loading State ----
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // ---- Error State ----
  if (isError) {
    return (
      <div className="up-error-container">
        <div className="up-error-icon">😅</div>
        <p className="up-error-text">
          {error instanceof Error ? error.message : 'Failed to load profile'}
        </p>
        <button className="up-retry-btn" onClick={() => window.location.reload()}>
          🔄 Retry
        </button>
      </div>
    );
  }

  // ---- No Data State ----
  if (!userData) {
    return (
      <div className="up-error-container">
        <div className="up-error-icon">👤</div>
        <p className="up-error-text">No user data available</p>
      </div>
    );
  }

  const { account, profile, preference } = userData;

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get member since
  const getMemberSince = () => {
    if (account.date_joined) {
      const date = new Date(account.date_joined);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    return 'Recently';
  };

  // Get gender display
  const getGenderDisplay = () => {
    if (!account.gender) return 'Not specified';
    const genderMap: Record<string, string> = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other'
    };
    return genderMap[account.gender] || account.gender;
  };

  // Get location
  const getLocation = () => {
    if (!profile) return null;
    const parts = [];
    if (profile.city) parts.push(profile.city);
    if (profile.county) parts.push(profile.county);
    if (profile.country) parts.push(profile.country);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="up-user-info-wrapper">
      {/* Display Name */}
      <h2 className="up-user-fullname">{account.full_name}</h2>
      
      {/* Email */}
      <p className="up-user-email">{account.email}</p>
      
      {/* Bio */}
      {profile?.bio && (
        <div className="up-user-bio">
          <p>{profile.bio}</p>
        </div>
      )}

      {/* User Stats Row */}
      <div className="up-user-stats">
        <div className="up-stat-item">
          <span className="up-stat-value">{account.role}</span>
          <span className="up-stat-label">Role</span>
        </div>
        {profile?.age && (
          <div className="up-stat-item">
            <span className="up-stat-value">{profile.age}</span>
            <span className="up-stat-label">Age</span>
          </div>
        )}
        {preference?.interested_in_gender_display && (
          <div className="up-stat-item">
            <span className="up-stat-value">{preference.interested_in_gender_display}</span>
            <span className="up-stat-label">Interested In</span>
          </div>
        )}
        <div className="up-stat-item">
          <span className="up-stat-value">{getMemberSince()}</span>
          <span className="up-stat-label">Joined</span>
        </div>
      </div>

      {/* Detailed Info Grid */}
      <div className="up-user-details-grid">
        {/* Phone */}
        {account.phone_number && (
          <div className="up-detail-item">
            <FiPhone className="up-detail-icon" />
            <div>
              <span className="up-detail-label">Phone</span>
              <span className="up-detail-value">{account.phone_number}</span>
            </div>
          </div>
        )}

        {/* Gender */}
        <div className="up-detail-item">
          <FiUser className="up-detail-icon" />
          <div>
            <span className="up-detail-label">Gender</span>
            <span className="up-detail-value">{getGenderDisplay()}</span>
          </div>
        </div>

        {/* Location */}
        {getLocation() && (
          <div className="up-detail-item">
            <FiMapPin className="up-detail-icon" />
            <div>
              <span className="up-detail-label">Location</span>
              <span className="up-detail-value">{getLocation()}</span>
            </div>
          </div>
        )}

        {/* Date of Birth */}
        {profile?.date_of_birth && (
          <div className="up-detail-item">
            <FiCalendar className="up-detail-icon" />
            <div>
              <span className="up-detail-label">Date of Birth</span>
              <span className="up-detail-value">{formatDate(profile.date_of_birth)}</span>
            </div>
          </div>
        )}

        {/* Age Range Preference */}
        {preference?.minimum_age && preference?.maximum_age && (
          <div className="up-detail-item">
            <FiGlobe className="up-detail-icon" />
            <div>
              <span className="up-detail-label">Age Preference</span>
              <span className="up-detail-value">{preference.minimum_age} - {preference.maximum_age} years</span>
            </div>
          </div>
        )}
      </div>

      {/* Member Since Footer */}
      <div className="up-user-footer">
        <span>Member since {getMemberSince()}</span>
        {account.is_active && (
          <span className="up-active-badge">● Active</span>
        )}
      </div>
    </div>
  );
}

export default Userfetchuserinfo;