// components/SuperadminHeader.tsx
// ============================================================
// SuperadminHeader.tsx - Top Header Bar (With Profile, Balance & Icons)
// Gold premium theme - distinct from admin blue theme
// ============================================================

import './superadminheader.css'
import { IoSettingsOutline } from "react-icons/io5";
import { IoLogOutOutline } from "react-icons/io5";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoShieldCheckmark } from "react-icons/io5";
import { useAuthStore } from '../../../store/authtokenstore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';
import SuperadminBalance from './SuperadminBalance';

// ============================================================
// TYPES
// ============================================================

interface SuperadminHeaderProps {
  activeTab: string;
  onNavClick: (tab: string) => void;
}

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
// COMPONENT
// ============================================================

function SuperadminHeader({ activeTab, onNavClick }: SuperadminHeaderProps) {
  const { access: accessToken, refresh: refreshToken, clearTokens } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ---- Fetch current user data ----
  const { 
    data: userData, 
    isLoading: isLoadingUser,
  } = useQuery<CurrentUserData>({
    queryKey: ['currentSuperadminUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ---- Logout mutation ----
  const logoutMutation = useMutation({
    mutationFn: () => logoutUser(accessToken, refreshToken),
    onSuccess: () => {
      toast.success('Logged out successfully!', {
        duration: 3000,
        icon: '👋',
        style: {
          background: '#1a1a2e',
          border: '1px solid #d4af37',
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

  // ---- Render profile avatar ----
  const renderProfileAvatar = () => {
    if (isLoadingUser) {
      return (
        <div className="superadmin-header-avatar-wrapper superadmin-header-avatar-loading">
          <div className="superadmin-header-avatar-spinner"></div>
        </div>
      );
    }

    if (userData?.profile_image_url) {
      return (
        <div className="superadmin-header-avatar-wrapper">
          <img 
            src={userData.profile_image_url} 
            alt={userData.full_name || 'Super Admin'}
            className="superadmin-header-avatar-img"
          />
        </div>
      );
    }

    return (
      <div className="superadmin-header-avatar-wrapper default-bg">
        <IoShieldCheckmark className="superadmin-header-avatar-icon" />
      </div>
    );
  };

  // ---- Handle logout ----
  const handleLogout = () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const loadingToast = toast.loading('Logging out...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #d4af37',
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

  // ---- Handle settings click ----
  const handleSettingsClick = () => {
    onNavClick('settings');
  };

  // ---- Handle notifications click ----
  const handleNotificationsClick = () => {
    onNavClick('notifications');
  };

  // ---- Handle profile click ----
  const handleProfileClick = () => {
    onNavClick('profile');
  };

  return (
    <div className="overall-superadmin-header-container">
      <div className="superadmin-header-left">
        {/* Profile Avatar with Name */}
        <div className="superadmin-header-profile" onClick={handleProfileClick}>
          {renderProfileAvatar()}
          <div className="superadmin-header-profile-info">
            <span className="superadmin-header-profile-name">
              {isLoadingUser ? 'Loading...' : userData?.full_name || 'Super Admin'}
            </span>
            <span className="superadmin-header-profile-role">
              {userData?.role || 'Super Administrator'}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Component - Separate SuperadminBalance */}
      <SuperadminBalance />

      <div className="superadmin-header-icons-wrapper">
        <button 
          className={`superadmin-header-icon-btn ${activeTab === 'notifications' ? 'active' : ''}`} 
          title="Notifications"
          onClick={handleNotificationsClick}
        >
          <IoNotificationsOutline />
          <span className="superadmin-header-notification-badge">3</span>
        </button>
        
        <button 
          className={`superadmin-header-icon-btn ${activeTab === 'settings' ? 'active' : ''}`} 
          title="Settings"
          onClick={handleSettingsClick}
        >
          <IoSettingsOutline />
        </button>

        <button 
          className="superadmin-header-logout-btn" 
          onClick={handleLogout}
          disabled={isLoggingOut || logoutMutation.isPending}
          title="Logout"
        >
          <IoLogOutOutline />
        </button>
      </div>
    </div>
  );
}

export default SuperadminHeader;