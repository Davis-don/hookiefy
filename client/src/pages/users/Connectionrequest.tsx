import './connectionrequest.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import Connectionrequestpreview from './Connectionrequestpreview'
import { usePreviewStore } from './store/connectpreview'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent'

// Interface matching the API response
interface ConnectionRequestData {
  notification_id: string;
  title: string;
  message: string;
  notification_type: string;
  notification_type_display: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  connection: {
    connection_id: string;
    status: string;
    status_display: string;
    created_at: string;
  };
  sender: {
    id: number;
    email: string;
    full_name: string;
    profile_image_url: string | null;
  };
  receiver: {
    id: number;
    email: string;
    full_name: string;
    profile_image_url: string | null;
  };
}

// Transformed interface for the preview component
export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  time: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  notification_id: string;
  connection_id: string;
  is_read: boolean;
  created_at: string;
}

// API call to fetch connection requests
const fetchConnectionRequests = async (accessToken: string | null): Promise<ConnectionRequest[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications/connection-requests/`, {
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
    throw new Error(`Failed to fetch connection requests: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform the API data to match the ConnectionRequest interface
  const transformedRequests: ConnectionRequest[] = data.data.map((item: ConnectionRequestData) => {
    // Calculate time ago
    const createdDate = new Date(item.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo = 'Just now';
    if (diffMins < 1) {
      timeAgo = 'Just now';
    } else if (diffMins < 60) {
      timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    return {
      id: item.notification_id,
      senderId: String(item.sender.id),
      senderName: item.sender.full_name,
      senderAvatar: item.sender.profile_image_url || '',
      receiverId: String(item.receiver.id),
      receiverName: item.receiver.full_name,
      receiverAvatar: item.receiver.profile_image_url || '',
      time: timeAgo,
      message: item.message,
      status: 'pending' as 'pending' | 'accepted' | 'declined',
      notification_id: item.notification_id,
      connection_id: item.connection.connection_id,
      is_read: item.is_read,
      created_at: item.created_at,
    };
  });

  return transformedRequests;
};

function Connectionrequest() {
  const { access: accessToken } = useAuthStore();
  const { openPreview } = usePreviewStore();
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Fetch connection requests
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['connectionRequests', accessToken],
    queryFn: () => fetchConnectionRequests(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setConnectionRequests(data);
    }
  }, [data]);

  // Auto-refresh every 30 seconds behind the scenes
  useEffect(() => {
    if (!accessToken) return;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      if (!isFetching) {
        console.log('🔄 Auto-refreshing connection requests...');
        refetch();
      }
    }, 30000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accessToken, refetch, isFetching]);

  // Handle preview click - pass the sender ID (the person who sent the request)
  const handlePreviewClick = (senderId: string) => {
    console.log('🔑 Opening preview for sender ID:', senderId);
    const request = connectionRequests.find(r => r.senderId === senderId);
    console.log('📌 Sender Name:', request?.senderName);
    openPreview(senderId);  // ✅ Store the sender ID
  };

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load connection requests', {
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

  // Loading state
  if (isLoading) {
    return (
      <div className="ovrall-connection-request-container">
        <div className="conn-req-loading">
          <Loadingcomponent />
          <div className="conn-req-loader-text">Loading connection requests...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && !connectionRequests.length) {
    return (
      <div className="ovrall-connection-request-container">
        <div className="conn-req-error">
          <div className="conn-req-error-icon">😅</div>
          <div className="conn-req-error-title">Couldn't load requests</div>
          <div className="conn-req-error-sub">
            {error instanceof Error ? error.message : 'Failed to load connection requests'}
          </div>
          <button 
            onClick={() => refetch()}
            className="conn-req-retry-btn"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // No access token
  if (!accessToken) {
    return (
      <div className="ovrall-connection-request-container">
        <div className="conn-req-empty">
          <div className="conn-req-empty-icon">🔒</div>
          <div className="conn-req-empty-title">Please Login</div>
          <div className="conn-req-empty-sub">You need to be logged in to view connection requests</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (connectionRequests.length === 0 && !isLoading) {
    return (
      <div className="ovrall-connection-request-container">
        <div className="conn-req-empty">
          <div className="conn-req-empty-icon">📭</div>
          <div className="conn-req-empty-title">No connection requests</div>
          <div className="conn-req-empty-sub">When someone sends you a hookup request, it will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ovrall-connection-request-container">
      {/* Request count */}
      <div className="conn-req-header">
        <span className="conn-req-count">
          {connectionRequests.length} {connectionRequests.length === 1 ? 'request' : 'requests'}
        </span>
        {isFetching && (
          <span className="conn-req-updating">Updating...</span>
        )}
      </div>

      {/* List of requests - passing sender ID to show the sender's profile */}
      {connectionRequests.map((request) => (
        <Connectionrequestpreview 
          key={request.id}
          request={request}
          onClick={() => handlePreviewClick(request.senderId)}  // ✅ Pass sender ID
        />
      ))}
    </div>
  )
}

export default Connectionrequest