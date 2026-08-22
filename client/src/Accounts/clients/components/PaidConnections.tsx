// ============================================================
// PaidConnections.tsx - Fetches and displays paid connections
// ============================================================

import './PaidConnections.css'
import Paidconnectionpreview from './Paidconnectionpreview'
import Paidpreviewdetail from './Paidpreviewdetail'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import Loadingcomponent from '../../../components/superadmin/Loadingcomponent'
import { useState } from 'react'

// ============================================================
// TYPES
// ============================================================

interface ConnectedUser {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  has_profile_image: boolean;
}

interface ContactDetails {
  phone_number: string;
  email: string;
  full_name: string;
}

interface PaidConnectionData {
  connection_id: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  user_role: string;
  connected_user: ConnectedUser;
  preview_message: string;
  contact_details: ContactDetails;
}

interface PaidConnectionsResponse {
  message: string;
  count: number;
  total_count: number;
  data: PaidConnectionData[];
}

// ============================================================
// API HELPER
// ============================================================

const fetchPaidConnections = async (accessToken: string | null): Promise<PaidConnectionsResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/connections-paid/`,
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch paid connections: ${response.status}`);
  }

  return response.json();
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function PaidConnections() {
  const { access: accessToken } = useAuthStore();
  const [selectedConnection, setSelectedConnection] = useState<PaidConnectionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch paid connections using React Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<PaidConnectionsResponse>({
    queryKey: ['paidConnections', accessToken],
    queryFn: () => fetchPaidConnections(accessToken),
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Handle view connection details
  const handleViewDetails = (connection: PaidConnectionData) => {
    setSelectedConnection(connection);
    setShowDetailModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedConnection(null);
  };

  // ============================================
  // SINE WAVE LOADING COMPONENT (SMALL)
  // ============================================
  const SmallSineWave = ({ isRefreshing = false }: { isRefreshing?: boolean }) => {
    const dotCount = 12;
    const colors = [
      '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', 
      '#54a0ff', '#5f27cd', '#1dd1a1', '#f368e0',
      '#00d2d3', '#ff9f43', '#2e86de', '#ee5a24'
    ];
    
    const dotIndices = Array.from({ length: dotCount }, (_, i) => i);
    
    return (
      <div className={`pc-mini-wave ${isRefreshing ? 'pc-mini-wave-refreshing' : ''}`}>
        {dotIndices.map((index: number) => {
          const angle = (index / dotCount) * Math.PI * 2;
          const y = Math.sin(angle) * 6;
          const scale = 0.6 + Math.abs(Math.sin(angle)) * 0.6;
          const color = colors[index % colors.length];
          const size = 5 + Math.abs(Math.sin(angle)) * 5;
          
          return (
            <span 
              key={index}
              className="pc-mini-dot"
              style={{ 
                background: color,
                transform: `translateY(${y}px) scale(${scale})`,
                animationDelay: `${index * 0.04}s`,
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
          );
        })}
      </div>
    );
  };

  // ============================================
  // BIG LOADER FOR INITIAL LOADING
  // ============================================
  const BigSineWave = () => {
    const dotCount = 15;
    const colors = [
      '#ff6b6b', '#ff9f43', '#feca57', '#ffd93d', 
      '#6bcb77', '#4d96ff', '#48dbfb', '#0abde3',
      '#a29bfe', '#6c5ce7', '#fd79a8', '#e17055',
      '#00b894', '#00cec9', '#0984e3'
    ];
    
    const dotIndices = Array.from({ length: dotCount }, (_, i) => i);
    
    return (
      <div className="pc-big-wave-container">
        <div className="pc-big-wave">
          {dotIndices.map((index: number) => {
            const angle = (index / dotCount) * Math.PI * 2;
            const y = Math.sin(angle) * 20;
            const scale = 0.5 + Math.abs(Math.sin(angle)) * 0.8;
            const color = colors[index % colors.length];
            const size = 10 + Math.abs(Math.sin(angle)) * 12;
            
            return (
              <span 
                key={index}
                className="pc-big-dot"
                style={{ 
                  background: color,
                  transform: `translateY(${y}px) scale(${scale})`,
                  animationDelay: `${index * 0.06}s`,
                  boxShadow: `0 0 30px ${color}60`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
              />
            );
          })}
        </div>
        <span className="pc-big-label">Loading connections...</span>
      </div>
    );
  };

  // ============================================
  // RENDER STATES
  // ============================================

  // Initial Loading
  if (isLoading) {
    return (
      <div className="pc-wrapper">
        <div className="pc-loading-container">
          <Loadingcomponent />
          <BigSineWave />
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="pc-wrapper">
        <div className="pc-error-state">
          <div className="pc-error-icon">😅</div>
          <h3>Failed to Load Connections</h3>
          <p>{error instanceof Error ? error.message : 'Something went wrong'}</p>
          <button className="pc-retry-btn" onClick={() => refetch()}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // No Token
  if (!accessToken) {
    return (
      <div className="pc-wrapper">
        <div className="pc-error-state">
          <div className="pc-error-icon">🔒</div>
          <h3>Authentication Required</h3>
          <p>Please login to view your connections</p>
        </div>
      </div>
    );
  }

  // No Connections
  if (!data || data.count === 0 || data.data.length === 0) {
    return (
      <div className="pc-wrapper">
        <div className="pc-empty-state">
          <div className="pc-empty-icon">🔗</div>
          <h3>No Connections Yet</h3>
          <p>When you complete a paid hookup,</p>
          <p>your connection's details will appear here.</p>
          <button className="pc-refresh-btn" onClick={() => refetch()}>
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="pc-wrapper">
      {/* Header */}
      <div className="pc-header">
        <div className="pc-header-left">
          <h2 className="pc-title">✅ Successful Connections</h2>
          <span className="pc-count-badge">{data.count} connection{data.count !== 1 ? 's' : ''}</span>
        </div>
        <div className="pc-header-right">
          {isFetching && (
            <span className="pc-refreshing-indicator">
              <SmallSineWave isRefreshing={true} />
              <span className="pc-refreshing-label">Refreshing...</span>
            </span>
          )}
          <button className="pc-refresh-btn" onClick={() => refetch()} disabled={isFetching}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Connection List - One line previews */}
      <div className="pc-list">
        {data.data.map((connection) => (
          <Paidconnectionpreview
            key={connection.connection_id}
            connection={connection}
            onViewDetails={() => handleViewDetails(connection)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      <Paidpreviewdetail
        connection={selectedConnection}
        isOpen={showDetailModal}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default PaidConnections