import './youractivitydetail.css'
import { usePreviewStore } from '../store/connectpreview'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { useEffect } from 'react'
import { toast } from 'sonner'
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent'
import { usePaymentModalStore } from '../store/modalstore'

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

// Activity status type
type ActivityStatus = 'accepted' | 'rejected' | 'completed';

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

function Youractivitydetail() {
  const { activityId, closeActivityPreview } = usePreviewStore();
  const { access: accessToken } = useAuthStore();
  const { open: openPaymentModal } = usePaymentModalStore();

  // Check if activityId is valid
  const isValidId = activityId !== null && activityId !== undefined && activityId !== '';

  // Fetch user full data by ID (the sender's ID from the store)
  const {
    data: userData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userFullData', activityId, accessToken],
    queryFn: () => fetchUserFullDataById(accessToken, activityId as string),
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

  // Get status from URL or store - you need to pass this from the activity
  // For now, we'll use a placeholder - you should get this from the activity data
  const status: ActivityStatus = 'accepted'; // TODO: Get from activity data

  const getStatusColor = (status: ActivityStatus) => {
    if (status === 'accepted') return '#22c55e';
    if (status === 'rejected') return '#ef4444';
    if (status === 'completed') return '#3b82f6';
    return '#f59e0b';
  };

  const getStatusIcon = (status: ActivityStatus) => {
    if (status === 'accepted') return '✅';
    if (status === 'rejected') return '❌';
    if (status === 'completed') return '✅';
    return '⏳';
  };

  const getStatusText = (status: ActivityStatus) => {
    if (status === 'accepted') return 'ACCEPTED';
    if (status === 'rejected') return 'DECLINED';
    if (status === 'completed') return 'COMPLETED';
    return 'PENDING';
  };

  const getStatusMessage = (status: ActivityStatus, senderName: string) => {
    if (status === 'accepted') {
      return `You accepted the hookup request from ${senderName}. Complete the payment to get connected instantly!`;
    }
    if (status === 'rejected') {
      return `You declined the hookup request from ${senderName}. You can always send a new request later.`;
    }
    if (status === 'completed') {
      return `You have completed the hookup with ${senderName}. Thank you for using Hookify!`;
    }
    return 'This request is still pending.';
  };

  const handleCompleteHookup = () => {
    if (activityId) {
      openPaymentModal(activityId);
    } else {
      toast.error('Invalid activity ID', {
        description: 'Unable to process payment. Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    }
  };

  // If no valid ID, show error state
  if (!isValidId) {
    return (
      <div className="overall-activity-detail">
        <div className="activity-detail-back" onClick={closeActivityPreview}>
          <span className="activity-detail-back-icon">←</span>
          <span className="activity-detail-back-text">Back to Activity</span>
        </div>
        <div className="activity-detail-not-found">
          <div className="activity-detail-not-found-icon">😕</div>
          <p>Activity not found</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="overall-activity-detail">
        <div className="activity-detail-back" onClick={closeActivityPreview}>
          <span className="activity-detail-back-icon">←</span>
          <span className="activity-detail-back-text">Back to Activity</span>
        </div>
        <div className="activity-detail-loading">
          <Loadingcomponent />
          <div className="activity-detail-loading-text">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !userData) {
    return (
      <div className="overall-activity-detail">
        <div className="activity-detail-back" onClick={closeActivityPreview}>
          <span className="activity-detail-back-icon">←</span>
          <span className="activity-detail-back-text">Back to Activity</span>
        </div>
        <div className="activity-detail-error">
          <div className="activity-detail-error-icon">😕</div>
          <p className="activity-detail-error-text">
            {error instanceof Error ? error.message : 'Failed to load user data'}
          </p>
          <button 
            className="activity-detail-retry-btn"
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

  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);
  const statusText = getStatusText(status);
  const statusMessage = getStatusMessage(status, userName);
  const isAccepted = status === 'accepted';

  return (
    <div className="overall-activity-detail">
      {/* Back Button */}
      <div className="activity-detail-back" onClick={closeActivityPreview}>
        <span className="activity-detail-back-icon">←</span>
        <span className="activity-detail-back-text">Back to Activity</span>
      </div>

      {/* Profile Header */}
      <div className="activity-detail-profile">
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt={userName} 
            className="activity-detail-avatar" 
          />
        ) : (
          <div className="activity-detail-avatar-fallback">
            <span>{userName?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
        )}
        <h2 className="activity-detail-name">{userName || 'Unknown User'}</h2>
        <div className="activity-detail-handle">@{account.email?.split('@')[0] || 'user'}</div>
        <div className="activity-detail-location">
          <span className="activity-detail-location-icon">📍</span>
          <span>{userLocation}</span>
        </div>
        {userAge !== 'N/A' && (
          <div className="activity-detail-age">
            <span className="activity-detail-age-icon">🎂</span>
            <span>{userAge} years old</span>
          </div>
        )}
        <div className="activity-detail-status-badge" style={{ color: statusColor }}>
          {statusIcon} {statusText}
        </div>
      </div>

      {/* Stats */}
      <div className="activity-detail-stats">
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">{preference?.interested_in_gender ? '✓' : '—'}</span>
          <span className="activity-detail-stat-label">Interested</span>
        </div>
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">{preference?.minimum_age || 'Any'}</span>
          <span className="activity-detail-stat-label">Min Age</span>
        </div>
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">{preference?.maximum_age || 'Any'}</span>
          <span className="activity-detail-stat-label">Max Age</span>
        </div>
      </div>

      {/* Bio Section */}
      <div className="activity-detail-bio">
        <div className="activity-detail-bio-title">About</div>
        <div className="activity-detail-bio-text">{userBio}</div>
      </div>

      {/* Looking For Section */}
      <div className="activity-detail-looking">
        <div className="activity-detail-looking-title">Looking For</div>
        <div className="activity-detail-looking-text">{lookingFor}</div>
      </div>

      {/* Status Message */}
      <div className="activity-detail-status-info">
        <div className="activity-detail-status-info-title">Status Update</div>
        <div className="activity-detail-status-info-text" style={{ borderLeftColor: statusColor }}>
          {statusMessage}
        </div>
      </div>

      {/* Payment Section - Only for accepted status */}
      {isAccepted && (
        <div className="activity-detail-payment-section">
          <div className="activity-detail-payment-icon">💳</div>
          <h3 className="activity-detail-payment-title">Complete Payment to Connect</h3>
          <p className="activity-detail-payment-description">
            Complete the payment of <strong>KES 500</strong> to get connected instantly 
            with {userName}. Secure and fast payment.
          </p>
          <div className="activity-detail-payment-features">
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">🔒</span>
              <span>Secure Payment</span>
            </div>
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">⚡</span>
              <span>Instant Connection</span>
            </div>
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">📱</span>
              <span>M-Pesa, Card & Bank</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="activity-detail-actions">
        <button 
          className="activity-detail-btn activity-detail-btn-close"
          onClick={closeActivityPreview}
        >
          Close
        </button>
        {isAccepted && (
          <button 
            className="activity-detail-btn activity-detail-btn-action"
            onClick={handleCompleteHookup}
          >
            Complete Hookup →
          </button>
        )}
      </div>
    </div>
  )
}

export default Youractivitydetail