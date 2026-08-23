// components/AdminHeader.tsx
// ============================================================
// AdminHeader.tsx - Top Header Bar (With Profile & Icons)
// ============================================================

import './AdminHeader.css'
import { IoPerson } from "react-icons/io5";
import { IoSettingsOutline } from "react-icons/io5";
import { IoLogOutOutline } from "react-icons/io5";
import { IoNotificationsOutline } from "react-icons/io5";
import { useAuthStore } from '../../../store/authtokenstore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

// ============================================================
// TYPES
// ============================================================

interface AdminHeaderProps {
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

function AdminHeader({ activeTab, onNavClick }: AdminHeaderProps) {
  const { access: accessToken, refresh: refreshToken, clearTokens } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ---- Fetch current user data ----
  const { 
    data: userData, 
    isLoading: isLoadingUser,
  } = useQuery<CurrentUserData>({
    queryKey: ['currentAdminUser', accessToken],
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

  // ---- Render profile avatar ----
  const renderProfileAvatar = () => {
    if (isLoadingUser) {
      return (
        <div className="admin-header-avatar-wrapper admin-header-avatar-loading">
          <div className="admin-header-avatar-spinner"></div>
        </div>
      );
    }

    if (userData?.profile_image_url) {
      return (
        <div className="admin-header-avatar-wrapper">
          <img 
            src={userData.profile_image_url} 
            alt={userData.full_name || 'Admin'}
            className="admin-header-avatar-img"
          />
        </div>
      );
    }

    return (
      <div className="admin-header-avatar-wrapper default-bg">
        <IoPerson className="admin-header-avatar-icon" />
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
    <div className="overall-admin-header-container">
      <div className="admin-header-left">
        {/* Profile Avatar with Name */}
        <div className="admin-header-profile" onClick={handleProfileClick}>
          {renderProfileAvatar()}
          <div className="admin-header-profile-info">
            <span className="admin-header-profile-name">
              {isLoadingUser ? 'Loading...' : userData?.full_name || 'Admin User'}
            </span>
            <span className="admin-header-profile-role">
              {userData?.role || 'Administrator'}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-header-icons-wrapper">
        <button 
          className={`admin-header-icon-btn ${activeTab === 'notifications' ? 'active' : ''}`} 
          title="Notifications"
          onClick={handleNotificationsClick}
        >
          <IoNotificationsOutline />
          <span className="admin-header-notification-badge">3</span>
        </button>
        
        <button 
          className={`admin-header-icon-btn ${activeTab === 'settings' ? 'active' : ''}`} 
          title="Settings"
          onClick={handleSettingsClick}
        >
          <IoSettingsOutline />
        </button>

        <button 
          className="admin-header-logout-btn" 
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

export default AdminHeader;