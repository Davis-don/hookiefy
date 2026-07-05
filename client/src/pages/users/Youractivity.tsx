import './youractivity.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import Youractivitypreview from './Youractivitypreview'
import Loadingcomponent from '../../components/superadmin/Loadingcomponent'

// Interface matching the API response for all connection requests (non-pending)
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
export interface Activity {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  time: string;
  message: string;
  status: 'accepted' | 'rejected' | 'completed';
  status_display: string;
  notification_id: string;
  connection_id: string;
  is_read: boolean;
  created_at: string;
}

// API call to fetch all connection requests (excluding pending)
const fetchAllConnectionRequests = async (accessToken: string | null): Promise<Activity[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications/connection-requests-all/`, {
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
    throw new Error(`Failed to fetch activity: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform the API data to match the Activity interface
  const transformedActivities: Activity[] = data.data.map((item: ConnectionRequestData) => {
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

    // Map status to our Activity status type
    let status: 'accepted' | 'rejected' | 'completed' = 'accepted';
    const connectionStatus = item.connection?.status?.toUpperCase() || '';
    if (connectionStatus === 'ACCEPTED') {
      status = 'accepted';
    } else if (connectionStatus === 'REJECTED') {
      status = 'rejected';
    } else if (connectionStatus === 'COMPLETED') {
      status = 'completed';
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
      status: status,
      status_display: item.connection?.status_display || 'Unknown',
      notification_id: item.notification_id,
      connection_id: item.connection?.connection_id || '',
      is_read: item.is_read,
      created_at: item.created_at,
    };
  });

  return transformedActivities;
};

function Youractivity() {
  const { access: accessToken } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Fetch all connection requests (excluding pending)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['allConnectionRequests', accessToken],
    queryFn: () => fetchAllConnectionRequests(accessToken),
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
      setActivities(data);
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
        console.log('🔄 Auto-refreshing activity...');
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

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load activity', {
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
      <div className="overall-your-activity-container">
        <div className="your-activity-loading">
          <Loadingcomponent />
          <div className="your-activity-loader-text">Loading activity...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && !activities.length) {
    return (
      <div className="overall-your-activity-container">
        <div className="your-activity-error">
          <div className="your-activity-error-icon">😅</div>
          <div className="your-activity-error-title">Couldn't load activity</div>
          <div className="your-activity-error-sub">
            {error instanceof Error ? error.message : 'Failed to load activity'}
          </div>
          <button 
            onClick={() => refetch()}
            className="your-activity-retry-btn"
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
      <div className="overall-your-activity-container">
        <div className="your-activity-empty">
          <div className="your-activity-empty-icon">🔒</div>
          <div className="your-activity-empty-title">Please Login</div>
          <div className="your-activity-empty-sub">You need to be logged in to view your activity</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (activities.length === 0 && !isLoading) {
    return (
      <div className="overall-your-activity-container">
        <div className="your-activity-header">
          <h1>Your Activity</h1>
          <span className="your-activity-count">0</span>
        </div>
        <div className="your-activity-empty">
          <div className="your-activity-empty-icon">📋</div>
          <div className="your-activity-empty-title">No activity yet</div>
          <div className="your-activity-empty-sub">
            When you accept or decline a hookup request, it will appear here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-your-activity-container">
      <div className="your-activity-header">
        <h1>Your Activity</h1>
        <span className="your-activity-count">{activities.length}</span>
        {isFetching && (
          <span className="your-activity-updating">Updating...</span>
        )}
      </div>
      <div className="your-activity-list">
        {activities.map((activity) => (
          <Youractivitypreview 
            key={activity.id}
            activity={activity}
          />
        ))}
      </div>
    </div>
  )
}

export default Youractivity