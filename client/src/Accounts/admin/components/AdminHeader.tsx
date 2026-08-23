// components/AdminHeader.tsx
// ============================================================
// AdminHeader.tsx - Top Header Bar (Icons only - Centered)
// ============================================================

import './AdminHeader.css'
import { IoSettingsOutline } from "react-icons/io5";
import { IoLogOutOutline } from "react-icons/io5";
import { IoNotificationsOutline } from "react-icons/io5";
import { useAuthStore } from '../../../store/authtokenstore';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

// ============================================================
// TYPES
// ============================================================

interface AdminHeaderProps {
  activeTab: string;
  onNavClick: (tab: string) => void;
}

// ============================================================
// API HELPERS
// ============================================================

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

  return (
    <div className="overall-admin-header-container">
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