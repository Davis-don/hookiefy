// Profileheader.tsx
import './profileheader.css'
import { IoLogOutOutline, IoSettingsOutline } from "react-icons/io5";
import { useAuthStore } from '../../../store/authtokenstore';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

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

interface ProfileheaderProps {
  onSettingsClick?: () => void;
}

function Profileheader({ onSettingsClick }: ProfileheaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { access: accessToken, refresh: refreshToken, clearTokens } = useAuthStore();

  // Logout mutation
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

  return (
    <div className="profile-header-wrapper">
      <div className="profile-header-content">
        {/* Settings Button */}
        <button 
          className="profile-settings-btn" 
          onClick={onSettingsClick}
          title="Settings"
        >
          <div className="settings-btn-content">
            <IoSettingsOutline className="settings-icon" />
            <span className="settings-tooltip">Settings</span>
          </div>
        </button>

        {/* Logout Button */}
        <button 
          className="profile-logout-btn" 
          onClick={handleLogout}
          disabled={isLoggingOut || logoutMutation.isPending}
          title="Logout"
        >
          <div className="logout-btn-content">
            <IoLogOutOutline className="logout-icon" />
            <span className="logout-tooltip">Logout</span>
          </div>
          <div className="logout-ripple"></div>
        </button>
      </div>
    </div>
  );
}

export default Profileheader;