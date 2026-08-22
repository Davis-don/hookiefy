import './profiledetailfetch.css'
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { FiUser, FiPhone, FiCalendar, FiMapPin, FiGlobe, FiMail, FiFlag, FiHeart, FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';
import { useState } from 'react';

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
// TRUNCATE TEXT HELPER
// ============================================================

const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Profiledetailfetchview() {
  const { access: accessToken } = useAuthStore();
  const [showAllDetails, setShowAllDetails] = useState(false);

  const { data: userData, isLoading, isError, error, refetch } = useQuery<UserFullData>({
    queryKey: ['userFullData', accessToken],
    queryFn: () => fetchUserFullData(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

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
    if (userData?.account.date_joined) {
      const date = new Date(userData.account.date_joined);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    return 'Recently';
  };

  // Get gender display
  const getGenderDisplay = () => {
    if (!userData?.account.gender) return 'Not specified';
    const genderMap: Record<string, string> = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other'
    };
    return genderMap[userData.account.gender] || userData.account.gender;
  };

  // Get location
  const getLocation = () => {
    if (!userData?.profile) return null;
    const parts = [];
    if (userData.profile.city) parts.push(userData.profile.city);
    if (userData.profile.county) parts.push(userData.profile.county);
    if (userData.profile.country) parts.push(userData.profile.country);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Toggle show more
  const toggleShowMore = () => {
    setShowAllDetails(!showAllDetails);
  };

  // ---- Loading State ----
  if (isLoading) {
    return <Loadingcomponent />;
  }

  // ---- Error State ----
  if (isError) {
    return (
      <div className="pdf-error-container">
        <div className="pdf-error-icon">😅</div>
        <p className="pdf-error-text">
          {error instanceof Error ? error.message : 'Failed to load profile'}
        </p>
        <button className="pdf-retry-btn" onClick={() => refetch()}>
          Try Again
        </button>
      </div>
    );
  }

  // ---- No Data State ----
  if (!userData) {
    return (
      <div className="pdf-error-container">
        <div className="pdf-error-icon">👤</div>
        <p className="pdf-error-text">No user data available</p>
      </div>
    );
  }

  const { account, profile, preference } = userData;

  // Initial details (always shown)
  const initialDetails = [
    { icon: FiMail, label: 'Email', value: account.email },
    { icon: FiPhone, label: 'Phone', value: account.phone_number || 'Not provided' },
    { icon: FiUser, label: 'Gender', value: getGenderDisplay() },
  ];

  // Additional details (shown on "Show More")
  const additionalDetails = [
    ...(profile?.date_of_birth ? [{ icon: FiCalendar, label: 'Date of Birth', value: formatDate(profile.date_of_birth) }] : []),
    ...(getLocation() ? [{ icon: FiMapPin, label: 'Location', value: getLocation() }] : []),
    ...(profile?.country ? [{ icon: FiFlag, label: 'Country', value: profile.country }] : []),
    ...(preference?.minimum_age && preference?.maximum_age ? [{ icon: FiHeart, label: 'Age Preference', value: `${preference.minimum_age} - ${preference.maximum_age} years` }] : []),
    ...(preference?.interested_in_gender_display ? [{ icon: FiGlobe, label: 'Interested In', value: preference.interested_in_gender_display }] : []),
    ...(profile?.county || profile?.city ? [{ icon: FiUsers, label: 'Region', value: [profile?.county, profile?.city].filter(Boolean).join(', ') }] : []),
  ];

  const hasAdditionalDetails = additionalDetails.length > 0;

  return (
    <div className="pdf-overall-container">
      {/* User Header */}
      <div className="pdf-user-header">
        <h1 className="pdf-user-name">{account.full_name}</h1>
      </div>

      {/* Bio - Truncated with "..." */}
      {profile?.bio && (
        <div className="pdf-bio-section">
          <p className="pdf-bio-text">
            {showAllDetails ? profile.bio : truncateText(profile.bio, 80)}
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="pdf-stats-row">
        <div className="pdf-stat-item">
          <span className="pdf-stat-value">{getMemberSince()}</span>
          <span className="pdf-stat-label">Joined</span>
        </div>
        {profile?.age && (
          <div className="pdf-stat-item">
            <span className="pdf-stat-value">{profile.age}</span>
            <span className="pdf-stat-label">Age</span>
          </div>
        )}
        <div className="pdf-stat-item">
          <span className="pdf-stat-value">{account.is_active ? 'Online' : 'Offline'}</span>
          <span className="pdf-stat-label">Status</span>
        </div>
      </div>

      {/* Initial Details - Always shown */}
      <div className="pdf-details-grid">
        {initialDetails.map((detail, index) => (
          <div className="pdf-detail-card" key={index}>
            <div className="pdf-detail-icon-wrapper">
              <detail.icon className="pdf-detail-icon" />
            </div>
            <div className="pdf-detail-content">
              <span className="pdf-detail-label">{detail.label}</span>
              <span className="pdf-detail-value">{detail.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button - Only if there are additional details */}
      {hasAdditionalDetails && (
        <>
          {/* Additional Details - Conditionally shown */}
          {showAllDetails && (
            <div className="pdf-details-grid pdf-additional-details">
              {additionalDetails.map((detail, index) => (
                <div className="pdf-detail-card pdf-additional-card" key={index}>
                  <div className="pdf-detail-icon-wrapper">
                    <detail.icon className="pdf-detail-icon" />
                  </div>
                  <div className="pdf-detail-content">
                    <span className="pdf-detail-label">{detail.label}</span>
                    <span className="pdf-detail-value">{detail.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More/Less Button */}
          <button className="pdf-show-more-btn" onClick={toggleShowMore}>
            <span>{showAllDetails ? 'Show Less' : 'Show More'}</span>
            {showAllDetails ? <FiChevronUp className="pdf-chevron-icon" /> : <FiChevronDown className="pdf-chevron-icon" />}
          </button>
        </>
      )}

      {/* Footer */}
      <div className="pdf-footer">
        <span className="pdf-footer-text">Member since {getMemberSince()}</span>
        {account.is_active && (
          <span className="pdf-active-badge">● Active</span>
        )}
      </div>
    </div>
  );
}

export default Profiledetailfetchview;