import './connectionrequest.css'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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

// API Response wrapper
interface ApiResponse {
  message: string;
  count: number;
  total_count: number;
  unread_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  data: ConnectionRequestData[];
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

// Props
interface ConnectionrequestProps {
  onNotificationRead?: () => void;
}

// API call to fetch connection requests
const fetchConnectionRequests = async (
  accessToken: string | null,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: ConnectionRequest[]; pagination: any }> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/connection-requests/?page=${page}&page_size=${pageSize}`,
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
    if (response.status === 403) {
      throw new Error('Permission denied.');
    }
    throw new Error(`Failed to fetch connection requests: ${response.status}`);
  }

  const data: ApiResponse = await response.json();
  
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

  return {
    data: transformedRequests,
    pagination: {
      count: data.count,
      total_count: data.total_count,
      unread_count: data.unread_count,
      page: data.page,
      page_size: data.page_size,
      total_pages: data.total_pages,
      has_next: data.has_next,
      has_previous: data.has_previous,
    }
  };
};

// Mark notification as read
const markNotificationAsRead = async (
  accessToken: string | null,
  notificationId: string
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/mark-read/${notificationId}/`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }

  return response.json();
};

function Connectionrequest({ onNotificationRead }: ConnectionrequestProps) {
  const { access: accessToken } = useAuthStore();
  const { openPreview } = usePreviewStore();
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
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
    queryKey: ['connectionRequests', accessToken, currentPage, pageSize],
    queryFn: () => fetchConnectionRequests(accessToken, currentPage, pageSize),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) => 
      markNotificationAsRead(accessToken, notificationId),
    onSuccess: () => {
      refetch();
      if (onNotificationRead) {
        onNotificationRead();
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to mark as read', {
        description: error.message,
      });
    },
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setConnectionRequests(data.data);
      setUnreadCount(data.pagination.unread_count || 0);
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

  // Handle preview click - mark as read and show detail
  const handlePreviewClick = (request: ConnectionRequest) => {
    console.log('🔑 Opening preview for sender ID:', request.senderId);
    
    // Mark as read if not already read
    if (!request.is_read) {
      markReadMutation.mutate({ notificationId: request.notification_id });
    }
    
    openPreview(request.senderId);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const pagination = data?.pagination;

  return (
    <div className="ovrall-connection-request-container">
      {/* Header with counts */}
      <div className="conn-req-header">
        <div className="conn-req-header-left">
          <h2 className="conn-req-title">Connection Requests</h2>
          {unreadCount > 0 && (
            <span className="conn-req-unread-badge">
              {unreadCount} new{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="conn-req-header-right">
          {isFetching && (
            <span className="conn-req-updating">Updating...</span>
          )}
        </div>
      </div>

      {/* List of requests */}
      {connectionRequests.map((request) => (
        <Connectionrequestpreview 
          key={request.id}
          request={request}
          onClick={() => handlePreviewClick(request)}
          isUnread={!request.is_read}
        />
      ))}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="conn-req-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_previous}
            className="conn-req-pagination-btn"
          >
            Previous
          </button>
          <span className="conn-req-pagination-info">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
            className="conn-req-pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default Connectionrequest