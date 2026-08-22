import './serchfeeddetail.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import useSearchFeedStore from '../store/sechfeed'
import Loadingcomponent from '../../../components/superadmin/Loadingcomponent';
import { toast } from 'sonner';

// Define the UserFullData interface matching the API response
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

// API call to send connection request
const sendConnectionRequest = async (userId: string | number, accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/hookup/${userId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send connection request');
  }

  return response.json();
};

// Fetch single user detail using the correct endpoint
const fetchUserDetail = async (userId: string, accessToken: string | null): Promise<UserFullData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  console.log(`🌐 Fetching user detail for ID: ${userId}`);
  
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
    throw new Error(`Failed to fetch user details: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

function Serchfeeddetail() {
  const { id } = useParams<{ id: string }>();
  const { access: accessToken } = useAuthStore();
  const { selectedUserId, reset } = useSearchFeedStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // Use the ID from URL params or from the store
  const userId = id || selectedUserId;

  console.log('📋 Serchfeeddetail rendering with userId:', userId);

  // Fetch user detail using useQuery
  const {
    data: userData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userdetail', userId, accessToken],
    queryFn: () => fetchUserDetail(userId!, accessToken),
    enabled: !!userId && !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Mutation for sending connection request
  const connectionMutation = useMutation({
    mutationFn: () => sendConnectionRequest(userId!, accessToken),
    onSuccess: (data) => {
      const userName = userData?.account?.full_name || 'this user';
      toast.success(data.message || 'Connection request sent successfully!', {
        description: `You have connected with ${userName}`,
        duration: 5000,
        icon: '🤝',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      console.log('Connection successful:', data);
      setIsConnecting(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to send connection request', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('Connection error:', error);
      setIsConnecting(false);
    },
  });

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load user details', {
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

  // Handle back - just reset the store, no navigation
  const handleBack = () => {
    console.log('🔙 Going back, resetting store');
    reset();
  };

  // Handle connect button click
  const handleConnect = () => {
    if (!userId) {
      toast.error('Invalid user', {
        description: 'Unable to connect with this user.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    if (!accessToken) {
      toast.error('Please login', {
        description: 'You need to be logged in to connect with users.',
        duration: 4000,
        icon: '🔒',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    const userName = userData?.account?.full_name || 'this user';
    console.log(`📨 Sending connection request to ${userName} (ID: ${userId})`);
    
    setIsConnecting(true);
    
    const loadingToast = toast.loading('Sending connection request...', {
      description: `Connecting with ${userName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    connectionMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  // If no valid ID, show error state
  if (!userId) {
    return (
      <div className="overall-serchfeed-detail">
        <div className="serchfeed-detail-back" onClick={handleBack}>
          <span className="serchfeed-detail-back-icon">←</span>
          <span className="serchfeed-detail-back-text">Back</span>
        </div>
        <div className="serchfeed-detail-error">
          <div className="serchfeed-detail-error-icon">😕</div>
          <p className="serchfeed-detail-error-text">Invalid user ID</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="overall-serchfeed-detail">
        <div className="serchfeed-detail-back" onClick={handleBack}>
          <span className="serchfeed-detail-back-icon">←</span>
          <span className="serchfeed-detail-back-text">Back</span>
        </div>
        <div className="serchfeed-detail-loading">
          <Loadingcomponent />
          <div className="serchfeed-detail-loading-text">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !userData) {
    return (
      <div className="overall-serchfeed-detail">
        <div className="serchfeed-detail-back" onClick={handleBack}>
          <span className="serchfeed-detail-back-icon">←</span>
          <span className="serchfeed-detail-back-text">Back</span>
        </div>
        <div className="serchfeed-detail-error">
          <div className="serchfeed-detail-error-icon">😕</div>
          <p className="serchfeed-detail-error-text">
            {error instanceof Error ? error.message : 'Failed to load user data'}
          </p>
          <button 
            className="serchfeed-detail-retry-btn"
            onClick={() => refetch()}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // No access token
  if (!accessToken) {
    return (
      <div className="overall-serchfeed-detail">
        <div className="serchfeed-detail-back" onClick={handleBack}>
          <span className="serchfeed-detail-back-icon">←</span>
          <span className="serchfeed-detail-back-text">Back</span>
        </div>
        <div className="serchfeed-detail-error">
          <div className="serchfeed-detail-error-icon">🔒</div>
          <p className="serchfeed-detail-error-text">Please login to view user details</p>
        </div>
      </div>
    );
  }

  const account = userData.account;
  const profile = userData.profile;
  const preference = userData.preference;

  // Extract data from the response
  const userName = account.full_name || 'Unknown User';
  const userAvatar = account.profile_image_url || '';
  const userLocation = profile 
    ? [profile.city, profile.county, profile.country].filter(Boolean).join(', ') 
    : 'Location not set';
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
    <div className="overall-serchfeed-detail">
      {/* Back Button */}
      <div className="serchfeed-detail-back" onClick={handleBack}>
        <span className="serchfeed-detail-back-icon">←</span>
        <span className="serchfeed-detail-back-text">Back</span>
      </div>

      {/* Profile Header */}
      <div className="serchfeed-detail-profile">
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt={userName} 
            className="serchfeed-detail-avatar" 
          />
        ) : (
          <div className="serchfeed-detail-avatar-fallback">
            <span>{userName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <h2 className="serchfeed-detail-name">{userName}</h2>
        <div className="serchfeed-detail-handle">@{account.email?.split('@')[0] || 'user'}</div>
        <div className="serchfeed-detail-location">
          <span className="serchfeed-detail-location-icon">📍</span>
          <span>{userLocation}</span>
        </div>
        {userAge !== 'N/A' && (
          <div className="serchfeed-detail-age">
            <span className="serchfeed-detail-age-icon">🎂</span>
            <span>{userAge} years old</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="serchfeed-detail-stats">
        <div className="serchfeed-detail-stat">
          <span className="serchfeed-detail-stat-number">{preference?.interested_in_gender ? '✓' : '—'}</span>
          <span className="serchfeed-detail-stat-label">Interested</span>
        </div>
        <div className="serchfeed-detail-stat">
          <span className="serchfeed-detail-stat-number">{preference?.minimum_age || 'Any'}</span>
          <span className="serchfeed-detail-stat-label">Min Age</span>
        </div>
        <div className="serchfeed-detail-stat">
          <span className="serchfeed-detail-stat-number">{preference?.maximum_age || 'Any'}</span>
          <span className="serchfeed-detail-stat-label">Max Age</span>
        </div>
      </div>

      {/* Bio Section */}
      <div className="serchfeed-detail-bio">
        <div className="serchfeed-detail-bio-title">About</div>
        <div className="serchfeed-detail-bio-text">{userBio}</div>
      </div>

      {/* Looking For Section */}
      <div className="serchfeed-detail-looking">
        <div className="serchfeed-detail-looking-title">Looking For</div>
        <div className="serchfeed-detail-looking-text">{lookingFor}</div>
      </div>

      {/* Contact Info */}
      <div className="serchfeed-detail-contact">
        <div className="serchfeed-detail-contact-title">Contact</div>
        <div className="serchfeed-detail-contact-text">
          <div className="serchfeed-detail-contact-item">
            <span className="serchfeed-detail-contact-icon">📧</span>
            <span>{account.email}</span>
          </div>
          {account.phone_number && (
            <div className="serchfeed-detail-contact-item">
              <span className="serchfeed-detail-contact-icon">📱</span>
              <span>{account.phone_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connect Button - Full width at bottom */}
      <div className="serchfeed-detail-connect-wrapper">
        <button 
          className={`serchfeed-detail-connect-btn ${isConnecting ? 'connecting' : ''}`}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="serchfeed-detail-connect-spinner"></span>
              Connecting...
            </>
          ) : (
            'Connect'
          )}
        </button>
      </div>
    </div>
  );
}

export default Serchfeeddetail;