// ============================================================
// User.tsx - Fetches unread notifications in parent
// ============================================================

import './user.css'
import { CiHome } from "react-icons/ci";
import { IoSearch } from "react-icons/io5";
import { IoNotifications } from "react-icons/io5";
import { IoPerson } from "react-icons/io5";
import { IoLogOutOutline } from "react-icons/io5";
import { IoCheckmarkCircle } from "react-icons/io5"; // Green tick icon
import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Submodalsuser from './Submodalsuser';
import Mypreference from './Mypreference';
import Myprofile from './Myprofile';
import Addprofileimguserpop from './Addprofileimguserpop';
// Import components
import Home from './Home';
import Search from './Search';
import Notifications from './Notifications';
import Profile from './Profile';
import PaidConnections from './PaidConnections'; // Keep the same component
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { useAuthStore } from '../../store/authtokenstore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================

interface CurrentUserData {
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
  assignment: {
    assigned_to_id: number;
    assigned_to_email: string;
    assigned_to_name: string;
  } | null;
}

interface UnreadNotificationsResponse {
  has_unread: boolean;
}

// ============================================================
// API HELPERS
// ============================================================

const fetchCurrentUser = async (accessToken: string | null): Promise<CurrentUserData> => {
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
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  return response.json();
};

// Fetch unread notifications status
const fetchUnreadNotifications = async (accessToken: string | null): Promise<UnreadNotificationsResponse> => {
  if (!accessToken) {
    throw new Error('No access token found');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/has-unread/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`Failed to check notifications: ${response.status}`);
  }

  return response.json();
};

// Logout function
const logoutUser = async (accessToken: string | null, refreshToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/logout/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) {
    throw new Error('Logout failed');
  }

  return response.json();
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function User() {
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasPreference, setHasPreference] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // State for successful connections count (can be fetched from API)
  const [successfulConnectionsCount] = useState(0);

  const { access: accessToken, refresh: refreshToken, clearTokens } = useAuthStore();

  // ---- Fetch current user data for profile icon ----
  const { 
    data: userData, 
    isLoading: isLoadingUser,
    refetch: refetchUser
  } = useQuery<CurrentUserData>({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ---- Fetch unread notifications status ----
  const {
    data: unreadData,
    error: unreadError,
  } = useQuery<UnreadNotificationsResponse>({
    queryKey: ['unreadNotifications', accessToken],
    queryFn: () => fetchUnreadNotifications(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 2,
  });

  // Get the unread status from the query data
  const hasUnreadNotifications = unreadData?.has_unread || false;

  // Log any errors from unread notifications fetch
  useEffect(() => {
    if (unreadError) {
      console.error('Error checking unread notifications:', unreadError);
    }
  }, [unreadError]);

  // ---- Logout mutation ----
  const logoutMutation = useMutation({
    mutationFn: () => logoutUser(accessToken, refreshToken),
    onSuccess: () => {
      toast.success('Logged out successfully!', {
        duration: 3000,
        icon: '👋',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      clearTokens();
      
      setTimeout(() => {
        window.location.href = '/signin';
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error('Logout failed', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      setIsLoggingOut(false);
    },
  });

  // Check if user has profile
  const checkProfile = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/profile/has-profile/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check profile status');
      }

      const data = await response.json();
      return data.has_profile;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  };

  // Check if user has preference
  const checkPreference = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/preference/has-preference/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check preference status');
      }

      const data = await response.json();
      return data.has_preference;
    } catch (error) {
      console.error('Error checking preference:', error);
      return false;
    }
  };

  // Check if user has profile image
  const checkProfileImageStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/account/has-profile-image/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check profile image status');
      }

      const data = await response.json();
      return data.has_profile_image;
    } catch (error) {
      console.error('Error checking profile image:', error);
      return false;
    }
  };

  // Check all statuses on mount
  useEffect(() => {
    const checkAllStatuses = async () => {
      if (!accessToken) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const [profileExists, preferenceExists, profileImageExists] = await Promise.all([
          checkProfile(),
          checkPreference(),
          checkProfileImageStatus()
        ]);

        setHasProfile(profileExists);
        setHasPreference(preferenceExists);
        setHasProfileImage(profileImageExists);

        // Show modals based on what's missing
        if (!profileExists) {
          setShowProfileModal(true);
          setShowPreferenceModal(false);
          setShowProfileImageModal(false);
        } else if (!preferenceExists) {
          setShowPreferenceModal(true);
          setShowProfileModal(false);
          setShowProfileImageModal(false);
        } else if (!profileImageExists) {
          setShowProfileImageModal(true);
          setShowProfileModal(false);
          setShowPreferenceModal(false);
        } else {
          setShowProfileModal(false);
          setShowPreferenceModal(false);
          setShowProfileImageModal(false);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAllStatuses();
  }, [accessToken]);

  // Handle profile completion
  const handleProfileComplete = async () => {
    setShowProfileModal(false);
    const profileExists = await checkProfile();
    setHasProfile(profileExists);
    
    if (profileExists) {
      const preferenceExists = await checkPreference();
      setHasPreference(preferenceExists);
      
      if (!preferenceExists) {
        setShowPreferenceModal(true);
      } else {
        const profileImageExists = await checkProfileImageStatus();
        setHasProfileImage(profileImageExists);
        if (!profileImageExists) {
          setShowProfileImageModal(true);
        }
      }
    }
  };

  // Handle preference completion
  const handlePreferenceComplete = async () => {
    setShowPreferenceModal(false);
    const preferenceExists = await checkPreference();
    setHasPreference(preferenceExists);
    
    if (preferenceExists) {
      const profileImageExists = await checkProfileImageStatus();
      setHasProfileImage(profileImageExists);
      if (!profileImageExists) {
        setShowProfileImageModal(true);
      }
    }
  };

  // Handle profile image completion
  const handleProfileImageComplete = async () => {
    setShowProfileImageModal(false);
    const profileImageExists = await checkProfileImageStatus();
    setHasProfileImage(profileImageExists);
    await refetchUser();
  };

  // Handle logout
  const handleLogout = () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const loadingToast = toast.loading('Logging out...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    logoutMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
        setIsLoggingOut(false);
      }
    });
  };

  // Handle navigation click
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    // IMPORTANT: Do NOT clear the notification dot here!
    // The dot is controlled by the API response via useQuery
  };

  // ---- Render profile avatar content ----
  const renderProfileAvatar = () => {
    if (isLoadingUser) {
      return (
        <div className="user-profile-avatar-wrapper user-profile-avatar-loading">
          <div className="user-profile-avatar-spinner"></div>
        </div>
      );
    }

    if (userData?.profile_image_url) {
      return (
        <div className="user-profile-avatar-wrapper">
          <img 
            src={userData.profile_image_url} 
            alt={userData.full_name || 'Profile'}
            className="user-profile-avatar-img"
          />
        </div>
      );
    }

    return (
      <div className="user-profile-avatar-wrapper default-bg">
        <IoPerson className="user-profile-avatar-icon" />
      </div>
    );
  };

  // Render the appropriate component based on active tab
  const renderContent = () => {
    if (isChecking) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          minHeight: '400px'
        }}>
          <Loadingcomponent />
        </div>
      );
    }

    if (!hasProfile || !hasPreference || !hasProfileImage) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          minHeight: '400px',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            opacity: 0.3
          }}>
            📸
          </div>
          <h3 style={{ 
            color: '#ffffff', 
            marginBottom: '0.5rem',
            fontWeight: '300'
          }}>
            {!hasProfile ? 'Complete Your Profile' :
             !hasPreference ? 'Complete Your Preferences' :
             'Add a Profile Image'}
          </h3>
          <p style={{ 
            color: 'rgba(255,255,255,0.5)',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {!hasProfile ? 'Please complete your profile to continue' :
             !hasPreference ? 'Please complete your preferences to continue' :
             'Please add a profile image to continue'}
          </p>
        </div>
      );
    }

    switch(activeTab) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'notifications':
        // Pass the navigation callback to Notifications
        return <Notifications onNavigateToSuccessfulConnections={() => handleNavClick('successful-connections')} />;
      case 'successful-connections':
        return <PaidConnections />;
      case 'profile':
        return <Profile />;
      default:
        return <Home />;
    }
  };

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-user-component-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Please login to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-user-component-container">
      {/* Sidebar / Navigation */}
      {!showProfileModal && !showPreferenceModal && !showProfileImageModal && (
        <div className="user-account-header-container">
          <div className="user-brand">
            <h3>Hookiefy</h3>
          </div>
          <ul>
            <li 
              className={activeTab === 'home' ? 'active-nav' : ''}
              onClick={() => handleNavClick('home')}
            >
              <div className="icon-fig"><CiHome /></div>
              <div className="nav-name">Home</div>
            </li>
            <li 
              className={activeTab === 'search' ? 'active-nav' : ''}
              onClick={() => handleNavClick('search')}
            >
              <div className="icon-fig"><IoSearch /></div>
              <div className="nav-name">Search</div>
            </li>
           
            {/* Notifications with red dot indicator */}
            <li 
              className={`${activeTab === 'notifications' ? 'active-nav' : ''} notification-nav-item`}
              onClick={() => handleNavClick('notifications')}
              style={{ position: 'relative' }}
            >
              <div className="icon-fig" style={{ position: 'relative' }}>
                <IoNotifications />
                {hasUnreadNotifications && (
                  <span className="notification-dot" style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid #1a1a2e',
                    animation: 'pulse 2s infinite'
                  }}></span>
                )}
              </div>
              <div className="nav-name">Notifications</div>
            </li>

            {/* Successful Connections - HIDDEN but still accessible via navigation */}
            {/* The link is hidden with display: none, but the component is still accessible via handleNavClick */}
            <li 
              className={`${activeTab === 'successful-connections' ? 'active-nav' : ''} successful-connections-nav-item`}
              onClick={() => handleNavClick('successful-connections')}
              style={{ position: 'relative', display: 'none' }} // HIDDEN
            >
              <div className="icon-fig" style={{ position: 'relative' }}>
                <IoCheckmarkCircle style={{ color: '#22c55e' }} />
                {successfulConnectionsCount > 0 && (
                  <span className="successful-connections-badge" style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #1a1a2e',
                  }}>
                    {successfulConnectionsCount}
                  </span>
                )}
              </div>
              <div className="nav-name">Successful Connections</div>
            </li>

            <li 
              className={`profile-user-nav ${activeTab === 'profile' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('profile')}
            >
              {renderProfileAvatar()}
              <div className="nav-name">Profile</div>
            </li>
          </ul>

          {/* Logout Button */}
          <div className="user-logout-section">
            <button 
              className="user-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut || logoutMutation.isPending}
            >
              <IoLogOutOutline className="user-logout-icon" />
              <span className="user-logout-text">
                {isLoggingOut || logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>

          <div className="user-sidebar-footer">
            <span>© 2026</span>
          </div>
        </div>
      )}

      {/* Main Body Content */}
      <div className="overall-user-body-container">
        <div className="actual-body-content-retainer-user">
          {renderContent()}
        </div>
        <div className="statauses-user-container">
          <Submodalsuser/>
          
          {/* Profile Modal */}
          {showProfileModal && (
            <Myprofile 
              onComplete={handleProfileComplete}
              onCancel={() => {}}
            />
          )}
          
          {/* Preference Modal */}
          {showPreferenceModal && (
            <Mypreference 
              onComplete={handlePreferenceComplete}
              onCancel={() => {}}
            />
          )}

          {/* Profile Image Modal */}
          {showProfileImageModal && (
            <Addprofileimguserpop 
              onComplete={handleProfileImageComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default User;