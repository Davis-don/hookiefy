import './settings.css'
import { IoArrowBack } from "react-icons/io5";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authtokenstore';

interface SettingsProps {
  onBack: () => void;
}

// API functions
const fetchAccountStatus = async (accessToken: string | null): Promise<{ account_status: string }> => {
  if (!accessToken) {
    throw new Error('No access token found');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/account-status/get/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch account status');
  }

  return response.json();
};

const updateAccountStatus = async (accessToken: string | null, status: string): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/account-status/`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account_status: status }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update account status');
  }

  return response.json();
};

function Settings({ onBack }: SettingsProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch current account status
  const { 
    data: statusData, 
    isLoading: isLoadingStatus,
    error: statusError
  } = useQuery({
    queryKey: ['accountStatus'],
    queryFn: () => fetchAccountStatus(accessToken),
    enabled: !!accessToken,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: true,
  });

  // Mutation for updating status
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateAccountStatus(accessToken, newStatus),
    onSuccess: () => {
      toast.success('Account status updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      queryClient.invalidateQueries({ queryKey: ['accountStatus'] });
      setIsUpdating(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update account status', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    statusMutation.mutate(newStatus);
  };

  const currentStatus = statusData?.account_status || 'public';

  return (
    <div className="overall-client-settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack}>
          <IoArrowBack />
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        {/* Account Status Section */}
        <div className="settings-section">
          <h3>Account Privacy</h3>
          <div className="settings-status-card">
            <div className="status-info">
              <div className="status-label">
                <span className="status-icon">{currentStatus === 'public' ? '🌐' : '🔒'}</span>
                <span className="status-title">
                  {currentStatus === 'public' ? 'Public Account' : 'Private Account'}
                </span>
              </div>
              <p className="status-description">
                {currentStatus === 'public' 
                  ? 'Your profile and posts are visible to everyone on Hookiefy.'
                  : 'Your profile and posts are not visible publicly'}
              </p>
            </div>

            {isLoadingStatus ? (
              <div className="status-loading">
                <div className="loading-spinner"></div>
                <span>Loading status...</span>
              </div>
            ) : (
              <div className="status-toggle-container">
                <button
                  className={`status-toggle-btn ${currentStatus === 'public' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('public')}
                  disabled={isUpdating || currentStatus === 'public'}
                >
                  <span className="toggle-label">Public</span>
                  {currentStatus === 'public' && <span className="toggle-check">✓</span>}
                </button>
                <button
                  className={`status-toggle-btn ${currentStatus === 'private' ? 'active' : ''}`}
                  onClick={() => handleStatusChange('private')}
                  disabled={isUpdating || currentStatus === 'private'}
                >
                  <span className="toggle-label">Private</span>
                  {currentStatus === 'private' && <span className="toggle-check">✓</span>}
                </button>
              </div>
            )}

            {statusError && (
              <div className="status-error">
                <span>⚠️ Failed to load status</span>
              </div>
            )}
          </div>
        </div>

        {/* You can add more settings sections here */}
      </div>
    </div>
  )
}

export default Settings